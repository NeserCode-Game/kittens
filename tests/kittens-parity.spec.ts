import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const M5_SAVE = readFileSync(
  new URL("./fixtures/m5-save.json", import.meta.url),
  "utf8"
);

type SystemScenario =
  | "seasonalTicks"
  | "batchBuilding"
  | "offlineTime"
  | "randomTrades"
  | "resetTimeline";

interface SystemRun {
  initial?: Record<string, unknown>;
  capture: {
    state: Record<string, unknown>;
    save: unknown;
  };
  built?: number;
  blocked?: number;
  reset?: {
    projected: {
      karmaKittens: number;
      paragonPoints: number;
    };
    returnedSave: Record<string, unknown>;
  };
}

function collectDifferences(
  left: unknown,
  right: unknown,
  path = "$",
  output: string[] = []
): string[] {
  if (output.length >= 80) return output;
  if (Object.is(left, right)) return output;
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    output.push(
      `${path}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`
    );
    return output;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([
    ...Object.keys(leftRecord),
    ...Object.keys(rightRecord),
  ]);
  for (const key of [...keys].sort()) {
    collectDifferences(
      leftRecord[key],
      rightRecord[key],
      `${path}.${key}`,
      output
    );
    if (output.length >= 80) break;
  }
  return output;
}

function normalizeSaveForParity(save: unknown): unknown {
  const normalized = structuredClone(save) as Record<string, unknown>;
  const game = normalized.game;
  if (game && typeof game === "object") {
    (game as Record<string, unknown>).lastBackup = null;
  }
  return normalized;
}

