"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { clientSupabase } from "@/app/lib/supabase/client";
import { Logout } from "@/app/hooks/logout";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import type { WorkspaceMember } from "./types";

const removeButtonId = (id: number) => `member-remove-${id}`;

interface MemberSectionProps {
  workspaceId: number;
  userId: number;
  members: WorkspaceMember[];
  setMembers: Dispatch<SetStateAction<WorkspaceMember[]>>;
  onOpenConfirm: () => void;
}

// ワークスペースのメンバーの一覧と、メンバーを外す操作
const MemberSection: React.FC<MemberSectionProps> = ({
  workspaceId,
  userId,
  members,
  setMembers,
  onOpenConfirm,
}) => {
  const { useLogout } = Logout();
  const { setNotificationValue } = useNotificationContext();
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceMember | null>(null);
  const moveFocusAfterRemove = useRef<number | null>(null);

  // 外した行のボタンは消えるので、次の行（無ければ前の行）のボタンへフォーカスを移す。
  // Radix のダイアログが閉じたあとフォーカスを戻す処理（setTimeout）より後に確かめる
  useEffect(() => {
    if (deleteTarget || moveFocusAfterRemove.current === null) return;
    const nextId = moveFocusAfterRemove.current;
    moveFocusAfterRemove.current = null;
    const timer = setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        document.getElementById(removeButtonId(nextId))?.focus();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [deleteTarget]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: deleteError } = await clientSupabase
        .from("workspace_users")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", deleteTarget.id);

      if (deleteError) {
        throw deleteError;
      }
      const index = members.findIndex((member) => member.id === deleteTarget.id);
      const nextMember = members[index + 1] ?? members[index - 1];
      moveFocusAfterRemove.current = nextMember ? nextMember.id : null;
      setMembers((prev) => prev.filter((member) => member.id !== deleteTarget.id));
      setDeleteTarget(null);
      setNotificationValue({
        message: "メンバーを外しました。",
        color: 0,
      });
      if (deleteTarget.id === userId) {
        await useLogout();
      }
    } catch (error) {
      console.error("Error Delete User", error);
      setNotificationValue({
        message: "メンバーを外せませんでした。",
        color: 1,
      });
    }
  };

  return (
    <>
      <ul role="list" aria-label="メンバーの一覧" className="m-0 list-none divide-y rounded-md border p-0">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-2 py-1 pr-1 pl-3">
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              {member.name}
              {member.id === userId && <span className="ml-1 text-muted-foreground">（自分）</span>}
            </span>
            <Button
              id={removeButtonId(member.id)}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`「${member.name}」をメンバーから外す`}
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onOpenConfirm();
                setDeleteTarget(member);
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      {deleteTarget && (
        <ConfirmDialog
          title={`「${deleteTarget.name}」を外しますか？`}
          description={
            deleteTarget.id === userId
              ? "自分を外すと、このワークスペースから抜けてログアウトします。"
              : "このワークスペースのメンバーから外します。"
          }
          confirmLabel="外す"
          pendingLabel="外しています"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default MemberSection;
