import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface KittensGameUiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: Dispatch<SetStateAction<boolean>>;
  saveDialogOpen: boolean;
  setSaveDialogOpen: Dispatch<SetStateAction<boolean>>;
  lastAction: string | null;
  setLastAction: Dispatch<SetStateAction<string | null>>;
}

export const KittensGameUiContext = createContext<KittensGameUiState | null>(
  null
);

export function useKittensGameUiContext(): KittensGameUiState {
  const value = useContext(KittensGameUiContext);
  if (!value) {
    throw new Error("KittensGameUiProvider is missing");
  }
  return value;
}
