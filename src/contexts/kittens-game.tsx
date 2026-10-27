import { useMemo, type ReactNode } from "react";

import { KittensGameContext } from "@/contexts/kittens-game-context";
import {
  useKittensGame,
  type KittensGameState,
} from "@/features/kittens/use-kittens-game";

export function KittensGameProvider({ children }: { children: ReactNode }) {
  const { kernel, snapshot, error } = useKittensGame();
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
