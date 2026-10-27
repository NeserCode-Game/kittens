import type { ActionReason } from "@/game/kernel/types";
import type { GameTranslate } from "./use-game-i18n";

export const RESOURCE_ORDER = [
  "catnip",
  "wood",
  "minerals",
  "science",
  "culture",
  "faith",
  "kittens",
];

export function formatNumber(
  value: number,
  maximumFractionDigits = 2,
  locale = "zh-CN"
): string {
  if (!Number.isFinite(value)) return "∞";
  if (value !== 0 && Math.abs(value) < 0.01) {
    return value.toExponential(2);
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(value);
}

export function formatRate(value: number, locale = "zh-CN"): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 3, locale)}`;
}

export function formatPercent(value: number, locale = "zh-CN"): string {
  return `${formatNumber(value * 100, 1, locale)}%`;
}

export function actionReasonLabel(
  reason: ActionReason,
  t: GameTranslate
): string {
  switch (reason) {
    case "cannot-afford":
      return t("资源不足");
    case "locked":
      return t("尚未解锁");
    case "not-enabled":
      return t("当前不可用");
    case "already-owned":
      return t("已经完成");
    case "blocked":
      return t("条件未满足");
    case "requires-confirmation":
      return t("等待确认");
    case "invalid-save":
      return t("存档无效");
    case "storage-unavailable":
      return t("存储不可用");
    case "unknown":
      return t("操作无法完成");
    default:
      return t("行动完成");
  }
}
