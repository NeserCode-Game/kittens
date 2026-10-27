import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  Cat,
  ChevronRight,
  Church,
  CircleAlert,
  Clock3,
  ExternalLink,
  FolderOpen,
  Handshake,
  Leaf,
  LoaderCircle,
  Menu,
  RefreshCw,
  Rocket,
  Save,
  Settings2,
  Sprout,
  Trophy,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import {
  ChallengesPanel,
  ProgressPanel,
  ReligionPanel,
  SpacePanel,
  TimePanel,
  TradePanel,
} from "@/features/kittens/game-midgame-panels";
import { SaveManagementDialog } from "@/features/kittens/game-save-dialog";
import { ResourceChip } from "@/features/kittens/game-shared";
import { useKittensGame } from "@/features/kittens/use-kittens-game";
import type { ActionResult, GameSnapshot } from "@/game/kernel/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  id:
    | "bonfire"
    | "village"
    | "science"
    | "workshop"
    | "trade"
    | "religion"
    | "space"
    | "time"
    | "challenges"
    | "progress"
    | "settings";
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
    id: "trade",
    label: "贸易",
    caption: "商队与外交",
    icon: Handshake,
  },
  {
    id: "religion",
    label: "宗教",
    caption: "信仰与超越",
    icon: Church,
  },
  {
    id: "space",
    label: "太空",
    caption: "任务与行星",
    icon: Rocket,
  },
  {
    id: "time",
    label: "时间",
    caption: "通量与热机",
    icon: Clock3,
  },
  {
    id: "challenges",
    label: "挑战",
    caption: "规则与奖励",
    icon: Trophy,
  },
  {
    id: "progress",
    label: "进度",
    caption: "成就与统计",
    icon: Activity,
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
    <nav
      aria-label="游戏系统"
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1"
    >
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
                ? "text-kg-accent bg-amber-400/12"
                : "text-kg-muted hover:bg-kg-hover hover:text-kg-body",
              item.id === "settings" &&
                "border-kg-line-subtle mt-2 border-t pt-3"
            )}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                active
                  ? "text-kg-accent border-amber-400/20 bg-amber-400/10"
                  : "border-kg-line-subtle bg-kg-inset text-kg-muted group-hover:text-kg-body"
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {item.label}
              </span>
              {!compact ? (
                <span className="text-kg-faint mt-0.5 block truncate text-[10px]">
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
        className="kittens-game-theme border-kg-line bg-kg-dialog text-kg-body shadow-2xl sm:max-w-md"
        showCloseButton={false}
        data-confirmation-dialog
      >
        <DialogHeader>
          <DialogTitle className="text-kg-strong font-serif text-lg">
            {pending?.title || "确认操作"}
          </DialogTitle>
          <DialogDescription className="text-kg-muted leading-relaxed">
            {pending?.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            className="border-kg-control text-kg-body hover:bg-kg-hover-strong hover:text-kg-strong bg-transparent"
            onClick={() => onResolve(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            className="text-kg-accent-foreground bg-amber-400 hover:bg-amber-300"
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLocaleLowerCase() !== "s") return;
      const target = event.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;
      if (editing && !event.shiftKey) return;
      event.preventDefault();
      if (event.shiftKey) {
        setSaveDialogOpen(true);
        return;
      }
      if (!kernel) return;
      const result = kernel.save();
      setLastAction(
        result.ok ? "游戏已保存" : `未完成：${actionReasonLabel(result.reason)}`
      );
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [kernel]);

  if (error) {
    return (
      <section className="kittens-game-theme bg-kg-canvas text-kg-body flex h-full w-full items-center justify-center px-6">
        <div className="max-w-md rounded-lg border border-rose-500/30 bg-rose-400/10 p-6 text-center">
          <CircleAlert className="text-kg-danger mx-auto size-8" />
          <h1 className="mt-3 text-lg font-semibold">游戏引擎未能启动</h1>
          <p className="text-kg-muted mt-2 text-sm leading-relaxed">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="border-kg-control text-kg-body hover:bg-kg-hover-strong mt-4 bg-transparent"
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
        className="kittens-game-theme bg-kg-canvas text-kg-body flex h-full w-full items-center justify-center"
        role="status"
      >
        <div className="text-kg-muted flex flex-col items-center gap-3">
          <LoaderCircle className="text-kg-accent size-7 animate-spin" />
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
    window.requestAnimationFrame(() => mainRef.current?.focus());
  };

  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeNav)?.label ?? "营火";

  const renderPanel = () => {
    switch (activeNav) {
      case "bonfire":
        return (
          <BonfirePanel
            snapshot={snapshot}
            onGather={() => runAction("采集了猫薄荷", () => kernel.gather())}
            onCraft={() => runAction("精炼了木材", () => kernel.craftWood())}
            onBuy={(id) => runAction("完成建造", () => kernel.buyBuilding(id))}
          />
        );
      case "village":
        return (
          <VillagePanel
            snapshot={snapshot}
            onAssign={(id, amount) =>
              runAction("已调整职业", () => kernel.assignJob(id, amount))
            }
            onUnassign={(id, amount) =>
              runAction("已调整职业", () => kernel.unassignJob(id, amount))
            }
          />
        );
      case "science":
        return (
          <SciencePanel
            snapshot={snapshot}
            onResearch={(id, kind) =>
              runAction("研究完成", () => kernel.research(id, kind))
            }
          />
        );
      case "workshop":
        return (
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
        );
      case "trade":
        return (
          <TradePanel
            snapshot={snapshot}
            onTrade={(id, amount) =>
              runAction("贸易完成", () => kernel.trade(id, amount))
            }
            onEmbassy={(id) =>
              runAction("大使馆已建造", () => kernel.buyEmbassy(id))
            }
          />
        );
      case "religion":
        return (
          <ReligionPanel
            snapshot={snapshot}
            onPraise={() => runAction("赞美完成", () => kernel.praise())}
            onResetFaith={() =>
              runAction("信仰已重置", () => kernel.resetFaith())
            }
            onTranscend={() => runAction("超越完成", () => kernel.transcend())}
            onSacrifice={() =>
              runAction("独角兽献祭完成", () => kernel.sacrificeUnicorns())
            }
            onBuyUpgrade={(id, kind) =>
              runAction("宗教升级已购买", () =>
                kernel.buyReligionUpgrade(id, kind)
              )
            }
          />
        );
      case "space":
        return (
          <SpacePanel
            snapshot={snapshot}
            onLaunch={(id) =>
              runAction("太空任务已启动", () => kernel.launchSpaceProgram(id))
            }
            onBuy={(id) =>
              runAction("太空建筑已建造", () => kernel.buySpaceBuilding(id))
            }
          />
        );
      case "time":
        return (
          <TimePanel
            snapshot={snapshot}
            onAccelerate={() =>
              runAction("时间流速已切换", () => kernel.toggleTimeAcceleration())
            }
            onShatter={() =>
              runAction("时间跳跃完成", () => kernel.shatterTime(1))
            }
            onUseHeat={() =>
              runAction("热机跳跃完成", () => kernel.useChronoforgeHeat(1))
            }
            onBuyUpgrade={(id, kind) =>
              runAction("时间装置已购买", () => kernel.buyTimeUpgrade(id, kind))
            }
            onResetTimeline={() =>
              runAction("已请求重置时间线", () => kernel.resetTimeline())
            }
          />
        );
      case "challenges":
        return (
          <ChallengesPanel
            snapshot={snapshot}
            onToggle={(id) =>
              runAction("挑战准备状态已更新", () => kernel.toggleChallenge(id))
            }
            onApply={() =>
              runAction("挑战已开始", () => kernel.applyPendingChallenges())
            }
          />
        );
      case "progress":
        return <ProgressPanel snapshot={snapshot} />;
      case "settings":
        return (
          <GameSettingsPanel
            snapshot={snapshot}
            onSet={(id, value) =>
              runAction("设置已更新", () => kernel.setSetting(id, value))
            }
          />
        );
    }
  };

  return (
    <section
      className="kittens-game-theme kittens-game-view bg-kg-canvas text-kg-body grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      aria-label="猫国建设者"
      data-game-paused={snapshot.paused}
    >
      <a
        href="#kittens-main"
        className="text-kg-accent-foreground sr-only fixed top-3 left-3 z-50 rounded-md bg-amber-300 px-3 py-2 text-xs font-semibold focus:not-sr-only"
      >
        跳到主要内容
      </a>
      <header className="border-kg-line bg-kg-chrome flex min-w-0 items-center gap-2 border-b px-3 py-2 sm:gap-3 sm:px-4">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-kg-muted hover:bg-kg-hover-strong hover:text-kg-strong size-8 shrink-0 lg:hidden"
              aria-label="打开系统导航"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="kittens-game-theme border-kg-line bg-kg-sidebar text-kg-body w-[280px]"
          >
            <SheetHeader className="border-kg-line border-b pb-5 text-left">
              <SheetTitle className="text-kg-strong flex items-center gap-2 font-serif text-lg">
                <Cat className="text-kg-accent size-5" />
                猫国建设者
              </SheetTitle>
              <SheetDescription className="text-kg-muted text-xs">
                原生逻辑 · {snapshot.version}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-2 min-h-0 flex-1 px-2">
              <Navigation activeNav={activeNav} onNavigate={navigate} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 shrink items-center gap-2 lg:mr-2 lg:flex">
          <span className="text-kg-accent hidden size-7 shrink-0 items-center justify-center rounded-md bg-amber-400/15 sm:flex">
            <Cat className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-kg-body truncate text-xs font-semibold lg:text-sm">
              <span className="lg:hidden">{activeLabel}</span>
              <span className="hidden lg:inline">猫国建设者</span>
            </div>
            <div className="text-kg-faint hidden text-[9px] sm:block">
              原生内核
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-0.5 sm:gap-2">
          {resources.map((resource) => (
            <ResourceChip key={resource.id} resource={resource} />
          ))}
        </div>

        <div className="border-kg-line hidden shrink-0 items-center gap-3 border-l pl-4 md:flex">
          <div className="text-right">
            <div className="text-kg-muted text-[10px]">
              {snapshot.calendar.seasonLabel} · 第 {snapshot.calendar.year} 年
            </div>
            <div className="text-kg-body mt-0.5 font-mono text-xs tabular-nums">
              第 {snapshot.calendar.day} 天
            </div>
          </div>
          <CalendarDays className="text-kg-muted size-5" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-kg-muted hover:bg-kg-hover-strong hover:text-kg-accent size-8 shrink-0"
          onClick={() => setSaveDialogOpen(true)}
          aria-label="存档管理"
          aria-keyshortcuts="Control+Shift+S Meta+Shift+S"
          data-action="open-save-manager"
        >
          <FolderOpen className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-kg-muted hover:bg-kg-hover-strong hover:text-kg-accent size-8 shrink-0"
          onClick={() => runAction("游戏已保存", () => kernel.save())}
          aria-label="快速保存"
          aria-keyshortcuts="Control+S Meta+S"
        >
          <Save className="size-4" />
        </Button>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_280px]">
        <aside className="border-kg-line bg-kg-sidebar hidden min-h-0 border-r p-2.5 lg:flex lg:flex-col">
          <div className="text-kg-faint mb-3 px-2 text-[10px] font-semibold tracking-[0.18em] uppercase">
            发展阶段
          </div>
          <Navigation activeNav={activeNav} onNavigate={navigate} />
          <div className="border-kg-line-subtle text-kg-faint mt-4 border-t px-2 pt-3 text-[10px] leading-relaxed">
            M4 原生系统
          </div>
        </aside>

        <main
          ref={mainRef}
          id="kittens-main"
          tabIndex={-1}
          className="bg-kg-main focus-visible:ring-kg-accent/60 min-h-0 min-w-0 overflow-y-auto focus:outline-none focus:ring-inset focus-visible:ring-2"
        >
          {snapshot.saveStatus.health === "corrupt" || snapshot.runtimeError ? (
            <div
              className="text-kg-danger flex flex-col gap-3 border-b border-rose-400/20 bg-rose-400/[0.06] px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              role="alert"
              data-recovery-banner
            >
              <div className="flex min-w-0 items-start gap-2">
                <CircleAlert className="text-kg-danger mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {snapshot.saveStatus.health === "corrupt"
                      ? "本地存档无法读取"
                      : "游戏模拟已暂停"}
                  </div>
                  <div className="text-kg-danger/65 mt-0.5">
                    {snapshot.runtimeError ??
                      "自动保存已停止，请导入有效存档或恢复备份。"}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-kg-danger shrink-0 border-rose-300/20 bg-rose-300/[0.05] hover:bg-rose-300/10"
                onClick={() => setSaveDialogOpen(true)}
                data-action="open-save-recovery"
              >
                打开存档恢复
              </Button>
            </div>
          ) : null}
          {renderPanel()}
        </main>

        <aside className="border-kg-line bg-kg-sidebar hidden min-h-0 flex-col border-l xl:flex">
          <div className="border-kg-line border-b p-4">
            <div className="flex items-center justify-between">
              <span className="text-kg-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
                本地存档
              </span>
              <span className="text-kg-success rounded-sm bg-emerald-400/10 px-1.5 py-0.5 text-[10px]">
                原版格式
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong mt-3 w-full"
              onClick={() => runAction("游戏已保存", () => kernel.save())}
            >
              <Save className="size-4" />
              保存游戏
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-kg-muted hover:bg-kg-hover hover:text-kg-accent mt-1 w-full"
              onClick={() => setSaveDialogOpen(true)}
              aria-keyshortcuts="Control+Shift+S Meta+Shift+S"
              data-action="open-save-manager-sidebar"
            >
              <FolderOpen className="size-4" />
              存档管理
            </Button>
          </div>

          <div className="border-kg-line grid grid-cols-2 border-b">
            <div className="border-kg-line-subtle border-r p-4">
              <div className="text-kg-faint text-[10px]">人口</div>
              <div className="text-kg-strong mt-1 font-mono text-lg">
                {snapshot.village.kittens}
              </div>
              <div className="text-kg-faint text-[10px]">
                {snapshot.village.freeKittens} 空闲
              </div>
            </div>
            <div className="p-4">
              <div className="text-kg-faint text-[10px]">幸福</div>
              <div className="text-kg-accent mt-1 font-mono text-lg">
                {formatPercent(snapshot.village.happiness)}
              </div>
              <div className="text-kg-faint text-[10px]">
                {snapshot.village.leaderName ?? "无领袖"}
              </div>
            </div>
          </div>

          <div className="border-kg-line border-b p-4">
            <div className="text-kg-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
              最近行动
            </div>
            <div
              className="bg-kg-inset text-kg-muted mt-3 min-h-16 border-l-2 border-amber-400/35 px-3 py-2 text-xs leading-relaxed"
              aria-live="polite"
              data-action-feedback
            >
              {lastAction ?? snapshot.lastMessage ?? "还没有行动记录。"}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="text-kg-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
              进度
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-kg-muted">可用研究</span>
                <span className="text-kg-body font-mono">
                  {snapshot.science.availableCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-kg-muted">已完成研究</span>
                <span className="text-kg-body font-mono">
                  {snapshot.science.researchedCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-kg-muted">工坊配方</span>
                <span className="text-kg-body font-mono">
                  {snapshot.workshop.crafts.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-kg-muted">待购升级</span>
                <span className="text-kg-body font-mono">
                  {
                    snapshot.workshop.upgrades.filter(
                      (upgrade) => !upgrade.researched
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          <footer className="border-kg-line text-kg-faint border-t p-4 text-[10px] leading-relaxed">
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
                  className="text-kg-muted hover:text-kg-accent inline-flex min-w-0 items-center gap-1 transition-colors"
                >
                  <span className="truncate">{label}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span>逻辑版本</span>
              <span className="text-kg-muted font-mono">
                {snapshot.version}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>世界刻度</span>
              <span className="text-kg-muted font-mono tabular-nums">
                {snapshot.ticks}
              </span>
            </div>
          </footer>
        </aside>
      </div>

      <SaveManagementDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        snapshot={snapshot}
        actions={{
          save: () => kernel.save(),
          exportSave: () => kernel.exportSave(),
          importSave: (raw) => kernel.importSave(raw),
          createBackup: () => kernel.createBackup(),
          restoreBackup: () => kernel.restoreBackup(),
          resetGame: () => kernel.resetGame(),
        }}
      />

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