test("matches upstream state and prices for an identical command sequence", async ({
  page,
}, testInfo) => {
  const runRole = async (role: "raw" | "kernel") => {
    const isolatedPage = await page.context().newPage();
    try {
      await isolatedPage.goto("/tauri.svg", { waitUntil: "domcontentloaded" });
      return await isolatedPage.evaluate(
        async ({
          fixture,
          saveKey,
          role,
        }: {
          fixture: string;
          saveKey: string;
          role: "raw" | "kernel";
        }) => {
          const engineModule =
            await import("/src/game/kernel/engine-loader.ts");
          const kernelModule = await import("/src/game/kernel/game-kernel.ts");
          const engine = engineModule.getEngineContext("zh");
          const classes = engine.namespace.classes;
          const controllers = engine.namespace.com.nuclearunicorn.game.ui;

          const seedRandom = () => {
            let seed = 0x51f15e;
            Math.random = () => {
              seed = (seed * 1664525 + 1013904223) >>> 0;
              return seed / 0x100000000;
            };
            Date.now = () => 1_793_066_100_000;
          };

          const prepareGame = () => {
            localStorage.setItem(saveKey, fixture);
            seedRandom();
            const game = new engine.gameClass();
            game.opts.useWorkers = false;
            game.opts.hideSell = false;
            game.setUI(new classes.ui.UISystem());
            game.render = () => game.ui.update();
            game.villageTab.updateTab = () => {};
            game.workshopTab.updateTab = () => {};
            game.libraryTab.updateTab = () => {};
            game.server.refresh = () => {};
            game.server.syncUserProfile = () => {};
            game.server.syncSaveData = () => {};
            game.server.pushSave = () => {};
            game.resetState();
            if (!game.load() || game.currentSaveIsBroken) {
              throw new Error("Unable to load parity fixture");
            }
            game.updateCaches();
            game.updateWinterCatnip();
            return game;
          };

          const probeGame = (game) => {
            const buildingController =
              new classes.ui.btn.BuildingBtnModernController(game);
            const groups = game.bld.getBuildingGroups(false);
            const buildingIds = game.bld.unrollBuildingGroups(groups);
            const buildings = {};
            for (const id of buildingIds) {
              const accessor = game.bld.getBuildingExt(id);
              if (!accessor) continue;
              const meta = accessor.getMeta();
              const model = buildingController.fetchModel({
                key: id,
                building: id,
              });
              if (!model.visible) continue;
              buildings[id] = {
                value: meta.val,
                enabled: meta.on,
                prices: (model.prices ?? []).map((price) => [
                  price.name,
                  price.val,
                ]),
              };
            }

            const techController = new controllers.TechButtonController(game);
            const technology = {};
            for (const tech of game.science.techs) {
              const model = techController.fetchModel({
                key: tech.name,
                id: tech.name,
              });
              if (!model.visible) continue;
              technology[tech.name] = {
                researched: tech.researched,
                blocked: tech.blocked,
                enabled: model.enabled,
                prices: (model.prices ?? []).map((price) => [
                  price.name,
                  price.val,
                ]),
              };
            }

            const craftController = new controllers.CraftButtonController(game);
            const crafts = {};
            for (const craft of game.workshop.crafts) {
              if (!craft.unlocked) continue;
              const prices = game.workshop.getCraftPrice(craft);
              const model = craftController.fetchModel({
                key: craft.name,
                id: craft.name,
                craft: craft.name,
                name: craft.label,
                description: craft.description,
                prices,
              });
              crafts[craft.name] = {
                value: craft.value,
                progress: craft.progress,
                maxCraftable: game.workshop.getCraftAllCount(craft.name),
                craftRatio: game.getResCraftRatio(craft.name),
                enabled: model.enabled,
                prices: prices.map((price) => [price.name, price.val]),
              };
            }

            const upgradeController = new controllers.UpgradeButtonController(
              game
            );
            const upgrades = {};
            for (const upgrade of game.workshop.upgrades) {
              if (!upgrade.unlocked) continue;
              const model = upgradeController.fetchModel({
                key: upgrade.name,
                id: upgrade.name,
              });
              upgrades[upgrade.name] = {
                researched: upgrade.researched,
                enabled: model.enabled,
                prices: (model.prices ?? []).map((price) => [
                  price.name,
                  price.val,
                ]),
              };
            }

            return {
              resources: Object.fromEntries(
                game.resPool.resources
                  .filter((resource) => resource.visible || resource.unlocked)
                  .map((resource) => [
                    resource.name,
                    {
                      value: resource.value,
                      maxValue: resource.maxValue,
                      perTick: game.getResourcePerTick(resource.name),
                      unlocked: resource.unlocked,
                    },
                  ])
              ),
              buildings,
              jobs: Object.fromEntries(
                game.village.jobs
                  .filter((job) => job.unlocked)
                  .map((job) => {
                    job.calculateEffects?.(job, game);
                    return [
                      job.name,
                      {
                        value: job.value,
                        limit: game.village.getJobLimit(job.name),
                        modifiers: { ...(job.modifiers ?? {}) },
                      },
                    ];
                  })
              ),
              technology,
              crafts,
              upgrades,
              calendar: {
                day: game.calendar.day,
                year: game.calendar.year,
                season: game.calendar.getCurSeason().name,
              },
              religion: {
                faith: game.religion.faith,
                faithRatio: game.religion.faithRatio,
                transcendenceTier: game.religion.transcendenceTier,
                nextTranscendenceCost: game.religion._getTranscendNextPrice(),
                sacrifices: game.religion.getAvailableUnicornSacrifices(),
              },
              trade: Object.fromEntries(
                game.diplomacy.races
                  .filter((race) => race.unlocked)
                  .map((race) => [
                    race.name,
                    {
                      standing: game.diplomacy.getFinalStanding(race),
                      maxAmount: game.diplomacy.getMaxTradeAmt(race),
                      embassyLevel: race.embassyLevel,
                    },
                  ])
              ),
              time: {
                heat: game.time.heat,
                temporalFlux: game.resPool.get("temporalFlux").value,
                accelerated: game.time.isAccelerated,
              },
            };
          };

          const runRaw = () => {
            let step = "prepare";
            try {
              const game = prepareGame();
              step = "gather";
              for (let index = 0; index < 5; index += 1) {
                game.bld.gatherCatnip();
              }
              step = "craft wood";
              game.workshop.craft("wood", 5);

              step = "load hut model";
              const buildingController =
                new classes.ui.btn.BuildingBtnModernController(game);
              const hutModel = buildingController.fetchModel({
                key: "hut",
                building: "hut",
              });
              step = "build hut";
              buildingController.build(hutModel, 1);

              step = "assign farmer";
              const jobController = new controllers.JobButtonController(game);
              const farmerModel = {
                job: game.village.getJob("farmer"),
              };
              jobController.assignJobs(farmerModel, 1);

              step = "load agriculture model";
              const techController = new controllers.TechButtonController(game);
              const agricultureModel = techController.fetchModel({
                key: "agriculture",
                id: "agriculture",
              });
              step = "research agriculture";
              techController.buyItem(agricultureModel);
              step = "craft beam";
              game.workshop.craft("beam", 1);

              step = "load mineral hoes model";
              const upgradeController = new controllers.UpgradeButtonController(
                game
              );
              const hoeModel = upgradeController.fetchModel({
                key: "mineralHoes",
                id: "mineralHoes",
              });
              step = "buy mineral hoes";
              upgradeController.buyItem(hoeModel);

              const lizardRace = game.diplomacy.get("lizards");
              step = "trade lizards";
              game.diplomacy.tradeMultiple(lizardRace, 1);
              step = "praise";
              game.religion.praise();

              step = "load orbital launch model";
              const programController =
                new controllers.SpaceProgramBtnController(game);
              const orbitalModel = programController.fetchModel({
                key: "orbitalLaunch",
                id: "orbitalLaunch",
              });
              step = "orbital launch";
              programController.buyItem(orbitalModel);

              step = "load space elevator model";
              const planetBuildingController =
                new classes.ui.space.PlanetBuildingBtnController(game);
              const elevatorModel = planetBuildingController.fetchModel({
                key: "spaceElevator",
                id: "spaceElevator",
              });
              step = "space elevator";
              planetBuildingController.buyItem(elevatorModel);

              step = "load shatter model";
              const shatterController =
                new classes.ui.time.ShatterTCBtnController(game);
              const shatterModel = shatterController.fetchModel({
                key: "shatterTimeCrystal",
                id: "shatterTimeCrystal",
                name: "shatter",
                description: "shatter",
                prices: [{ name: "timeCrystal", val: 1 }],
              });
              step = "shatter time";
              shatterController.doShatterAmt(shatterModel, 1);

              step = "load challenge model";
              const challengeController = new classes.ui.ChallengeBtnController(
                game
              );
              const winterModel = challengeController.fetchModel({
                key: "winterIsComing",
                id: "winterIsComing",
              });
              step = "toggle challenge";
              challengeController.buyItem(winterModel);

              const setting = game.settings.settingsArr.find(
                (entry) => entry.name === "forceHighPrecision"
              );
              step = "set precision";
              game.settings.set(setting, true);
              game.updateCaches();
              game.updateWinterCatnip();
              game.updateResources();

              step = "probe";
              const probe = probeGame(game);
              step = "save";
              return {
                probe,
                save: JSON.parse(game._saveDataToString(game.save())),
              };
            } catch (cause) {
              const message =
                cause instanceof Error ? cause.message : String(cause);
              const stack = cause instanceof Error ? cause.stack : undefined;
              throw new Error(
                `Raw step "${step}" failed: ${message}${stack ? `\n${stack}` : ""}`,
                { cause }
              );
            }
          };

          const runKernel = () => {
            localStorage.setItem(saveKey, fixture);
            seedRandom();
            const kernel = new kernelModule.GameKernel("zh");
            const ensure = (name, action) => {
              const outcome = action();
              if (!outcome.ok) {
                const resources = Object.fromEntries(
                  ["catnip", "wood", "minerals", "science"].map((id) => [
                    id,
                    kernel.game.resPool.get(id).value,
                  ])
                );
                throw new Error(
                  `${name} failed: ${outcome.reason}; resources=${JSON.stringify(
                    resources
                  )}`
                );
              }
            };

            for (let index = 0; index < 5; index += 1) {
              ensure("gather", () => kernel.gather());
            }
            ensure("craft wood", () => kernel.craftWood(5));
            ensure("build hut", () => kernel.buyBuilding("hut"));
            ensure("assign farmer", () => kernel.assignJob("farmer"));
            ensure("research agriculture", () =>
              kernel.research("agriculture")
            );
            ensure("craft beam", () => kernel.craft("beam", 1));
            ensure("buy mineral hoes", () => kernel.buyUpgrade("mineralHoes"));
            ensure("trade lizards", () => kernel.trade("lizards", 1));
            ensure("praise", () => kernel.praise());
            ensure("orbital launch", () =>
              kernel.launchSpaceProgram("orbitalLaunch")
            );
            ensure("space elevator", () =>
              kernel.buySpaceBuilding("spaceElevator")
            );
            ensure("shatter time", () => kernel.shatterTime(1));
            ensure("toggle challenge", () =>
              kernel.toggleChallenge("winterIsComing")
            );
            ensure("set precision", () =>
              kernel.setSetting("forceHighPrecision", true)
            );
            ensure("save", () => kernel.save());

            const game = kernel.game;
            return {
              probe: probeGame(game),
              save: JSON.parse(localStorage.getItem(saveKey)),
            };
          };

          return role === "raw" ? runRaw() : runKernel();
        },
        { fixture: M5_SAVE, saveKey: SAVE_KEY, role }
      );
    } finally {
      await isolatedPage.close();
    }
  };

  const raw = await runRole("raw");
  const kernel = await runRole("kernel");

  const probeDifferences = collectDifferences(raw.probe, kernel.probe);
  const saveDifferences = collectDifferences(
    normalizeSaveForParity(raw.save),
    normalizeSaveForParity(kernel.save)
  );

  await testInfo.attach("m5-parity-differences.json", {
    body: Buffer.from(
      JSON.stringify({ probeDifferences, saveDifferences }, null, 2)
    ),
    contentType: "application/json",
  });

  expect(probeDifferences).toEqual([]);
  expect(saveDifferences).toEqual([]);
});

