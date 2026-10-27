import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getGameKernel,
  normalizeGameLocale,
  type GameKernel,
} from "@/game/kernel/game-kernel";
import { translateGameText } from "@/game/kernel/game-text";
import type { GameSnapshot } from "@/game/kernel/types";

export interface KittensGameState {
  kernel: GameKernel | null;
  snapshot: GameSnapshot | null;
  error: string | null;
}

const EMPTY_SUBSCRIBE = () => () => {};
const EMPTY_SNAPSHOT = () => null;

export function useKittensGame(locale = "zh"): KittensGameState {
  const [kernel, setKernel] = useState<GameKernel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gameLocale = normalizeGameLocale(locale);

  useEffect(() => {
    try {
      setError(null);
      const nextKernel = getGameKernel(gameLocale);
      setKernel(nextKernel);
      nextKernel.start();
      return () => nextKernel.stop();
    } catch (cause) {
      console.error("Unable to initialize Kittens Game", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : translateGameText(gameLocale, "游戏引擎初始化失败")
      );
      return undefined;
    }
  }, [gameLocale]);

  const snapshot = useSyncExternalStore(
    kernel?.subscribe ?? EMPTY_SUBSCRIBE,
    kernel?.getSnapshot ?? EMPTY_SNAPSHOT,
    kernel?.getSnapshot ?? EMPTY_SNAPSHOT
  );

  return { kernel, snapshot, error };
}
