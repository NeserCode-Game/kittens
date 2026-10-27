import { useMemo, type ReactNode } from "react";

import { KittensGameContext } from "@/contexts/kittens-game-context";
import {
  useKittensGame,
  type KittensGameState,
} from "@/features/kittens/use-kittens-game";
import { useResourceWindowPublisher } from "@/features/kittens/resource-bridge";

export function KittensGameProvider({ children }: { children: ReactNode }) {
  const { kernel, snapshot, error } = useKittensGame();
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
