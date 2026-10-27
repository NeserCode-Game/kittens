import {
  BadgeCheck,
  BookOpen,
  Cat,
  CircleCheck,
  Cog,
  Hammer,
  Leaf,
  Lock,
  Minus,
  Plus,
  Search,
  Sprout,
  Trees,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingItemGroup, SettingToggleItem } from "@/components/SettingItems";
import { cn } from "@/lib/utils";
import type {
  BuildingSnapshot,
  CraftSnapshot,
  GameSettingSnapshot,
  GameSnapshot,
  JobSnapshot,
  ResearchItemSnapshot,
  UpgradeSnapshot,
} from "@/game/kernel/types";

import { formatNumber, formatPercent, formatRate } from "./game-format";
import {
  EmptyState,
  Meter,
  Metric,
  PanelHeading,
  PricePills,
  SectionLabel,
} from "./game-shared";
import { useGameI18n } from "./use-game-i18n";

const primaryActionClass =
  "border-amber-400/25 bg-amber-400/90 text-kg-accent-foreground hover:bg-amber-300";
const quietActionClass =
  "border-kg-control bg-transparent text-kg-body hover:bg-kg-hover-strong hover:text-kg-strong";

function matchesSearch(query: string, values: Array<string | undefined>) {
  const needle = query.trim().toLocaleLowerCase();
  return (
    !needle ||
    values.some((value) => value?.toLocaleLowerCase().includes(needle))
  );
}

function BuildingRow({
  building,
  onBuy,
}: {
  building: BuildingSnapshot;
  onBuy: (id: string) => void;
}) {
  const { t } = useGameI18n();

  return (
    <article
      className={cn(
        "border-kg-line-subtle grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-5 py-4 transition-colors last:border-b-0",
        building.canBuy ? "hover:bg-kg-hover-subtle" : "opacity-65"
      )}
      data-building-id={building.id}
      data-building-enabled={building.enabled}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-kg-strong truncate text-sm font-semibold">
            {building.label}
          </h3>
          {building.enabled > 0 ? (
            <span className="text-kg-accent shrink-0 rounded-sm bg-amber-400/15 px-1.5 py-px font-mono text-[10px]">
              {building.enabled}
            </span>
          ) : null}
        </div>
        <p className="text-kg-muted mt-1 line-clamp-2 text-xs leading-relaxed">
          {building.description || t("建筑设施")}
        </p>
        <PricePills prices={building.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("self-center", primaryActionClass)}
        disabled={!building.canBuy}
        onClick={() => onBuy(building.id)}
        aria-label={t("建造{label}", { label: building.label })}
      >
        <Hammer className="size-3.5" />
        {t("建造")}
      </Button>
    </article>
  );
}

