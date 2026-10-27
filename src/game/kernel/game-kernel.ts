import { getEngineContext } from "./engine-loader";
import type {
  AchievementSnapshot,
  ActionResult,
  BadgeSnapshot,
  BuildingSnapshot,
  ChallengeSnapshot,
  ChallengesSnapshot,
  CraftSnapshot,
  EffectSnapshot,
  GameSnapshot,
  GameSettingSnapshot,
  JobSnapshot,
  PrestigeSnapshot,
  PriceSnapshot,
  ProgressSnapshot,
  ReligionSnapshot,
  ReligionUpgradeKind,
  ReligionUpgradeSnapshot,
  ResearchItemSnapshot,
  ResourceSnapshot,
  SaveExportResult,
  SaveHealth,
  SaveImportResult,
  SaveStatusSnapshot,
  ScienceSnapshot,
  SpaceBuildingSnapshot,
  SpaceProgramSnapshot,
  SpaceSnapshot,
  StatGroupSnapshot,
  StatSnapshot,
  TimeSnapshot,
  TimeUpgradeKind,
  TimeUpgradeSnapshot,
  TradeOfferSnapshot,
  TradeRaceSnapshot,
  TradeSnapshot,
  UpgradeSnapshot,
  VillageSnapshot,
  WorkshopSnapshot,
} from "./types";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const SAVE_BACKUP_KEY = "com.nuclearunicorn.kittengame.savedata.backup";
const SAVE_META_KEY = "com.nuclearunicorn.kittengame.native-save-meta";
const TICK_MS = 200;
const SNAPSHOT_INTERVAL_MS = 250;

interface StorageRead {
  ok: boolean;
  value: string | null;
}

interface SaveMetadata {
  lastSavedAt: number | null;
  backupAt: number | null;
}

interface PreparedSave {
  data: string;
  sourceVersion: number | null;
}

