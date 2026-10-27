import { useMemo, type ReactNode } from "react";

import { KittensGameContext } from "@/contexts/kittens-game-context";
import {
  useKittensGame,
  type KittensGameState,
} from "@/features/kittens/use-kittens-game";
import { useResourceWindowPublisher } from "@/features/kittens/resource-bridge";
import { useI18n } from "@/composables";

export function KittensGameProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const { kernel, snapshot, error } = useKittensGame(lang);
  useResourceWindowPublisher(snapshot);
  const value = useMemo<KittensGameState>(
    () => ({ kernel, snapshot, error }),
    [kernel, snapshot, error]
  );

  return (
    <KittensGameContext.Provider value={value}>
      {children}
    </KittensGameContext.Provider>
  );
}
