import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PriceSnapshot, ResourceSnapshot } from "@/game/kernel/types";

import { formatNumber, formatRate } from "./game-format";

export function ResourceChip({ resource }: { resource: ResourceSnapshot }) {
  const capacity =
    resource.maxValue > 0
      ? Math.min(100, (resource.value / resource.maxValue) * 100)
      : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="group relative min-w-28 overflow-hidden rounded-md border border-white/10 bg-white/[0.035] px-3 py-2"
          data-resource-id={resource.id}
          data-resource-value={resource.value}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-medium tracking-wide text-stone-400">
              {resource.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] tabular-nums",
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
          <div className="mt-0.5 text-right font-mono text-[15px] font-semibold text-stone-100 tabular-nums">
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
        当前 {formatNumber(resource.value, 3)}，每刻
        {formatRate(resource.perTick)}
      </TooltipContent>
    </Tooltip>
  );
}

export function PricePills({
  prices,
  className,
}: {
  prices: PriceSnapshot[];
  className?: string;
}) {
  if (prices.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {prices.map((price) => (
        <span
          key={price.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] tabular-nums",
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
      ))}
    </div>
  );
}

export function PanelHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-white/10 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-amber-400/75 uppercase">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-normal text-stone-50">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-stone-500">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionLabel({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-black/10 px-5 py-2.5">
      <h2 className="text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">
        {children}
      </h2>
      {aside ? (
        <span className="font-mono text-[10px] text-stone-600">{aside}</span>
      ) : null}
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "default" | "amber" | "green";
}) {
  return (
    <div className="min-w-0 border-r border-white/[0.07] px-4 py-3 last:border-r-0">
      <div className="text-[10px] font-medium tracking-wide text-stone-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-mono text-lg font-semibold tabular-nums",
          tone === "amber"
            ? "text-amber-300"
            : tone === "green"
              ? "text-emerald-300"
              : "text-stone-100"
        )}
      >
        {value}
      </div>
      {detail ? (
        <div className="mt-0.5 truncate text-[10px] text-stone-600">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
      <CircleAlert className="size-6 text-stone-600" />
      <h2 className="mt-3 text-sm font-semibold text-stone-300">{title}</h2>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-600">
        {description}
      </p>
    </div>
  );
}

export function Meter({
  value,
  tone = "amber",
  label,
}: {
  value: number;
  tone?: "amber" | "green";
  label: string;
}) {
  return (
    <div
      className="h-1 overflow-hidden rounded-full bg-white/[0.06]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-300",
          tone === "green" ? "bg-emerald-500/75" : "bg-amber-400/80"
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
