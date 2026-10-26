import { getEngineContext } from "./engine-loader";
import type {
  ActionResult,
  BuildingSnapshot,
  GameSnapshot,
  ResourceSnapshot,
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
    getBuildingGroups: (
      includeFilters: boolean
    ) => Array<{ name: string; title: string; buildings: string[] }>;
    unrollBuildingGroups: (
      groups: Array<{ name: string; title: string; buildings: string[] }>
    ) => string[];
    getBuildingExt: (
      id: string
    ) => { getMeta: () => LegacyBuildingMeta };
  };
  calendar: {
    day: number;
    year: number;
    getCurSeason: () => { name: string };
  };
  science: {
    get: (id: string) => LegacyTechMeta;
  };
  workshop: {
    craft: (
      id: string,
      amount: number,
      suppressUndo?: boolean,
      forceAll?: boolean,
      bypassResourceCheck?: boolean
    ) => boolean;
  };
  ui: { update: () => void };
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
  getDisplayValueExt: (value: number) => string;
  msg: (message: string, type?: string) => void;
  render: () => void;
}

interface LegacyTechMeta {
  name: string;
  label: string;
}

interface KernelClasses {
  ui: {
    UISystem: new () => object;
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

const SEASON_LABELS: Record<string, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

const descriptionCache = new Map<string, string>();

function plainText(html: string): string {
  const cached = descriptionCache.get(html);
  if (cached !== undefined) return cached;

  const document = new DOMParser().parseFromString(html, "text/html");
  const text = (document.body.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
  descriptionCache.set(html, text);
  return text;
}

function deepGet(root: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, root);
}

export class GameKernel {
  private readonly listeners = new Set<() => void>();
  private readonly game: LegacyGame;
  private readonly classes: KernelClasses;
  private snapshot: GameSnapshot;
  private timer: number | null = null;
  private snapshotTimer: number | null = null;
  private lastMessage: string | null = null;

  constructor(locale = "zh") {
    const engine = getEngineContext(locale);
    const classes = deepGet(engine.namespace, ["classes"]) as KernelClasses;
    if (!classes || !engine.gameClass) {
      throw new Error("Kittens Game engine failed to initialize.");
    }

    this.classes = classes;
    this.game = new engine.gameClass() as unknown as LegacyGame;
    this.game.opts.useWorkers = false;
    this.game.opts.hideSell = false;
    this.game.setUI(new this.classes.ui.UISystem());

    // Some legacy controllers call render after mutations. The new React UI owns
    // rendering, so retain only the update hook and skip the old tab renderer.
    this.game.render = () => this.game.ui.update();
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
    const crafted = this.game.workshop.craft("wood", amount);
    if (!crafted) {
      this.lastMessage = "猫薄荷不足，无法精炼";
      this.refreshSnapshot();
      return { ok: false, reason: "cannot-afford" };
    }

    this.game.updateResources();
    this.game.updateCaches();
    this.lastMessage = "精炼了猫薄荷";
    this.refreshSnapshot();
    return { ok: true, reason: "ok" };
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
      calendar: {
        day: this.game.calendar.day,
        year: this.game.calendar.year,
        season: season.name,
        seasonLabel: SEASON_LABELS[season.name] ?? season.name,
      },
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
    const groupByBuilding = new Map<
      string,
      { name: string; title: string }
    >();
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
}

let sharedKernel: GameKernel | null = null;

export function getGameKernel(): GameKernel {
  if (!sharedKernel) {
    sharedKernel = new GameKernel();
  }
  return sharedKernel;
}
