import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileUp,
  HardDrive,
  History,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ActionResult,
  GameSnapshot,
  SaveExportResult,
  SaveImportResult,
  SaveStatusSnapshot,
} from "@/game/kernel/types";
import type { GameTextKey } from "@/game/kernel/game-text";
import { cn } from "@/lib/utils";

import { actionReasonLabel } from "./game-format";
import { useGameI18n, type GameTranslate } from "./use-game-i18n";

export interface SaveManagementActions {
  save: () => ActionResult;
  exportSave: () => SaveExportResult;
  importSave: (raw: string) => SaveImportResult;
  createBackup: () => ActionResult;
  restoreBackup: () => SaveImportResult;
  resetGame: () => ActionResult;
}

interface SaveNotice {
  tone: "success" | "warning" | "error";
  text: string;
}

const HEALTH_LABELS: Record<SaveStatusSnapshot["health"], GameTextKey> = {
  new: "新游戏",
  healthy: "可读取",
  corrupt: "存档损坏",
  unavailable: "存储不可用",
};

function formatTimestamp(
  value: number | null,
  locale: string,
  t: GameTranslate
): string {
  if (!value) return t("无记录");
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function resultNotice(
  result: ActionResult,
  successText: string,
  t: GameTranslate
): SaveNotice {
  if (result.ok) return { tone: "success", text: successText };
  if (result.reason === "requires-confirmation") {
    return { tone: "warning", text: t("等待确认操作") };
  }
  return {
    tone: "error",
    text: actionReasonLabel(result.reason, t),
  };
}

function SaveMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border-kg-line-subtle min-w-0 border-b px-4 py-3 md:border-r md:last:border-r-0">
      <div className="text-kg-faint text-[10px]">{label}</div>
      <div className="text-kg-body mt-1 truncate font-mono text-xs">
        {value}
      </div>
      {detail ? (
        <div className="text-kg-faint mt-0.5 truncate text-[10px]">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function SaveManagementDialog({
  open,
  onOpenChange,
  snapshot,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: GameSnapshot;
  actions: SaveManagementActions;
}) {
  const { formatLocale, t } = useGameI18n();
  const [tab, setTab] = useState<"export" | "import" | "recovery">("export");
  const [exportData, setExportData] = useState("");
  const [importData, setImportData] = useState("");
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveStatus = snapshot.saveStatus;

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setNotice(null);
    } else if (saveStatus.health === "corrupt") {
      setTab("recovery");
    }
  }, [open, saveStatus.health]);

  const perform = (
    action: () => ActionResult,
    successText: string
  ): ActionResult => {
    setBusy(true);
    try {
      const result = action();
      setNotice(resultNotice(result, successText, t));
      return result;
    } catch {
      setNotice({ tone: "error", text: t("操作失败") });
      return { ok: false, reason: "unknown" };
    } finally {
      setBusy(false);
    }
  };

  const exportSave = () => {
    setBusy(true);
    try {
      const result = actions.exportSave();
      if (result.ok && result.data) {
        setExportData(result.data);
        setNotice({ tone: "success", text: t("导出文本已生成") });
      } else {
        setNotice({
          tone: "error",
          text: actionReasonLabel(result.reason, t),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyExport = async () => {
    if (!exportData) {
      setNotice({ tone: "warning", text: t("请先生成导出文本") });
      return;
    }
    try {
      await navigator.clipboard.writeText(exportData);
      setNotice({ tone: "success", text: t("存档已复制") });
    } catch {
      const textarea =
        document.querySelector<HTMLTextAreaElement>("[data-save-export]");
      textarea?.select();
      const copied = textarea ? document.execCommand("copy") : false;
      setNotice(
        copied
          ? { tone: "success", text: t("存档已复制") }
          : { tone: "error", text: t("无法访问剪贴板") }
      );
    }
  };

  const downloadExport = () => {
    if (!exportData) {
      setNotice({ tone: "warning", text: t("请先生成导出文本") });
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kittens-game-${snapshot.version}-${stamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: "success", text: t("存档文件已下载") });
  };

  const requestImport = () => {
    if (!importData.trim()) {
      setNotice({ tone: "warning", text: t("请粘贴存档或选择存档文件") });
      return;
    }
    perform(() => actions.importSave(importData), t("存档已导入"));
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const value = await file.text();
      setImportData(value.trim());
      setNotice({
        tone: "success",
        text: t("已读取 {name}", { name: file.name }),
      });
    } catch {
      setNotice({ tone: "error", text: t("无法读取存档文件") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="kittens-game-theme border-kg-line bg-kg-dialog text-kg-body flex h-[min(88vh,760px)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        aria-describedby="save-dialog-description"
        data-save-dialog
      >
        <DialogHeader className="border-kg-line border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-kg-strong flex items-center gap-2 font-serif text-lg">
            <HardDrive className="text-kg-accent size-5" />
            {t("存档管理")}
          </DialogTitle>
          <DialogDescription
            id="save-dialog-description"
            className="text-kg-muted text-xs leading-relaxed"
          >
            {t("使用原版压缩与迁移格式管理本地进度。")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea type="hover" className="min-h-0 flex-1">
          <div className="pb-6">
            <div
              className="border-kg-line bg-kg-inset grid grid-cols-2 border-b md:grid-cols-4"
              data-save-health={saveStatus.health}
              data-save-version={saveStatus.currentVersion}
              data-save-source-version={saveStatus.sourceVersion ?? ""}
              data-save-migrated={saveStatus.migrated}
              data-save-has-local={saveStatus.hasLocalSave}
              data-save-has-backup={saveStatus.hasBackup}
            >
              <SaveMetric
                label={t("状态")}
                value={t(HEALTH_LABELS[saveStatus.health])}
                detail={saveStatus.hasLocalSave ? t("本地存在") : t("尚未写入")}
              />
              <SaveMetric
                label={t("格式版本")}
                value={
                  saveStatus.migrated && saveStatus.sourceVersion !== null
                    ? `v${saveStatus.sourceVersion} → v${saveStatus.currentVersion}`
                    : `v${saveStatus.currentVersion}`
                }
                detail={saveStatus.migrated ? t("已迁移") : t("当前格式")}
              />
              <SaveMetric
                label={t("上次保存")}
                value={formatTimestamp(saveStatus.lastSavedAt, formatLocale, t)}
              />
              <SaveMetric
                label={t("恢复点")}
                value={formatTimestamp(saveStatus.backupAt, formatLocale, t)}
                detail={saveStatus.hasBackup ? t("可恢复") : t("尚未建立")}
              />
            </div>

            {notice ? (
              <div
                className={cn(
                  "mx-5 mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                  notice.tone === "success" &&
                    "text-kg-success border-emerald-400/20 bg-emerald-400/[0.06]",
                  notice.tone === "warning" &&
                    "text-kg-accent border-amber-400/20 bg-amber-400/[0.06]",
                  notice.tone === "error" &&
                    "text-kg-danger border-rose-400/20 bg-rose-400/[0.06]"
                )}
                role="status"
                aria-live="polite"
                data-save-notice={notice.tone}
              >
                {notice.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                )}
                {notice.text}
              </div>
            ) : null}

            <Tabs
              value={tab}
              onValueChange={(value) =>
                setTab(value as "export" | "import" | "recovery")
              }
              className="gap-0"
            >
              <div className="border-kg-line border-b px-5 py-3">
                <TabsList className="bg-kg-inset-strong h-8 rounded-md p-0.5">
                  <TabsTrigger
                    value="export"
                    className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
                  >
                    {t("导出")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="import"
                    className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
                  >
                    {t("导入")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="recovery"
                    className="data-[state=active]:text-kg-accent h-7 px-3 text-xs data-[state=active]:bg-amber-400/15"
                  >
                    {t("恢复")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="export" className="m-0 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="text-kg-accent-foreground bg-amber-400 hover:bg-amber-300"
                    onClick={exportSave}
                    disabled={busy}
                    data-action="generate-save-export"
                  >
                    <Save className="size-3.5" />
                    {t("生成导出")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong"
                    onClick={copyExport}
                    disabled={!exportData}
                    data-action="copy-save-export"
                  >
                    <Clipboard className="size-3.5" />
                    {t("复制")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong"
                    onClick={downloadExport}
                    disabled={!exportData}
                    data-action="download-save-export"
                  >
                    <Download className="size-3.5" />
                    {t("下载文件")}
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={exportData}
                  placeholder={t("生成后在此显示原版压缩存档")}
                  aria-label={t("存档导出文本")}
                  className="border-kg-line bg-kg-inset-strong text-kg-body mt-3 min-h-48 resize-y font-mono text-[11px] leading-relaxed"
                  data-save-export
                />
              </TabsContent>

              <TabsContent value="import" className="m-0 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="sr-only"
                    onChange={loadFile}
                    data-save-file
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <FileUp className="size-3.5" />
                    {t("选择文件")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="text-kg-accent-foreground bg-amber-400 hover:bg-amber-300"
                    onClick={requestImport}
                    disabled={busy || !importData.trim()}
                    data-action="import-save"
                  >
                    <Upload className="size-3.5" />
                    {t("导入存档")}
                  </Button>
                </div>
                <p className="text-kg-muted mt-3 border-l-2 border-amber-400/30 pl-3 text-[11px] leading-relaxed">
                  {t("导入会替换当前进度。当前可读取存档会先保存为恢复点。")}
                </p>
                <Textarea
                  value={importData}
                  onChange={(event) => setImportData(event.target.value)}
                  placeholder={t("粘贴原版存档文本")}
                  aria-label={t("待导入存档文本")}
                  className="border-kg-line bg-kg-inset-strong text-kg-body mt-3 min-h-48 resize-y font-mono text-[11px] leading-relaxed"
                  data-save-import
                />
              </TabsContent>

              <TabsContent value="recovery" className="m-0 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-kg-line bg-kg-inset border p-4">
                    <div className="text-kg-body flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="text-kg-success size-4" />
                      {t("恢复点")}
                    </div>
                    <div className="text-kg-muted mt-1 text-[11px]">
                      {saveStatus.hasBackup
                        ? t("建立于 {time}", {
                            time: formatTimestamp(
                              saveStatus.backupAt,
                              formatLocale,
                              t
                            ),
                          })
                        : t("尚无可恢复的存档")}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong"
                        onClick={() =>
                          perform(actions.createBackup, t("恢复点已建立"))
                        }
                        disabled={busy || saveStatus.health === "corrupt"}
                        data-action="create-save-backup"
                      >
                        <History className="size-3.5" />
                        {t("建立恢复点")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-kg-control bg-kg-wash text-kg-body hover:bg-kg-hover-strong"
                        onClick={() =>
                          perform(actions.restoreBackup, t("已请求恢复备份"))
                        }
                        disabled={busy || !saveStatus.hasBackup}
                        data-action="restore-save-backup"
                      >
                        <RotateCcw className="size-3.5" />
                        {t("恢复备份")}
                      </Button>
                    </div>
                  </div>

                  <div className="border border-rose-400/15 bg-rose-400/[0.025] p-4">
                    <div className="text-kg-danger flex items-center gap-2 text-sm font-semibold">
                      <Trash2 className="size-4" />
                      {t("重置")}
                    </div>
                    <div className="text-kg-muted mt-1 text-[11px] leading-relaxed">
                      {t("清除当前进度并返回新游戏状态。")}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-kg-danger mt-4 border-rose-400/20 bg-rose-400/[0.03] hover:bg-rose-400/10"
                      onClick={() =>
                        perform(actions.resetGame, t("已请求重置存档"))
                      }
                      disabled={busy}
                      data-action="reset-save"
                    >
                      <Trash2 className="size-3.5" />
                      {t("重置存档")}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
