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
  Settings2,
  Sprout,
  Trees,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const primaryActionClass =
  "border-amber-400/25 bg-amber-400/90 text-kg-accent-foreground hover:bg-amber-300";
const quietActionClass =
  "border-kg-control bg-transparent text-kg-body hover:bg-kg-hover-strong hover:text-kg-strong";

function matchesSearch(query: string, values: Array<string | undefined>) {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  return (
    !needle ||
    values.some((value) => value?.toLocaleLowerCase("zh-CN").includes(needle))
  );
}

function BuildingRow({
  building,
  onBuy,
}: {
  building: BuildingSnapshot;
  onBuy: (id: string) => void;
}) {
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
          {building.description || "建筑设施"}
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
        aria-label={`建造${building.label}`}
      >
        <Hammer className="size-3.5" />
        建造
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
        eyebrow="营火"
        title="营火"
        description="收集猫薄荷与木材，建立村庄的第一批居所。所有增长与价格由原版内核实时计算。"
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
              采集猫薄荷
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={quietActionClass}
              onClick={onCraft}
            >
              <Trees className="size-4" />
              精炼木材
            </Button>
          </>
        }
      />

      <div className="border-kg-line bg-kg-inset grid grid-cols-2 border-b lg:grid-cols-4">
        <Metric
          label="猫薄荷"
          value={formatNumber(catnip?.value ?? 0)}
          detail={formatRate(catnip?.perTick ?? 0) + " / 刻"}
          tone="green"
        />
        <Metric
          label="人口"
          value={snapshot.village.kittens}
          detail={`上限 ${snapshot.village.maxKittens}`}
        />
        <Metric
          label="幸福"
          value={formatPercent(snapshot.village.happiness)}
          tone="amber"
        />
        <Metric
          label="已建建筑"
          value={snapshot.buildings.reduce(
            (total, building) => total + building.enabled,
            0
          )}
          detail={`${snapshot.buildings.length} 种可建造`}
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
          title="还没有可建造设施"
          description="继续采集资源，解锁下一步建筑。"
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
          {job.description || "村庄职业"}
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
            <span className="text-kg-faint text-[10px]">基础职业</span>
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
          aria-label={`减少${job.label} 1 只猫`}
        >
          <Minus className="size-3.5" />1
        </Button>
        <Button
          type="button"
          size="sm"
          className={primaryActionClass}
          disabled={!job.canAssign}
          onClick={() => onAssign(job.id, 1)}
          aria-label={`为${job.label}分配 1 只猫`}
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
          aria-label={`为${job.label}分配 ${batch} 只猫`}
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
          aria-label={`为${job.label}分配全部空闲猫`}
        >
          全部
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
  const village = snapshot.village;
  const happinessPercent = Math.max(0, Math.min(100, village.happiness * 100));

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow="村庄"
        title="村庄"
        description="安排猫猫从事食物、木材、科学与探索工作。分配结果会直接进入原版生产结算。"
        icon={Cat}
      />

      <div className="border-kg-line bg-kg-inset grid grid-cols-2 border-b lg:grid-cols-4">
        <Metric
          label="猫猫"
          value={village.kittens}
          detail={`容量 ${village.maxKittens}`}
        />
        <Metric
          label="空闲"
          value={village.freeKittens}
          tone={village.freeKittens > 0 ? "green" : "default"}
        />
        <Metric
          label="幸福"
          value={formatPercent(village.happiness)}
          tone="amber"
          detail={<Meter value={happinessPercent} label="幸福度" />}
        />
        <Metric
          label="领袖"
          value={village.leaderName ?? "尚未任命"}
          detail={`${village.jobs.filter((job) => job.value > 0).length} 种职业在岗`}
        />
      </div>

      {village.jobs.length > 0 ? (
        <section>
          <SectionLabel aside={`${village.freeKittens} 空闲`}>
            职业分配
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
          title="村庄还没有工作"
          description="建造小屋并等待第一只猫猫到来。"
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
  const stateLabel = item.researched
    ? "已完成"
    : item.blocked
      ? "已封锁"
      : item.canResearch
        ? "可研究"
        : "资源不足";

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
          {item.description || item.flavor || "研究项目"}
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
        aria-label={`${
          item.kind === "policy" ? "采纳政策" : "研究"
        }${item.label}`}
      >
        {item.kind === "policy" ? (
          <BookOpen className="size-3.5" />
        ) : (
          <Leaf className="size-3.5" />
        )}
        {item.kind === "policy" ? "采纳" : "研究"}
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
        eyebrow="科学"
        title="科学"
        description="投入科学资源研究技术，或以政策确立长期方向。价格增长、解锁与排他关系均来自原版规则。"
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
              科技
              <span className="text-kg-muted font-mono text-[10px]">
                {snapshot.science.techs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="policy"
              className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
            >
              政策
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
              placeholder="筛选研究"
              aria-label="筛选研究"
              className="border-kg-line bg-kg-inset-strong text-kg-body placeholder:text-kg-faint h-8 pl-8 text-xs"
            />
          </div>
          <span className="text-kg-muted shrink-0 font-mono text-[10px]">
            {snapshot.science.researchedCount} 完成 ·{" "}
            {snapshot.science.availableCount} 可用
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
            emptyDescription="建造图书馆并积累科学资源，解锁第一批技术。"
            onResearch={onResearch}
          />
        </TabsContent>
        <TabsContent value="policy" className="m-0">
          <ResearchList
            items={visibleItems}
            emptyDescription="满足社会条件后，政策会出现在这里。"
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
  if (items.length === 0) {
    return <EmptyState title="没有可用项目" description={emptyDescription} />;
  }

  return (
    <section>
      <SectionLabel aside={items.length}>研究项目</SectionLabel>
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
            {craft.value} 工程师
          </span>
          <span className="text-kg-success rounded-sm bg-emerald-400/10 px-1.5 py-px font-mono text-[10px]">
            产出 +{formatPercent(craft.craftRatio)}
          </span>
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {craft.description || "工坊制作配方"}
        </p>
        {craft.value > 0 ? (
          <div className="mt-2 max-w-sm">
            <div className="text-kg-muted mb-1 flex items-center justify-between font-mono text-[10px]">
              <span>自动制作进度</span>
              <span>{formatNumber(craft.progress, 2)}%</span>
            </div>
            <Meter
              value={craft.progress}
              label={`${craft.label}自动制作进度`}
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
          aria-label={`制作${craft.label}`}
        >
          <Hammer className="size-3.5" />
          制作
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={quietActionClass}
          disabled={!craft.canCraft}
          onClick={() => onCraft(craft.id, 10)}
          aria-label={`制作 10 个${craft.label}`}
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
          aria-label={`全部制作${craft.label}`}
          title={`最多 ${formatNumber(craft.maxCraftable, 0)} 个`}
        >
          全部
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
              已购买
            </span>
          ) : null}
        </div>
        <p className="text-kg-muted mt-1 max-w-2xl text-xs leading-relaxed">
          {upgrade.description || "工坊升级"}
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
        aria-label={`购买${upgrade.label}`}
      >
        <Cog className="size-3.5" />
        购买
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
        eyebrow="工坊"
        title="工坊"
        description="把基础资源加工为高级材料，购买永久升级。制作倍率、工程师进度与特殊配方均由原版内核提供。"
        icon={Wrench}
      />

      <div className="border-kg-line bg-kg-inset flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-kg-muted flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <Cog className="text-kg-accent/75 size-3.5" />
            全局制作加成
          </span>
          <span className="text-kg-success font-mono">
            +{formatPercent(snapshot.workshop.craftRatio)}
          </span>
        </div>
        <div className="relative min-w-0 sm:w-56">
          <Search className="text-kg-faint pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="筛选配方与升级"
            aria-label="筛选工坊"
            className="border-kg-line bg-kg-inset-strong text-kg-body placeholder:text-kg-faint h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <section>
        <SectionLabel aside={crafts.length}>制作配方</SectionLabel>
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
            title="没有可制作配方"
            description="研究相关技术后会解锁新的加工配方。"
          />
        )}
      </section>

      <section>
        <SectionLabel aside={upgrades.length}>工坊升级</SectionLabel>
        {upgrades.length > 0 ? (
          upgrades.map((upgrade) => (
            <UpgradeRow key={upgrade.id} upgrade={upgrade} onBuy={onBuy} />
          ))
        ) : (
          <EmptyState
            title="没有可购买升级"
            description="继续研究并积累工坊资源。"
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
    <div
      className="border-kg-line-subtle flex items-center justify-between gap-5 border-b px-5 py-4 last:border-b-0"
      data-setting-id={setting.id}
      data-setting-value={setting.value}
    >
      <div className="min-w-0">
        <label
          htmlFor={`game-setting-${setting.id}`}
          className="text-kg-body cursor-pointer text-sm font-medium"
        >
          {setting.label}
        </label>
        <p className="text-kg-muted mt-1 text-xs leading-relaxed">
          {setting.description}
        </p>
      </div>
      <Switch
        id={`game-setting-${setting.id}`}
        checked={setting.value}
        onCheckedChange={(value) => onSet(setting.id, value)}
        aria-label={setting.label}
        className="data-[state=unchecked]:bg-kg-control [&_[data-slot=switch-thumb]]:bg-kg-accent-foreground data-[state=checked]:bg-amber-400"
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
  const standard = snapshot.settings.filter((setting) => !setting.advanced);
  const advanced = snapshot.settings.filter((setting) => setting.advanced);

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow="选项"
        title="游戏设置"
        description="调整显示精度、确认流程与存档行为。设置直接写入原版选项，并随存档保留。"
        icon={Settings2}
      />

      <section>
        <SectionLabel aside={standard.length}>常规</SectionLabel>
        {standard.map((setting) => (
          <SettingRow key={setting.id} setting={setting} onSet={onSet} />
        ))}
      </section>

      <section>
        <SectionLabel aside={advanced.length}>高级</SectionLabel>
        {advanced.map((setting) => (
          <SettingRow key={setting.id} setting={setting} onSet={onSet} />
        ))}
      </section>
    </div>
  );
}
