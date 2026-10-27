import { useMemo, useState, type ReactNode } from "react";

import {
  KittensGameUiContext,
  type KittensGameUiState,
} from "@/contexts/kittens-game-ui-context";

export function KittensGameUiProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const value = useMemo<KittensGameUiState>(
    () => ({
      mobileNavOpen,
      setMobileNavOpen,
      saveDialogOpen,
      setSaveDialogOpen,
      lastAction,
      setLastAction,
    }),
    [lastAction, mobileNavOpen, saveDialogOpen]
  );

  return (
    <KittensGameUiContext.Provider value={value}>
      {children}
    </KittensGameUiContext.Provider>
  );
}
