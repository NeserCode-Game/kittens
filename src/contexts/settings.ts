import { createContext, useContext } from "react";

export type SettingsSection = "search" | "general" | "game";

export interface SettingsDialogContextValue {
  openSettings: (section?: SettingsSection) => void;
  openAbout: () => void;
}

export const SettingsDialogContext = createContext<SettingsDialogContextValue>({
  openSettings: () => {},
  openAbout: () => {},
});

export function useSettingsDialog() {
  return useContext(SettingsDialogContext);
}