function readStorage(key: string): StorageRead {
  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function parseSaveMetadata(value: string | null): SaveMetadata {
  if (!value) return { lastSavedAt: null, backupAt: null };
  try {
    const metadata = JSON.parse(value) as Record<string, unknown>;
    return {
      lastSavedAt:
        typeof metadata.lastSavedAt === "number" ? metadata.lastSavedAt : null,
      backupAt:
        typeof metadata.backupAt === "number" ? metadata.backupAt : null,
    };
  } catch {
    return { lastSavedAt: null, backupAt: null };
  }
}

interface LegacyResource {
  name: string;
  title: string;
  value: number;
  maxValue: number;
  visible: boolean;
  unlocked: boolean;
}

interface LegacyPrice {
  name: string;
  val: number;
}

interface LegacyBuildingModel {
  enabled: boolean;
  visible: boolean;
  prices: LegacyPrice[];
}

interface LegacyBuildingMeta {
  name: string;
  label: string;
  description: string;
  val: number;
  on: number;
  unlocked: boolean;
}

interface LegacyJob {
  name: string;
  title: string;
  description: string;
  modifiers?: Record<string, number>;
  value: number;
  unlocked: boolean;
  calculateEffects?: (job: LegacyJob, game: LegacyGame) => void;
}

interface LegacyTech {
  name: string;
  label: string;
  description: string;
  effectDesc?: string;
  flavor?: string;
  prices: LegacyPrice[];
  researched: boolean;
  unlocked: boolean;
  blocked?: boolean;
  blocks?: string[];
  requiredLeaderJob?: string;
}

interface LegacyCraft {
  name: string;
  label: string;
  description: string;
  prices: LegacyPrice[];
  unlocked: boolean;
  value: number;
  progress: number;
  tier: number;
  progressHandicap: number;
}

interface LegacyUpgrade {
  name: string;
  label: string;
  description: string;
  prices: LegacyPrice[];
  researched: boolean;
  unlocked: boolean;
}

interface LegacySetting {
  name: string;
  defaultValue: boolean;
  label?: string;
  mobileTitle?: string;
  mobileDesc?: string;
  tooltip?: string;
  isExtra?: boolean;
  devModeOnly?: boolean;
  showOnlyIfKSDetected?: boolean;
}

interface LegacyTradePrice {
  name: string;
  val: number;
}

interface LegacyTradeOffer {
  name: string;
  value?: number;
  chance: number;
  minLevel?: number;
}

interface LegacyRace {
  name: string;
  title: string;
  standing: number;
  buys: LegacyTradePrice[];
  sells: LegacyTradeOffer[];
  embassyPrices: LegacyPrice[];
  embassyLevel: number;
  unlocked: boolean;
}

interface LegacyReligionUpgrade {
  name: string;
  label: string;
  description: string;
  prices: LegacyPrice[];
  faith?: number;
  val: number;
  on: number;
  unlocked?: boolean;
  noStackable?: boolean;
}

interface LegacySpaceProgram {
  name: string;
  label: string;
  description: string;
  prices: LegacyPrice[];
  val: number;
  on: number;
  unlocked: boolean;
}

interface LegacySpaceBuilding extends LegacySpaceProgram {
  priceRatio?: number;
}

interface LegacyPlanet {
  name: string;
  label: string;
  unlocked: boolean;
  reached: boolean;
  routeDays: number;
  buildings: LegacySpaceBuilding[];
}

interface LegacyTimeUpgrade {
  name: string;
  label: string;
  description: string;
  prices: LegacyPrice[];
  val: number;
  on: number;
  unlocked?: boolean;
  heat?: number;
}

interface LegacyChallenge {
  name: string;
  label: string;
  description: string;
  effectDesc?: string;
  unlocked: boolean;
  active: boolean;
  pending: boolean;
  on: number;
  researched: boolean;
}

interface LegacyAchievement {
  name: string;
  title: string;
  description: string;
  hidden?: boolean;
  unethical?: boolean;
  unlocked: boolean;
  starUnlocked?: boolean;
  starCondition?: unknown;
}

interface LegacyBadge {
  name: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface LegacyStat {
  name: string;
  title: string;
  val: number | string;
  unlocked: boolean;
  defaultUnlocked?: boolean;
  calculate?: (game: LegacyGame) => number | string;
}

interface LegacyStatGroup {
  group: LegacyStat[];
  title: string;
}

interface ControllerOptions {
  key: string;
  id: string;
  race?: LegacyRace;
  prices?: LegacyPrice[];
  name?: string;
  description?: string;
}

interface ControllerModel {
  enabled: boolean;
  visible: boolean;
  prices: LegacyPrice[];
  options?: ControllerOptions;
}

interface JobButtonModel extends ControllerModel {
  job: LegacyJob;
}

interface PurchaseController {
  fetchModel: (options: ControllerOptions) => ControllerModel;
  buyItem: (model: ControllerModel) => PurchaseOutcome;
}

interface StackableController extends PurchaseController {
  build: (model: ControllerModel, amount: number) => number;
}

interface ShatterController extends PurchaseController {
  getPricesMultiple: (
    model: ControllerModel,
    amount: number
  ) => Record<string, number>;
  doShatterAmt: (model: ControllerModel, amount: number) => void;
}

interface HeatController extends PurchaseController {
  getPricesMultiple: (
    model: ControllerModel,
    amount: number
  ) => Record<string, number>;
  doShatterAmt: (model: ControllerModel, amount: number) => void;
}

interface PurchaseOutcome {
  itemBought: boolean;
  reason: string;
}

interface LegacyGame {
  ticks: number;
  isPaused: boolean;
  saveVersion: number;
  currentSaveIsBroken: boolean;
  karmaKittens: number;
  karmaZebras: number;
  deadKittens: number;
  ironWill: boolean;
  isCMBREnabled: boolean;
  opts: Record<string, unknown>;
  resPool: {
    resources: LegacyResource[];
    get: (id: string) => LegacyResource;
  };
  bld: {
    gatherCatnip: () => void;
    get: (id: string) => { on: number; val: number };
    getBuildingGroups: (
      includeFilters: boolean
    ) => Array<{ name: string; title: string; buildings: string[] }>;
    unrollBuildingGroups: (
      groups: Array<{ name: string; title: string; buildings: string[] }>
    ) => string[];
    getBuildingExt: (id: string) => { getMeta: () => LegacyBuildingMeta };
  };
  calendar: {
    day: number;
    year: number;
    getCurSeason: () => { name: string };
  };
  village: {
    jobs: LegacyJob[];
    happiness: number;
    maxKittens: number;
    sim: {
      maxKittens: number;
      kittens: Array<{ name?: string; surname?: string }>;
    };
    leader: { name?: string; surname?: string } | null;
    getKittens: () => number;
    getFreeKittens: () => number;
    getJob: (id: string) => LegacyJob;
    getJobLimit: (id: string) => number;
    loadoutController: {
      loadouts: unknown[] | null;
      toggleDefaultLoadouts: () => void;
    };
  };
  science: {
    techs: LegacyTech[];
    policies: LegacyTech[];
    get: (id: string) => LegacyTech;
    getPolicy: (id: string) => LegacyTech;
    getPrices: (tech: LegacyTech) => LegacyPrice[];
  };
  workshop: {
    crafts: LegacyCraft[];
    upgrades: LegacyUpgrade[];
    get: (id: string) => LegacyUpgrade;
    getCraft: (id: string) => LegacyCraft | null;
    craft: (
      id: string,
      amount: number,
      suppressUndo?: boolean,
      forceAll?: boolean,
      bypassResourceCheck?: boolean
    ) => boolean;
    craftAll: (id: string) => void;
    getCraftAllCount: (id: string) => number;
    getCraftPrice: (craft: LegacyCraft) => LegacyPrice[];
  };
  diplomacy: {
    races: LegacyRace[];
    get: (id: string) => LegacyRace | null;
    getTradeRatio: () => number;
    getTradeVolume: () => number;
    getGoldCost: () => number;
    getManpowerCost: () => number;
    getMaxTradeAmt: (race: LegacyRace) => number;
    hasMultipleResources: (race: LegacyRace, amount: number) => boolean;
    tradeMultiple: (race: LegacyRace, amount: number) => void;
    getFinalStanding: (race: LegacyRace) => number;
    getResourceTradeChance: (
      offer: LegacyTradeOffer,
      race: LegacyRace
    ) => number;
    isValidTrade: (offer: LegacyTradeOffer, race: LegacyRace) => boolean;
    getBlueprintTradeChance: (race: LegacyRace) => number;
    getSpiceTradeChance: (race: LegacyRace) => number;
  };
  religion: {
    faith: number;
    faithRatio: number;
    transcendenceTier: number;
    corruption: number;
    zigguratUpgrades: LegacyReligionUpgrade[];
    religionUpgrades: LegacyReligionUpgrade[];
    transcendenceUpgrades: LegacyReligionUpgrade[];
    getZU: (id: string) => LegacyReligionUpgrade;
    getRU: (id: string) => LegacyReligionUpgrade;
    getTU: (id: string) => LegacyReligionUpgrade;
    getApocryphaBonus: () => number;
    getAvailableUnicornSacrifices: () => number;
    praise: () => void;
    resetFaith: (bonusRatio: number, withConfirmation: boolean) => void;
    transcend: () => void;
    sacrificeAllUnicorns: () => void;
    _getTranscendNextPrice: () => number;
  };
  space: {
    programs: LegacySpaceProgram[];
    planets: LegacyPlanet[];
    getProgram: (id: string) => LegacySpaceProgram | undefined;
    getPlanet: (id: string) => LegacyPlanet | undefined;
    getBuilding: (id: string) => LegacySpaceBuilding | undefined;
  };
  time: {
    heat: number;
    isAccelerated: boolean;
    chronoforgeUpgrades: LegacyTimeUpgrade[];
    voidspaceUpgrades: LegacyTimeUpgrade[];
    getCFU: (id: string) => LegacyTimeUpgrade;
    getVSU: (id: string) => LegacyTimeUpgrade;
  };
  challenges: {
    challenges: LegacyChallenge[];
    getChallenge: (id: string) => LegacyChallenge;
    getCountPending: () => number;
    getCountCompletions: () => number;
    applyPending: (isIronWillPending?: boolean) => void;
    onRunReset: () => void;
  };
  achievements: {
    achievements: LegacyAchievement[];
    badges: LegacyBadge[];
    unlockBadge: (id: string) => void;
  };
  prestige: {
    getPerk: (id: string) => { researched: boolean };
    getResetBonusBreakdown: (
      extraParagon: number,
      extraKarma: number
    ) => {
      happiness: number;
      storage: number;
      production: number;
    };
  };
  stats: {
    stats: LegacyStat[];
    statsCurrent: LegacyStat[];
    statGroups: LegacyStatGroup[];
  };
  settings: {
    settingsArr: LegacySetting[];
    get: (setting: LegacySetting | string) => boolean;
    set: (setting: LegacySetting | string, value: boolean) => void;
  };
  ui: {
    update: () => void;
    updateOptions: () => void;
    confirm: (
      title: string,
      message: string,
      onConfirm?: () => void,
      onCancel?: () => void
    ) => void;
  };
  server: {
    refresh: () => void;
    syncUserProfile: () => void;
    syncSaveData: () => void;
    pushSave: () => void;
  };
  setUI: (ui: object) => void;
  resetState: () => void;
  load: () => boolean;
  save: () => Record<string, unknown>;
  compressLZData: (json: string, useUTF16?: boolean) => string;
  _parseLSSaveData: (data?: string) => Record<string, unknown>;
  _saveDataToString: (data: Record<string, unknown>) => string;
  update: () => void;
  tick: () => void;
  updateResources: () => void;
  updateCaches: () => void;
  updateWinterCatnip: () => void;
  getResourcePerTick: (id: string) => number;
  getEffect: (id: string) => number;
  getResCraftRatio: (id: string) => number;
  getCraftRatio: () => number;
  getUnlimitedDR: (value: number, stripe: number) => number;
  getResetPrestige: () => {
    karmaKittens: number;
    paragonPoints: number;
  };
  _getBonusZebras: () => number;
  _resetInternal: () => Record<string, unknown>;
  getDisplayValueExt: (value: number) => string;
  getEffectDisplayParams: (
    effectName: string,
    effectValue: number,
    showIfZero: boolean
  ) => {
    displayEffectName: string;
    displayEffectValue: string;
  } | null;
  msg: (message: string, type?: string) => void;
  render: () => void;
  villageTab: { updateTab: () => void };
  workshopTab: { updateTab: () => void };
  libraryTab: { updateTab: () => void };
}

interface KernelClasses {
  diplomacy: {
    ui: {
      EmbassyButtonController: new (game: LegacyGame) => StackableController;
    };
  };
  ui: {
    UISystem: new () => object;
    PolicyBtnController: new (game: LegacyGame) => {
      fetchModel: (options: { key: string; id: string }) => ControllerModel;
      buyItem: (model: ControllerModel) => PurchaseOutcome;
    };
    TranscendenceBtnController: new (game: LegacyGame) => StackableController;
    ChallengeBtnController: new (game: LegacyGame) => StackableController;
    space: {
      PlanetBuildingBtnController: new (
        game: LegacyGame
      ) => StackableController;
    };
    time: {
      AccelerateTimeBtnController: new (game: LegacyGame) => PurchaseController;
      ShatterTCBtnController: new (game: LegacyGame) => ShatterController;
      UseHeatBtnController: new (game: LegacyGame) => HeatController;
      ChronoforgeBtnController: new (game: LegacyGame) => StackableController;
      VoidSpaceBtnController: new (game: LegacyGame) => StackableController;
    };
    btn: {
      BuildingBtnModernController: new (game: LegacyGame) => {
        fetchModel: (options: {
          key: string;
          building: string;
        }) => LegacyBuildingModel;
      };
    };
  };
}

interface KernelControllers {
  TechButtonController: new (game: LegacyGame) => {
    fetchModel: (options: { key: string; id: string }) => ControllerModel;
    buyItem: (model: ControllerModel) => PurchaseOutcome;
  };
  UpgradeButtonController: new (game: LegacyGame) => {
    fetchModel: (options: { key: string; id: string }) => ControllerModel;
    buyItem: (model: ControllerModel) => PurchaseOutcome;
  };
  CraftButtonController: new (game: LegacyGame) => {
    fetchModel: (options: {
      key: string;
      id: string;
      craft: string;
      name: string;
      description: string;
      prices: LegacyPrice[];
    }) => ControllerModel;
    buyItem: (model: ControllerModel) => PurchaseOutcome;
  };
  JobButtonController: new (game: LegacyGame) => {
    fetchModel: (options: { key: string; job: string }) => JobButtonModel;
    assignJobs: (model: JobButtonModel, amount: number) => void;
    unassignJobs: (model: JobButtonModel, amount: number) => void;
  };
  ZigguratBtnController: new (game: LegacyGame) => StackableController;
  ReligionBtnController: new (game: LegacyGame) => StackableController;
  SpaceProgramBtnController: new (game: LegacyGame) => StackableController;
}

interface PendingConfirmation {
  id: number;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const SEASON_LABELS: Record<string, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

const SETTING_IDS = new Set([
  "forceHighPrecision",
  "usePerSecondValues",
  "usePercentageResourceValues",
  "usePercentageConsumptionValues",
  "highlightUnavailable",
  "hideSell",
  "hideDowngrade",
  "noConfirm",
  "IWSmelter",
  "disableTelemetry",
  "enableRedshift",
  "disablePollution",
  "enableRedshiftGflops",
  "forceLZ",
  "compressSaveFile",
  "hodl",
]);

const descriptionCache = new Map<string, string>();

function plainText(html: string): string {
  const cached = descriptionCache.get(html);
  if (cached !== undefined) return cached;

  const document = new DOMParser().parseFromString(html, "text/html");
  const text = (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
  descriptionCache.set(html, text);
  return text;
}

function deepGet(root: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, root);
}

const EFFECT_LABELS: Record<string, string> = {
  catnip: "猫薄荷",
  culture: "文化",
  faith: "信仰",
  manpower: "人力",
  minerals: "矿物",
  science: "科学",
  starchart: "星图",
  wood: "木材",
};

function formatEffectValue(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  const magnitude = Math.abs(value);
  const formatted =
    magnitude > 0 && magnitude < 0.01
      ? magnitude.toFixed(5)
      : new Intl.NumberFormat("zh-CN", {
          maximumFractionDigits: 3,
        }).format(magnitude);
  return `${sign}${formatted}`;
}

export class GameKernel {
  private readonly listeners = new Set<() => void>();
  private readonly game: LegacyGame;
  private readonly classes: KernelClasses;
  private readonly controllers: KernelControllers;
  private snapshot: GameSnapshot;
  private timer: number | null = null;
  private snapshotTimer: number | null = null;
  private stopSaveTimer: number | null = null;
  private lastMessage: string | null = null;
  private pendingConfirmation: PendingConfirmation | null = null;
  private nextConfirmationId = 1;
  private saveHealth: SaveHealth = "new";
  private sourceSaveVersion: number | null = null;
  private saveMigrated = false;
  private runtimeError: string | null = null;
  private lastPersistFailed = false;

  constructor(locale = "zh") {
    const engine = getEngineContext(locale);
    const classes = deepGet(engine.namespace, ["classes"]) as KernelClasses;
    const controllers = deepGet(engine.namespace, [
      "com",
      "nuclearunicorn",
      "game",
      "ui",
    ]) as KernelControllers;
    if (!classes || !controllers || !engine.gameClass) {
      throw new Error("Kittens Game engine failed to initialize.");
    }

    this.classes = classes;
    this.controllers = controllers;
    this.game = new engine.gameClass() as unknown as LegacyGame;
    this.game.opts.useWorkers = false;
    this.game.opts.hideSell = false;
    const saveGame = this.game.save.bind(this.game);
    this.game.save = () => {
      this.lastPersistFailed = false;
      const data = saveGame();
      const raw = this.game._saveDataToString(data);
      if (!writeStorage(SAVE_KEY, raw)) {
        this.lastPersistFailed = true;
        this.saveHealth = "unavailable";
        this.lastMessage = "保存失败，浏览器存储不可用；请立即手动导出当前进度";
        return data;
      }
      this.saveHealth = "healthy";
      this.sourceSaveVersion = this.game.saveVersion;
      this.saveMigrated = false;
      this.updateSaveMetadata({ lastSavedAt: Date.now() });
      return data;
    };
    this.game.setUI(new this.classes.ui.UISystem());
    this.game.ui.confirm = (
      title: string,
      message: string,
      onConfirm?: () => void,
      onCancel?: () => void
    ) => {
      this.pendingConfirmation = {
        id: this.nextConfirmationId++,
        title: plainText(title || "确认操作"),
        message: plainText(message),
        onConfirm,
        onCancel,
      };
      this.refreshSnapshot();
    };

    // Some legacy controllers call render after mutations. The new React UI owns
    // rendering, so retain only the update hook and skip the old tab renderer.
    this.game.render = () => this.game.ui.update();
    this.game.villageTab.updateTab = () => {};
    this.game.workshopTab.updateTab = () => {};
    this.game.libraryTab.updateTab = () => {};
    this.game.server.refresh = () => {};
    this.game.server.syncUserProfile = () => {};
    this.game.server.syncSaveData = () => {};
    this.game.server.pushSave = () => {};

    this.game.resetState();
    this.loadInitialSave();
    this.game.updateCaches();
    this.game.updateWinterCatnip();
    this.snapshot = this.buildSnapshot();
  }

  getSnapshot = (): GameSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (this.stopSaveTimer !== null) {
      window.clearTimeout(this.stopSaveTimer);
      this.stopSaveTimer = null;
    }
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.runTick(), TICK_MS);
    this.snapshotTimer = window.setInterval(() => {
      this.refreshSnapshot();
    }, SNAPSHOT_INTERVAL_MS);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.snapshotTimer !== null) {
      window.clearInterval(this.snapshotTimer);
    }
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("pagehide", this.handlePageHide);
    this.timer = null;
    this.snapshotTimer = null;
    if (this.stopSaveTimer !== null) window.clearTimeout(this.stopSaveTimer);
    this.stopSaveTimer = window.setTimeout(() => {
      this.stopSaveTimer = null;
      this.saveOnLifecycle();
    }, 500);
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.saveOnLifecycle();
      return;
    }
    this.refreshSnapshot();
  };

  private readonly handlePageHide = (): void => {
    this.saveOnLifecycle();
  };

  private runTick(): void {
    try {
      this.game.tick();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      this.runtimeError = message;
      this.game.isPaused = true;
      this.lastMessage = "游戏模拟发生错误，已暂停以防止存档继续变化";
      console.error("Kittens Game tick failed", cause);
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
      this.refreshSnapshot();
    }
  }

  private loadInitialSave(): void {
    const stored = readStorage(SAVE_KEY);
    if (!stored.ok) {
      this.saveHealth = "unavailable";
      this.lastMessage = "浏览器存储不可用，本局进度只能手动导出";
      return;
    }
    if (!stored.value) {
      this.saveHealth = "new";
      return;
    }

    let prepared: PreparedSave;
    try {
      prepared = this.prepareSaveText(stored.value);
    } catch {
      this.saveHealth = "corrupt";
      this.game.isPaused = true;
      this.lastMessage = "本地存档无法解析，已暂停自动保存";
      return;
    }

    this.sourceSaveVersion = prepared.sourceVersion;
    const loaded = this.game.load();
    if (!loaded || this.game.currentSaveIsBroken) {
      this.saveHealth = "corrupt";
      this.game.isPaused = true;
      this.lastMessage = "本地存档加载失败，已暂停自动保存";
      return;
    }

    this.saveHealth = "healthy";
    this.saveMigrated =
      prepared.sourceVersion !== null &&
      prepared.sourceVersion !== this.game.saveVersion;
    this.lastMessage = this.saveMigrated
      ? `存档已从版本 ${prepared.sourceVersion} 迁移到 ${this.game.saveVersion}`
      : null;
  }

  private prepareSaveText(raw: string): PreparedSave {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error("empty save");

    const data = trimmed[0] === "{" ? trimmed : trimmed.replace(/\s+/g, "");
    const parsed = this.game._parseLSSaveData(data);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Array.isArray(parsed.resources) ||
      !Array.isArray(parsed.buildings)
    ) {
      throw new Error("invalid save object");
    }
    const sourceVersion = this.parseSaveVersion(parsed.saveVersion);
    if (sourceVersion !== null && sourceVersion > this.game.saveVersion) {
      throw new Error("unsupported future save version");
    }
    return { data, sourceVersion };
  }

  private parseSaveVersion(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (
      typeof value === "string" &&
      /^\d+$/.test(value) &&
      Number.isSafeInteger(Number(value))
    ) {
      return Number(value);
    }
    return null;
  }

  private readSaveMetadata(): SaveMetadata {
    const stored = readStorage(SAVE_META_KEY);
    return parseSaveMetadata(stored.ok ? stored.value : null);
  }

  private updateSaveMetadata(update: Partial<SaveMetadata>): void {
    const current = this.readSaveMetadata();
    writeStorage(
      SAVE_META_KEY,
      JSON.stringify({
        lastSavedAt: update.lastSavedAt ?? current.lastSavedAt,
        backupAt: update.backupAt ?? current.backupAt,
      })
    );
  }

  private saveOnLifecycle(): void {
    if (
      this.saveHealth === "corrupt" ||
      this.saveHealth === "unavailable" ||
      this.runtimeError
    ) {
      return;
    }

    try {
      this.game.save();
      if (this.lastPersistFailed) {
        this.saveHealth = "unavailable";
      }
    } catch (cause) {
      console.error("Unable to save Kittens Game on lifecycle change", cause);
      this.saveHealth = "unavailable";
    }
  }

  private backupRawSave(raw: string): boolean {
    if (!writeStorage(SAVE_BACKUP_KEY, raw)) return false;
    this.updateSaveMetadata({ backupAt: Date.now() });
    return true;
  }

  private confirmImport(
    prepared: PreparedSave,
    title: string
  ): SaveImportResult {
    const versionText =
      prepared.sourceVersion === null
        ? "未标记版本"
        : `版本 ${prepared.sourceVersion}`;
    this.game.ui.confirm(
      title,
      `将导入${versionText}的存档。当前可读取进度会先建立恢复点，确认继续？`,
      () => this.applyImportedSave(prepared)
    );
    this.lastMessage = `等待确认${title}`;
    this.refreshSnapshot();
    return {
      ok: false,
      reason: "requires-confirmation",
      sourceVersion: prepared.sourceVersion,
    };
  }

  private applyImportedSave(prepared: PreparedSave): SaveImportResult {
    const previousHealth = this.saveHealth;
    const previousRuntimeError = this.runtimeError;
    let previous = readStorage(SAVE_KEY);
    const previousBackup = readStorage(SAVE_BACKUP_KEY);

    if (previousHealth === "unavailable") {
      this.lastMessage = "浏览器存储不可用，无法导入存档";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    if (previousHealth !== "corrupt" && !previousRuntimeError) {
      try {
        this.game.save();
      } catch (cause) {
        console.error("Unable to refresh current save before import", cause);
      }
      previous = readStorage(SAVE_KEY);
      if (
        this.lastPersistFailed ||
        !previous.ok ||
        !previous.value ||
        !this.backupRawSave(previous.value)
      ) {
        this.saveHealth = previous.ok ? this.saveHealth : "unavailable";
        this.lastMessage = "无法建立导入前的恢复点，已取消导入";
        this.refreshSnapshot();
        return { ok: false, reason: "storage-unavailable" };
      }
    } else if (
      previousHealth !== "corrupt" &&
      previous.ok &&
      previous.value &&
      !this.backupRawSave(previous.value)
    ) {
      this.lastMessage = "无法建立导入前的恢复点，已取消导入";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    if (!writeStorage(SAVE_KEY, prepared.data)) {
      this.saveHealth = "unavailable";
      this.lastMessage = "无法写入导入存档，浏览器存储不可用";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    const loaded = this.game.load();
    if (loaded && !this.game.currentSaveIsBroken) {
      const migrated =
        prepared.sourceVersion !== null &&
        prepared.sourceVersion !== this.game.saveVersion;
      this.saveHealth = "healthy";
      this.sourceSaveVersion = prepared.sourceVersion;
      this.saveMigrated = migrated;
      this.runtimeError = null;
      this.game.isPaused = false;
      if (migrated) {
        this.game.save();
        this.sourceSaveVersion = prepared.sourceVersion;
        this.saveMigrated = true;
      }
      this.lastMessage = migrated
        ? this.lastPersistFailed
          ? `存档已从版本 ${prepared.sourceVersion} 载入，但迁移结果写入失败`
          : `存档已从版本 ${prepared.sourceVersion} 迁移到 ${this.game.saveVersion}`
        : "存档已导入";
      this.refreshGameState();
      return {
        ok: true,
        reason: "ok",
        changed: true,
        sourceVersion: prepared.sourceVersion,
        migrated,
      };
    }

    if (previous.ok && previous.value) {
      writeStorage(SAVE_KEY, previous.value);
    } else {
      removeStorage(SAVE_KEY);
    }
    if (previousBackup.ok && previousBackup.value) {
      writeStorage(SAVE_BACKUP_KEY, previousBackup.value);
    } else {
      removeStorage(SAVE_BACKUP_KEY);
    }

    if (previousHealth === "healthy" && previous.value) {
      const restored = this.game.load();
      this.saveHealth =
        restored && !this.game.currentSaveIsBroken ? "healthy" : "corrupt";
    } else if (previousHealth === "new") {
      this.game.resetState();
      this.saveHealth = "new";
    } else {
      this.saveHealth = previousHealth;
    }
    this.game.isPaused = this.saveHealth === "corrupt";
    this.lastMessage = "导入失败，已恢复导入前的游戏状态";
    this.refreshGameState();
    return { ok: false, reason: "invalid-save" };
  }

  private applyReset(): ActionResult {
    if (this.saveHealth === "unavailable") {
      this.lastMessage = "浏览器存储不可用，无法重置存档";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    if (this.saveHealth !== "corrupt" && !this.runtimeError) {
      try {
        this.game.save();
      } catch (cause) {
        console.error("Unable to save before resetting Kittens Game", cause);
      }
      const current = readStorage(SAVE_KEY);
      if (
        this.lastPersistFailed ||
        !current.ok ||
        !current.value ||
        !this.backupRawSave(current.value)
      ) {
        this.lastMessage = "无法建立恢复点，已取消重置";
        this.refreshSnapshot();
        return { ok: false, reason: "storage-unavailable" };
      }
    } else {
      const current = readStorage(SAVE_KEY);
      if (
        this.saveHealth !== "corrupt" &&
        current.ok &&
        current.value &&
        !this.backupRawSave(current.value)
      ) {
        this.lastMessage = "无法建立恢复点，已取消重置";
        this.refreshSnapshot();
        return { ok: false, reason: "storage-unavailable" };
      }
    }

    try {
      if (!removeStorage(SAVE_KEY)) {
        throw new Error("storage unavailable");
      }
      this.game.resetState();
      this.game.updateCaches();
      this.game.updateWinterCatnip();
      this.game.isPaused = false;
      this.saveHealth = "new";
      this.sourceSaveVersion = null;
      this.saveMigrated = false;
      this.runtimeError = null;
      this.lastMessage = "游戏已重置，导入前恢复点仍保留";
      this.refreshSnapshot();
      return { ok: true, reason: "ok", changed: true };
    } catch (cause) {
      console.error("Unable to reset Kittens Game save", cause);
      this.saveHealth = "unavailable";
      this.lastMessage = "无法重置存档，浏览器存储不可用";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }
  }

  gather(): ActionResult {
    this.game.bld.gatherCatnip();
    this.game.updateResources();
    this.game.updateCaches();
    this.lastMessage = "采集了猫薄荷";
    this.refreshSnapshot();
    return { ok: true, reason: "ok" };
  }

  craftWood(amount = 1): ActionResult {
    return this.craft("wood", amount);
  }

  assignJob(id: string, amount = 1): ActionResult {
    return this.changeJob(id, amount, true);
  }

  unassignJob(id: string, amount = 1): ActionResult {
    return this.changeJob(id, amount, false);
  }

  research(id: string, kind: "tech" | "policy" = "tech"): ActionResult {
    const controller =
      kind === "policy"
        ? new this.classes.ui.PolicyBtnController(this.game)
        : new this.controllers.TechButtonController(this.game);
    const metadata =
      kind === "policy"
        ? this.game.science.getPolicy(id)
        : this.game.science.get(id);
    if (!metadata) {
      this.lastMessage = "未找到研究项目";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    const model = controller.fetchModel({ key: id, id });
    if (!model.visible) {
      this.lastMessage = "该项目尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }
    if (metadata.researched) {
      this.lastMessage = `${metadata.label} 已经完成`;
      this.refreshSnapshot();
      return { ok: false, reason: "already-owned" };
    }
    if (metadata.blocked) {
      this.lastMessage = `${metadata.label} 当前不可研究`;
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }
    if (!model.enabled) {
      this.lastMessage = "资源不足，无法研究";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    const outcome = controller.buyItem(model);
    if (outcome.itemBought) {
      this.lastMessage =
        kind === "policy"
          ? `采纳政策：${metadata.label}`
          : `完成研究：${metadata.label}`;
      this.refreshGameState();
      return { ok: true, reason: "ok", changed: true };
    }

    const reason = this.mapPurchaseReason(outcome.reason);
    this.lastMessage =
      reason === "requires-confirmation"
        ? `等待确认：${metadata.label}`
        : `${metadata.label} 当前无法完成`;
    this.refreshSnapshot();
    return { ok: false, reason };
  }

  craft(id: string, amount = 1): ActionResult {
    const recipe = this.game.workshop.getCraft(id);
    if (!recipe) {
      this.lastMessage = "未找到制作配方";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!recipe.unlocked) {
      this.lastMessage = "该配方尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      this.lastMessage = "制作数量无效";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    const crafted = this.game.workshop.craft(id, amount);
    if (!crafted) {
      this.lastMessage = "资源不足，无法制作";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.lastMessage = `制作了 ${recipe.label}`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  craftAll(id: string): ActionResult {
    const recipe = this.game.workshop.getCraft(id);
    if (!recipe) {
      this.lastMessage = "未找到制作配方";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!recipe.unlocked) {
      this.lastMessage = "该配方尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    const amount = this.game.workshop.getCraftAllCount(id);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.lastMessage = "资源不足，无法制作";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.workshop.craftAll(id);
    this.lastMessage = `批量制作了 ${recipe.label}`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  buyUpgrade(id: string): ActionResult {
    const controller = new this.controllers.UpgradeButtonController(this.game);
    const metadata = this.game.workshop.get(id);
    if (!metadata) {
      this.lastMessage = "未找到工坊升级";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    const model = controller.fetchModel({ key: id, id });
    if (!model.visible) {
      this.lastMessage = "该升级尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }
    if (metadata.researched) {
      this.lastMessage = `${metadata.label} 已经购买`;
      this.refreshSnapshot();
      return { ok: false, reason: "already-owned" };
    }
    if (!model.enabled) {
      this.lastMessage = "资源不足，无法购买升级";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    const outcome = controller.buyItem(model);
    if (!outcome.itemBought) {
      this.lastMessage = `${metadata.label} 当前无法购买`;
      this.refreshSnapshot();
      return {
        ok: false,
        reason: this.mapPurchaseReason(outcome.reason),
      };
    }

    this.lastMessage = `购买升级：${metadata.label}`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  trade(id: string, requestedAmount: number | "all" = 1): ActionResult {
    const race = this.game.diplomacy.get(id);
    if (!race) {
      this.lastMessage = "未找到贸易种族";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!race.unlocked) {
      this.lastMessage = `${race.title} 尚未建立贸易关系`;
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    const maxAmount = Math.max(
      0,
      Math.floor(this.game.diplomacy.getMaxTradeAmt(race) || 0)
    );
    const amount =
      requestedAmount === "all"
        ? maxAmount
        : Math.floor(Number(requestedAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.lastMessage = "当前资源不足，无法派出商队";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }
    if (!this.game.diplomacy.hasMultipleResources(race, amount)) {
      this.lastMessage = "当前资源不足，无法完成贸易";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.diplomacy.tradeMultiple(race, amount);
    this.lastMessage = `与${race.title}完成 ${amount} 次贸易`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  buyEmbassy(id: string): ActionResult {
    const race = this.game.diplomacy.get(id);
    if (!race) {
      this.lastMessage = "未找到贸易种族";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!race.unlocked) {
      this.lastMessage = "需要先与该种族建立贸易关系";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    return this.purchaseWithController(
      new this.classes.diplomacy.ui.EmbassyButtonController(this.game),
      {
        key: id,
        id,
        race,
        prices: race.embassyPrices,
      },
      "大使馆",
      `建造${race.title}大使馆`
    );
  }

  praise(): ActionResult {
    const faith = this.game.resPool.get("faith");
    if (!faith || faith.value <= 0) {
      this.lastMessage = "没有可赞美的信仰";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.religion.praise();
    this.lastMessage = "信仰已转化为崇拜";
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  resetFaith(): ActionResult {
    if (!this.game.religion.getRU("apocripha").on) {
      this.lastMessage = "尚未掌握信仰重置";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    this.game.religion.resetFaith(1.01, true);
    this.lastMessage = this.pendingConfirmation
      ? "等待确认信仰重置"
      : "信仰已重置";
    this.refreshGameState();
    return {
      ok: !this.pendingConfirmation,
      reason: this.pendingConfirmation ? "requires-confirmation" : "ok",
      changed: !this.pendingConfirmation,
    };
  }

  transcend(): ActionResult {
    if (!this.game.religion.getRU("transcendence").on) {
      this.lastMessage = "尚未解锁超越";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    const nextCost = this.game.religion._getTranscendNextPrice();
    if (
      !Number.isFinite(nextCost) ||
      this.game.religion.faithRatio <= nextCost
    ) {
      this.lastMessage = "顿悟不足，无法超越";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.religion.transcend();
    this.lastMessage = this.pendingConfirmation
      ? "等待确认超越"
      : "超越状态未改变";
    this.refreshGameState();
    return {
      ok: !this.pendingConfirmation,
      reason: this.pendingConfirmation ? "requires-confirmation" : "ok",
      changed: !this.pendingConfirmation,
    };
  }

  sacrificeUnicorns(): ActionResult {
    const available = this.game.religion.getAvailableUnicornSacrifices();
    if (available <= 0) {
      this.lastMessage = "没有足够的独角兽可供献祭";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.religion.sacrificeAllUnicorns();
    this.lastMessage = `献祭了 ${available} 批独角兽`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  buyReligionUpgrade(id: string, kind: ReligionUpgradeKind): ActionResult {
    const metadata = this.getReligionUpgrade(id, kind);
    if (!metadata) {
      this.lastMessage = "未找到宗教升级";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    const controller =
      kind === "ziggurat"
        ? new this.controllers.ZigguratBtnController(this.game)
        : kind === "transcendence"
          ? new this.classes.ui.TranscendenceBtnController(this.game)
          : new this.controllers.ReligionBtnController(this.game);
    return this.purchaseWithController(
      controller,
      { key: id, id },
      metadata.label,
      `购买${metadata.label}`
    );
  }

  launchSpaceProgram(id: string): ActionResult {
    const metadata = this.game.space.getProgram(id);
    if (!metadata) {
      this.lastMessage = "未找到太空项目";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (metadata.val > 0) {
      this.lastMessage = `${metadata.label} 已经完成或正在执行`;
      this.refreshSnapshot();
      return { ok: false, reason: "already-owned" };
    }

    return this.purchaseWithController(
      new this.controllers.SpaceProgramBtnController(this.game),
      { key: id, id },
      metadata.label,
      `启动${metadata.label}`
    );
  }

  buySpaceBuilding(id: string): ActionResult {
    const metadata = this.game.space.getBuilding(id);
    if (!metadata) {
      this.lastMessage = "未找到太空建筑";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    return this.purchaseWithController(
      new this.classes.ui.space.PlanetBuildingBtnController(this.game),
      { key: id, id },
      metadata.label,
      `建造${metadata.label}`
    );
  }

  toggleTimeAcceleration(): ActionResult {
    const controller = new this.classes.ui.time.AccelerateTimeBtnController(
      this.game
    );
    const model = controller.fetchModel({
      key: "accelerateTime",
      id: "accelerateTime",
      name: "时间加速",
      description: "加速或恢复正常时间流速",
    });
    const outcome = controller.buyItem(model);
    if (!outcome.itemBought) {
      this.lastMessage = "无法切换时间加速";
      this.refreshSnapshot();
      return {
        ok: false,
        reason: this.mapPurchaseReason(outcome.reason),
      };
    }

    this.lastMessage = this.game.time.isAccelerated
      ? "时间加速已开启"
      : "时间加速已关闭";
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  shatterTime(amount = 1): ActionResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: "blocked" };
    }

    const shatterAmount = Math.floor(amount);
    const controller = new this.classes.ui.time.ShatterTCBtnController(
      this.game
    );
    const model = controller.fetchModel({
      key: "shatterTimeCrystal",
      id: "shatterTimeCrystal",
      name: "碎裂时间水晶",
      description: "跳跃一个年份并积累时间热量",
      prices: [{ name: "timeCrystal", val: 1 }],
    });
    const prices = controller.getPricesMultiple(model, shatterAmount);
    if (
      !model.visible ||
      (prices.timeCrystal ?? 0) > this.game.resPool.get("timeCrystal").value ||
      (prices.void ?? 0) > this.game.resPool.get("void").value
    ) {
      this.lastMessage = model.visible
        ? "没有足够的时间水晶或虚空"
        : "碎裂时间水晶尚未解锁";
      this.refreshSnapshot();
      return {
        ok: false,
        reason: model.visible ? "cannot-afford" : "locked",
      };
    }

    const timeCrystalBefore = this.game.resPool.get("timeCrystal").value;
    const heatBefore = this.game.time.heat;
    const furnaceHeatBefore = this.game.time.getCFU("blastFurnace").heat ?? 0;
    const calendarBefore = this.game.calendar.day;
    controller.doShatterAmt(model, shatterAmount);
    const changed =
      this.game.resPool.get("timeCrystal").value < timeCrystalBefore &&
      (this.game.time.heat > heatBefore ||
        (this.game.time.getCFU("blastFurnace").heat ?? 0) > furnaceHeatBefore ||
        this.game.calendar.day !== calendarBefore);
    if (!changed) {
      this.lastMessage = "时间水晶未能碎裂";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    this.lastMessage = `碎裂了 ${shatterAmount} 个时间水晶`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  useChronoforgeHeat(amount = 1): ActionResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: "blocked" };
    }

    const shatterAmount = Math.floor(amount);
    const controller = new this.classes.ui.time.UseHeatBtnController(this.game);
    const model = controller.fetchModel({
      key: "useHeat",
      id: "useHeat",
      name: "使用时间热量",
      description: "消耗热机热量进行时间跳跃",
    });
    const furnace = this.game.time.getCFU("blastFurnace");
    if (!model.visible || (furnace.heat ?? 0) < shatterAmount * 100) {
      this.lastMessage = model.visible
        ? "热机中没有足够的时间热量"
        : "尚未解锁热机控制";
      this.refreshSnapshot();
      return {
        ok: false,
        reason: model.visible ? "cannot-afford" : "locked",
      };
    }

    const furnaceHeatBefore = furnace.heat ?? 0;
    const calendarBefore = this.game.calendar.day;
    controller.doShatterAmt(model, shatterAmount);
    const changed =
      (furnace.heat ?? 0) < furnaceHeatBefore ||
      this.game.calendar.day !== calendarBefore;
    if (!changed) {
      this.lastMessage = "热机未能完成时间跳跃";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    this.lastMessage = `使用热机跳跃了 ${shatterAmount} 次`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  buyTimeUpgrade(id: string, kind: TimeUpgradeKind): ActionResult {
    const metadata =
      kind === "chronoforge"
        ? this.game.time.getCFU(id)
        : this.game.time.getVSU(id);
    if (!metadata) {
      this.lastMessage = "未找到时间升级";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    const controller =
      kind === "chronoforge"
        ? new this.classes.ui.time.ChronoforgeBtnController(this.game)
        : new this.classes.ui.time.VoidSpaceBtnController(this.game);
    return this.purchaseWithController(
      controller,
      { key: id, id },
      metadata.label,
      `购买${metadata.label}`
    );
  }

  toggleChallenge(id: string): ActionResult {
    const metadata = this.game.challenges.getChallenge(id);
    if (!metadata) {
      this.lastMessage = "未找到挑战";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!metadata.unlocked) {
      this.lastMessage = "该挑战尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    const controller = new this.classes.ui.ChallengeBtnController(this.game);
    const model = controller.fetchModel({ key: id, id });
    const outcome = controller.buyItem(model);
    if (!outcome.itemBought) {
      this.lastMessage = "无法切换挑战";
      this.refreshSnapshot();
      return {
        ok: false,
        reason: this.mapPurchaseReason(outcome.reason),
      };
    }

    this.lastMessage = metadata.pending
      ? `${metadata.label} 已加入待开始列表`
      : `${metadata.label} 已从待开始列表移除`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  applyPendingChallenges(): ActionResult {
    const pendingCount = this.game.challenges.getCountPending();
    if (pendingCount <= 0) {
      this.lastMessage = "没有待开始的挑战";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    this.game.challenges.applyPending();
    this.lastMessage = this.pendingConfirmation
      ? `等待确认开始 ${pendingCount} 个挑战`
      : "挑战已开始";
    this.refreshGameState();
    return {
      ok: !this.pendingConfirmation,
      reason: this.pendingConfirmation ? "requires-confirmation" : "ok",
      changed: !this.pendingConfirmation,
    };
  }

  setSetting(id: string, value: boolean): ActionResult {
    const setting = this.game.settings.settingsArr.find(
      (entry) => entry.name === id && SETTING_IDS.has(entry.name)
    );
    if (!setting) {
      this.lastMessage = "该设置不可用";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    this.game.settings.set(setting, value);
    this.game.ui.updateOptions();
    this.lastMessage = `游戏设置已更新：${plainText(
      setting.mobileTitle ?? setting.label ?? setting.name
    )}`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  resolvePendingConfirmation(accept: boolean): ActionResult {
    const pending = this.pendingConfirmation;
    if (!pending) {
      return { ok: false, reason: "unknown" };
    }

    this.pendingConfirmation = null;
    try {
      if (accept) {
        pending.onConfirm?.();
        this.lastMessage = pending.title || "操作已确认";
      } else {
        pending.onCancel?.();
        this.lastMessage = "操作已取消";
      }
    } catch (error) {
      console.error("Unable to resolve Kittens Game confirmation", error);
      this.lastMessage = "确认操作执行失败";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    this.refreshGameState();
    return {
      ok: true,
      reason: "ok",
      changed: accept,
    };
  }

  buyBuilding(id: string, amount = 1): ActionResult {
    const accessor = this.game.bld.getBuildingExt(id);
    if (!accessor) {
      this.lastMessage = "未找到建筑";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }

    const controller = new this.classes.ui.btn.BuildingBtnModernController(
      this.game
    );
    const model = controller.fetchModel({ key: id, building: id });
    if (!model.visible) {
      this.lastMessage = "建筑尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }
    if (!model.enabled) {
      this.lastMessage = "资源不足或尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "not-enabled" };
    }

    const meta = accessor.getMeta();
    const controllerWithBuild = controller as unknown as {
      build: (buildingModel: LegacyBuildingModel, count: number) => void;
    };
    const builtBefore = meta.val;
    controllerWithBuild.build(model, amount);
    const built = meta.val - builtBefore;
    this.game.updateCaches();
    this.game.updateResources();
    this.lastMessage =
      built > 0 ? `建造了 ${meta.label}` : "资源不足或尚未解锁";
    this.refreshSnapshot();
    return built > 0
      ? { ok: true, reason: "ok" }
      : { ok: false, reason: "cannot-afford" };
  }

  save(): ActionResult {
    if (
      this.saveHealth === "corrupt" ||
      this.saveHealth === "unavailable" ||
      this.runtimeError
    ) {
      this.lastMessage =
        this.saveHealth === "corrupt"
          ? "当前存档损坏，保存已阻止"
          : this.runtimeError
            ? "模拟运行异常，保存已阻止"
            : "浏览器存储不可用，无法保存";
      this.refreshSnapshot();
      return {
        ok: false,
        reason:
          this.saveHealth === "corrupt"
            ? "invalid-save"
            : this.runtimeError
              ? "blocked"
              : "storage-unavailable",
      };
    }

    try {
      this.game.save();
    } catch (cause) {
      console.error("Unable to save Kittens Game", cause);
      this.saveHealth = "unavailable";
      this.lastMessage = "保存失败，浏览器存储不可用";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    const stored = readStorage(SAVE_KEY);
    if (this.lastPersistFailed || !stored.ok || !stored.value) {
      this.saveHealth = "unavailable";
      this.lastMessage = "保存失败，浏览器存储不可用";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    this.saveHealth = "healthy";
    this.sourceSaveVersion = this.game.saveVersion;
    this.saveMigrated = false;
    this.lastMessage = "游戏已保存";
    this.refreshSnapshot();
    return { ok: true, reason: "ok", changed: true };
  }

  exportSave(): SaveExportResult {
    if (this.saveHealth === "corrupt" || this.runtimeError) {
      const stored = readStorage(SAVE_KEY);
      if (!stored.ok || !stored.value) {
        this.lastMessage = "无法读取损坏的本地存档";
        this.refreshSnapshot();
        return { ok: false, reason: "storage-unavailable" };
      }
      this.lastMessage = this.runtimeError
        ? "已导出上次成功保存的原始存档"
        : "已导出损坏的原始存档，请联系开发者或重新导入备份";
      this.refreshSnapshot();
      return {
        ok: true,
        reason: "ok",
        data: stored.value,
        sourceVersion: this.sourceSaveVersion,
      };
    }

    try {
      const data = this.game.save();
      const encoded = this.game.compressLZData(JSON.stringify(data), false);
      this.lastMessage = this.lastPersistFailed
        ? "存档文本已生成，但本地保存失败"
        : "存档文本已生成";
      this.refreshSnapshot();
      return {
        ok: true,
        reason: "ok",
        data: encoded,
        sourceVersion: this.game.saveVersion,
      };
    } catch (cause) {
      console.error("Unable to export Kittens Game save", cause);
      this.lastMessage = "无法生成存档导出文本";
      this.refreshSnapshot();
      return { ok: false, reason: "invalid-save" };
    }
  }

  importSave(raw: string): SaveImportResult {
    if (this.saveHealth === "unavailable") {
      this.lastMessage = "浏览器存储不可用，无法导入存档";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }
    let prepared: PreparedSave;
    try {
      prepared = this.prepareSaveText(raw);
    } catch {
      this.lastMessage = "存档文本无效或无法解压";
      this.refreshSnapshot();
      return { ok: false, reason: "invalid-save" };
    }
    return this.confirmImport(prepared, "导入存档");
  }

  createBackup(): ActionResult {
    if (this.saveHealth === "corrupt" || this.runtimeError) {
      this.lastMessage = this.runtimeError
        ? "模拟运行异常，不能覆盖现有恢复点"
        : "损坏存档不能覆盖现有恢复点";
      this.refreshSnapshot();
      return { ok: false, reason: "invalid-save" };
    }

    try {
      this.game.save();
    } catch (cause) {
      console.error("Unable to save before creating backup", cause);
      this.lastMessage = "建立恢复点前无法保存游戏";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    const current = readStorage(SAVE_KEY);
    if (
      this.lastPersistFailed ||
      !current.ok ||
      !current.value ||
      !this.backupRawSave(current.value)
    ) {
      this.saveHealth = current.ok ? this.saveHealth : "unavailable";
      this.lastMessage = "无法建立恢复点";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }

    this.saveHealth = "healthy";
    this.sourceSaveVersion = this.game.saveVersion;
    this.saveMigrated = false;
    this.updateSaveMetadata({ lastSavedAt: Date.now() });
    this.lastMessage = "恢复点已建立";
    this.refreshSnapshot();
    return { ok: true, reason: "ok", changed: true };
  }

  restoreBackup(): SaveImportResult {
    const backup = readStorage(SAVE_BACKUP_KEY);
    if (!backup.ok || !backup.value) {
      this.lastMessage = "还没有可恢复的备份";
      this.refreshSnapshot();
      return {
        ok: false,
        reason: backup.ok ? "blocked" : "storage-unavailable",
      };
    }

    let prepared: PreparedSave;
    try {
      prepared = this.prepareSaveText(backup.value);
    } catch {
      this.lastMessage = "备份存档无法解析";
      this.refreshSnapshot();
      return { ok: false, reason: "invalid-save" };
    }
    return this.confirmImport(prepared, "恢复备份");
  }

  resetGame(): ActionResult {
    if (this.saveHealth === "unavailable") {
      this.lastMessage = "浏览器存储不可用，无法重置存档";
      this.refreshSnapshot();
      return { ok: false, reason: "storage-unavailable" };
    }
    this.game.ui.confirm(
      "重置存档",
      "这会清除当前游戏。可读取的当前进度会先建立恢复点，重置后可继续导入或恢复备份。确认重置？",
      () => this.applyReset()
    );
    this.lastMessage = "等待确认重置存档";
    this.refreshSnapshot();
    return { ok: false, reason: "requires-confirmation" };
  }

  resetTimeline(): ActionResult {
    if (
      this.saveHealth === "unavailable" ||
      this.saveHealth === "corrupt" ||
      this.runtimeError
    ) {
      this.lastMessage =
        this.saveHealth === "corrupt"
          ? "当前存档损坏，无法计算重置收益"
          : this.runtimeError
            ? "模拟运行异常，无法重置时间线"
            : "浏览器存储不可用，无法重置时间线";
      this.refreshSnapshot();
      return {
        ok: false,
        reason:
          this.saveHealth === "corrupt"
            ? "invalid-save"
            : this.runtimeError
              ? "blocked"
              : "storage-unavailable",
      };
    }

    const preview = this.mapPrestige().reset;
    this.game.ui.confirm(
      "重置时间线",
      `当前时间线将结束并重新开始。将获得 ${preview.karmaPoints} 点业力与 ${preview.paragonPoints} 点领导力。统计、成就和已继承的升级会保留。确认开始新一轮？`,
      () => this.applyTimelineReset()
    );
    this.lastMessage = "等待确认重置时间线";
    this.refreshSnapshot();
    return { ok: false, reason: "requires-confirmation" };
  }

  private applyTimelineReset(): void {
    const previousSave = readStorage(SAVE_KEY);
    const previousBackup = readStorage(SAVE_BACKUP_KEY);
    const previousHealth = this.saveHealth;
    const previousSourceVersion = this.sourceSaveVersion;
    const previousMigrated = this.saveMigrated;
    const previousRuntimeError = this.runtimeError;

    try {
      this.game.save();
      const current = readStorage(SAVE_KEY);
      if (
        this.lastPersistFailed ||
        !current.ok ||
        !current.value ||
        !this.backupRawSave(current.value)
      ) {
        throw new Error("Unable to create reset recovery point");
      }

      const game = this.game;
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

      game._resetInternal();
      const resetSave = readStorage(SAVE_KEY);
      if (!resetSave.ok || !resetSave.value) {
        throw new Error("Unable to persist reset timeline save");
      }
      const loaded = game.load();
      if (!loaded || game.currentSaveIsBroken) {
        throw new Error("Unable to load reset timeline save");
      }

      game.isPaused = false;
      game.updateCaches();
      game.updateWinterCatnip();
      game.updateResources();
      this.saveHealth = "healthy";
      this.sourceSaveVersion = game.saveVersion;
      this.saveMigrated = false;
      this.runtimeError = null;
      this.lastPersistFailed = false;
      this.updateSaveMetadata({ lastSavedAt: Date.now() });
      this.lastMessage = "新一轮已经开始，继承状态已载入";
    } catch (cause) {
      console.error("Unable to reset Kittens Game timeline", cause);
      if (previousSave.ok && previousSave.value) {
        writeStorage(SAVE_KEY, previousSave.value);
      } else {
        removeStorage(SAVE_KEY);
      }
      if (previousBackup.ok && previousBackup.value) {
        writeStorage(SAVE_BACKUP_KEY, previousBackup.value);
      } else {
        removeStorage(SAVE_BACKUP_KEY);
      }
      const restored =
        previousSave.ok && previousSave.value ? this.game.load() : false;
      this.saveHealth =
        previousHealth === "new"
          ? "new"
          : restored && !this.game.currentSaveIsBroken
            ? previousHealth
            : "corrupt";
      this.sourceSaveVersion = previousSourceVersion;
      this.saveMigrated = previousMigrated;
      this.runtimeError = previousRuntimeError;
      this.game.isPaused = true;
      this.lastMessage = "重置时间线失败，已恢复重置前状态";
      throw cause;
    }
  }

  setPaused(paused: boolean): void {
    this.game.isPaused =
      this.saveHealth === "corrupt" || this.runtimeError ? true : paused;
    this.refreshSnapshot();
  }

  private changeJob(id: string, amount: number, assign: boolean): ActionResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: "blocked" };
    }

    const controller = new this.controllers.JobButtonController(this.game);
    const job = this.game.village.getJob(id);
    if (!job) {
      this.lastMessage = "未找到职业";
      this.refreshSnapshot();
      return { ok: false, reason: "unknown" };
    }
    if (!job.unlocked) {
      this.lastMessage = `${job.title} 尚未解锁`;
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }

    // The legacy fetchModel adds UI-only link models and contains a callback
    // that assumes a browser-global game instance. Job mutations only need the
    // resolved job metadata, so keep the upstream mutation path without
    // invoking that DOM-specific factory.
    const model = { job } as JobButtonModel;
    const before = job.value;
    if (assign) {
      controller.assignJobs(model, amount);
    } else {
      controller.unassignJobs(model, amount);
    }

    const changed = job.value !== before;
    if (!changed) {
      this.lastMessage = assign
        ? "没有空闲猫或该职业已达上限"
        : "该职业没有在岗猫";
      this.refreshSnapshot();
      return { ok: false, reason: "blocked" };
    }

    this.lastMessage = assign
      ? `${job.title} +${job.value - before}`
      : `${job.title} ${job.value - before}`;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  private purchaseWithController(
    controller: PurchaseController,
    options: ControllerOptions,
    label: string,
    successMessage: string
  ): ActionResult {
    const model = controller.fetchModel(options);
    if (!model.visible) {
      this.lastMessage = `${label} 尚未解锁`;
      this.refreshSnapshot();
      return { ok: false, reason: "locked" };
    }
    if (!model.enabled) {
      this.lastMessage = "资源不足或条件尚未满足";
      this.refreshSnapshot();
      return { ok: false, reason: "not-enabled" };
    }

    const outcome = controller.buyItem(model);
    if (!outcome.itemBought) {
      const reason = this.mapPurchaseReason(outcome.reason);
      this.lastMessage =
        reason === "requires-confirmation"
          ? `等待确认：${label}`
          : `${label} 当前无法完成`;
      this.refreshSnapshot();
      return { ok: false, reason };
    }

    this.lastMessage = successMessage;
    this.refreshGameState();
    return { ok: true, reason: "ok", changed: true };
  }

  private getReligionUpgrade(
    id: string,
    kind: ReligionUpgradeKind
  ): LegacyReligionUpgrade | undefined {
    if (kind === "ziggurat") return this.game.religion.getZU(id);
    if (kind === "transcendence") return this.game.religion.getTU(id);
    return this.game.religion.getRU(id);
  }

  private mapPurchaseReason(reason: string): ActionResult["reason"] {
    switch (reason) {
      case "paid-for":
      case "ok":
      case "item-is-free":
        return "ok";
      case "cannot-afford":
        return "cannot-afford";
      case "require-confirmation":
      case "requires-confirmation":
        return "requires-confirmation";
      case "already-bought":
        return "already-owned";
      case "not-unlocked":
        return "locked";
      case "not-enabled":
        return "not-enabled";
      case "blocked":
      case "player-denied":
      case "read-only":
        return "blocked";
      default:
        return "unknown";
    }
  }

  private refreshGameState(): void {
    this.game.updateCaches();
    this.game.updateWinterCatnip();
    this.refreshSnapshot();
  }

  private refreshSnapshot(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): GameSnapshot {
    const resources = this.game.resPool.resources.map((resource) =>
      this.mapResource(resource)
    );
    const buildings = this.mapBuildings();
    const season = this.game.calendar.getCurSeason();

    return {
      version: "1.6.1.6",
      ticks: this.game.ticks,
      paused: this.game.isPaused,
      resources,
      buildings,
      village: this.mapVillage(),
      science: this.mapScience(),
      workshop: this.mapWorkshop(),
      trade: this.mapTrade(),
      religion: this.mapReligion(),
      space: this.mapSpace(),
      time: this.mapTime(),
      prestige: this.mapPrestige(),
      challenges: this.mapChallenges(),
      progress: this.mapProgress(),
      settings: this.mapSettings(),
      calendar: {
        day: this.game.calendar.day,
        year: this.game.calendar.year,
        season: season.name,
        seasonLabel: SEASON_LABELS[season.name] ?? season.name,
      },
      saveStatus: this.mapSaveStatus(),
      runtimeError: this.runtimeError,
      pendingConfirmation: this.pendingConfirmation
        ? {
            id: this.pendingConfirmation.id,
            title: this.pendingConfirmation.title,
            message: this.pendingConfirmation.message,
          }
        : null,
      lastMessage: this.lastMessage,
    };
  }

  private mapResource(resource: LegacyResource): ResourceSnapshot {
    const perTick = this.game.getResourcePerTick(resource.name) || 0;
    return {
      id: resource.name,
      label: resource.title,
      value: resource.value,
      maxValue: resource.maxValue,
      perTick,
      visible: resource.visible,
      unlocked: resource.unlocked,
      capped:
        Number.isFinite(resource.maxValue) &&
        resource.maxValue > 0 &&
        resource.value >= resource.maxValue,
    };
  }

  private mapBuildings(): BuildingSnapshot[] {
    const groups = this.game.bld.getBuildingGroups(false);
    const leaves = this.game.bld.unrollBuildingGroups(groups);
    const groupByBuilding = new Map<string, { name: string; title: string }>();
    for (const group of groups) {
      for (const id of group.buildings) {
        groupByBuilding.set(id, {
          name: group.name,
          title: group.title,
        });
      }
    }

    const controller = new this.classes.ui.btn.BuildingBtnModernController(
      this.game
    );

    return leaves.flatMap((name) => {
      const accessor = this.game.bld.getBuildingExt(name);
      if (!accessor) return [];

      const model = controller.fetchModel({ key: name, building: name });
      const meta = accessor.getMeta();
      if (!model.visible) return [];
      const group = groupByBuilding.get(name);
      const prices = (model.prices ?? []).map((price) => {
        const resource = this.game.resPool.get(price.name);
        return {
          id: price.name,
          label: resource.title,
          value: price.val,
          affordable: resource.value >= price.val,
        };
      });

      return [
        {
          id: name,
          label: meta.label,
          description: plainText(meta.description),
          group: group?.name ?? "buildings",
          groupLabel: group?.title ?? "建筑",
          value: meta.val,
          enabled: meta.on,
          unlocked: meta.unlocked,
          canBuy: model.enabled,
          prices,
        },
      ];
    });
  }

  private mapVillage(): VillageSnapshot {
    const village = this.game.village;
    const freeKittens = village.getFreeKittens();
    const jobs = village.jobs
      .filter((job) => job.unlocked)
      .map((job): JobSnapshot => {
        job.calculateEffects?.(job, this.game);
        const limit = village.getJobLimit(job.name);
        return {
          id: job.name,
          label: job.title,
          description: plainText(job.description),
          value: job.value,
          limit,
          unlocked: job.unlocked,
          canAssign: freeKittens > 0 && job.value < limit,
          canUnassign: job.value > 0,
          effects: Object.entries(job.modifiers ?? {}).map(([id, value]) =>
            this.mapEffect(id, value)
          ),
        };
      });
    const leader = village.leader;
    const leaderName = leader
      ? [leader.name, leader.surname].filter(Boolean).join(" ")
      : null;

    return {
      kittens: village.getKittens(),
      freeKittens,
      maxKittens: village.sim.maxKittens,
      happiness: village.happiness,
      leaderName: leaderName || null,
      jobs,
    };
  }

  private mapScience(): ScienceSnapshot {
    const techController = new this.controllers.TechButtonController(this.game);
    const policyController = new this.classes.ui.PolicyBtnController(this.game);
    const mapItem = (
      item: LegacyTech,
      kind: "tech" | "policy"
    ): ResearchItemSnapshot => {
      const controller = kind === "policy" ? policyController : techController;
      const model = controller.fetchModel({ key: item.name, id: item.name });
      return {
        id: item.name,
        kind,
        label: item.label,
        description: plainText(item.description ?? ""),
        effectDescription: plainText(item.effectDesc ?? ""),
        flavor: plainText(item.flavor ?? ""),
        researched: item.researched,
        unlocked: item.unlocked,
        blocked: Boolean(item.blocked),
        canResearch:
          model.visible && model.enabled && !item.researched && !item.blocked,
        prices: this.mapPrices(model.prices),
      };
    };
    const techs = this.game.science.techs
      .filter((item) => item.unlocked)
      .map((item) => mapItem(item, "tech"));
    const policies = this.game.science.policies
      .filter((item) => item.unlocked)
      .map((item) => mapItem(item, "policy"));

    return {
      unlocked: techs.length > 0 || policies.length > 0,
      researchedCount:
        techs.filter((item) => item.researched).length +
        policies.filter((item) => item.researched).length,
      availableCount: [...techs, ...policies].filter((item) => item.canResearch)
        .length,
      techs,
      policies,
    };
  }

  private mapWorkshop(): WorkshopSnapshot {
    const workshop = this.game.workshop;
    const craftController = new this.controllers.CraftButtonController(
      this.game
    );
    const crafts = workshop.crafts
      .filter((craft) => craft.unlocked)
      .map((craft): CraftSnapshot => {
        const prices = workshop.getCraftPrice(craft);
        const model = craftController.fetchModel({
          key: craft.name,
          id: craft.name,
          craft: craft.name,
          name: craft.label,
          description: craft.description,
          prices,
        });
        const maxCraftable = workshop.getCraftAllCount(craft.name);
        return {
          id: craft.name,
          label: craft.label,
          description: plainText(craft.description),
          value: craft.value,
          progress: craft.progress,
          unlocked: craft.unlocked,
          canCraft: model.visible && model.enabled,
          canCraftAll: maxCraftable > 0,
          maxCraftable,
          craftRatio: this.game.getResCraftRatio(craft.name),
          prices: this.mapPrices(prices),
        };
      });

    const upgradeController = new this.controllers.UpgradeButtonController(
      this.game
    );
    const upgrades = workshop.upgrades
      .filter((upgrade) => upgrade.unlocked)
      .map((upgrade): UpgradeSnapshot => {
        const model = upgradeController.fetchModel({
          key: upgrade.name,
          id: upgrade.name,
        });
        return {
          id: upgrade.name,
          label: upgrade.label,
          description: plainText(upgrade.description),
          researched: upgrade.researched,
          unlocked: upgrade.unlocked,
          canBuy: model.visible && model.enabled && !upgrade.researched,
          prices: this.mapPrices(model.prices),
        };
      });

    return {
      unlocked: crafts.length > 0 || upgrades.length > 0,
      craftRatio: this.game.getCraftRatio(),
      crafts,
      upgrades,
    };
  }

  private mapTrade(): TradeSnapshot {
    const diplomacy = this.game.diplomacy;
    const tradeVolume = diplomacy.getTradeVolume();
    const embassyController =
      new this.classes.diplomacy.ui.EmbassyButtonController(this.game);
    const races = diplomacy.races
      .filter((race) => race.unlocked)
      .map((race): TradeRaceSnapshot => {
        const embassyModel = embassyController.fetchModel({
          key: race.name,
          id: race.name,
          race,
          prices: race.embassyPrices,
        });
        const mapOffer = (
          offer: LegacyTradePrice | LegacyTradeOffer,
          kind: "buy" | "sell"
        ): TradeOfferSnapshot => {
          const resource = this.game.resPool.get(offer.name);
          const chance =
            kind === "buy"
              ? 1
              : this.game.diplomacy.getResourceTradeChance(
                  offer as LegacyTradeOffer,
                  race
                );
          const baseAmount =
            "val" in offer
              ? offer.val
              : ((offer as LegacyTradeOffer).value ?? 0);
          return {
            id: offer.name,
            label: resource?.title ?? offer.name,
            amount: baseAmount * tradeVolume,
            chance,
            minEmbassyLevel: (offer as LegacyTradeOffer).minLevel ?? 0,
            available:
              kind === "buy" ||
              diplomacy.isValidTrade(offer as LegacyTradeOffer, race),
          };
        };

        return {
          id: race.name,
          label: race.title,
          standing: diplomacy.getFinalStanding(race),
          unlocked: race.unlocked,
          buys: race.buys.map((offer) => mapOffer(offer, "buy")),
          sells: race.sells.map((offer) => mapOffer(offer, "sell")),
          maxTradeAmount: Math.max(
            0,
            Math.floor(diplomacy.getMaxTradeAmt(race) || 0)
          ),
          canTrade: diplomacy.getMaxTradeAmt(race) > 0,
          blueprintChance: diplomacy.getBlueprintTradeChance(race),
          spiceChance: diplomacy.getSpiceTradeChance(race),
          embassy: {
            level: race.embassyLevel,
            canBuy: embassyModel.visible && embassyModel.enabled,
            prices: this.mapPrices(embassyModel.prices),
          },
        };
      });

    return {
      unlocked: races.length > 0,
      tradeVolume,
      goldCost: diplomacy.getGoldCost(),
      manpowerCost: diplomacy.getManpowerCost(),
      races,
    };
  }

  private mapReligion(): ReligionSnapshot {
    const religion = this.game.religion;
    const faith = this.game.resPool.get("faith");
    const controllers = {
      ziggurat: new this.controllers.ZigguratBtnController(this.game),
      religion: new this.controllers.ReligionBtnController(this.game),
      transcendence: new this.classes.ui.TranscendenceBtnController(this.game),
    };
    const mapUpgrades = (
      items: LegacyReligionUpgrade[],
      kind: ReligionUpgradeKind
    ): ReligionUpgradeSnapshot[] => {
      const controller = controllers[kind];
      return items.flatMap((item) => {
        const model = controller.fetchModel({ key: item.name, id: item.name });
        if (!model.visible) return [];
        return [
          {
            id: item.name,
            kind,
            label: item.label,
            description: plainText(item.description ?? ""),
            value: item.val,
            enabled: item.on,
            unlocked: item.unlocked ?? true,
            canBuy: model.enabled,
            prices: this.mapPrices(model.prices),
          },
        ];
      });
    };
    const upgrades = [
      ...mapUpgrades(religion.zigguratUpgrades, "ziggurat"),
      ...mapUpgrades(religion.religionUpgrades, "religion"),
      ...mapUpgrades(religion.transcendenceUpgrades, "transcendence"),
    ];
    const nextTranscendenceCost = religion._getTranscendNextPrice();
    const unicornSacrifices = religion.getAvailableUnicornSacrifices();

    return {
      unlocked:
        Boolean(faith?.unlocked) ||
        religion.faith > 0 ||
        religion.faithRatio > 0 ||
        upgrades.length > 0,
      faith: faith?.value ?? 0,
      worship: religion.faith,
      faithRatio: religion.faithRatio,
      apocryphaBonus: religion.getApocryphaBonus(),
      transcendenceTier: religion.transcendenceTier,
      nextTranscendenceCost,
      corruption: religion.corruption,
      unicornSacrifices,
      canPraise: (faith?.value ?? 0) > 0,
      canResetFaith: religion.getRU("apocripha").on > 0,
      canTranscend:
        religion.getRU("transcendence").on > 0 &&
        Number.isFinite(nextTranscendenceCost) &&
        religion.faithRatio > nextTranscendenceCost,
      canSacrifice: unicornSacrifices > 0,
      upgrades,
    };
  }

  private mapSpace(): SpaceSnapshot {
    const space = this.game.space;
    const programController = new this.controllers.SpaceProgramBtnController(
      this.game
    );
    const buildingController =
      new this.classes.ui.space.PlanetBuildingBtnController(this.game);
    const programs = space.programs.flatMap(
      (program): SpaceProgramSnapshot[] => {
        const model = programController.fetchModel({
          key: program.name,
          id: program.name,
        });
        if (!model.visible) return [];
        return [
          {
            id: program.name,
            label: program.label,
            description: plainText(program.description ?? ""),
            value: program.val,
            enabled: program.on,
            unlocked: program.unlocked,
            canLaunch: model.visible && model.enabled && program.val === 0,
            prices: this.mapPrices(model.prices),
          },
        ];
      }
    );
    const planets = space.planets
      .filter((planet) => planet.unlocked || planet.reached)
      .map((planet) => {
        const buildings = (planet.buildings ?? []).flatMap(
          (building): SpaceBuildingSnapshot[] => {
            const model = buildingController.fetchModel({
              key: building.name,
              id: building.name,
            });
            if (!model.visible) return [];
            return [
              {
                id: building.name,
                label: building.label,
                description: plainText(building.description ?? ""),
                value: building.val,
                enabled: building.on,
                unlocked: building.unlocked,
                canBuy: model.enabled,
                prices: this.mapPrices(model.prices),
              },
            ];
          }
        );
        return {
          id: planet.name,
          label: planet.label,
          unlocked: planet.unlocked,
          reached: planet.reached,
          routeDays: planet.routeDays,
          buildings,
        };
      });

    return {
      unlocked: programs.length > 0 || planets.length > 0,
      programs,
      planets,
    };
  }

  private mapTime(): TimeSnapshot {
    const time = this.game.time;
    const timeCrystal = this.game.resPool.get("timeCrystal");
    const temporalFlux = this.game.resPool.get("temporalFlux");
    const shatterController = new this.classes.ui.time.ShatterTCBtnController(
      this.game
    );
    const shatterModel = shatterController.fetchModel({
      key: "shatterTimeCrystal",
      id: "shatterTimeCrystal",
      name: "碎裂时间水晶",
      description: "跳跃一个年份并积累时间热量",
      prices: [{ name: "timeCrystal", val: 1 }],
    });
    const shatterCost = shatterController.getPricesMultiple(shatterModel, 1);
    const heatController = new this.classes.ui.time.UseHeatBtnController(
      this.game
    );
    const heatModel = heatController.fetchModel({
      key: "useHeat",
      id: "useHeat",
      name: "使用时间热量",
      description: "消耗热机热量进行时间跳跃",
      prices: [],
    });
    const furnace = time.getCFU("blastFurnace");
    const mapUpgrades = (
      items: LegacyTimeUpgrade[],
      kind: TimeUpgradeKind
    ): TimeUpgradeSnapshot[] => {
      const controller =
        kind === "chronoforge"
          ? new this.classes.ui.time.ChronoforgeBtnController(this.game)
          : new this.classes.ui.time.VoidSpaceBtnController(this.game);
      return items.flatMap((item) => {
        const model = controller.fetchModel({ key: item.name, id: item.name });
        if (!model.visible) return [];
        return [
          {
            id: item.name,
            kind,
            label: item.label,
            description: plainText(item.description ?? ""),
            value: item.val,
            enabled: item.on,
            unlocked: item.unlocked ?? true,
            canBuy: model.enabled,
            prices: this.mapPrices(model.prices),
          },
        ];
      });
    };
    const upgrades = [
      ...mapUpgrades(time.chronoforgeUpgrades, "chronoforge"),
      ...mapUpgrades(time.voidspaceUpgrades, "voidspace"),
    ];
    const canShatter =
      shatterModel.visible &&
      shatterModel.enabled &&
      (shatterCost.timeCrystal ?? 0) <= timeCrystal.value &&
      (shatterCost.void ?? 0) <= this.game.resPool.get("void").value;

    return {
      unlocked:
        Boolean(timeCrystal.unlocked) ||
        Boolean(temporalFlux.unlocked) ||
        time.isAccelerated ||
        upgrades.length > 0,
      temporalFlux: temporalFlux.value,
      temporalFluxMax: temporalFlux.maxValue,
      heat: time.heat,
      heatMax: this.game.getEffect("heatMax"),
      furnaceHeat: furnace.heat ?? 0,
      isAccelerated: time.isAccelerated,
      canAccelerate: temporalFlux.value > 0 || time.isAccelerated,
      canShatter,
      canUseHeat:
        heatModel.visible && heatModel.enabled && (furnace.heat ?? 0) >= 100,
      shatterPrices: Object.entries(shatterCost)
        .filter(([, value]) => value > 0)
        .map(([id, value]) => {
          const resource = this.game.resPool.get(id);
          return {
            id,
            label: resource?.title ?? id,
            value,
            affordable: Boolean(resource && resource.value >= value),
          };
        }),
      upgrades,
    };
  }

  private mapPrestige(): PrestigeSnapshot {
    const reset = this.game.getResetPrestige();
    const karmaPoints =
      this.game.getUnlimitedDR(reset.karmaKittens, 5) -
      this.game.getUnlimitedDR(this.game.karmaKittens, 5);
    const bonus = this.game.prestige.getResetBonusBreakdown(
      reset.paragonPoints,
      karmaPoints
    );
    const kittens = Math.round(
      this.game.resPool.get("kittens").value *
        (1 + this.game.getEffect("simScalingRatio"))
    );

    return {
      paragon: this.game.resPool.get("paragon").value,
      burnedParagon: this.game.resPool.get("burnedParagon").value,
      karma: this.game.resPool.get("karma").value,
      karmaKittens: this.game.karmaKittens,
      karmaZebras: this.game.karmaZebras,
      ironWill: this.game.ironWill,
      reset: {
        kittens,
        karmaKittens: reset.karmaKittens,
        paragonPoints: reset.paragonPoints,
        karmaPoints: Math.floor(karmaPoints * 100) / 100,
        happinessBonus: bonus.happiness,
        storageBonus: bonus.storage,
        productionBonus: bonus.production,
        zebraKittens: this.game.ironWill ? this.game._getBonusZebras() : 0,
        canReset:
          this.saveHealth !== "unavailable" &&
          this.saveHealth !== "corrupt" &&
          !this.runtimeError,
      },
    };
  }

  private mapChallenges(): ChallengesSnapshot {
    const manager = this.game.challenges;
    const controller = new this.classes.ui.ChallengeBtnController(this.game);
    const challenges = manager.challenges
      .filter((challenge) => challenge.unlocked)
      .map((challenge): ChallengeSnapshot => {
        const model = controller.fetchModel({
          key: challenge.name,
          id: challenge.name,
        });
        return {
          id: challenge.name,
          label: challenge.label,
          description: plainText(challenge.description ?? ""),
          effectDescription: plainText(challenge.effectDesc ?? ""),
          unlocked: challenge.unlocked,
          active: challenge.active,
          pending: challenge.pending,
          completions: challenge.on,
          canToggle: model.visible,
        };
      });

    return {
      unlocked: challenges.length > 0,
      activeCount: challenges.filter((challenge) => challenge.active).length,
      pendingCount: manager.getCountPending(),
      completionCount: manager.getCountCompletions(),
      canApplyPending: manager.getCountPending() > 0,
      challenges,
    };
  }

  private mapProgress(): ProgressSnapshot {
    const achievements = this.game.achievements.achievements.map(
      (achievement): AchievementSnapshot => {
        const hidden = Boolean(achievement.hidden && !achievement.unlocked);
        return {
          id: achievement.name,
          label: hidden ? "隐藏成就" : achievement.title,
          description: hidden
            ? "解锁后揭示这个成就的条件。"
            : plainText(achievement.description ?? ""),
          hidden,
          unethical: Boolean(achievement.unethical),
          unlocked: achievement.unlocked,
          starUnlocked: Boolean(achievement.starUnlocked),
          hasStar: Boolean(achievement.starCondition),
        };
      }
    );
    const visibleAchievements = achievements.filter(
      (achievement) => !achievement.hidden
    );
    const ethicalAchievements = visibleAchievements.filter(
      (achievement) => !achievement.unethical
    );
    const badges = this.game.achievements.badges.map(
      (badge): BadgeSnapshot => ({
        id: badge.name,
        label: badge.title,
        description: plainText(badge.description ?? ""),
        unlocked: badge.unlocked,
      })
    );
    const statGroups = this.game.stats.statGroups.map(
      (group, groupIndex): StatGroupSnapshot => ({
        id: `group-${groupIndex}`,
        label: group.title,
        stats: group.group.map((stat): StatSnapshot => {
          const calculated =
            typeof stat.calculate === "function"
              ? stat.calculate(this.game)
              : stat.val;
          const value =
            stat.name === "totalResets" && typeof calculated === "number"
              ? calculated + 1
              : calculated;
          return {
            id: stat.name,
            label: stat.title,
            value,
            unlocked:
              Boolean(stat.unlocked) ||
              Boolean(stat.defaultUnlocked) ||
              value !== 0,
          };
        }),
      })
    );

    return {
      achievements,
      badges,
      unlockedAchievements: ethicalAchievements.filter(
        (achievement) => achievement.unlocked
      ).length,
      totalAchievements: ethicalAchievements.length,
      unlockedStars: ethicalAchievements.filter(
        (achievement) => achievement.starUnlocked
      ).length,
      totalStars: ethicalAchievements.filter(
        (achievement) => achievement.hasStar
      ).length,
      statGroups,
    };
  }

  private mapSettings(): GameSettingSnapshot[] {
    return this.game.settings.settingsArr
      .filter((setting) => SETTING_IDS.has(setting.name))
      .map((setting) => ({
        id: setting.name,
        label: plainText(setting.label ?? setting.mobileTitle ?? setting.name),
        description: plainText(
          setting.tooltip ??
            setting.mobileDesc ??
            (setting.isExtra ? "高级游戏选项" : "游戏选项")
        ),
        value: Boolean(this.game.settings.get(setting)),
        advanced: Boolean(setting.isExtra),
      }));
  }

  private mapSaveStatus(): SaveStatusSnapshot {
    const stored = readStorage(SAVE_KEY);
    const backup = readStorage(SAVE_BACKUP_KEY);
    const metadata = this.readSaveMetadata();
    const storageAvailable = stored.ok && backup.ok;
    return {
      health: storageAvailable ? this.saveHealth : "unavailable",
      hasLocalSave: Boolean(stored.value),
      hasBackup: Boolean(backup.value),
      lastSavedAt: metadata.lastSavedAt,
      backupAt: metadata.backupAt,
      currentVersion: this.game.saveVersion,
      sourceVersion: this.sourceSaveVersion,
      migrated: this.saveMigrated,
    };
  }

  private mapPrices(prices: LegacyPrice[] | null): PriceSnapshot[] {
    return (prices ?? []).map((price) => {
      const resource = this.game.resPool.get(price.name);
      return {
        id: price.name,
        label: resource?.title ?? price.name,
        value: price.val,
        affordable: Boolean(resource && resource.value >= price.val),
      };
    });
  }

  private mapEffect(id: string, value: number): EffectSnapshot {
    const display = this.game.getEffectDisplayParams(id, value, true);
    return {
      id,
      label: display?.displayEffectName ?? EFFECT_LABELS[id] ?? id,
      value,
      valueLabel: display?.displayEffectValue ?? formatEffectValue(value),
    };
  }
}

let sharedKernel: GameKernel | null = null;

export function getGameKernel(): GameKernel {
  if (!sharedKernel) {
    sharedKernel = new GameKernel();
  }
  return sharedKernel;
}
