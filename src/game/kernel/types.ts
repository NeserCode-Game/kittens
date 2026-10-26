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
  calendar: CalendarSnapshot;
  lastMessage: string | null;
}

export type ActionReason =
  | "ok"
  | "cannot-afford"
  | "locked"
  | "not-enabled"
  | "unknown";

export interface ActionResult {
  ok: boolean;
  reason: ActionReason;
}
