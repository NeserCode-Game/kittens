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

export interface TradeOfferSnapshot {
  id: string;
  label: string;
  amount: number;
  chance: number;
  minEmbassyLevel: number;
  available: boolean;
}

export interface TradeEmbassySnapshot {
  level: number;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface TradeRaceSnapshot {
  id: string;
  label: string;
  standing: number;
  unlocked: boolean;
  buys: TradeOfferSnapshot[];
  sells: TradeOfferSnapshot[];
  maxTradeAmount: number;
  canTrade: boolean;
  blueprintChance: number;
  spiceChance: number;
  embassy: TradeEmbassySnapshot;
}

export interface TradeSnapshot {
  unlocked: boolean;
  tradeVolume: number;
  goldCost: number;
  manpowerCost: number;
  races: TradeRaceSnapshot[];
}

export type ReligionUpgradeKind = "ziggurat" | "religion" | "transcendence";

export interface ReligionUpgradeSnapshot {
  id: string;
  kind: ReligionUpgradeKind;
  label: string;
  description: string;
  value: number;
  enabled: number;
  unlocked: boolean;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface ReligionSnapshot {
  unlocked: boolean;
  faith: number;
  worship: number;
  faithRatio: number;
  apocryphaBonus: number;
  transcendenceTier: number;
  nextTranscendenceCost: number;
  corruption: number;
  unicornSacrifices: number;
  canPraise: boolean;
  canResetFaith: boolean;
  canTranscend: boolean;
  canSacrifice: boolean;
  upgrades: ReligionUpgradeSnapshot[];
}

export interface SpaceProgramSnapshot {
  id: string;
  label: string;
  description: string;
  value: number;
  enabled: number;
  unlocked: boolean;
  canLaunch: boolean;
  prices: PriceSnapshot[];
}

export interface SpaceBuildingSnapshot {
  id: string;
  label: string;
  description: string;
  value: number;
  enabled: number;
  unlocked: boolean;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface SpacePlanetSnapshot {
  id: string;
  label: string;
  unlocked: boolean;
  reached: boolean;
  routeDays: number;
  buildings: SpaceBuildingSnapshot[];
}

export interface SpaceSnapshot {
  unlocked: boolean;
  programs: SpaceProgramSnapshot[];
  planets: SpacePlanetSnapshot[];
}

export type TimeUpgradeKind = "chronoforge" | "voidspace";

export interface TimeUpgradeSnapshot {
  id: string;
  kind: TimeUpgradeKind;
  label: string;
  description: string;
  value: number;
  enabled: number;
  unlocked: boolean;
  canBuy: boolean;
  prices: PriceSnapshot[];
}

export interface TimeSnapshot {
  unlocked: boolean;
  temporalFlux: number;
  temporalFluxMax: number;
  heat: number;
  heatMax: number;
  furnaceHeat: number;
  isAccelerated: boolean;
  canAccelerate: boolean;
  canShatter: boolean;
  canUseHeat: boolean;
  shatterPrices: PriceSnapshot[];
  upgrades: TimeUpgradeSnapshot[];
}

export interface ChallengeSnapshot {
  id: string;
  label: string;
  description: string;
  effectDescription: string;
  unlocked: boolean;
  active: boolean;
  pending: boolean;
  completions: number;
  canToggle: boolean;
}

export interface ChallengesSnapshot {
  unlocked: boolean;
  activeCount: number;
  pendingCount: number;
  completionCount: number;
  canApplyPending: boolean;
  challenges: ChallengeSnapshot[];
}

export interface AchievementSnapshot {
  id: string;
  label: string;
  description: string;
  hidden: boolean;
  unethical: boolean;
  unlocked: boolean;
  starUnlocked: boolean;
  hasStar: boolean;
}

export interface BadgeSnapshot {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
}

export interface StatSnapshot {
  id: string;
  label: string;
  value: number | string;
  unlocked: boolean;
}

export interface StatGroupSnapshot {
  id: string;
  label: string;
  stats: StatSnapshot[];
}

export interface ProgressSnapshot {
  achievements: AchievementSnapshot[];
  badges: BadgeSnapshot[];
  unlockedAchievements: number;
  totalAchievements: number;
  unlockedStars: number;
  totalStars: number;
  statGroups: StatGroupSnapshot[];
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

export type SaveHealth = "new" | "healthy" | "corrupt" | "unavailable";

export interface SaveStatusSnapshot {
  health: SaveHealth;
  hasLocalSave: boolean;
  hasBackup: boolean;
  lastSavedAt: number | null;
  backupAt: number | null;
  currentVersion: number;
  sourceVersion: number | null;
  migrated: boolean;
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
  trade: TradeSnapshot;
  religion: ReligionSnapshot;
  space: SpaceSnapshot;
  time: TimeSnapshot;
  challenges: ChallengesSnapshot;
  progress: ProgressSnapshot;
  settings: GameSettingSnapshot[];
  calendar: CalendarSnapshot;
  saveStatus: SaveStatusSnapshot;
  runtimeError: string | null;
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
  | "invalid-save"
  | "storage-unavailable"
  | "unknown";

export interface ActionResult {
  ok: boolean;
  reason: ActionReason;
  changed?: boolean;
}

export interface SaveExportResult extends ActionResult {
  data?: string;
  sourceVersion?: number | null;
}

export interface SaveImportResult extends ActionResult {
  sourceVersion?: number | null;
  migrated?: boolean;
}
