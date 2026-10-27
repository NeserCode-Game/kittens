import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Cat,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Leaf,
  LoaderCircle,
  Menu,
  RefreshCw,
  Save,
  Settings2,
  Sprout,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  actionReasonLabel,
  formatPercent,
  RESOURCE_ORDER,
} from "@/features/kittens/game-format";
import {
  BonfirePanel,
  GameSettingsPanel,
  SciencePanel,
  VillagePanel,
  WorkshopPanel,
} from "@/features/kittens/game-panels";
import { ResourceChip } from "@/features/kittens/game-shared";
import { useKittensGame } from "@/features/kittens/use-kittens-game";
import type { ActionResult, GameSnapshot } from "@/game/kernel/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  id: "bonfire" | "village" | "science" | "workshop" | "settings";
  label: string;
  caption: string;
  icon: LucideIcon;
}> = [
  {
    id: "bonfire",
    label: "营火",
    caption: "资源与建筑",
    icon: Sprout,
  },
  {
    id: "village",
    label: "村庄",
    caption: "人口与职业",
    icon: Cat,
  },
  {
    id: "science",
    label: "科学",
    caption: "科技与政策",
    icon: Leaf,
  },
  {
    id: "workshop",
    label: "工坊",
    caption: "制作与升级",
    icon: Wrench,
  },
  {
    id: "settings",
    label: "游戏设置",
    caption: "显示与存档",
    icon: Settings2,
  },
];

type NavId = (typeof NAV_ITEMS)[number]["id"];

function Navigation({
  activeNav,
  onNavigate,
  compact = false,
}: {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  compact?: boolean;
}) {
  return (
    <nav aria-label="游戏系统" className="flex min-h-0 flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeNav === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn(
              "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
              active
                ? "bg-amber-400/12 text-amber-200"
                : "text-stone-400 hover:bg-white/[0.04] hover:text-stone-200",
              item.id === "settings" && "mt-2 border-t border-white/[0.07] pt-3"
            )}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                active
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                  : "border-white/[0.06] bg-black/10 text-stone-500 group-hover:text-stone-300"
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {item.label}
              </span>
              {!compact ? (
                <span className="mt-0.5 block truncate text-[10px] text-stone-600">
                  {item.caption}
                </span>
              ) : null}
            </span>
            {active ? <ChevronRight className="size-3.5" /> : null}
          </button>
        );
      })}
    </nav>
  );
}

