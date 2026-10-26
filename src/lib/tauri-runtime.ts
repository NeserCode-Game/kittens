import { getCurrentWindow, type Window } from "@tauri-apps/api/window";

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__")
  );
}

export function getCurrentWindowOrNull(): Window | null {
  if (!isTauriRuntime()) return null;

  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}
