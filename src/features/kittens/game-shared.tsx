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
          className="group border-kg-line bg-kg-wash relative h-[52px] w-32 shrink-0 overflow-hidden rounded-md border px-2.5 py-1.5"
          data-resource-id={resource.id}
          data-resource-value={resource.value}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-kg-muted truncate text-[11px] font-medium tracking-wide">
              {resource.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] tabular-nums",
                resource.perTick > 0
                  ? "text-kg-success/80"
                  : resource.perTick < 0
                    ? "text-kg-danger/80"
                    : "text-kg-muted"
              )}
            >
              {formatRate(resource.perTick)}
            </span>
          </div>
          <div className="text-kg-strong mt-0.5 overflow-hidden text-right font-mono text-[15px] font-semibold whitespace-nowrap tabular-nums">
            <span className="block overflow-hidden text-ellipsis">
              {formatNumber(resource.value)}
              {resource.maxValue > 0 ? (
                <span className="text-kg-muted ml-1 text-[10px] font-normal">
                  / {formatNumber(resource.maxValue)}
                </span>
              ) : null}
            </span>
          </div>
          {capacity !== null ? (
            <div className="bg-kg-track absolute inset-x-0 bottom-0 h-0.5">
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
              ? "text-kg-success border-emerald-500/20 bg-emerald-500/10"
              : "text-kg-danger border-rose-500/20 bg-rose-500/10"
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
    <header className="border-kg-line border-b px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-kg-accent/75 mb-1.5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="text-kg-strong font-serif text-2xl font-semibold tracking-normal">
            {title}
          </h1>
          <p className="text-kg-muted mt-1.5 max-w-2xl text-xs leading-relaxed">
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
    <div className="border-kg-line-subtle bg-kg-inset flex items-center justify-between gap-3 border-b px-5 py-2.5">
      <h2 className="text-kg-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
        {children}
      </h2>
      {aside ? (
        <span className="text-kg-faint font-mono text-[10px]">{aside}</span>
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
    <div className="border-kg-line-subtle min-w-0 border-r px-4 py-3 last:border-r-0">
      <div className="text-kg-muted text-[10px] font-medium tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-mono text-lg font-semibold tabular-nums",
          tone === "amber"
            ? "text-kg-accent"
            : tone === "green"
              ? "text-kg-success"
              : "text-kg-strong"
        )}
      >
        {value}
      </div>
      {detail ? (
        <div className="text-kg-faint mt-0.5 truncate text-[10px]">
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
      <CircleAlert className="text-kg-faint size-6" />
      <h2 className="text-kg-body mt-3 text-sm font-semibold">{title}</h2>
      <p className="text-kg-faint mt-1 max-w-sm text-xs leading-relaxed">
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
      className="bg-kg-wash-strong h-1 overflow-hidden rounded-full"
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
