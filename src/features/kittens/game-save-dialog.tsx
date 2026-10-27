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
import type {
  ActionResult,
  GameSnapshot,
  SaveExportResult,
  SaveImportResult,
  SaveStatusSnapshot,
} from "@/game/kernel/types";
import { cn } from "@/lib/utils";

import { actionReasonLabel } from "./game-format";

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

const HEALTH_LABELS: Record<SaveStatusSnapshot["health"], string> = {
  new: "新游戏",
  healthy: "可读取",
  corrupt: "存档损坏",
  unavailable: "存储不可用",
};

function formatTimestamp(value: number | null): string {
  if (!value) return "无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function resultNotice(result: ActionResult, successText: string): SaveNotice {
  if (result.ok) return { tone: "success", text: successText };
  if (result.reason === "requires-confirmation") {
    return { tone: "warning", text: "等待确认操作" };
  }
  return {
    tone: "error",
    text: actionReasonLabel(result.reason),
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
    <div className="min-w-0 border-b border-white/[0.07] px-4 py-3 md:border-r md:last:border-r-0">
      <div className="text-[10px] text-stone-600">{label}</div>
      <div className="mt-1 truncate font-mono text-xs text-stone-200">
        {value}
      </div>
      {detail ? (
        <div className="mt-0.5 truncate text-[10px] text-stone-600">
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
      setNotice(resultNotice(result, successText));
      return result;
    } catch {
      setNotice({ tone: "error", text: "操作失败" });
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
        setNotice({ tone: "success", text: "导出文本已生成" });
      } else {
        setNotice({
          tone: "error",
          text: actionReasonLabel(result.reason),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyExport = async () => {
    if (!exportData) {
      setNotice({ tone: "warning", text: "请先生成导出文本" });
      return;
    }
    try {
      await navigator.clipboard.writeText(exportData);
      setNotice({ tone: "success", text: "存档已复制" });
    } catch {
      const textarea =
        document.querySelector<HTMLTextAreaElement>("[data-save-export]");
      textarea?.select();
      const copied = textarea ? document.execCommand("copy") : false;
      setNotice(
        copied
          ? { tone: "success", text: "存档已复制" }
          : { tone: "error", text: "无法访问剪贴板" }
      );
    }
  };

  const downloadExport = () => {
    if (!exportData) {
      setNotice({ tone: "warning", text: "请先生成导出文本" });
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
    setNotice({ tone: "success", text: "存档文件已下载" });
  };

  const requestImport = () => {
    if (!importData.trim()) {
      setNotice({ tone: "warning", text: "请粘贴存档或选择存档文件" });
      return;
    }
    perform(() => actions.importSave(importData), "存档已导入");
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const value = await file.text();
      setImportData(value.trim());
      setNotice({ tone: "success", text: `已读取 ${file.name}` });
    } catch {
      setNotice({ tone: "error", text: "无法读取存档文件" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(88vh,760px)] max-w-3xl gap-0 overflow-y-auto border-white/10 bg-[#151a15] p-0 text-stone-100"
        aria-describedby="save-dialog-description"
        data-save-dialog
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg text-stone-50">
            <HardDrive className="size-5 text-amber-300" />
            存档管理
          </DialogTitle>
          <DialogDescription
            id="save-dialog-description"
            className="text-xs leading-relaxed text-stone-500"
          >
            使用原版压缩与迁移格式管理本地进度。
          </DialogDescription>
        </DialogHeader>

        <div
          className="grid grid-cols-2 border-b border-white/10 bg-black/10 md:grid-cols-4"
          data-save-health={saveStatus.health}
          data-save-version={saveStatus.currentVersion}
          data-save-source-version={saveStatus.sourceVersion ?? ""}
          data-save-migrated={saveStatus.migrated}
          data-save-has-local={saveStatus.hasLocalSave}
          data-save-has-backup={saveStatus.hasBackup}
        >
          <SaveMetric
            label="状态"
            value={HEALTH_LABELS[saveStatus.health]}
            detail={saveStatus.hasLocalSave ? "本地存在" : "尚未写入"}
          />
          <SaveMetric
            label="格式版本"
            value={
              saveStatus.migrated && saveStatus.sourceVersion !== null
                ? `v${saveStatus.sourceVersion} → v${saveStatus.currentVersion}`
                : `v${saveStatus.currentVersion}`
            }
            detail={saveStatus.migrated ? "已迁移" : "当前格式"}
          />
          <SaveMetric
            label="上次保存"
            value={formatTimestamp(saveStatus.lastSavedAt)}
          />
          <SaveMetric
            label="恢复点"
            value={formatTimestamp(saveStatus.backupAt)}
            detail={saveStatus.hasBackup ? "可恢复" : "尚未建立"}
          />
        </div>

        {notice ? (
          <div
            className={cn(
              "mx-5 mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
              notice.tone === "success" &&
                "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200",
              notice.tone === "warning" &&
                "border-amber-400/20 bg-amber-400/[0.06] text-amber-200",
              notice.tone === "error" &&
                "border-rose-400/20 bg-rose-400/[0.06] text-rose-200"
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
          <div className="border-b border-white/10 px-5 py-3">
            <TabsList className="h-8 rounded-md bg-black/20 p-0.5">
              <TabsTrigger
                value="export"
                className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
              >
                导出
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
              >
                导入
              </TabsTrigger>
              <TabsTrigger
                value="recovery"
                className="h-7 px-3 text-xs data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
              >
                恢复
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="export" className="m-0 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-amber-400 text-stone-950 hover:bg-amber-300"
                onClick={exportSave}
                disabled={busy}
                data-action="generate-save-export"
              >
                <Save className="size-3.5" />
                生成导出
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
                onClick={copyExport}
                disabled={!exportData}
                data-action="copy-save-export"
              >
                <Clipboard className="size-3.5" />
                复制
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
                onClick={downloadExport}
                disabled={!exportData}
                data-action="download-save-export"
              >
                <Download className="size-3.5" />
                下载文件
              </Button>
            </div>
            <Textarea
              readOnly
              value={exportData}
              placeholder="生成后在此显示原版压缩存档"
              aria-label="存档导出文本"
              className="mt-3 min-h-48 resize-y border-white/10 bg-black/20 font-mono text-[11px] leading-relaxed text-stone-300"
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
                className="border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <FileUp className="size-3.5" />
                选择文件
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-400 text-stone-950 hover:bg-amber-300"
                onClick={requestImport}
                disabled={busy || !importData.trim()}
                data-action="import-save"
              >
                <Upload className="size-3.5" />
                导入存档
              </Button>
            </div>
            <p className="mt-3 border-l-2 border-amber-400/30 pl-3 text-[11px] leading-relaxed text-stone-500">
              导入会替换当前进度。当前可读取存档会先保存为恢复点。
            </p>
            <Textarea
              value={importData}
              onChange={(event) => setImportData(event.target.value)}
              placeholder="粘贴原版存档文本"
              aria-label="待导入存档文本"
              className="mt-3 min-h-48 resize-y border-white/10 bg-black/20 font-mono text-[11px] leading-relaxed text-stone-300"
              data-save-import
            />
          </TabsContent>

          <TabsContent value="recovery" className="m-0 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-white/10 bg-black/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-200">
                  <ShieldCheck className="size-4 text-emerald-300" />
                  恢复点
                </div>
                <div className="mt-1 text-[11px] text-stone-500">
                  {saveStatus.hasBackup
                    ? `建立于 ${formatTimestamp(saveStatus.backupAt)}`
                    : "尚无可恢复的存档"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
                    onClick={() =>
                      perform(actions.createBackup, "恢复点已建立")
                    }
                    disabled={busy || saveStatus.health === "corrupt"}
                    data-action="create-save-backup"
                  >
                    <History className="size-3.5" />
                    建立恢复点
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/15 bg-white/[0.03] text-stone-200 hover:bg-white/10"
                    onClick={() =>
                      perform(actions.restoreBackup, "已请求恢复备份")
                    }
                    disabled={busy || !saveStatus.hasBackup}
                    data-action="restore-save-backup"
                  >
                    <RotateCcw className="size-3.5" />
                    恢复备份
                  </Button>
                </div>
              </div>

              <div className="border border-rose-400/15 bg-rose-400/[0.025] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                  <Trash2 className="size-4" />
                  重置
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-stone-500">
                  清除当前进度并返回新游戏状态。
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-4 border-rose-400/20 bg-rose-400/[0.03] text-rose-200 hover:bg-rose-400/10"
                  onClick={() => perform(actions.resetGame, "已请求重置存档")}
                  disabled={busy}
                  data-action="reset-save"
                >
                  <Trash2 className="size-3.5" />
                  重置存档
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
