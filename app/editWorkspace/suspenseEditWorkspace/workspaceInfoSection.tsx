"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import type { ActiveForm, WorkspaceData } from "./types";

const EDIT_BUTTON_ID = "workspace-name-edit";

interface WorkspaceInfoSectionProps {
  workspaceData: WorkspaceData;
  setWorkspaceData: Dispatch<SetStateAction<WorkspaceData>>;
  activeForm: ActiveForm;
  setActiveForm: Dispatch<SetStateAction<ActiveForm>>;
}

// ワークスペースの名前の編集と、参加に使う合言葉のコピー
const WorkspaceInfoSection: React.FC<WorkspaceInfoSectionProps> = ({
  workspaceData,
  setWorkspaceData,
  activeForm,
  setActiveForm,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const returnFocus = useRef(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = activeForm?.type === "name";
  // 保存の返事を待つ間に別のフォームへ移っていたら、そのフォームを閉じない
  const isEditingNow = useRef(isEditing);

  useEffect(() => {
    isEditingNow.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // フォームを閉じると押したボタンが消えるので、「編集」へフォーカスを戻す
  useEffect(() => {
    if (isEditing || !returnFocus.current) return;
    returnFocus.current = false;
    document.getElementById(EDIT_BUTTON_ID)?.focus();
  }, [isEditing]);

  const openForm = () => {
    setEditName(workspaceData.name);
    setActiveForm({ type: "name" });
  };

  const closeForm = () => {
    if (!isEditingNow.current) return;
    returnFocus.current = true;
    setActiveForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 返事を待つ間に Enter などでもう一度送っても、2回は送らない
    if (saving) return;
    setSaving(true);
    try {
      const { error: workspaceNameUpdateError } = await clientSupabase
        .from("workspace")
        .update({ workspace_name: editName })
        .eq("id", workspaceData.id);

      if (workspaceNameUpdateError) {
        throw workspaceNameUpdateError;
      }

      setWorkspaceData((prev) => ({ ...prev, name: editName }));
      // サイドバーのワークスペース名も読み直す
      setPageUpdated(true);
      setNotificationValue({
        message: "ワークスペース名を更新しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Workspace Name", error);
      setNotificationValue({
        message: "ワークスペース名を更新できませんでした。",
        color: 1,
      });
    }
    setSaving(false);
    closeForm();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(workspaceData.spaceId);
    } catch (error) {
      console.error("Copy Space ID", error);
      setNotificationValue({
        message: "合言葉をコピーできませんでした。",
        color: 1,
      });
      return;
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section aria-labelledby="workspace-info-heading" className="rounded-lg border bg-card">
      <h2 id="workspace-info-heading" className="m-0 border-b px-4 py-3 text-sm font-semibold">
        基本情報
      </h2>
      <div className="space-y-4 p-4 text-sm">
        <div>
          {isEditing ? (
            <form onSubmit={handleSubmit} aria-label="ワークスペース名の編集" className="space-y-1.5">
              <Label htmlFor="workspace-name-input">ワークスペース名</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="workspace-name-input"
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Button type="button" variant="ghost" size="icon-sm" aria-label="編集をやめる" onClick={closeForm}>
                  <X aria-hidden />
                </Button>
                <Button type="submit" size="icon-sm" aria-label="ワークスペース名を保存" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-muted-foreground">ワークスペース名</p>
                <p className="m-0 mt-0.5 font-medium [overflow-wrap:anywhere]">{workspaceData.name}</p>
              </div>
              <Button
                id={EDIT_BUTTON_ID}
                type="button"
                variant="outline"
                size="sm"
                aria-label="ワークスペース名を編集"
                onClick={openForm}
              >
                <Pencil aria-hidden />
                編集
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div className="min-w-0">
            <p className="m-0 text-muted-foreground">合言葉</p>
            <p className="m-0 mt-0.5 font-mono [overflow-wrap:anywhere]">{workspaceData.spaceId}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span role="status" className="text-xs text-muted-foreground">
              {copied ? "コピーしました" : ""}
            </span>
            <Button type="button" variant="outline" size="sm" aria-label="合言葉をコピー" onClick={handleCopy}>
              <Copy aria-hidden />
              コピー
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceInfoSection;
