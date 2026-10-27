import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CalendarSnapshot,
  GameSnapshot,
  ResourceSnapshot,
} from "@/game/kernel/types";

const CHANNEL_NAME = "kittens-resource-window";
const FALLBACK_STORAGE_KEY = "kittens-resource-window-state";

export interface ResourceWindowState {
  version: string;
  resources: ResourceSnapshot[];
  calendar: CalendarSnapshot;
  ticks: number;
  paused: boolean;
}

type ResourceWindowMessage =
  { type: "state"; state: ResourceWindowState } | { type: "request" };

function toResourceWindowState(snapshot: GameSnapshot): ResourceWindowState {
  return {
    version: snapshot.version,
    resources: snapshot.resources,
    calendar: snapshot.calendar,
    ticks: snapshot.ticks,
    paused: snapshot.paused,
  };
}

function readCachedState(): ResourceWindowState | null {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResourceWindowState) : null;
  } catch {
    return null;
  }
}

export function useResourceWindowPublisher(snapshot: GameSnapshot | null) {
  const state = useMemo(
    () => (snapshot ? toResourceWindowState(snapshot) : null),
    [snapshot]
  );
  const stateRef = useRef<ResourceWindowState | null>(state);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ResourceWindowMessage>) => {
      if (event.data?.type !== "request" || !stateRef.current) return;
      channel.postMessage({ type: "state", state: stateRef.current });
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (!state) return;

    const message: ResourceWindowMessage = { type: "state", state };
    if (channelRef.current) {
      channelRef.current.postMessage(message);
      return;
    }

    try {
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The live channel remains available when storage is restricted.
    }
  }, [state]);
}

export function useResourceWindowState(): ResourceWindowState | null {
  const [state, setState] = useState<ResourceWindowState | null>(
    readCachedState
  );

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ResourceWindowMessage>) => {
      if (event.data?.type === "state") {
        setState(event.data.state);
      }
    };
    channel.postMessage({ type: "request" } satisfies ResourceWindowMessage);

    return () => channel.close();
  }, []);

  return state;
}