function GameConfirmation({
  snapshot,
  onResolve,
}: {
  snapshot: GameSnapshot;
  onResolve: (accept: boolean) => void;
}) {
  const pending = snapshot.pendingConfirmation;

  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open && pending) onResolve(false);
      }}
    >
      <DialogContent
        className="border-white/10 bg-[#171c16] text-stone-100 shadow-2xl sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-stone-50">
            {pending?.title || "确认操作"}
          </DialogTitle>
          <DialogDescription className="leading-relaxed text-stone-400">
            {pending?.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-transparent text-stone-300 hover:bg-white/10 hover:text-stone-100"
            onClick={() => onResolve(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            className="bg-amber-400 text-stone-950 hover:bg-amber-300"
            onClick={() => onResolve(true)}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KittensGame() {
  const { kernel, snapshot, error } = useKittensGame();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<NavId>("bonfire");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  if (error) {
    return (
      <section className="flex h-full w-full items-center justify-center bg-[#101410] px-6 text-stone-100">
        <div className="max-w-md rounded-lg border border-rose-500/30 bg-rose-950/20 p-6 text-center">
          <CircleAlert className="mx-auto size-8 text-rose-400" />
          <h1 className="mt-3 text-lg font-semibold">游戏引擎未能启动</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">{error}</p>
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

  const runAction = (label: string, action: () => ActionResult) => {
    const result = action();
    setLastAction(
      result.ok ? label : `未完成：${actionReasonLabel(result.reason)}`
    );
  };
  const navigate = (id: NavId) => {
    setActiveNav(id);
    setMobileNavOpen(false);
  };

  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeNav)?.label ?? "营火";

  return (
    <section
      className="kittens-game-view grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#101410] text-stone-100"
      aria-label="猫国建设者"
    >
      <header className="flex min-w-0 items-center gap-2 border-b border-white/10 bg-[#151a15] px-3 py-2 sm:gap-3 sm:px-4">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-stone-400 hover:bg-white/10 hover:text-stone-100 lg:hidden"
              aria-label="打开系统导航"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] border-white/10 bg-[#121612] text-stone-100"
          >
            <SheetHeader className="border-b border-white/10 pb-5 text-left">
              <SheetTitle className="flex items-center gap-2 font-serif text-lg text-stone-50">
                <Cat className="size-5 text-amber-300" />
                猫国建设者
              </SheetTitle>
              <SheetDescription className="text-xs text-stone-500">
                原生逻辑 · {snapshot.version}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-2 min-h-0 flex-1 px-2">
              <Navigation activeNav={activeNav} onNavigate={navigate} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 shrink items-center gap-2 lg:mr-2 lg:flex">
          <span className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-300 sm:flex">
            <Cat className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-stone-200 lg:text-sm">
              <span className="lg:hidden">{activeLabel}</span>
              <span className="hidden lg:inline">猫国建设者</span>
            </div>
            <div className="hidden text-[9px] text-stone-600 sm:block">
              原生内核
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-0.5 sm:gap-2">
          {resources.map((resource) => (
            <ResourceChip key={resource.id} resource={resource} />
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-3 border-l border-white/10 pl-4 md:flex">
          <div className="text-right">
            <div className="text-[10px] text-stone-500">
              {snapshot.calendar.seasonLabel} · 第 {snapshot.calendar.year} 年
            </div>
            <div className="mt-0.5 font-mono text-xs text-stone-300 tabular-nums">
              第 {snapshot.calendar.day} 天
            </div>
          </div>
          <CalendarDays className="size-5 text-stone-500" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-stone-400 hover:bg-white/10 hover:text-amber-200"
          onClick={() => runAction("游戏已保存", () => kernel.save())}
          aria-label="快速保存"
        >
          <Save className="size-4" />
        </Button>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_280px]">
        <aside className="hidden min-h-0 border-r border-white/10 bg-[#121612] p-2.5 lg:flex lg:flex-col">
          <div className="mb-3 px-2 text-[10px] font-semibold tracking-[0.18em] text-stone-600 uppercase">
            发展阶段
          </div>
          <Navigation activeNav={activeNav} onNavigate={navigate} />
          <div className="mt-4 border-t border-white/[0.07] px-2 pt-3 text-[10px] leading-relaxed text-stone-600">
            M2 原生系统
          </div>
        </aside>

        <main className="min-h-0 min-w-0 overflow-y-auto bg-[#181d18]">
          {activeNav === "bonfire" ? (
            <BonfirePanel
              snapshot={snapshot}
              onGather={() => runAction("采集了猫薄荷", () => kernel.gather())}
              onCraft={() => runAction("精炼了木材", () => kernel.craftWood())}
              onBuy={(id) =>
                runAction("完成建造", () => kernel.buyBuilding(id))
              }
            />
          ) : activeNav === "village" ? (
            <VillagePanel
              snapshot={snapshot}
              onAssign={(id, amount) =>
                runAction("已调整职业", () => kernel.assignJob(id, amount))
              }
              onUnassign={(id, amount) =>
                runAction("已调整职业", () => kernel.unassignJob(id, amount))
              }
            />
          ) : activeNav === "science" ? (
            <SciencePanel
              snapshot={snapshot}
              onResearch={(id, kind) =>
                runAction("研究完成", () => kernel.research(id, kind))
              }
            />
          ) : activeNav === "workshop" ? (
            <WorkshopPanel
              snapshot={snapshot}
              onCraft={(id, amount) =>
                runAction("制作完成", () => kernel.craft(id, amount))
              }
              onCraftAll={(id) =>
                runAction("批量制作完成", () => kernel.craftAll(id))
              }
              onBuy={(id) => runAction("购买升级", () => kernel.buyUpgrade(id))}
            />
          ) : (
            <GameSettingsPanel
              snapshot={snapshot}
              onSet={(id, value) =>
                runAction("设置已更新", () => kernel.setSetting(id, value))
              }
            />
          )}
        </main>

        <aside className="hidden min-h-0 flex-col border-l border-white/10 bg-[#121612] xl:flex">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
                本地存档
              </span>
              <span className="rounded-sm bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                原版格式
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
              onClick={() => runAction("游戏已保存", () => kernel.save())}
            >
              <Save className="size-4" />
              保存游戏
            </Button>
          </div>

          <div className="grid grid-cols-2 border-b border-white/10">
            <div className="border-r border-white/[0.07] p-4">
              <div className="text-[10px] text-stone-600">人口</div>
              <div className="mt-1 font-mono text-lg text-stone-100">
                {snapshot.village.kittens}
              </div>
              <div className="text-[10px] text-stone-600">
                {snapshot.village.freeKittens} 空闲
              </div>
            </div>
            <div className="p-4">
              <div className="text-[10px] text-stone-600">幸福</div>
              <div className="mt-1 font-mono text-lg text-amber-300">
                {formatPercent(snapshot.village.happiness)}
              </div>
              <div className="text-[10px] text-stone-600">
                {snapshot.village.leaderName ?? "无领袖"}
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 p-4">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
              最近行动
            </div>
            <div
              className="mt-3 min-h-16 border-l-2 border-amber-400/35 bg-black/10 px-3 py-2 text-xs leading-relaxed text-stone-400"
              aria-live="polite"
            >
              {lastAction ?? snapshot.lastMessage ?? "还没有行动记录。"}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
              进度
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">可用研究</span>
                <span className="font-mono text-stone-300">
                  {snapshot.science.availableCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">已完成研究</span>
                <span className="font-mono text-stone-300">
                  {snapshot.science.researchedCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">工坊配方</span>
                <span className="font-mono text-stone-300">
                  {snapshot.workshop.crafts.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-500">待购升级</span>
                <span className="font-mono text-stone-300">
                  {
                    snapshot.workshop.upgrades.filter(
                      (upgrade) => !upgrade.researched
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          <footer className="border-t border-white/10 p-4 text-[10px] leading-relaxed text-stone-600">
            <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                ["官方网站", "https://kittensgame.com/web/"],
                ["英文 WIKI", "https://wiki.kittensgame.com/en/home"],
                ["中文 WIKI", "https://lolitalibrary.com/wiki/"],
                ["上游源码", "https://github.com/nuclear-unicorn/kittensgame"],
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
              <span className="font-mono text-stone-500 tabular-nums">
                {snapshot.ticks}
              </span>
            </div>
          </footer>
        </aside>
      </div>

      <GameConfirmation
        snapshot={snapshot}
        onResolve={(accept) =>
          runAction(accept ? "操作已确认" : "操作已取消", () =>
            kernel.resolvePendingConfirmation(accept)
          )
        }
      />
    </section>
  );
}
