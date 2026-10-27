import { getEngineContext } from "./engine-loader";
import type {
  ActionResult,
  BuildingSnapshot,
  CraftSnapshot,
  EffectSnapshot,
  GameSnapshot,
  GameSettingSnapshot,
  JobSnapshot,
  PriceSnapshot,
  ResearchItemSnapshot,
  ResourceSnapshot,
  ScienceSnapshot,
  UpgradeSnapshot,
  VillageSnapshot,
  WorkshopSnapshot,
} from "./types";

const SAVE_KEY = "com.nuclearunicorn.kittengame.savedata";
const TICK_MS = 200;
const SNAPSHOT_INTERVAL_MS = 250;

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

interface ControllerModel {
  enabled: boolean;
  visible: boolean;
  prices: LegacyPrice[];
}

interface JobButtonModel extends ControllerModel {
  job: LegacyJob;
}

interface PurchaseOutcome {
  itemBought: boolean;
  reason: string;
}

interface LegacyGame {
  ticks: number;
  isPaused: boolean;
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
  update: () => void;
  tick: () => void;
  updateResources: () => void;
  updateCaches: () => void;
  updateWinterCatnip: () => void;
  getResourcePerTick: (id: string) => number;
  getResCraftRatio: (id: string) => number;
  getCraftRatio: () => number;
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
  ui: {
    UISystem: new () => object;
    PolicyBtnController: new (game: LegacyGame) => {
      fetchModel: (options: { key: string; id: string }) => ControllerModel;
      buyItem: (model: ControllerModel) => PurchaseOutcome;
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
  private lastMessage: string | null = null;
  private pendingConfirmation: PendingConfirmation | null = null;
  private nextConfirmationId = 1;

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
    if (window.localStorage.getItem(SAVE_KEY)) {
      this.game.load();
    }
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
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      this.game.tick();
    }, TICK_MS);
    this.snapshotTimer = window.setInterval(() => {
      this.refreshSnapshot();
    }, SNAPSHOT_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.snapshotTimer !== null) {
      window.clearInterval(this.snapshotTimer);
    }
    this.timer = null;
    this.snapshotTimer = null;
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
    const controller = new this.classes.ui.btn.BuildingBtnModernController(
      this.game
    );
    const model = controller.fetchModel({ key: id, building: id });
    if (!model.enabled) {
      this.lastMessage = "资源不足或尚未解锁";
      this.refreshSnapshot();
      return { ok: false, reason: "not-enabled" };
    }

    const meta = this.game.bld.getBuildingExt(id).getMeta();
    const controllerWithBuild = controller as unknown as {
      build: (buildingModel: LegacyBuildingModel, count: number) => number;
    };
    const built = controllerWithBuild.build(model, amount);
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
    this.game.save();
    this.lastMessage = "游戏已保存";
    this.refreshSnapshot();
    return { ok: true, reason: "ok" };
  }

  setPaused(paused: boolean): void {
    this.game.isPaused = paused;
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

  private mapPurchaseReason(reason: string): ActionResult["reason"] {
    switch (reason) {
      case "paid-for":
      case "ok":
        return "ok";
      case "cannot-afford":
        return "cannot-afford";
      case "require-confirmation":
        return "requires-confirmation";
      case "already-bought":
        return "already-owned";
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
      settings: this.mapSettings(),
      calendar: {
        day: this.game.calendar.day,
        year: this.game.calendar.year,
        season: season.name,
        seasonLabel: SEASON_LABELS[season.name] ?? season.name,
      },
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
      const meta = accessor.getMeta();
      if (!meta.unlocked) return [];

      const model = controller.fetchModel({ key: name, building: name });
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
