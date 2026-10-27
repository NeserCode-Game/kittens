import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import { useI18n } from "@/composables";
import { Settings2 } from "lucide-react";
import Settings from "@/views/Settings";
import type { SettingsSection } from "@/contexts/settings";

interface SettingsDialogProps {
  open: boolean;
  initialSection?: SettingsSection;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({
  open,
  initialSection = "search",
  onOpenChange,
}: SettingsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(82vh,760px)] w-[min(calc(100vw-2rem),960px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <header className="bg-muted/40 flex items-center gap-3 border-b px-6 py-4">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Settings2 className="size-5" />
          </span>
          <div className="stack-1">
            <DialogTitle className="text-base leading-tight font-semibold">
              {t("Titlebar.menu.turnto.settings")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("Settings.search.description")}
            </DialogDescription>
          </div>
        </header>

        <div className="min-h-0 flex-1 px-6 pt-5">
          <Settings initialSection={initialSection} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
