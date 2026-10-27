import type { ActionReason } from "@/game/kernel/types";

export const RESOURCE_ORDER = [
  "catnip",
  "wood",
  "minerals",
  "science",
  "culture",
  "faith",
  "kittens",
];

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "∞";
  if (value !== 0 && Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatRate(value: number): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 3)}`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value * 100, 1)}%`;
}

export function actionReasonLabel(reason: ActionReason): string {
  switch (reason) {
    case "cannot-afford":
      return "资源不足";
    case "locked":
      return "尚未解锁";
    case "not-enabled":
      return "当前不可用";
    case "already-owned":
      return "已经完成";
    case "blocked":
      return "条件未满足";
    case "requires-confirmation":
      return "等待确认";
    case "unknown":
      return "操作无法完成";
    default:
      return "行动完成";
  }
}
