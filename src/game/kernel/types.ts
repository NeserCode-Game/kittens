export interface ResourceSnapshot {
  id: string;
  label: string;
  value: number;
  maxValue: number;
  perTick: number;
  visible: boolean;
  unlocked: boolean;
  capped: boolean;
}

export interface PriceSnapshot {
  id: string;
  label: string;
  value: number;
  affordable: boolean;
}

export interface BuildingSnapshot {
  id: string;
  label: string;
  description: string;
  group: string;
  groupLabel: string;
  value: number;
  enabled: number;
  unlocked: boolean;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface EffectSnapshot {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
}

export interface JobSnapshot {
  id: string;
  label: string;
  description: string;
  value: number;
  limit: number;
  unlocked: boolean;
  canAssign: boolean;
  canUnassign: boolean;
  effects: EffectSnapshot[];
}

export interface VillageSnapshot {
  kittens: number;
  freeKittens: number;
  maxKittens: number;
  happiness: number;
  leaderName: string | null;
  jobs: JobSnapshot[];
}

export interface ResearchItemSnapshot {
  id: string;
  kind: "tech" | "policy";
  label: string;
  description: string;
  effectDescription: string;
  flavor: string;
  researched: boolean;
  unlocked: boolean;
  blocked: boolean;
  canResearch: boolean;
  prices: PriceSnapshot[];
}

export interface ScienceSnapshot {
  unlocked: boolean;
  researchedCount: number;
  availableCount: number;
  techs: ResearchItemSnapshot[];
  policies: ResearchItemSnapshot[];
}

export interface CraftSnapshot {
  id: string;
  label: string;
  description: string;
  value: number;
  progress: number;
  unlocked: boolean;
  canCraft: boolean;
  canCraftAll: boolean;
  maxCraftable: number;
  craftRatio: number;
  prices: PriceSnapshot[];
}

export interface UpgradeSnapshot {
  id: string;
  label: string;
  description: string;
  researched: boolean;
  unlocked: boolean;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface WorkshopSnapshot {
  unlocked: boolean;
  craftRatio: number;
  crafts: CraftSnapshot[];
  upgrades: UpgradeSnapshot[];
}

export interface GameSettingSnapshot {
  id: string;
  label: string;
  description: string;
  value: boolean;
  advanced: boolean;
}

export interface PendingConfirmationSnapshot {
  id: number;
  title: string;
  message: string;
}

export interface CalendarSnapshot {
  day: number;
  year: number;
  season: string;
  seasonLabel: string;
}

export interface GameSnapshot {
  version: string;
  ticks: number;
  paused: boolean;
  resources: ResourceSnapshot[];
  buildings: BuildingSnapshot[];
  village: VillageSnapshot;
  science: ScienceSnapshot;
  workshop: WorkshopSnapshot;
  settings: GameSettingSnapshot[];
  calendar: CalendarSnapshot;
  pendingConfirmation: PendingConfirmationSnapshot | null;
  lastMessage: string | null;
}

export type ActionReason =
  | "ok"
  | "cannot-afford"
  | "locked"
  | "not-enabled"
  | "already-owned"
  | "blocked"
  | "requires-confirmation"
  | "unknown";

export interface ActionResult {
  ok: boolean;
  reason: ActionReason;
  changed?: boolean;
}
