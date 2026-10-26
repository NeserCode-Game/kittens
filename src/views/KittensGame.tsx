import {
  CalendarDays,
  Cat,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Hammer,
  Leaf,
  LoaderCircle,
  RefreshCw,
  Save,
  Sprout,
  Trees,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useKittensGame } from "@/features/kittens/use-kittens-game";
import type {
  BuildingSnapshot,
  ResourceSnapshot,
} from "@/game/kernel/types";
import { cn } from "@/lib/utils";

const RESOURCE_ORDER = [
  "catnip",
  "wood",
  "minerals",
  "science",
  "culture",
  "faith",
  "kittens",
];

const NAV_ITEMS = [
  { id: "bonfire", label: "营火", icon: Sprout, ready: true },
  { id: "village", label: "村庄", icon: Cat, ready: false },
  { id: "science", label: "科学", icon: Leaf, ready: false },
  { id: "workshop", label: "工坊", icon: Wrench, ready: false },
] as const;

function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "∞";
  if (value !== 0 && Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
  }).format(value);
}

function formatRate(value: number): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 3)}`;
}

function ResourceChip({ resource }: { resource: ResourceSnapshot }) {
  const capacity =
    resource.maxValue > 0
      ? Math.min(100, (resource.value / resource.maxValue) * 100)
      : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="group relative min-w-28 overflow-hidden rounded-md border border-white/10 bg-white/[0.045] px-3 py-2"
          data-resource-id={resource.id}
          data-resource-value={resource.value}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-medium tracking-wide text-stone-400">
              {resource.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                resource.perTick > 0
                  ? "text-emerald-400/80"
                  : resource.perTick < 0
                    ? "text-rose-400/80"
                    : "text-stone-500"
              )}
            >
              {formatRate(resource.perTick)}
            </span>
          </div>
          <div className="mt-0.5 text-right font-mono text-[15px] font-semibold tabular-nums text-stone-100">
            {formatNumber(resource.value)}
            {resource.maxValue > 0 ? (
              <span className="ml-1 text-[10px] font-normal text-stone-500">
                / {formatNumber(resource.maxValue)}
              </span>
            ) : null}
          </div>
          {capacity !== null ? (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
              <div
                className={cn(
                  "h-full transition-[width] duration-300",
                  resource.capped ? "bg-amber-400" : "bg-emerald-500/70"
                )}
                style={{ width: `${capacity}%` }}
              />
            </div>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        当前 {formatNumber(resource.value, 3)}，每 0.2 秒
        {formatRate(resource.perTick)}
      </TooltipContent>
    </Tooltip>
  );
}

function PricePill({
  price,
}: {
  price: BuildingSnapshot["prices"][number];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] tabular-nums",
        price.affordable
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
      )}
    >
      {price.label}
      <strong className="font-mono font-semibold">
        {formatNumber(price.value)}
      </strong>
    </span>
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
        "group grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/[0.07] px-5 py-4 transition-colors last:border-b-0",
        building.canBuy ? "hover:bg-white/[0.035]" : "opacity-60"
      )}
      data-building-id={building.id}
      data-building-enabled={building.enabled}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-stone-100">
            {building.label}
          </h3>
          {building.enabled > 0 ? (
            <span className="rounded bg-amber-400/15 px-1.5 py-px font-mono text-[10px] text-amber-300">
              {building.enabled}
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">
          {building.description || "可建造设施"}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {building.prices.map((price) => (
            <PricePill key={price.id} price={price} />
          ))}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-center border-amber-400/25 bg-amber-400/5 text-amber-200 hover:border-amber-300/50 hover:bg-amber-400/15 hover:text-amber-100"
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

export default function KittensGame() {
  const { kernel, snapshot, error } = useKittensGame();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("bonfire");

  const resources = useMemo(() => {
    if (!snapshot) return [];
    const byId = new Map(
      snapshot.resources.map((resource) => [resource.id, resource])
    );
    return RESOURCE_ORDER.flatMap((id) => {
      const resource = byId.get(id);
      return resource?.visible ? [resource] : [];
    });
  }, [snapshot]);

  const buildingGroups = useMemo(() => {
    if (!snapshot) return [];
    const groups = new Map<string, BuildingSnapshot[]>();
    for (const building of snapshot.buildings) {
      const list = groups.get(building.group) ?? [];
      list.push(building);
      groups.set(building.group, list);
    }
    return [...groups.entries()];
  }, [snapshot]);

  if (error) {
    return (
      <section className="flex h-full w-full items-center justify-center bg-[#101410] px-6 text-stone-100">
        <div className="max-w-md rounded-lg border border-rose-500/30 bg-rose-950/20 p-6 text-center">
          <CircleAlert className="mx-auto size-8 text-rose-400" />
          <h1 className="mt-3 text-lg font-semibold">游戏引擎未能启动</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-white/15 bg-transparent text-stone-200 hover:bg-white/10"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" />
            重新加载
          </Button>
        </div>
      </section>
    );
  }

  if (!kernel || !snapshot) {
    return (
      <section
        className="flex h-full w-full items-center justify-center bg-[#101410]"
        role="status"
      >
        <div className="flex flex-col items-center gap-3 text-stone-400">
          <LoaderCircle className="size-7 animate-spin text-amber-400" />
          <span className="text-sm">正在唤醒猫薄荷森林</span>
        </div>
      </section>
    );
  }

  const catnip = snapshot.resources.find(
    (resource) => resource.id === "catnip"
  );

  const runAction = (name: string, action: () => { ok: boolean }) => {
    const result = action();
    setLastAction(result.ok ? name : "行动失败：资源不足或尚未解锁");
  };

  return (
    <section
      className="kittens-game-view grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101410] text-stone-100"
      aria-label="猫国建设者"
    >
      <header className="flex min-w-0 items-center gap-3 border-b border-white/10 bg-[#151a15] px-4 py-2.5">
        <div className="mr-2 hidden shrink-0 items-center gap-2 lg:flex">
          <span className="flex size-7 items-center justify-center rounded-md bg-amber-400/15 text-amber-300">
            <Cat className="size-4" />
          </span>
          <span className="text-sm font-semibold">猫国建设者</span>
        </div>
        <div className="flex min-w-0 flex-1 items-stretch gap-2 overflow-x-auto pb-0.5">
          {resources.map((resource) => (
            <ResourceChip key={resource.id} resource={resource} />
          ))}
        </div>
        <div className="ml-2 hidden shrink-0 items-center gap-3 border-l border-white/10 pl-4 md:flex">
          <div className="text-right">
            <div className="text-[10px] text-stone-500">
              {snapshot.calendar.seasonLabel} · 第 {snapshot.calendar.year} 年
            </div>
            <div className="mt-0.5 text-xs tabular-nums text-stone-300">
              第 {snapshot.calendar.day} 天
            </div>
          </div>
          <CalendarDays className="size-5 text-stone-500" />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[160px_minmax(0,1fr)_250px] xl:grid-cols-[176px_minmax(0,1fr)_280px]">
        <aside className="min-h-0 border-r border-white/10 bg-[#121612] p-2.5">
          <div className="mb-3 px-2 text-[10px] font-semibold tracking-[0.18em] text-stone-600 uppercase">
            发展阶段
          </div>
          <nav aria-label="游戏系统" className="stack-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs transition-colors",
                    activeNav === item.id
                      ? "bg-amber-400/12 text-amber-200"
                      : "text-stone-400 hover:bg-white/[0.04] hover:text-stone-200",
                    !item.ready && "text-stone-600"
                  )}
                  onClick={() => setActiveNav(item.id)}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {activeNav === item.id ? (
                    <ChevronRight className="size-3.5" />
                  ) : null}
                  {!item.ready ? (
                    <span className="text-[9px] text-stone-700">后续</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-0 min-w-0 overflow-y-auto bg-[#181d18]">
          {activeNav === "bonfire" ? (
            <>
              <div className="border-b border-white/10 px-5 py-5">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-amber-400/70 uppercase">
                      Bonfire
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-50">
                      营火
                    </h1>
                    <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-stone-500">
                      在森林边收集猫薄荷，将其精炼为木材，并为新的猫猫搭建居所。
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 lg:flex-row">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-400 text-stone-950 hover:bg-amber-300"
                      onClick={() =>
                        runAction("采集了猫薄荷", () => kernel.gather())
                      }
                    >
                      <Sprout className="size-4" />
                      采集猫薄荷
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-transparent text-stone-200 hover:bg-white/10"
                      onClick={() =>
                        runAction("精炼了木材", () => kernel.craftWood())
                      }
                    >
                      <Trees className="size-4" />
                      精炼木材
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-stone-500">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  模拟运行中 · 每 200 毫秒推进一次
                  {catnip ? (
                    <span className="ml-3 text-stone-400">
                      猫薄荷产量 {formatRate(catnip.perTick)} / 刻
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                {buildingGroups.map(([group, buildings]) => (
                  <section key={group}>
                    <h2 className="border-b border-white/[0.06] bg-black/10 px-5 py-2 text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
                      {buildings[0]?.groupLabel ?? group}
                    </h2>
                    {buildings.map((building) => (
                      <BuildingRow
                        key={building.id}
                        building={building}
                        onBuy={(id) =>
                          runAction("完成建造", () =>
                            kernel.buyBuilding(id)
                          )
                        }
                      />
                    ))}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-500">
              <Wrench className="size-7" />
              <p className="text-sm">该系统的原生界面正在接入</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                onClick={() => setActiveNav("bonfire")}
              >
                返回营火
              </Button>
            </div>
          )}
        </main>

        <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[#121612]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
                存档
              </span>
              <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                本地
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
              onClick={() =>
                runAction("游戏已保存", () => kernel.save())
              }
            >
              <Save className="size-4" />
              保存游戏
            </Button>
            <p className="mt-2 text-[10px] leading-relaxed text-stone-600">
              存档保持原版格式，刷新或重新打开应用后继续。
            </p>
          </div>

          <div className="flex-1 p-4">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
              最近行动
            </div>
            <div
              className="mt-3 rounded-md border border-white/[0.07] bg-black/10 p-3 text-xs leading-relaxed text-stone-400"
              aria-live="polite"
            >
              {lastAction ?? snapshot.lastMessage ?? "还没有行动记录。"}
            </div>
          </div>

          <footer className="border-t border-white/10 p-4 text-[10px] leading-relaxed text-stone-600">
            <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                ["官方网站", "https://kittensgame.com/web/"],
                ["英文 WIKI", "https://wiki.kittensgame.com/en/home"],
                ["中文 WIKI", "https://lolitalibrary.com/wiki/"],
                [
                  "上游源码",
                  "https://github.com/nuclear-unicorn/kittensgame",
                ],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 text-stone-500 transition-colors hover:text-amber-300"
                >
                  <span className="truncate">{label}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span>逻辑版本</span>
              <span className="font-mono text-stone-500">
                {snapshot.version}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>世界刻度</span>
              <span className="font-mono tabular-nums text-stone-500">
                {snapshot.ticks}
              </span>
            </div>
          </footer>
        </aside>
      </div>
    </section>
  );
}