test("matches production systems and timeline reset inheritance", async ({
  page,
}, testInfo) => {
  const scenarios: SystemScenario[] = [
    "seasonalTicks",
    "batchBuilding",
    "offlineTime",
    "randomTrades",
    "resetTimeline",
  ];

  const runScenario = async (
    role: "raw" | "kernel",
    scenario: SystemScenario
  ): Promise<SystemRun> => {
    const isolatedPage = await page.context().newPage();
    try {
      await isolatedPage.goto("/tauri.svg", { waitUntil: "domcontentloaded" });

      return await isolatedPage.evaluate(
        async ({
          fixture,
          saveKey,
          role,
          scenario,
        }: {
          fixture: string;
          saveKey: string;
          role: "raw" | "kernel";
          scenario: SystemScenario;
        }) => {
          const engineModule =
            await import("/src/game/kernel/engine-loader.ts");
          const kernelModule = await import("/src/game/kernel/game-kernel.ts");
          const engine = engineModule.getEngineContext("zh");
          const classes = engine.namespace.classes;
          const controllers = engine.namespace.com.nuclearunicorn.game.ui;

          const seedRandom = () => {
            let seed = 0x51f15e;
            Math.random = () => {
              seed = (seed * 1664525 + 1013904223) >>> 0;
              return seed / 0x100000000;
            };
            Date.now = () => 1_793_066_100_000;
          };

          const createRawGame = () => {
            localStorage.setItem(saveKey, fixture);
            seedRandom();
            const game = new engine.gameClass();
            game.opts.useWorkers = false;
            game.opts.hideSell = false;
            game.setUI(new classes.ui.UISystem());
            game.render = () => game.ui.update();
            game.villageTab.updateTab = () => {};
            game.workshopTab.updateTab = () => {};
            game.libraryTab.updateTab = () => {};
            game.server.refresh = () => {};
            game.server.syncUserProfile = () => {};
            game.server.syncSaveData = () => {};
            game.server.pushSave = () => {};
            game.resetState();
            if (!game.load() || game.currentSaveIsBroken) {
              throw new Error("Unable to load parity fixture");
            }
            game.isPaused = false;
            game.updateCaches();
            game.updateWinterCatnip();
            game.updateResources();
            return game;
          };

          const createKernel = () => {
            localStorage.setItem(saveKey, fixture);
            seedRandom();
            const kernel = new kernelModule.GameKernel("zh");
            kernel.setPaused(false);
            return kernel;
          };

          const snapshot = (game) => {
            const craftValues = Object.fromEntries(
              game.workshop.crafts
                .filter((craft) => craft.unlocked)
                .map((craft) => [
                  craft.name,
                  { value: craft.value, progress: craft.progress },
                ])
            );
            return {
              ticks: game.ticks,
              resources: Object.fromEntries(
                game.resPool.resources
                  .filter((resource) => resource.visible || resource.unlocked)
                  .map((resource) => [
                    resource.name,
                    {
                      value: resource.value,
                      maxValue: resource.maxValue,
                      perTick: game.getResourcePerTick(resource.name),
                    },
                  ])
              ),
              calendar: {
                year: game.calendar.year,
                day: game.calendar.day,
                season: game.calendar.season,
                seasonName: game.calendar.getCurSeason().name,
                weather: game.calendar.weather,
                coldChance: game.getEffect("coldChance"),
                astroEventsUnlocked: game.calendar.getAreAstroEventsUnlocked(),
                libraryOn: game.bld.get("library").on,
                libraryMetaOn: game.bld.getBuildingExt("library").getMeta().on,
                astronomyResearched: game.science.get("astronomy").researched,
              },
              village: {
                kittens: game.village.getKittens(),
                freeKittens: game.village.getFreeKittens(),
                happiness: game.village.happiness,
                jobs: Object.fromEntries(
                  game.village.jobs.map((job) => [job.name, job.value])
                ),
                biomes: game.village.map.biomes.map((biome) => ({
                  name: biome.name,
                  unlocked: biome.unlocked,
                  on: biome.on,
                  fauna: biome.fauna,
                })),
              },
              buildings: Object.fromEntries(
                game.bld.buildingsData.map((building) => [
                  building.name,
                  {
                    value: building.val,
                    enabled: building.on,
                    unlocked: building.unlocked,
                  },
                ])
              ),
              crafts: craftValues,
              trade: Object.fromEntries(
                game.diplomacy.races.map((race) => [
                  race.name,
                  {
                    standing: game.diplomacy.getFinalStanding(race),
                    embassyLevel: race.embassyLevel,
                    unlocked: race.unlocked,
                  },
                ])
              ),
              time: {
                heat: game.time.heat,
                flux: game.time.flux,
                accelerated: game.time.isAccelerated,
                furnaceHeat: game.time.getCFU("blastFurnace").heat,
              },
              prestige: {
                karmaKittens: game.karmaKittens,
                projected: game.getResetPrestige(),
              },
              ironWill: game.ironWill,
            };
          };

          const captured = (game) => ({
            state: snapshot(game),
            save: JSON.parse(game._saveDataToString(game.save())),
          });

          const unassignProductionJobs = (game) => {
            const controller = new controllers.JobButtonController(game);
            for (const [jobId, amount] of [
              ["farmer", 8],
              ["scholar", 3],
            ]) {
              controller.unassignJobs(
                { job: game.village.getJob(jobId) },
                amount
              );
            }
            game.updateCaches();
            game.updateWinterCatnip();
            game.updateResources();
          };

          const runSeasonalTicks = () => {
            const prepare = (game) => {
              game.calendar.year = 8;
              game.calendar.season = 3;
              game.calendar.day = game.calendar.daysPerSeason - 1;
              game.calendar.weather = "cold";
              game.settings.set("forceHighPrecision", true);
              unassignProductionJobs(game);
              game.resPool.get("catnip").value = 1000;
              game.updateCaches();
              game.updateWinterCatnip();
              game.updateResources();
              seedRandom();
              return snapshot(game);
            };

            const game = role === "raw" ? createRawGame() : createKernel().game;
            const initial = prepare(game);
            for (let index = 0; index < 600; index += 1) game.tick();
            return { initial, capture: captured(game) };
          };

          const runBatchBuilding = () => {
            let built = 0;
            let blocked = 0;
            if (role === "raw") {
              const game = createRawGame();
              const controller = new classes.ui.btn.BuildingBtnModernController(
                game
              );
              const model = controller.fetchModel({
                key: "hut",
                building: "hut",
              });
              const before = game.bld.get("hut").val;
              controller.build(model, 5);
              built = game.bld.get("hut").val - before;

              game.resPool.get("catnip").value = 0;
              game.resPool.get("wood").value = 0;
              game.updateResources();
              const blockedBefore = game.bld.get("hut").val;
              controller.build(model, 1);
              blocked = game.bld.get("hut").val - blockedBefore;
              return { capture: captured(game), built, blocked };
            }

            const kernel = createKernel();
            const before = kernel.game.bld.get("hut").val;
            const kernelResult = kernel.buyBuilding("hut", 5);
            if (!kernelResult.ok) {
              throw new Error(
                `Kernel batch build failed: ${kernelResult.reason}`
              );
            }
            built = kernel.game.bld.get("hut").val - before;

            kernel.game.resPool.get("catnip").value = 0;
            kernel.game.resPool.get("wood").value = 0;
            kernel.game.updateResources();
            const blockedBefore = kernel.game.bld.get("hut").val;
            kernel.buyBuilding("hut", 1);
            blocked = kernel.game.bld.get("hut").val - blockedBefore;
            return { capture: captured(kernel.game), built, blocked };
          };

          const runOfflineTime = () => {
            const run = (game) => {
              game.calendar.year = 12;
              game.calendar.season = 1;
              game.calendar.day = 0;
              unassignProductionJobs(game);
              seedRandom();
              game.time.applyRedshift(30);
              game.updateCaches();
              game.updateResources();
            };

            const game = role === "raw" ? createRawGame() : createKernel().game;
            run(game);
            return { capture: captured(game) };
          };

          const runRandomTrades = () => {
            if (role === "raw") {
              const game = createRawGame();
              seedRandom();
              game.diplomacy.tradeMultiple(game.diplomacy.get("lizards"), 5);
              return { capture: captured(game) };
            }

            const kernel = createKernel();
            seedRandom();
            const tradeResult = kernel.trade("lizards", 5);
            if (!tradeResult.ok) {
              throw new Error(`Kernel trade failed: ${tradeResult.reason}`);
            }
            return { capture: captured(kernel.game) };
          };

          const prepareResetTimeline = (game) => {
            game.resPool.get("kittens").value = 125;
            game.resPool.get("zebras").value = 1;
            game.resPool.get("paragon").value = 10;
            game.resPool.get("burnedParagon").value = 5;
            game.karmaKittens = 4;
            game.karmaZebras = 2;
            game.deadKittens = 5;
            game.isCMBREnabled = true;
            game.calendar.day = -1;
            game.science.get("archery").researched = true;
            game.science.get("chronophysics").unlocked = true;
            game.science.get("chronophysics").researched = true;
            game.prestige.getPerk("anachronomancy").researched = true;
            game.time.getVSU("cryochambers").val = 3;
            game.time.getVSU("cryochambers").on = 3;
            game.religion.getTU("holyGenocide").val = 2;
            game.religion.getTU("holyGenocide").on = 2;
            game.religion.activeHolyGenocide = 0;
            game.challenges.getChallenge("anarchy").researched = true;
            game.challenges.getChallenge("winterIsComing").pending = true;
            game.updateCaches();
            game.updateWinterCatnip();
            game.updateResources();
          };

          const runResetTimeline = () => {
            const kernelForScenario =
              role === "kernel" ? createKernel() : undefined;
            const game = kernelForScenario?.game ?? createRawGame();
            prepareResetTimeline(game);
            const initial = snapshot(game);
            const projected = game.getResetPrestige();
            let returnedSave: Record<string, unknown> | undefined;

            if (role === "raw") {
              game.challenges.onRunReset();
              if (game.calendar.day < 0) {
                game.achievements.unlockBadge("abOwo");
              }
              for (const challenge of game.challenges.challenges) {
                challenge.pending = false;
              }
              if (game.village.loadoutController.loadouts?.length === 0) {
                game.village.loadoutController.toggleDefaultLoadouts();
              }
              returnedSave = game._resetInternal();
              game.isPaused = false;
              if (!game.load() || game.currentSaveIsBroken) {
                throw new Error("Unable to reload reset timeline save");
              }
              game.updateCaches();
              game.updateWinterCatnip();
              game.updateResources();
            } else {
              const originalResetInternal = game._resetInternal;
              game._resetInternal = function () {
                returnedSave = originalResetInternal.call(game);
                return returnedSave;
              };
              const request = kernelForScenario!.resetTimeline();
              if (request.reason !== "requires-confirmation") {
                throw new Error(
                  `Kernel reset request failed: ${request.reason}`
                );
              }
              const confirmed =
                kernelForScenario!.resolvePendingConfirmation(true);
              if (!confirmed.ok) {
                throw new Error(
                  `Kernel reset confirmation failed: ${confirmed.reason}`
                );
              }
            }

            if (!returnedSave) {
              throw new Error("Reset timeline did not return save data");
            }
            const normalizedReturnedSave = structuredClone(
              returnedSave
            ) as Record<string, unknown>;
            const returnedGame = normalizedReturnedSave.game;
            if (returnedGame && typeof returnedGame === "object") {
              (returnedGame as Record<string, unknown>).lastBackup = null;
            }
            return {
              initial,
              capture: captured(game),
              reset: {
                projected,
                returnedSave: normalizedReturnedSave,
              },
            };
          };

          switch (scenario) {
            case "seasonalTicks":
              return runSeasonalTicks();
            case "batchBuilding":
              return runBatchBuilding();
            case "offlineTime":
              return runOfflineTime();
            case "randomTrades":
              return runRandomTrades();
            case "resetTimeline":
              return runResetTimeline();
          }
        },
        { fixture: M5_SAVE, saveKey: SAVE_KEY, role, scenario }
      );
    } finally {
      await isolatedPage.close();
    }
  };

  const results = Object.fromEntries(
    scenarios.map((scenario) => [scenario, { raw: null, kernel: null }])
  ) as Record<
    SystemScenario,
    { raw: SystemRun | null; kernel: SystemRun | null }
  >;
  for (const scenario of scenarios) {
    results[scenario].raw = await runScenario("raw", scenario);
    results[scenario].kernel = await runScenario("kernel", scenario);
  }

  const differences = Object.fromEntries(
    scenarios.map((scenario) => {
      const raw = results[scenario].raw;
      const kernel = results[scenario].kernel;
      if (!raw || !kernel) {
        throw new Error(`Missing results for ${scenario}`);
      }
      return [
        scenario,
        {
          initial:
            raw.initial && kernel.initial
              ? collectDifferences(raw.initial, kernel.initial)
              : [],
          state: collectDifferences(raw.capture.state, kernel.capture.state),
          save: collectDifferences(
            normalizeSaveForParity(raw.capture.save),
            normalizeSaveForParity(kernel.capture.save)
          ),
          reset:
            raw.reset && kernel.reset
              ? collectDifferences(raw.reset, kernel.reset)
              : [],
        },
      ];
    })
  );

  await testInfo.attach("m5-system-parity-differences.json", {
    body: Buffer.from(JSON.stringify({ differences }, null, 2)),
    contentType: "application/json",
  });

  const rawBatch = results.batchBuilding.raw;
  const kernelBatch = results.batchBuilding.kernel;
  expect({
    raw: rawBatch?.built,
    kernel: kernelBatch?.built,
  }).toEqual({ raw: 5, kernel: 5 });
  expect({
    raw: rawBatch?.blocked,
    kernel: kernelBatch?.blocked,
  }).toEqual({ raw: 0, kernel: 0 });

  const rawReset = results.resetTimeline.raw?.reset;
  const kernelReset = results.resetTimeline.kernel?.reset;
  expect(rawReset?.projected).toEqual({
    karmaKittens: 1889,
    paragonPoints: 55,
  });
  expect(kernelReset?.projected).toEqual(rawReset?.projected);

  const returnedSave = rawReset?.returnedSave as {
    resources: Array<{ name: string; value: number }>;
    game: {
      karmaKittens: number;
      deadKittens: number;
      isCMBREnabled: boolean;
      ironWill: boolean;
      startedWithoutChronospheres: boolean;
    };
    religion: { activeHolyGenocide: number };
    village: { kittens: unknown[] };
    challenges: {
      challenges: Array<{ name: string; active: boolean; pending?: boolean }>;
    };
    prestige: {
      perks: Array<{ name: string; researched: boolean }>;
    };
    stats: Array<{ name: string; val: number }>;
  };
  expect(
    returnedSave.resources.find((resource) => resource.name === "paragon")
      ?.value
  ).toBe(65);
  expect(returnedSave.game.karmaKittens).toBe(1889);
  expect(returnedSave.game.deadKittens).toBe(0);
  expect(returnedSave.game.isCMBREnabled).toBe(false);
  expect(returnedSave.game.ironWill).toBe(false);
  expect(returnedSave.game.startedWithoutChronospheres).toBe(false);
  expect(returnedSave.religion.activeHolyGenocide).toBe(2);
  expect(returnedSave.village.kittens).toHaveLength(3);
  const resetWinter = returnedSave.challenges.challenges.find(
    (challenge) => challenge.name === "winterIsComing"
  );
  expect(resetWinter).toMatchObject({ active: false });
  expect(resetWinter).not.toHaveProperty("pending");
  expect(
    returnedSave.prestige.perks.find((perk) => perk.name === "anachronomancy")
      ?.researched
  ).toBe(true);
  expect(
    returnedSave.stats.find((stat) => stat.name === "totalResets")?.val
  ).toBe(1);
  expect(
    returnedSave.stats.find((stat) => stat.name === "totalParagon")?.val
  ).toBe(55);

  const finalResetSave = results.resetTimeline.raw?.capture.save as Record<
    string,
    unknown
  >;
  expect(finalResetSave.game).toMatchObject({
    karmaKittens: 1889,
    deadKittens: 0,
    isCMBREnabled: false,
    ironWill: false,
    startedWithoutChronospheres: false,
  });

  for (const scenario of scenarios) {
    expect(differences[scenario].initial, `${scenario} initial`).toEqual([]);
    expect(differences[scenario].state, scenario).toEqual([]);
    expect(differences[scenario].save, scenario).toEqual([]);
    expect(differences[scenario].reset, `${scenario} reset`).toEqual([]);
  }
});
