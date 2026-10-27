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
} from "./resource-window-layout";

const log = createLogger("ResourceWindow");
const RESOURCE_WINDOW_LABEL = "resources";

let snapGeneration = 0;
let disposeSnap: (() => void) | null = null;

function disposeSnapListeners() {
  disposeSnap?.();
  disposeSnap = null;
}

async function attachToMainWindow(mainWindow: Window, resourceWindow: Window) {
  const generation = ++snapGeneration;
  disposeSnapListeners();

  await resourceWindow.setSize(
    new LogicalSize(RESOURCE_WINDOW_WIDTH, RESOURCE_WINDOW_HEIGHT)
  );

  let syncing = false;
  let syncQueued = false;

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
          Math.round(RESOURCE_WINDOW_HEIGHT * scale)
        );
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

  await resourceWindow.setAlwaysOnTop(true);
  await syncPosition();

  const [unlistenMoved, unlistenResized, unlistenDestroyed] = await Promise.all(
    [
      mainWindow.onMoved(() => void syncPosition()),
      mainWindow.onResized(() => void syncPosition()),
      resourceWindow.once("tauri://destroyed", () => {
        if (generation === snapGeneration) disposeSnapListeners();
      }),
    ]
  );

  if (generation !== snapGeneration) {
    unlistenMoved();
    unlistenResized();
    unlistenDestroyed();
    return;
  }

  disposeSnap = () => {
    unlistenMoved();
    unlistenResized();
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
    alwaysOnTop: true,
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