export function BonfirePanel({
  snapshot,
  onGather,
  onCraft,
  onBuy,
}: {
  snapshot: GameSnapshot;
  onGather: () => void;
  onCraft: () => void;
  onBuy: (id: string) => void;
}) {
  const { formatLocale, t } = useGameI18n();
  const buildingGroups = useMemo(() => {
    const groups = new Map<string, BuildingSnapshot[]>();
    for (const building of snapshot.buildings) {
      const list = groups.get(building.group) ?? [];
      list.push(building);
      groups.set(building.group, list);
    }
    return [...groups.entries()];
  }, [snapshot.buildings]);
  const catnip = snapshot.resources.find(
    (resource) => resource.id === "catnip"
  );

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow={t("营火")}
        title={t("营火")}
        description={t(
          "收集猫薄荷与木材，建立村庄的第一批居所。所有增长与价格由原版内核实时计算。"
        )}
        icon={Sprout}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              className={primaryActionClass}
              onClick={onGather}
            >
              <Sprout className="size-4" />
              {t("采集猫薄荷")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={quietActionClass}
              onClick={onCraft}
            >
              <Trees className="size-4" />
              {t("精炼木材")}
            </Button>
          </>
        }
      />

      <div className="border-kg-line bg-kg-inset grid grid-cols-2 border-b lg:grid-cols-4">
        <Metric
          label={t("猫薄荷")}
          value={formatNumber(catnip?.value ?? 0, 2, formatLocale)}
          detail={t("{rate} / 刻", {
            rate: formatRate(catnip?.perTick ?? 0, formatLocale),
          })}
          tone="green"
        />
        <Metric
          label={t("人口")}
          value={snapshot.village.kittens}
          detail={t("上限 {value}", { value: snapshot.village.maxKittens })}
        />
        <Metric
          label={t("幸福")}
          value={formatPercent(snapshot.village.happiness, formatLocale)}
          tone="amber"
        />
        <Metric
          label={t("已建建筑")}
          value={snapshot.buildings.reduce(
            (total, building) => total + building.enabled,
            0
          )}
          detail={t("{count} 种可建造", {
            count: snapshot.buildings.length,
          })}
        />
      </div>

      {buildingGroups.length > 0 ? (
        buildingGroups.map(([group, buildings]) => (
          <section key={group}>
            <SectionLabel aside={buildings.length}>
              {buildings[0]?.groupLabel ?? group}
            </SectionLabel>
            {buildings.map((building) => (
              <BuildingRow
                key={building.id}
                building={building}
                onBuy={onBuy}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState
          title={t("还没有可建造设施")}
          description={t("继续采集资源，解锁下一步建筑。")}
        />
      )}
    </div>
  );
}

function JobRow({
  job,
  freeKittens,
  onAssign,
  onUnassign,
}: {
  job: JobSnapshot;
  freeKittens: number;
  onAssign: (id: string, amount: number) => void;
  onUnassign: (id: string, amount: number) => void;
}) {
  const { t } = useGameI18n();
  const batch = Math.min(10, freeKittens);

  return (
    <article
      className="border-kg-line-subtle grid gap-4 border-b px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
      data-job-id={job.id}
      data-job-value={job.value}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-kg-strong text-sm font-semibold">{job.label}</h3>
          <span className="bg-kg-wash-strong text-kg-muted rounded-sm px-1.5 py-px font-mono text-[10px]">
            {job.value} / {job.limit >= 100000 ? "∞" : job.limit}
          </span>
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {job.description || t("村庄职业")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.effects.length > 0 ? (
            job.effects.map((effect) => (
              <span
                key={effect.id}
                className="text-kg-success/80 inline-flex items-center gap-1 rounded-sm border border-emerald-500/15 bg-emerald-500/[0.07] px-1.5 py-0.5 text-[10px]"
              >
                {effect.label}
                <strong className="text-kg-success font-mono font-medium">
                  {effect.valueLabel}
                </strong>
              </span>
            ))
          ) : (
            <span className="text-kg-faint text-[10px]">{t("基础职业")}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={quietActionClass}
          disabled={!job.canUnassign}
          onClick={() => onUnassign(job.id, 1)}
          aria-label={t("减少{label} 1 只猫", { label: job.label })}
        >
          <Minus className="size-3.5" />1
        </Button>
        <Button
          type="button"
          size="sm"
          className={primaryActionClass}
          disabled={!job.canAssign}
          onClick={() => onAssign(job.id, 1)}
          aria-label={t("为{label}分配 1 只猫", { label: job.label })}
          data-job-assign={job.id}
        >
          <Plus className="size-3.5" />1
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={quietActionClass}
          disabled={!job.canAssign || batch <= 0}
          onClick={() => onAssign(job.id, batch)}
          aria-label={t("为{label}分配 {count} 只猫", {
            label: job.label,
            count: batch,
          })}
        >
          +{batch}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-kg-muted hover:bg-kg-hover hover:text-kg-strong"
          disabled={!job.canAssign || freeKittens <= 0}
          onClick={() => onAssign(job.id, freeKittens)}
          aria-label={t("为{label}分配全部空闲猫", { label: job.label })}
        >
          {t("全部")}
        </Button>
      </div>
    </article>
  );
}

export function VillagePanel({
  snapshot,
  onAssign,
  onUnassign,
}: {
  snapshot: GameSnapshot;
  onAssign: (id: string, amount: number) => void;
  onUnassign: (id: string, amount: number) => void;
}) {
  const { formatLocale, t } = useGameI18n();
  const village = snapshot.village;
  const happinessPercent = Math.max(0, Math.min(100, village.happiness * 100));

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow={t("村庄")}
        title={t("村庄")}
        description={t(
          "安排猫猫从事食物、木材、科学与探索工作。分配结果会直接进入原版生产结算。"
        )}
        icon={Cat}
      />

      <div className="border-kg-line bg-kg-inset grid grid-cols-2 border-b lg:grid-cols-4">
        <Metric
          label={t("猫猫")}
          value={village.kittens}
          detail={t("容量 {count}", { count: village.maxKittens })}
        />
        <Metric
          label={t("空闲")}
          value={village.freeKittens}
          tone={village.freeKittens > 0 ? "green" : "default"}
        />
        <Metric
          label={t("幸福")}
          value={formatPercent(village.happiness, formatLocale)}
          tone="amber"
          detail={<Meter value={happinessPercent} label={t("幸福度")} />}
        />
        <Metric
          label={t("领袖")}
          value={village.leaderName ?? t("尚未任命")}
          detail={t("{count} 种职业在岗", {
            count: village.jobs.filter((job) => job.value > 0).length,
          })}
        />
      </div>

      {village.jobs.length > 0 ? (
        <section>
          <SectionLabel
            aside={t("{count} 空闲", { count: village.freeKittens })}
          >
            {t("职业分配")}
          </SectionLabel>
          {village.jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              freeKittens={village.freeKittens}
              onAssign={onAssign}
              onUnassign={onUnassign}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title={t("村庄还没有工作")}
          description={t("建造小屋并等待第一只猫猫到来。")}
        />
      )}
    </div>
  );
}

function ResearchRow({
  item,
  onResearch,
}: {
  item: ResearchItemSnapshot;
  onResearch: (id: string, kind: "tech" | "policy") => void;
}) {
  const { t } = useGameI18n();
  const stateLabel = item.researched
    ? t("已完成")
    : item.blocked
      ? t("已封锁")
      : item.canResearch
        ? t("可研究")
        : t("资源不足");

  return (
    <article
      className={cn(
        "border-kg-line-subtle grid gap-4 border-b px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !item.canResearch && !item.researched && "opacity-70"
      )}
      data-research-id={item.id}
      data-research-kind={item.kind}
      data-research-researched={item.researched}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-kg-strong text-sm font-semibold">{item.label}</h3>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-px text-[10px]",
              item.researched
                ? "text-kg-success bg-emerald-400/10"
                : item.blocked
                  ? "text-kg-danger bg-rose-400/10"
                  : item.canResearch
                    ? "text-kg-accent bg-amber-400/10"
                    : "bg-kg-wash-strong text-kg-muted"
            )}
          >
            {item.researched ? (
              <CircleCheck className="size-3" />
            ) : item.blocked ? (
              <Lock className="size-3" />
            ) : (
              <BadgeCheck className="size-3" />
            )}
            {stateLabel}
          </span>
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {item.description || item.flavor || t("研究项目")}
        </p>
        {item.effectDescription ? (
          <p className="text-kg-success/65 mt-1.5 text-[11px] leading-relaxed">
            {item.effectDescription}
          </p>
        ) : null}
        <PricePills prices={item.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        variant={item.kind === "policy" ? "outline" : "default"}
        className={cn(
          "self-center",
          item.kind === "policy" ? quietActionClass : primaryActionClass
        )}
        disabled={!item.canResearch}
        onClick={() => onResearch(item.id, item.kind)}
        aria-label={
          item.kind === "policy"
            ? t("采纳政策：{label}", { label: item.label })
            : t("研究{label}", { label: item.label })
        }
      >
        {item.kind === "policy" ? (
          <BookOpen className="size-3.5" />
        ) : (
          <Leaf className="size-3.5" />
        )}
        {item.kind === "policy" ? t("采纳") : t("研究")}
      </Button>
    </article>
  );
}

export function SciencePanel({
  snapshot,
  onResearch,
}: {
  snapshot: GameSnapshot;
  onResearch: (id: string, kind: "tech" | "policy") => void;
}) {
  const { t } = useGameI18n();
  const [tab, setTab] = useState<"tech" | "policy">("tech");
  const [query, setQuery] = useState("");
  const items =
    tab === "tech" ? snapshot.science.techs : snapshot.science.policies;
  const visibleItems = items.filter((item) =>
    matchesSearch(query, [
      item.label,
      item.description,
      item.effectDescription,
      item.flavor,
    ])
  );

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow={t("科学")}
        title={t("科学")}
        description={t(
          "投入科学资源研究技术，或以政策确立长期方向。价格增长、解锁与排他关系均来自原版规则。"
        )}
        icon={Leaf}
      />

      <div className="border-kg-line bg-kg-inset flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "tech" | "policy")}
          className="gap-0"
        >
          <TabsList className="bg-kg-inset-strong h-8 rounded-md p-0.5">
            <TabsTrigger
              value="tech"
              className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
            >
              {t("科技")}
              <span className="text-kg-muted font-mono text-[10px]">
                {snapshot.science.techs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="policy"
              className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
            >
              {t("政策")}
              <span className="text-kg-muted font-mono text-[10px]">
                {snapshot.science.policies.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 sm:w-56">
            <Search className="text-kg-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("筛选研究")}
              aria-label={t("筛选研究")}
              className="border-kg-line bg-kg-inset-strong text-kg-body placeholder:text-kg-faint h-8 pl-8 text-xs"
            />
          </div>
          <span className="text-kg-muted shrink-0 font-mono text-[10px]">
            {t("{completed} 完成 · {available} 可用", {
              completed: snapshot.science.researchedCount,
              available: snapshot.science.availableCount,
            })}
          </span>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "tech" | "policy")}
        className="gap-0"
      >
        <TabsContent value="tech" className="m-0">
          <ResearchList
            items={visibleItems}
            emptyDescription={t("建造图书馆并积累科学资源，解锁第一批技术。")}
            onResearch={onResearch}
          />
        </TabsContent>
        <TabsContent value="policy" className="m-0">
          <ResearchList
            items={visibleItems}
            emptyDescription={t("满足社会条件后，政策会出现在这里。")}
            onResearch={onResearch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResearchList({
  items,
  emptyDescription,
  onResearch,
}: {
  items: ResearchItemSnapshot[];
  emptyDescription: string;
  onResearch: (id: string, kind: "tech" | "policy") => void;
}) {
  const { t } = useGameI18n();
  if (items.length === 0) {
    return (
      <EmptyState title={t("没有可用项目")} description={emptyDescription} />
    );
  }

  return (
    <section>
      <SectionLabel aside={items.length}>{t("研究项目")}</SectionLabel>
      {items.map((item) => (
        <ResearchRow key={item.id} item={item} onResearch={onResearch} />
      ))}
    </section>
  );
}

function CraftRow({
  craft,
  onCraft,
  onCraftAll,
}: {
  craft: CraftSnapshot;
  onCraft: (id: string, amount: number) => void;
  onCraftAll: (id: string) => void;
}) {
  const { formatLocale, t } = useGameI18n();

  return (
    <article
      className={cn(
        "border-kg-line-subtle grid gap-4 border-b px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !craft.canCraft && "opacity-70"
      )}
      data-craft-id={craft.id}
      data-craft-can-craft={craft.canCraft}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-kg-strong text-sm font-semibold">
            {craft.label}
          </h3>
          <span className="bg-kg-wash-strong text-kg-muted rounded-sm px-1.5 py-px font-mono text-[10px]">
            {craft.value} {t("工程师")}
          </span>
          <span className="text-kg-success rounded-sm bg-emerald-400/10 px-1.5 py-px font-mono text-[10px]">
            {t("产出 +{value}", {
              value: formatPercent(craft.craftRatio, formatLocale),
            })}
          </span>
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {craft.description || t("工坊制作配方")}
        </p>
        {craft.value > 0 ? (
          <div className="mt-2 max-w-sm">
            <div className="text-kg-muted mb-1 flex items-center justify-between font-mono text-[10px]">
              <span>{t("自动制作进度")}</span>
              <span>{formatNumber(craft.progress, 2, formatLocale)}%</span>
            </div>
            <Meter
              value={craft.progress}
              label={t("{label}自动制作进度", { label: craft.label })}
              tone="green"
            />
          </div>
        ) : null}
        <PricePills prices={craft.prices} className="mt-2.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        <Button
          type="button"
          size="sm"
          className={primaryActionClass}
          disabled={!craft.canCraft}
          onClick={() => onCraft(craft.id, 1)}
          aria-label={t("制作{label}", { label: craft.label })}
        >
          <Hammer className="size-3.5" />
          {t("制作")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={quietActionClass}
          disabled={!craft.canCraft}
          onClick={() => onCraft(craft.id, 10)}
          aria-label={t("制作 10 个{label}", { label: craft.label })}
        >
          ×10
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-kg-muted hover:bg-kg-hover hover:text-kg-strong"
          disabled={!craft.canCraftAll}
          onClick={() => onCraftAll(craft.id)}
          aria-label={t("全部制作{label}", { label: craft.label })}
          title={t("最多 {count} 个", {
            count: formatNumber(craft.maxCraftable, 0, formatLocale),
          })}
        >
          {t("全部")}
        </Button>
      </div>
    </article>
  );
}

function UpgradeRow({
  upgrade,
  onBuy,
}: {
  upgrade: UpgradeSnapshot;
  onBuy: (id: string) => void;
}) {
  const { t } = useGameI18n();

  return (
    <article
      className={cn(
        "border-kg-line-subtle grid gap-4 border-b px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !upgrade.canBuy && "opacity-70"
      )}
      data-upgrade-id={upgrade.id}
      data-upgrade-researched={upgrade.researched}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-kg-strong text-sm font-semibold">
            {upgrade.label}
          </h3>
          {upgrade.researched ? (
            <span className="text-kg-success inline-flex items-center gap-1 rounded-sm bg-emerald-400/10 px-1.5 py-px text-[10px]">
              <CircleCheck className="size-3" />
              {t("已购买")}
            </span>
          ) : null}
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {upgrade.description || t("工坊升级")}
        </p>
        <PricePills prices={upgrade.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("self-center", quietActionClass)}
        disabled={!upgrade.canBuy}
        onClick={() => onBuy(upgrade.id)}
        aria-label={t("购买{label}", { label: upgrade.label })}
      >
        <Cog className="size-3.5" />
        {t("购买")}
      </Button>
    </article>
  );
}

export function WorkshopPanel({
  snapshot,
  onCraft,
  onCraftAll,
  onBuy,
}: {
  snapshot: GameSnapshot;
  onCraft: (id: string, amount: number) => void;
  onCraftAll: (id: string) => void;
  onBuy: (id: string) => void;
}) {
  const { formatLocale, t } = useGameI18n();
  const [query, setQuery] = useState("");
  const crafts = snapshot.workshop.crafts.filter((craft) =>
    matchesSearch(query, [craft.label, craft.description])
  );
  const upgrades = snapshot.workshop.upgrades.filter((upgrade) =>
    matchesSearch(query, [upgrade.label, upgrade.description])
  );

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow={t("工坊")}
        title={t("工坊")}
        description={t(
          "把基础资源加工为高级材料，购买永久升级。制作倍率、工程师进度与特殊配方均由原版内核提供。"
        )}
        icon={Wrench}
      />

      <div className="border-kg-line bg-kg-inset flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-kg-muted flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <Cog className="text-kg-accent/75 size-3.5" />
            {t("全局制作加成")}
          </span>
          <span className="text-kg-success font-mono">
            +{formatPercent(snapshot.workshop.craftRatio, formatLocale)}
          </span>
        </div>
        <div className="relative min-w-0 sm:w-56">
          <Search className="text-kg-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("筛选配方与升级")}
            aria-label={t("筛选工坊")}
            className="border-kg-line bg-kg-inset-strong text-kg-body placeholder:text-kg-faint h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <section>
        <SectionLabel aside={crafts.length}>{t("制作配方")}</SectionLabel>
        {crafts.length > 0 ? (
          crafts.map((craft) => (
            <CraftRow
              key={craft.id}
              craft={craft}
              onCraft={onCraft}
              onCraftAll={onCraftAll}
            />
          ))
        ) : (
          <EmptyState
            title={t("没有可制作配方")}
            description={t("研究相关技术后会解锁新的加工配方。")}
          />
        )}
      </section>

      <section>
        <SectionLabel aside={upgrades.length}>{t("工坊升级")}</SectionLabel>
        {upgrades.length > 0 ? (
          upgrades.map((upgrade) => (
            <UpgradeRow key={upgrade.id} upgrade={upgrade} onBuy={onBuy} />
          ))
        ) : (
          <EmptyState
            title={t("没有可购买升级")}
            description={t("继续研究并积累工坊资源。")}
          />
        )}
      </section>
    </div>
  );
}

function SettingRow({
  setting,
  onSet,
}: {
  setting: GameSettingSnapshot;
  onSet: (id: string, value: boolean) => void;
}) {
  return (
    <div data-setting-id={setting.id} data-setting-value={setting.value}>
      <SettingToggleItem
        id={`game-setting-${setting.id}`}
        title={setting.label}
        description={setting.description}
        checked={setting.value}
        onCheckedChange={(value) => onSet(setting.id, value)}
      />
    </div>
  );
}

export function GameSettingsPanel({
  snapshot,
  onSet,
}: {
  snapshot: GameSnapshot;
  onSet: (id: string, value: boolean) => void;
}) {
  const { t } = useGameI18n();
  const standard = snapshot.settings.filter((setting) => !setting.advanced);
  const advanced = snapshot.settings.filter((setting) => setting.advanced);

  return (
    <div className="flex flex-col gap-5" data-game-settings>
      <div className="stack-1">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("游戏设置")}
        </h2>
        <p className="text-muted-sm">
          {t("调整确认流程、离线进度与显示精度。设置写入原版存档并即时生效。")}
        </p>
      </div>

      <SettingItemGroup title={t("常规")}>
        {standard.map((setting) => (
          <SettingRow key={setting.id} setting={setting} onSet={onSet} />
        ))}
      </SettingItemGroup>

      <SettingItemGroup title={t("高级")}>
        {advanced.map((setting) => (
          <SettingRow key={setting.id} setting={setting} onSet={onSet} />
        ))}
      </SettingItemGroup>
    </div>
  );
}
