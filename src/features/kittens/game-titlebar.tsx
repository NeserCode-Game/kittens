import {
  Boxes,
  CalendarDays,
  FolderOpen,
  Menu,
  Pause,
  PictureInPicture2,
  Play,
  Save,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Tooltip } from "@/components/framework/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useKittensGameContext } from "@/contexts/kittens-game-context";
import { useKittensGameUiContext } from "@/contexts/kittens-game-ui-context";

import { actionReasonLabel, RESOURCE_ORDER } from "./game-format";
import { openResourceWindow } from "./resource-window-manager";
import { ResourceChip } from "./game-shared";

export function GameTitlebar() {
  const { kernel, snapshot } = useKittensGameContext();
  const { setMobileNavOpen, setSaveDialogOpen, setLastAction } =
    useKittensGameUiContext();
  const [resourceOpen, setResourceOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

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

  const quickSave = () => {
    if (!kernel) return;
    const result = kernel.save();
    setLastAction(
      result.ok ? "游戏已保存" : `未完成：${actionReasonLabel(result.reason)}`
    );
    setSaveOpen(false);
  };

  return (
    <div className="flex h-full w-fit shrink-0 items-center" data-game-titlebar>
      <Tooltip content="系统导航">
        <button
          type="button"
          className="titlebar-op h-full w-7 px-0 text-neutral-600 lg:hidden dark:text-neutral-200"
          aria-label="打开系统导航"
          data-action="open-game-navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="titlebar-op-icon" />
        </button>
      </Tooltip>

      <Popover open={resourceOpen} onOpenChange={setResourceOpen}>
        <Tooltip content="资源">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="titlebar-op h-full w-8 px-0"
              aria-label="资源"
              data-action="toggle-game-resources"
            >
              <Boxes className="titlebar-op-icon" />
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="kittens-game-theme border-kg-line bg-kg-dialog text-kg-body w-[552px] p-2 shadow-xl"
          aria-label="资源"
          data-resource-panel
        >
          <div className="mb-2 flex h-7 items-center justify-between gap-3 px-1">
            <div>
              <span className="text-kg-body text-xs font-medium">资源</span>
              <span className="text-kg-faint ml-2 text-[10px]">
                {resources.length} 项
              </span>
            </div>
            <button
              type="button"
              className="text-kg-muted hover:text-kg-accent hover:bg-kg-hover flex h-6 items-center gap-1.5 rounded-sm px-2 text-[10px] transition-colors"
              aria-label="打开资源浮窗"
              data-action="open-resource-window"
              onClick={() => {
                setResourceOpen(false);
                void openResourceWindow().catch(() => {
                  setLastAction("资源浮窗未能打开");
                });
              }}
            >
              <PictureInPicture2 className="size-3.5" />
              独立显示
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5" data-resource-grid>
            {resources.map((resource) => (
              <ResourceChip key={resource.id} resource={resource} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <Tooltip content="日期与时间">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="titlebar-op h-full w-8 px-0"
              aria-label="日期与时间"
              data-action="toggle-game-calendar"
            >
              <CalendarDays className="titlebar-op-icon" />
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="kittens-game-theme border-kg-line bg-kg-dialog text-kg-body w-56 p-3 shadow-xl"
          aria-label="日期与时间"
          data-game-calendar-panel
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-kg-muted text-[10px]">
                {snapshot?.calendar.seasonLabel ?? "季节"} · 第{" "}
                {snapshot?.calendar.year ?? 0} 年
              </div>
              <div className="text-kg-strong mt-1 font-mono text-lg font-semibold tabular-nums">
                第 {snapshot?.calendar.day ?? 0} 天
              </div>
            </div>
            <span
              className={
                snapshot?.paused
                  ? "text-kg-muted bg-kg-wash-strong inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[10px]"
                  : "text-kg-success inline-flex items-center gap-1 rounded-sm bg-emerald-400/10 px-1.5 py-1 text-[10px]"
              }
            >
              {snapshot?.paused ? (
                <Pause className="size-3" />
              ) : (
                <Play className="size-3" />
              )}
              {snapshot?.paused ? "已暂停" : "运行中"}
            </span>
          </div>
          <div className="text-kg-muted mt-3 flex items-center justify-between text-[10px]">
            <span>世界刻度</span>
            <span className="text-kg-body font-mono tabular-nums">
              {snapshot?.ticks ?? 0}
            </span>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <Tooltip content="存档操作">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="titlebar-op h-full w-8 px-0"
              aria-label="存档操作"
              aria-keyshortcuts="Control+S Meta+S Control+Shift+S Meta+Shift+S"
              data-action="toggle-save-actions"
            >
              <Save className="titlebar-op-icon" />
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="kittens-game-theme border-kg-line bg-kg-dialog text-kg-body w-60 p-2 shadow-xl"
          aria-label="存档操作"
          data-save-actions-panel
        >
          <button
            type="button"
            className="hover:bg-kg-hover flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-xs transition-colors disabled:opacity-50"
            disabled={!kernel}
            onClick={quickSave}
          >
            <Save className="text-kg-accent size-3.5" />
            <span className="min-w-0 flex-1">快速保存</span>
            <span className="text-kg-faint font-mono text-[9px]">Ctrl+S</span>
          </button>
          <button
            type="button"
            className="hover:bg-kg-hover flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-xs transition-colors"
            data-action="open-save-manager"
            onClick={() => {
              setSaveDialogOpen(true);
              setSaveOpen(false);
            }}
          >
            <FolderOpen className="text-kg-muted size-3.5" />
            <span className="min-w-0 flex-1">存档管理</span>
            <span className="text-kg-faint font-mono text-[9px]">
              Ctrl+Shift+S
            </span>
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
