import {
  currentMonitor,
  LogicalSize,
  PhysicalPosition,
  type Window,
} from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import { createLogger } from "@/lib/logger";
import { getCurrentWindowOrNull, isTauriRuntime } from "@/lib/tauri-runtime";
import { WindowUtils } from "@/lib/window.utils";

import {
  computeAttachedWindowPosition,
  RESOURCE_WINDOW_HEIGHT,
  RESOURCE_WINDOW_WIDTH,
  resolveAttachedWindowSide,
  type ResourceWindowSide,
} from "./resource-window-layout";

const log = createLogger("ResourceWindow");
const RESOURCE_WINDOW_LABEL = "resources";
const USER_MOVE_SETTLE_DELAY = 240;

let snapGeneration = 0;
let disposeSnap: (() => void) | null = null;

function disposeSnapListeners() {
  disposeSnap?.();
  disposeSnap = null;
}

async function attachToMainWindow(mainWindow: Window, resourceWindow: Window) {
  const generation = ++snapGeneration;
  disposeSnapListeners();

  await Promise.all([
    resourceWindow.setSize(
      new LogicalSize(RESOURCE_WINDOW_WIDTH, RESOURCE_WINDOW_HEIGHT)
    ),
    resourceWindow.setAlwaysOnTop(false),
  ]);

  let preferredSide: ResourceWindowSide = "above";
  let syncing = false;
  let syncQueued = false;
  let latestAppliedPosition: { x: number; y: number } | null = null;
  let userMoveTimer: ReturnType<typeof setTimeout> | null = null;
  let latestUserPosition: { x: number; y: number } | null = null;

  const syncPosition = async () => {
    if (syncing) {
      syncQueued = true;
      return;
    }

    syncing = true;
    try {
      do {
        syncQueued = false;
        const [mainPosition, mainSize, monitor] = await Promise.all([
          mainWindow.outerPosition(),
          mainWindow.outerSize(),
          currentMonitor(),
        ]);
        if (!monitor) return;

        const scale = monitor.scaleFactor;
        const position = computeAttachedWindowPosition(
          {
            x: mainPosition.x,
            y: mainPosition.y,
            width: mainSize.width,
            height: mainSize.height,
          },
          {
            x: monitor.position.x,
            y: monitor.position.y,
            width: monitor.size.width,
            height: monitor.size.height,
          },
          Math.round(RESOURCE_WINDOW_WIDTH * scale),
          Math.round(RESOURCE_WINDOW_HEIGHT * scale),
          preferredSide
        );
        latestAppliedPosition = position;
        await resourceWindow.setPosition(
          new PhysicalPosition(position.x, position.y)
        );
      } while (syncQueued);
    } catch (error) {
      log.debug("resource window follow skipped", error);
    } finally {
      syncing = false;
    }
  };

  const applyDraggedSide = async () => {
    userMoveTimer = null;
    if (!latestUserPosition) return;

    try {
      const [mainPosition, mainSize, monitor] = await Promise.all([
        mainWindow.outerPosition(),
        mainWindow.outerSize(),
        currentMonitor(),
      ]);
      if (!monitor) return;

      preferredSide = resolveAttachedWindowSide(
        {
          x: mainPosition.x,
          y: mainPosition.y,
          width: mainSize.width,
          height: mainSize.height,
        },
        latestUserPosition.y,
        Math.round(RESOURCE_WINDOW_HEIGHT * monitor.scaleFactor)
      );
      await syncPosition();
    } catch (error) {
      log.debug("resource window snap skipped", error);
    }
  };

  const handleResourceMoved = ({ payload }: { payload: PhysicalPosition }) => {
    if (
      latestAppliedPosition &&
      Math.abs(payload.x - latestAppliedPosition.x) <= 1 &&
      Math.abs(payload.y - latestAppliedPosition.y) <= 1
    ) {
      if (userMoveTimer) clearTimeout(userMoveTimer);
      userMoveTimer = null;
      latestUserPosition = null;
      return;
    }

    latestUserPosition = payload;
    if (userMoveTimer) clearTimeout(userMoveTimer);
    userMoveTimer = setTimeout(
      () => void applyDraggedSide(),
      USER_MOVE_SETTLE_DELAY
    );
  };

  await syncPosition();

  const [
    unlistenMoved,
    unlistenResized,
    unlistenResourceMoved,
    unlistenDestroyed,
  ] = await Promise.all([
    mainWindow.onMoved(() => void syncPosition()),
    mainWindow.onResized(() => void syncPosition()),
    resourceWindow.onMoved(handleResourceMoved),
    resourceWindow.once("tauri://destroyed", () => {
      if (generation === snapGeneration) disposeSnapListeners();
    }),
  ]);

  if (generation !== snapGeneration) {
    unlistenMoved();
    unlistenResized();
    unlistenResourceMoved();
    unlistenDestroyed();
    return;
  }

  disposeSnap = () => {
    if (userMoveTimer) clearTimeout(userMoveTimer);
    unlistenMoved();
    unlistenResized();
    unlistenResourceMoved();
    unlistenDestroyed();
  };
}

async function openTauriResourceWindow(): Promise<void> {
  const mainWindow = getCurrentWindowOrNull();
  if (!mainWindow) return;

  const existing = await WindowUtils.getWindowByLabel(RESOURCE_WINDOW_LABEL);
  if (existing) {
    await attachToMainWindow(mainWindow, existing);
    await WindowUtils.restoreAndFocus(existing);
    return;
  }

  const resourceWindow = new WebviewWindow(RESOURCE_WINDOW_LABEL, {
    url: "/resource",
    title: "资源",
    width: RESOURCE_WINDOW_WIDTH,
    height: RESOURCE_WINDOW_HEIGHT,
    visible: false,
    decorations: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    parent: mainWindow,
    transparent: true,
    shadow: false,
    focus: false,
    center: false,
  });

  await new Promise<void>((resolve, reject) => {
    void resourceWindow.once("tauri://created", () => resolve());
    void resourceWindow.once<unknown>("tauri://error", (event) => {
      reject(new Error(`Unable to create resource window: ${event.payload}`));
    });
  });

  await attachToMainWindow(mainWindow, resourceWindow);
  await resourceWindow.show();
}

export async function openResourceWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    const resourceWindow = window.open(
      "/resource",
      "kittens-resources",
      `popup=yes,width=${RESOURCE_WINDOW_WIDTH},height=${RESOURCE_WINDOW_HEIGHT},resizable=no,scrollbars=no`
    );
    resourceWindow?.focus();
    return;
  }

  try {
    await openTauriResourceWindow();
  } catch (error) {
    log.error("openResourceWindow failed", error);
    throw error;
  }
}
