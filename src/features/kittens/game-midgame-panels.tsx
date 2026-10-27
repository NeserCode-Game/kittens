import {
  ArrowRightLeft,
  BadgeCheck,
  Church,
  Clock3,
  Flame,
  Handshake,
  Hourglass,
  Lock,
  RotateCcw,
  Rocket,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AchievementSnapshot,
  ChallengeSnapshot,
  GameSnapshot,
  ReligionUpgradeKind,
  ReligionUpgradeSnapshot,
  SpaceBuildingSnapshot,
  SpaceProgramSnapshot,
  TimeUpgradeKind,
  TimeUpgradeSnapshot,
  TradeOfferSnapshot,
  TradeRaceSnapshot,
} from "@/game/kernel/types";
import { cn } from "@/lib/utils";

import { formatNumber, formatPercent } from "./game-format";
import {
  EmptyState,
  Meter,
  Metric,
  PanelHeading,
  PricePills,
  SectionLabel,
} from "./game-shared";

const primaryActionClass =
  "border-amber-400/25 bg-amber-400/90 text-stone-950 hover:bg-amber-300";
const quietActionClass =
  "border-white/15 bg-transparent text-stone-300 hover:bg-white/10 hover:text-stone-100";

function standingLabel(standing: number): string {
  if (standing >= 0.25) return "友好";
  if (standing > 0) return "亲近";
  if (standing === 0) return "中立";
  if (standing > -0.25) return "冷淡";
  return "敌对";
}

function OfferPill({
  offer,
  kind,
}: {
  offer: TradeOfferSnapshot;
  kind: "buy" | "sell";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[10px]",
        offer.available
          ? kind === "buy"
            ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-200/85"
            : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200/85"
          : "border-white/[0.06] bg-black/10 text-stone-600"
      )}
    >
      <span>{offer.label}</span>
      <strong className="font-mono font-medium">
        {formatNumber(offer.amount)}
      </strong>
      {kind === "sell" ? (
        <span className="font-mono text-stone-500">
          {formatPercent(Math.min(offer.chance, 1))}
        </span>
      ) : null}
    </span>
  );
}

