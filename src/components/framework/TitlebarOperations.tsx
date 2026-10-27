import { Tooltip } from "./Tooltip";

import { Minus, X, Sun, Moon, Paperclip, Square, Copy } from "lucide-react";
import { ThemeContext } from "@/contexts/theme";
import { Separator } from "../ui/separator";
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorageState } from "ahooks";
import type { Window } from "@tauri-apps/api/window";

import { useI18n } from "@/composables";
import { WindowUtils } from "@/lib/window.utils";
import { createLogger } from "@/lib/logger";
import { getCurrentWindowOrNull, isTauriRuntime } from "@/lib/tauri-runtime";

const log = createLogger("Titlebar");

export function ThemeIcon() {
  const { theme } = useContext(ThemeContext);

  if (theme === "dark") {
    return <Sun className="titlebar-op-icon" />;
  } else {
    return <Moon className="titlebar-op-icon" />;
  }
}

/** 最大化状态变化时的图标 */
export function MaximizeIcon({ maximized }: { maximized: boolean }) {
  return maximized ? (
    <Copy className="titlebar-op-icon" />
  ) : (
    <Square className="titlebar-op-icon" />
  );
}

async function handleOperation(
  currentWindow: Window | null,
  operation: "minimize" | "close"
) {
  if (!currentWindow) return;

  switch (operation) {
    case "minimize":
      await currentWindow.minimize();
      break;
    case "close":
      await WindowUtils.windowsQuit();
      break;
  }
}

/** 切换最大化；返回切换后的状态 */
async function toggleMaximize(currentWindow: Window | null): Promise<boolean> {
  if (!currentWindow) return false;

  const maximized = await currentWindow.isMaximized().catch(() => false);
  if (maximized) {
    await currentWindow.unmaximize();
  } else {
    await currentWindow.maximize();
  }
  const next = await currentWindow.isMaximized().catch(() => false);
  log.debug("toggleMaximize ->", next ? "maximized" : "restored");
  return next;
}

export default function TitlebarOperations() {
  const { t } = useI18n();
  const { theme, setThemeMode } = useContext(ThemeContext);
  const [alwaysOnTop, setAlwaysOnTop] = useLocalStorageState(
    "app-always-on-top",
    {
      defaultValue: false,
    }
  );
  const [maximized, setMaximized] = useState(false);
  const currentWindow = useMemo(
    () => (isTauriRuntime() ? getCurrentWindowOrNull() : null),
    []
  );

  useEffect(() => {
    void currentWindow?.setAlwaysOnTop(alwaysOnTop ?? false);
  }, [alwaysOnTop, currentWindow]);

  /* 同步最大化状态：覆盖双击标题栏、系统快捷键、外部 resize 等场景 */
  useEffect(() => {
    if (!currentWindow) return;

    let cancelled = false;

    const sync = async () => {
      const value = await currentWindow.isMaximized().catch(() => false);
      if (!cancelled) setMaximized(value);
    };

    void sync();
    const unlisten = currentWindow.onResized(() => {
      void sync();
    });

    return () => {
      cancelled = true;
      unlisten.then((fn) => fn());
    };
  }, [currentWindow]);

  return (
    <>
      <div className="inline-flex h-full w-fit flex-row items-center justify-center">
        <Separator
          orientation="vertical"
          className="mx-0.5 h-1/2 rounded bg-neutral-300 transition-colors duration-100 ease-in-out dark:bg-neutral-700"
        />
        <Tooltip content={t("Titlebar.operations.always-on-top.tooltip")}>
          <button
            type="button"
            className={alwaysOnTop ? "titlebar-op is-pinned" : "titlebar-op"}
            aria-label={t("Titlebar.operations.always-on-top.tooltip")}
            aria-pressed={Boolean(alwaysOnTop)}
            data-action="toggle-app-pinned"
            onClick={() => {
              const next = !alwaysOnTop;
              setAlwaysOnTop(next);
              void currentWindow?.setAlwaysOnTop(next);
            }}
          >
            <Paperclip className="titlebar-op-icon" />
          </button>
        </Tooltip>
        <Tooltip content={t("Titlebar.operations.theme.tooltip")}>
          <button
            type="button"
            className="titlebar-op"
            aria-label={t("Titlebar.operations.theme.tooltip")}
            data-action="toggle-app-theme"
            onClick={() => {
              setThemeMode(theme === "dark" ? "light" : "dark");
            }}
          >
            <ThemeIcon />
          </button>
        </Tooltip>
        <Tooltip content={t("Titlebar.operations.minimize.tooltip")}>
          <button
            type="button"
            className="titlebar-op"
            aria-label={t("Titlebar.operations.minimize.tooltip")}
            onClick={() => {
              void handleOperation(currentWindow, "minimize");
            }}
          >
            <Minus className="titlebar-op-icon" />
          </button>
        </Tooltip>
        <Tooltip
          content={t(
            maximized
              ? "Titlebar.operations.restore.tooltip"
              : "Titlebar.operations.maximize.tooltip"
          )}
        >
          <button
            type="button"
            className="titlebar-op"
            aria-label={t(
              maximized
                ? "Titlebar.operations.restore.tooltip"
                : "Titlebar.operations.maximize.tooltip"
            )}
            onClick={() => {
              void toggleMaximize(currentWindow).then(setMaximized);
            }}
          >
            <MaximizeIcon maximized={maximized} />
          </button>
        </Tooltip>
        <Tooltip content={t("Titlebar.operations.close.tooltip")}>
          <button
            type="button"
            className="titlebar-op"
            aria-label={t("Titlebar.operations.close.tooltip")}
            onClick={() => {
              void handleOperation(currentWindow, "close");
            }}
          >
            <X className="titlebar-op-icon" />
          </button>
        </Tooltip>
      </div>
    </>
  );
}
