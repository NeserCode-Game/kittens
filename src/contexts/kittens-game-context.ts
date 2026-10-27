import { createContext, useContext } from "react";

import type { KittensGameState } from "@/features/kittens/use-kittens-game";

export const KittensGameContext = createContext<KittensGameState | null>(null);

export function useKittensGameContext(): KittensGameState {
  const value = useContext(KittensGameContext);
  if (!value) {
    throw new Error("KittensGameProvider is missing");
  }
  return value;
}