function TradeRaceRow({
  race,
  onTrade,
  onEmbassy,
}: {
  race: TradeRaceSnapshot;
  onTrade: (id: string, amount: number | "all") => void;
  onEmbassy: (id: string) => void;
}) {
  return (
    <article
      className="border-b border-white/[0.07] px-5 py-4 last:border-b-0"
      data-trade-race-id={race.id}
      data-trade-max={race.maxTradeAmount}
      data-standing={race.standing}
      data-trade-embassy-level={race.embassy.level}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-100">
              {race.label}
            </h3>
            <span className="rounded-sm border border-white/[0.07] bg-white/[0.04] px-1.5 py-px text-[10px] text-stone-400">
              {standingLabel(race.standing)} {formatPercent(race.standing)}
            </span>
            {race.embassy.level > 0 ? (
              <span className="rounded-sm bg-amber-400/10 px-1.5 py-px font-mono text-[10px] text-amber-300">
                大使馆 {race.embassy.level}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[10px] tracking-wide text-stone-600">
                商队支出
              </div>
              <div className="flex flex-wrap gap-1.5">
                {race.buys.map((offer) => (
                  <OfferPill key={offer.id} offer={offer} kind="buy" />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] tracking-wide text-stone-600">
                可带回资源
              </div>
              <div className="flex flex-wrap gap-1.5">
                {race.sells.map((offer) => (
                  <OfferPill key={offer.id} offer={offer} kind="sell" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-stone-500">
            <span>
              单次容量{" "}
              <strong className="font-mono text-stone-300">
                {race.maxTradeAmount || "0"}
              </strong>
            </span>
            <span>
              蓝图{" "}
              <strong className="font-mono text-stone-300">
                {formatPercent(race.blueprintChance)}
              </strong>
            </span>
            <span>
              香料{" "}
              <strong className="font-mono text-stone-300">
                {formatPercent(race.spiceChance)}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 xl:justify-end">
          <Button
            type="button"
            size="sm"
            className={primaryActionClass}
            disabled={!race.canTrade}
            onClick={() => onTrade(race.id, 1)}
            aria-label={`与${race.label}贸易`}
            data-trade-action={race.id}
          >
            <ArrowRightLeft className="size-3.5" />
            贸易
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={quietActionClass}
            disabled={!race.canTrade || race.maxTradeAmount <= 1}
            onClick={() => onTrade(race.id, "all")}
            aria-label={`与${race.label}全部贸易`}
            data-trade-all={race.id}
          >
            全部
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-stone-400 hover:bg-white/[0.06] hover:text-amber-200"
            disabled={!race.embassy.canBuy}
            onClick={() => onEmbassy(race.id)}
            aria-label={`建造${race.label}大使馆`}
            data-embassy-build={race.id}
          >
            大使馆
          </Button>
        </div>
      </div>
      {race.embassy.prices.length > 0 ? (
        <PricePills prices={race.embassy.prices} className="mt-3" />
      ) : null}
    </article>
  );
}

export function TradePanel({
  snapshot,
  onTrade,
  onEmbassy,
}: {
  snapshot: GameSnapshot;
  onTrade: (id: string, amount: number | "all") => void;
  onEmbassy: (id: string) => void;
}) {
  const trade = snapshot.trade;

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow="外交"
        title="贸易"
        description="派遣商队交换资源，提高种族关系并建立大使馆。商队容量、资源抽取与特殊收获由原版内核结算。"
        icon={Handshake}
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric label="贸易种族" value={trade.races.length} />
        <Metric
          label="贸易容量"
          value={`×${formatNumber(trade.tradeVolume, 2)}`}
          tone="green"
        />
        <Metric
          label="金币 / 人力"
          value={`${formatNumber(trade.goldCost)} / ${formatNumber(trade.manpowerCost)}`}
        />
        <Metric
          label="总贸易"
          value={
            snapshot.progress.statGroups
              .flatMap((group) => group.stats)
              .find((stat) => stat.id === "totalTrades")?.value ?? 0
          }
          detail="本存档累计"
        />
      </div>

      {trade.races.length > 0 ? (
        <section>
          <SectionLabel aside={`${trade.races.length} 个已结识`}>
            贸易伙伴
          </SectionLabel>
          {trade.races.map((race) => (
            <TradeRaceRow
              key={race.id}
              race={race}
              onTrade={onTrade}
              onEmbassy={onEmbassy}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="尚未发现贸易种族"
          description="推进探索和外交条件后，新的贸易伙伴会出现在这里。"
        />
      )}
    </div>
  );
}

function ReligionUpgradeRow({
  upgrade,
  onBuy,
}: {
  upgrade: ReligionUpgradeSnapshot;
  onBuy: (id: string, kind: ReligionUpgradeKind) => void;
}) {
  return (
    <article
      className={cn(
        "grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !upgrade.canBuy && "opacity-70"
      )}
      data-religion-upgrade-id={upgrade.id}
      data-religion-upgrade-kind={upgrade.kind}
      data-religion-upgrade-value={upgrade.value}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {upgrade.label}
          </h3>
          {upgrade.enabled > 0 ? (
            <span className="rounded-sm bg-amber-400/10 px-1.5 py-px font-mono text-[10px] text-amber-300">
              {upgrade.enabled}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
          {upgrade.description || "宗教升级"}
        </p>
        <PricePills prices={upgrade.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("self-center", quietActionClass)}
        disabled={!upgrade.canBuy}
        onClick={() => onBuy(upgrade.id, upgrade.kind)}
        aria-label={`购买${upgrade.label}`}
        data-religion-buy={upgrade.id}
      >
        <Sparkles className="size-3.5" />
        购买
      </Button>
    </article>
  );
}

export function ReligionPanel({
  snapshot,
  onPraise,
  onResetFaith,
  onTranscend,
  onSacrifice,
  onBuyUpgrade,
}: {
  snapshot: GameSnapshot;
  onPraise: () => void;
  onResetFaith: () => void;
  onTranscend: () => void;
  onSacrifice: () => void;
  onBuyUpgrade: (id: string, kind: ReligionUpgradeKind) => void;
}) {
  const religion = snapshot.religion;
  const groups: Array<{
    kind: ReligionUpgradeKind;
    title: string;
    items: ReligionUpgradeSnapshot[];
  }> = [
    {
      kind: "religion",
      title: "宗教升级",
      items: religion.upgrades.filter((item) => item.kind === "religion"),
    },
    {
      kind: "ziggurat",
      title: "金字塔建筑",
      items: religion.upgrades.filter((item) => item.kind === "ziggurat"),
    },
    {
      kind: "transcendence",
      title: "超越升级",
      items: religion.upgrades.filter((item) => item.kind === "transcendence"),
    },
  ];

  return (
    <div
      className="animate-in fade-in-0 duration-200"
      data-religion-faith={religion.faith}
      data-religion-worship={religion.worship}
      data-religion-tier={religion.transcendenceTier}
      data-religion-sacrifices={religion.unicornSacrifices}
    >
      <PanelHeading
        eyebrow="宗教"
        title="宗教"
        description="赞美积累崇拜，重置信仰换取顿悟，并逐步开启超越。所有换算与独角兽献祭均沿用原版规则。"
        icon={Church}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              className={primaryActionClass}
              disabled={!religion.canPraise}
              onClick={onPraise}
              data-action="praise"
            >
              <Sparkles className="size-3.5" />
              赞美
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={quietActionClass}
              disabled={!religion.canResetFaith}
              onClick={onResetFaith}
              data-action="reset-faith"
            >
              重置信仰
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={quietActionClass}
              disabled={!religion.canTranscend}
              onClick={onTranscend}
              data-action="transcend"
            >
              超越
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric
          label="信仰"
          value={formatNumber(religion.faith)}
          tone="amber"
          detail={`崇拜 ${formatNumber(religion.worship)}`}
        />
        <Metric
          label="顿悟"
          value={formatNumber(religion.faithRatio)}
          detail={`加成 ${formatPercent(religion.apocryphaBonus)}`}
          tone="green"
        />
        <Metric
          label="超越层级"
          value={religion.transcendenceTier}
          detail={`下级 ${formatNumber(religion.nextTranscendenceCost)}`}
        />
        <Metric
          label="独角兽献祭"
          value={religion.unicornSacrifices}
          detail={`腐化 ${formatNumber(religion.corruption, 3)}`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
        <div className="min-w-40 flex-1">
          <div className="mb-1 flex items-center justify-between text-[10px] text-stone-500">
            <span>崇拜积累</span>
            <span className="font-mono">{formatNumber(religion.worship)}</span>
          </div>
          <Meter
            value={
              religion.faithRatio > 0
                ? Math.min(100, religion.apocryphaBonus * 100)
                : religion.canPraise
                  ? 100
                  : 0
            }
            label="崇拜积累"
            tone="green"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-stone-400 hover:bg-white/[0.06] hover:text-rose-200"
          disabled={!religion.canSacrifice}
          onClick={onSacrifice}
          data-action="sacrifice-unicorns"
        >
          献祭独角兽
        </Button>
      </div>

      {religion.upgrades.length > 0 ? (
        groups.map((group) => (
          <section key={group.kind}>
            <SectionLabel aside={group.items.length}>
              {group.title}
            </SectionLabel>
            {group.items.length > 0 ? (
              group.items.map((upgrade) => (
                <ReligionUpgradeRow
                  key={`${upgrade.kind}-${upgrade.id}`}
                  upgrade={upgrade}
                  onBuy={onBuyUpgrade}
                />
              ))
            ) : (
              <div className="px-5 py-4 text-xs text-stone-600">
                暂无可用项目
              </div>
            )}
          </section>
        ))
      ) : (
        <EmptyState
          title="宗教尚未开启"
          description="积累信仰并建造宗教设施后，升级会出现在这里。"
        />
      )}
    </div>
  );
}

function SpaceProgramRow({
  program,
  onLaunch,
}: {
  program: SpaceProgramSnapshot;
  onLaunch: (id: string) => void;
}) {
  const state =
    program.value === 0 ? null : program.enabled === 0 ? "航行中" : "已完成";

  return (
    <article
      className={cn(
        "grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !program.canLaunch && "opacity-75"
      )}
      data-space-program-id={program.id}
      data-space-program-value={program.value}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {program.label}
          </h3>
          {state ? (
            <span className="rounded-sm bg-emerald-400/10 px-1.5 py-px text-[10px] text-emerald-300">
              {state}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
          {program.description || "太空任务"}
        </p>
        <PricePills prices={program.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        className={cn("self-center", primaryActionClass)}
        disabled={!program.canLaunch}
        onClick={() => onLaunch(program.id)}
        aria-label={`启动${program.label}`}
        data-space-launch={program.id}
      >
        <Rocket className="size-3.5" />
        启动
      </Button>
    </article>
  );
}

function SpaceBuildingRow({
  building,
  onBuy,
}: {
  building: SpaceBuildingSnapshot;
  onBuy: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        "grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !building.canBuy && "opacity-70"
      )}
      data-space-building-id={building.id}
      data-space-building-value={building.value}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {building.label}
          </h3>
          {building.value > 0 ? (
            <span className="rounded-sm bg-amber-400/10 px-1.5 py-px font-mono text-[10px] text-amber-300">
              {building.enabled} / {building.value}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
          {building.description || "太空建筑"}
        </p>
        <PricePills prices={building.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("self-center", quietActionClass)}
        disabled={!building.canBuy}
        onClick={() => onBuy(building.id)}
        aria-label={`建造${building.label}`}
        data-space-build={building.id}
      >
        <Rocket className="size-3.5" />
        建造
      </Button>
    </article>
  );
}

export function SpacePanel({
  snapshot,
  onLaunch,
  onBuy,
}: {
  snapshot: GameSnapshot;
  onLaunch: (id: string) => void;
  onBuy: (id: string) => void;
}) {
  const [tab, setTab] = useState<"programs" | "planets">("programs");
  const space = snapshot.space;
  const visiblePlanets = space.planets.filter(
    (planet) => planet.reached || planet.buildings.length > 0
  );

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow="太空"
        title="太空"
        description="研发并启动太空任务，抵达行星后建造轨道设施。航程、价格倍率与解锁条件由原版太空管理器计算。"
        icon={Rocket}
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric
          label="可用任务"
          value={space.programs.filter((program) => program.canLaunch).length}
        />
        <Metric
          label="已完成任务"
          value={space.programs.filter((program) => program.value > 0).length}
          tone="green"
        />
        <Metric
          label="已抵达行星"
          value={visiblePlanets.filter((p) => p.reached).length}
        />
        <Metric
          label="太空建筑"
          value={visiblePlanets.reduce(
            (total, planet) =>
              total +
              planet.buildings.reduce(
                (subtotal, building) => subtotal + building.value,
                0
              ),
            0
          )}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "programs" | "planets")}
        className="gap-0"
      >
        <div className="border-b border-white/[0.07] bg-black/10 px-5 py-3">
          <TabsList className="h-8 rounded-md bg-black/20 p-0.5">
            <TabsTrigger
              value="programs"
              className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
            >
              任务
              <span className="font-mono text-[10px] text-stone-500">
                {space.programs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="planets"
              className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
            >
              行星
              <span className="font-mono text-[10px] text-stone-500">
                {visiblePlanets.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="programs" className="m-0">
          {space.programs.length > 0 ? (
            <section>
              <SectionLabel aside={space.programs.length}>
                太空任务
              </SectionLabel>
              {space.programs.map((program) => (
                <SpaceProgramRow
                  key={program.id}
                  program={program}
                  onLaunch={onLaunch}
                />
              ))}
            </section>
          ) : (
            <EmptyState
              title="还没有可用任务"
              description="完成轨道工程研究并积累星图与燃料。"
            />
          )}
        </TabsContent>

        <TabsContent value="planets" className="m-0">
          {visiblePlanets.length > 0 ? (
            visiblePlanets.map((planet) => (
              <section key={planet.id}>
                <SectionLabel
                  aside={
                    planet.reached
                      ? `${planet.buildings.length} 种设施`
                      : `航程 ${formatNumber(planet.routeDays, 1)} 天`
                  }
                >
                  {planet.label}
                </SectionLabel>
                {planet.buildings.length > 0 ? (
                  planet.buildings.map((building) => (
                    <SpaceBuildingRow
                      key={building.id}
                      building={building}
                      onBuy={onBuy}
                    />
                  ))
                ) : (
                  <div className="px-5 py-4 text-xs text-stone-600">
                    任务抵达后开放建造。
                  </div>
                )}
              </section>
            ))
          ) : (
            <EmptyState
              title="尚未抵达行星"
              description="启动太空任务后，行星设施会逐步开放。"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimeUpgradeRow({
  upgrade,
  onBuy,
}: {
  upgrade: TimeUpgradeSnapshot;
  onBuy: (id: string, kind: TimeUpgradeKind) => void;
}) {
  return (
    <article
      className={cn(
        "grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !upgrade.canBuy && "opacity-70"
      )}
      data-time-upgrade-id={upgrade.id}
      data-time-upgrade-kind={upgrade.kind}
      data-time-upgrade-value={upgrade.value}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {upgrade.label}
          </h3>
          {upgrade.value > 0 ? (
            <span className="rounded-sm bg-amber-400/10 px-1.5 py-px font-mono text-[10px] text-amber-300">
              {upgrade.enabled} / {upgrade.value}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
          {upgrade.description || "时间装置"}
        </p>
        <PricePills prices={upgrade.prices} className="mt-2.5" />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("self-center", quietActionClass)}
        disabled={!upgrade.canBuy}
        onClick={() => onBuy(upgrade.id, upgrade.kind)}
        aria-label={`购买${upgrade.label}`}
        data-time-buy={upgrade.id}
      >
        <Clock3 className="size-3.5" />
        购买
      </Button>
    </article>
  );
}

export function TimePanel({
  snapshot,
  onAccelerate,
  onShatter,
  onUseHeat,
  onBuyUpgrade,
  onResetTimeline,
}: {
  snapshot: GameSnapshot;
  onAccelerate: () => void;
  onShatter: () => void;
  onUseHeat: () => void;
  onBuyUpgrade: (id: string, kind: TimeUpgradeKind) => void;
  onResetTimeline: () => void;
}) {
  const time = snapshot.time;
  const prestige = snapshot.prestige;
  const reset = prestige.reset;
  const heatPercent =
    time.heatMax > 0 ? Math.min(100, (time.heat / time.heatMax) * 100) : 0;
  const groups: Array<{
    kind: TimeUpgradeKind;
    title: string;
    items: TimeUpgradeSnapshot[];
  }> = [
    {
      kind: "chronoforge",
      title: "时间熔炉",
      items: time.upgrades.filter((item) => item.kind === "chronoforge"),
    },
    {
      kind: "voidspace",
      title: "虚空空间",
      items: time.upgrades.filter((item) => item.kind === "voidspace"),
    },
  ];

  return (
    <div
      className="animate-in fade-in-0 duration-200"
      data-time-heat={time.heat}
      data-time-accelerated={time.isAccelerated}
      data-time-furnace-heat={time.furnaceHeat}
    >
      <PanelHeading
        eyebrow="时间"
        title="时间"
        description="操控时间通量、热量与时间水晶。加速、碎裂与热机转换均调用原版时间管理器。"
        icon={Clock3}
        actions={
          <Button
            type="button"
            size="sm"
            className={primaryActionClass}
            disabled={!time.canAccelerate}
            onClick={onAccelerate}
            data-action="toggle-time-acceleration"
          >
            <Hourglass className="size-3.5" />
            {time.isAccelerated ? "停止加速" : "开始加速"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric
          label="时间通量"
          value={formatNumber(time.temporalFlux)}
          detail={`上限 ${formatNumber(time.temporalFluxMax)}`}
          tone="green"
        />
        <Metric
          label="时间热量"
          value={formatNumber(time.heat)}
          detail={`上限 ${formatNumber(time.heatMax)}`}
          tone={time.heat > time.heatMax ? "amber" : "default"}
        />
        <Metric
          label="熔炉热量"
          value={formatNumber(time.furnaceHeat)}
          detail="每 100 可跳跃一次"
        />
        <Metric
          label="时间流速"
          value={time.isAccelerated ? "加速" : "正常"}
          tone={time.isAccelerated ? "amber" : "default"}
        />
      </div>

      <div className="border-b border-white/[0.07] px-5 py-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-stone-500">
          <span>时间热量负载</span>
          <span className="font-mono">
            {formatPercent(time.heatMax > 0 ? time.heat / time.heatMax : 0)}
          </span>
        </div>
        <Meter value={heatPercent} label="时间热量负载" tone="amber" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className={primaryActionClass}
            disabled={!time.canShatter}
            onClick={onShatter}
            data-action="shatter-time"
          >
            <Hourglass className="size-3.5" />
            碎裂时间水晶
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={quietActionClass}
            disabled={!time.canUseHeat}
            onClick={onUseHeat}
            data-action="use-chronoforge-heat"
          >
            <Flame className="size-3.5" />
            使用熔炉热量
          </Button>
          <PricePills prices={time.shatterPrices} className="ml-0 sm:ml-2" />
        </div>
      </div>

      <section
        className="border-b border-white/[0.07] bg-[#17120f]/45 px-5 py-4"
        data-reset-kittens={reset.kittens}
        data-reset-karma={reset.karmaPoints}
        data-reset-paragon={reset.paragonPoints}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <RotateCcw className="size-4 text-amber-300" />
              开始新一轮
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[10px] text-stone-600">业力</div>
                <div className="mt-0.5 font-mono text-xs text-stone-200">
                  +{formatNumber(reset.karmaPoints)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-stone-600">
                  累计 {formatNumber(reset.karmaKittens)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-stone-600">领导力</div>
                <div className="mt-0.5 font-mono text-xs text-stone-200">
                  +{formatNumber(reset.paragonPoints)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-stone-600">
                  现有 {formatNumber(prestige.paragon)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-stone-600">幸福度</div>
                <div className="mt-0.5 font-mono text-xs text-emerald-200/80">
                  +{formatPercent(reset.happinessBonus)}
                </div>
                <div className="mt-0.5 text-[10px] text-stone-600">
                  来自业力
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-stone-600">存储 / 产出</div>
                <div className="mt-0.5 truncate font-mono text-xs text-amber-200/80">
                  +{formatPercent(reset.storageBonus)} / +
                  {formatPercent(reset.productionBonus)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-stone-600">
                  {prestige.ironWill
                    ? `铁猫额外斑马 ${formatNumber(reset.zebraKittens)}`
                    : "业力斑马保留"}
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-rose-400/20 bg-rose-400/[0.03] text-rose-200 hover:bg-rose-400/10"
            disabled={!reset.canReset}
            onClick={onResetTimeline}
            data-action="reset-timeline"
          >
            <RotateCcw className="size-3.5" />
            开始新一轮
          </Button>
        </div>
      </section>

      {time.upgrades.length > 0 ? (
        groups.map((group) => (
          <section key={group.kind}>
            <SectionLabel aside={group.items.length}>
              {group.title}
            </SectionLabel>
            {group.items.length > 0 ? (
              group.items.map((upgrade) => (
                <TimeUpgradeRow
                  key={`${upgrade.kind}-${upgrade.id}`}
                  upgrade={upgrade}
                  onBuy={onBuyUpgrade}
                />
              ))
            ) : (
              <div className="px-5 py-4 text-xs text-stone-600">
                暂无可用装置
              </div>
            )}
          </section>
        ))
      ) : (
        <EmptyState
          title="时间系统尚未开启"
          description="研究时间相关技术后，时间装置会在这里出现。"
        />
      )}
    </div>
  );
}

function ChallengeRow({
  challenge,
  onToggle,
}: {
  challenge: ChallengeSnapshot;
  onToggle: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        "grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]",
        !challenge.canToggle && "opacity-70"
      )}
      data-challenge-id={challenge.id}
      data-challenge-pending={challenge.pending}
      data-challenge-active={challenge.active}
      data-challenge-completions={challenge.completions}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {challenge.label}
          </h3>
          {challenge.active ? (
            <span className="rounded-sm bg-amber-400/10 px-1.5 py-px text-[10px] text-amber-300">
              进行中
            </span>
          ) : null}
          {challenge.pending ? (
            <span className="rounded-sm bg-rose-400/10 px-1.5 py-px text-[10px] text-rose-300">
              待开始
            </span>
          ) : null}
          {challenge.completions > 0 ? (
            <span className="rounded-sm bg-emerald-400/10 px-1.5 py-px font-mono text-[10px] text-emerald-300">
              ×{challenge.completions}
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
          {challenge.description || "挑战规则"}
        </p>
        {challenge.effectDescription ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-200/65">
            {challenge.effectDescription}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={challenge.pending ? "outline" : "default"}
        className={cn(
          "self-center",
          challenge.pending ? quietActionClass : primaryActionClass
        )}
        disabled={!challenge.canToggle || challenge.active}
        onClick={() => onToggle(challenge.id)}
        aria-label={
          challenge.pending
            ? `取消${challenge.label}`
            : `准备${challenge.label}`
        }
        data-challenge-toggle={challenge.id}
      >
        {challenge.pending ? "取消" : "准备"}
      </Button>
    </article>
  );
}

export function ChallengesPanel({
  snapshot,
  onToggle,
  onApply,
}: {
  snapshot: GameSnapshot;
  onToggle: (id: string) => void;
  onApply: () => void;
}) {
  const challenges = snapshot.challenges;

  return (
    <div className="animate-in fade-in-0 duration-200">
      <PanelHeading
        eyebrow="挑战"
        title="挑战"
        description="选择挑战规则并在下一次重置时生效。完成次数会永久叠加相应效果，开始挑战前的确认与原版一致。"
        icon={Trophy}
        actions={
          <Button
            type="button"
            size="sm"
            className={primaryActionClass}
            disabled={!challenges.canApplyPending}
            onClick={onApply}
            data-action="apply-challenges"
          >
            <Trophy className="size-3.5" />
            开始 {challenges.pendingCount} 项挑战
          </Button>
        }
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric label="可用挑战" value={challenges.challenges.length} />
        <Metric
          label="进行中"
          value={challenges.activeCount}
          tone={challenges.activeCount > 0 ? "amber" : "default"}
        />
        <Metric
          label="待开始"
          value={challenges.pendingCount}
          tone={challenges.pendingCount > 0 ? "amber" : "default"}
        />
        <Metric
          label="完成次数"
          value={challenges.completionCount}
          tone="green"
        />
      </div>

      {challenges.challenges.length > 0 ? (
        <section>
          <SectionLabel aside={challenges.challenges.length}>
            挑战列表
          </SectionLabel>
          {challenges.challenges.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              onToggle={onToggle}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="挑战尚未解锁"
          description="继续推进太空与时间系统。"
        />
      )}
    </div>
  );
}

function AchievementRow({ achievement }: { achievement: AchievementSnapshot }) {
  return (
    <article
      className={cn(
        "flex items-start gap-3 border-b border-white/[0.07] px-5 py-4 last:border-b-0",
        !achievement.unlocked && !achievement.hidden && "opacity-65",
        achievement.unethical && "bg-rose-400/[0.025]"
      )}
      data-achievement-id={achievement.id}
      data-achievement-unlocked={achievement.unlocked}
      data-achievement-unethical={achievement.unethical}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
          achievement.unlocked
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border-white/[0.06] bg-black/10 text-stone-600"
        )}
      >
        {achievement.starUnlocked ? (
          <Star className="size-4 fill-current" />
        ) : achievement.unlocked ? (
          <BadgeCheck className="size-4" />
        ) : (
          <Lock className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-100">
            {achievement.label}
          </h3>
          {achievement.hasStar ? (
            <Star
              className={cn(
                "size-3.5",
                achievement.starUnlocked
                  ? "fill-amber-300 text-amber-300"
                  : "text-stone-600"
              )}
            />
          ) : null}
          {achievement.unethical ? (
            <span className="rounded-sm border border-rose-400/15 bg-rose-400/[0.06] px-1.5 py-px text-[10px] text-rose-300/75">
              不计量
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {achievement.description}
        </p>
      </div>
    </article>
  );
}

export function ProgressPanel({ snapshot }: { snapshot: GameSnapshot }) {
  const [tab, setTab] = useState<"achievements" | "stats">("achievements");
  const [query, setQuery] = useState("");
  const progress = snapshot.progress;
  const visibleAchievements = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    if (!needle) return progress.achievements;
    return progress.achievements.filter((achievement) =>
      [achievement.label, achievement.description].some((value) =>
        value.toLocaleLowerCase("zh-CN").includes(needle)
      )
    );
  }, [progress.achievements, query]);
  const unlockedBadges = progress.badges.filter((badge) => badge.unlocked);

  return (
    <div
      className="animate-in fade-in-0 duration-200"
      data-progress-achievements={`${progress.unlockedAchievements}/${progress.totalAchievements}`}
      data-progress-stars={`${progress.unlockedStars}/${progress.totalStars}`}
    >
      <PanelHeading
        eyebrow="传承"
        title="进度"
        description="回顾成就、徽章与跨存档统计。隐藏成就只在解锁后揭示条件，历史数据直接来自原版管理器。"
        icon={Trophy}
      />

      <div className="grid grid-cols-2 border-b border-white/10 bg-black/10 lg:grid-cols-4">
        <Metric
          label="成就"
          value={`${progress.unlockedAchievements} / ${progress.totalAchievements}`}
          tone="green"
        />
        <Metric
          label="星标"
          value={`${progress.unlockedStars} / ${progress.totalStars}`}
          tone="amber"
        />
        <Metric label="徽章" value={unlockedBadges.length} />
        <Metric label="挑战完成" value={snapshot.challenges.completionCount} />
      </div>

      {unlockedBadges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-5 py-3">
          <span className="mr-1 text-[10px] tracking-wide text-stone-600">
            已获徽章
          </span>
          {unlockedBadges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center gap-1 rounded-sm border border-amber-400/15 bg-amber-400/[0.06] px-2 py-1 text-[10px] text-amber-200/80"
              data-badge-id={badge.id}
            >
              <Trophy className="size-3" />
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "achievements" | "stats")}
        className="gap-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/[0.07] bg-black/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-8 w-fit rounded-md bg-black/20 p-0.5">
            <TabsTrigger
              value="achievements"
              className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
            >
              成就
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
            >
              统计
            </TabsTrigger>
          </TabsList>
          {tab === "achievements" ? (
            <div className="relative min-w-0 sm:w-56">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="筛选成就"
                aria-label="筛选成就"
                className="h-8 border-white/10 bg-black/15 text-xs text-stone-200 placeholder:text-stone-600"
              />
            </div>
          ) : null}
        </div>

        <TabsContent value="achievements" className="m-0">
          {visibleAchievements.length > 0 ? (
            <section>
              <SectionLabel aside={visibleAchievements.length}>
                成就列表
              </SectionLabel>
              {visibleAchievements.map((achievement) => (
                <AchievementRow
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </section>
          ) : (
            <EmptyState
              title="没有匹配的成就"
              description="调整筛选条件后再试。"
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="m-0">
          {progress.statGroups.map((group) => (
            <section key={group.id}>
              <SectionLabel aside={group.stats.length}>
                {group.label}
              </SectionLabel>
              <div className="grid md:grid-cols-2">
                {group.stats.map((stat) => (
                  <div
                    key={`${group.id}-${stat.id}`}
                    className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3 md:border-r md:[&:nth-child(2n)]:border-r-0"
                    data-stat-id={stat.id}
                    data-stat-group={group.id}
                    data-stat-unlocked={stat.unlocked}
                  >
                    <span className="text-xs text-stone-500">
                      {stat.unlocked ? stat.label : "???"}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-stone-200">
                      {stat.unlocked
                        ? typeof stat.value === "number"
                          ? formatNumber(stat.value)
                          : stat.value
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
