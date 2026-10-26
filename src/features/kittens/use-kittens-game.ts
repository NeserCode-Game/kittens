import { useEffect, useState, useSyncExternalStore } from "react";

import { getGameKernel, type GameKernel } from "@/game/kernel/game-kernel";
import type { GameSnapshot } from "@/game/kernel/types";

interface KittensGameState {
  kernel: GameKernel | null;
  snapshot: GameSnapshot | null;
  error: string | null;
}

const EMPTY_SUBSCRIBE = () => () => {};
const EMPTY_SNAPSHOT = () => null;

export function useKittensGame(): KittensGameState {
  const [kernel, setKernel] = useState<GameKernel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const nextKernel = getGameKernel();
      setKernel(nextKernel);
      nextKernel.start();
      return () => nextKernel.stop();
    } catch (cause) {
      console.error("Unable to initialize Kittens Game", cause);
      setError(
        cause instanceof Error ? cause.message : "游戏引擎初始化失败"
      );
      return undefined;
    }
  }, []);

  const snapshot = useSyncExternalStore(
    kernel?.subscribe ?? EMPTY_SUBSCRIBE,
    kernel?.getSnapshot ?? EMPTY_SNAPSHOT,
    kernel?.getSnapshot ?? EMPTY_SNAPSHOT
  );

  return { kernel, snapshot, error };
}
