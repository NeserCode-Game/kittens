import { Cat, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ResourceSnapshot } from "@/game/kernel/types";
import { getCurrentWindowOrNull, isTauriRuntime } from "@/lib/tauri-runtime";
import { cn } from "@/lib/utils";

import { formatNumber, formatRate, RESOURCE_ORDER } from "./game-format";
import { useResourceWindowState } from "./resource-bridge";

function ResourceWindowItem({ resource }: { resource: ResourceSnapshot }) {
  const capacity =
    resource.maxValue > 0
      ? Math.min(100, (resource.value / resource.maxValue) * 100)
      : null;

  return (
    <div
      className="border-kg-line relative flex h-[28px] w-[92px] shrink-0 flex-col justify-center overflow-hidden border-r px-1.5 last:border-r-0"
      data-resource-id={resource.id}
      data-resource-value={resource.value}
      title={`${resource.label}，当前 ${formatNumber(resource.value, 3)}，每刻 ${formatRate(resource.perTick)}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span className="text-kg-muted min-w-0 truncate text-[8px]">
          {resource.label}
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-[7px] tabular-nums",
            resource.perTick > 0
              ? "text-kg-success"
              : resource.perTick < 0
                ? "text-kg-danger"
                : "text-kg-faint"
          )}
        >
          {formatRate(resource.perTick)}
        </span>
      </div>
      <div
        className={cn(
          "mt-0.5 truncate font-mono text-[10px] leading-none font-semibold tabular-nums",
          resource.capped ? "text-kg-accent" : "text-kg-strong"
        )}
      >
        {formatNumber(resource.value)}
        {resource.maxValue > 0 ? (
          <span className="text-kg-faint font-normal">
            /{formatNumber(resource.maxValue)}
          </span>
        ) : null}
      </div>
      {capacity !== null ? (
        <span className="bg-kg-track absolute inset-x-0 bottom-0 h-px">
          <span
            className={cn(
              "block h-full",
              resource.capped ? "bg-amber-400" : "bg-emerald-500/70"
            )}
            style={{ width: `${capacity}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

export default function ResourceWindow() {
  const state = useResourceWindowState();

  useEffect(() => {
    const htmlBackground = document.documentElement.style.backgroundColor;
    const bodyBackground = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.documentElement.style.backgroundColor = htmlBackground;
      document.body.style.backgroundColor = bodyBackground;
    };
  }, []);

  const resources = useMemo(() => {
    if (!state) return [];
    const byId = new Map(
      state.resources.map((resource) => [resource.id, resource])
    );
    return RESOURCE_ORDER.flatMap((id) => {
      const resource = byId.get(id);
      return resource?.visible ? [resource] : [];
    });
  }, [state]);

  const close = () => {
    if (isTauriRuntime()) {
      void getCurrentWindowOrNull()?.close();
    } else {
      window.close();
    }
  };

  return (
    <main
      className="kittens-game-theme h-screen w-screen overflow-hidden bg-transparent p-px"
      data-resource-window
      data-resource-side="attached"
    >
      <div
        className="bg-kg-chrome text-kg-body border-kg-line flex h-full w-full items-center gap-1 overflow-hidden rounded-md border px-1"
        data-resource-surface
      >
        <span
          className="text-kg-accent relative flex size-6 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
          data-tauri-drag-region
          data-resource-drag-handle
          title="拖动可切换上下吸附"
        >
          <Cat className="size-3.5" />
          {state?.paused ? (
            <span className="absolute right-0.5 bottom-0.5 size-1 rounded-full bg-amber-400" />
          ) : null}
        </span>

        {state ? (
          <ScrollArea
            type="hover"
            className="h-full min-w-0 flex-1"
            aria-label="资源栏"
            data-resource-scroll
          >
            <div className="flex h-[28px] w-max items-center">
              {resources.map((resource) => (
                <ResourceWindowItem key={resource.id} resource={resource} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <span className="text-kg-muted flex min-w-0 flex-1 items-center gap-2 text-[10px]">
            <LoaderCircle className="text-kg-accent size-3.5 animate-spin" />
            等待游戏数据
          </span>
        )}

        <button
          type="button"
          className="text-kg-muted hover:bg-kg-hover-strong hover:text-kg-strong flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors"
          aria-label="关闭资源浮窗"
          onClick={close}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </main>
  );
}
