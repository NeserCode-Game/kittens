import { useCallback, useMemo } from "react";

import { useI18n } from "@/composables";
import {
  normalizeGameLocale,
  translateGameText,
  type GameTextKey,
  type GameTextVariables,
} from "@/game/kernel/game-text";

export type GameTranslate = (
  source: GameTextKey,
  variables?: GameTextVariables
) => string;

export function useGameI18n() {
  const { lang } = useI18n();
  const locale = normalizeGameLocale(lang);
  const t = useCallback<GameTranslate>(
    (source, variables) => translateGameText(locale, source, variables),
    [locale]
  );

  return useMemo(
    () => ({
      locale,
      formatLocale: locale === "en" ? "en-US" : "zh-CN",
      t,
    }),
    [locale, t]
  );
}
