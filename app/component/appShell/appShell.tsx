"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppSidebar,
  type SidebarCurrent,
  type SidebarProject,
  type SidebarWorkspace,
} from "@/components/app-sidebar";
import MailNotificationList from "../mailNotificationList/mailNotificationList";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getWorkspace } from "@/app/lib/api/getWorkspace";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getMailNotifications } from "@/app/lib/api/getMailNotification";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { Logout } from "@/app/hooks/logout";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

type Notification = {
  id: number;
  message: string;
  isRead: boolean;
  timestamp: string;
};

interface AppShellProps {
  userId: number;
  current: SidebarCurrent;
  children: React.ReactNode;
}

// 作業する画面の枠。左にサイドバー、右に画面の中身を置く（台帳 決定14）。
// 以前のヘッダーが持っていた、ワークスペースの切り替え・通知・アカウント・ログアウトをここで扱う
const AppShell: React.FC<AppShellProps> = ({ userId, current, children }) => {
  const router = useRouter();
  const { useLogout } = Logout();
  const { displayWorkspaceId, setDisplayWorkspaceId } =
    useDisplayWorkspaceIdContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();

  const [workspaces, setWorkspaces] = useState<SidebarWorkspace[]>([]);
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const workspaceUserBelongsData = await getWorkspace(userId);
      setWorkspaces(
        workspaceUserBelongsData
          .map((data) =>
            Array.isArray(data.workspace) ? data.workspace[0] : data.workspace
          )
          .filter(Boolean)
          .map((workspace) => ({
            id: workspace.id,
            workspaceName: workspace.workspace_name,
          }))
      );
    })();
  }, [userId, pageUpdated]);

  useEffect(() => {
    if (!displayWorkspaceId) return;
    (async () => {
      const projectData = await getProjectData(null, displayWorkspaceId);
      setProjects(
        (projectData ?? []).map((project) => ({
          id: project.id,
          projectName: project.project_name,
        }))
      );
    })();
  }, [displayWorkspaceId, pageUpdated]);

  // 通知は開け閉めのたびに読み直す。7日を過ぎた既読の通知は消す（以前のヘッダーの処理と同じ）
  useEffect(() => {
    if (!displayWorkspaceId) return;
    (async () => {
      const mailNotifications = await getMailNotifications(
        userId,
        displayWorkspaceId
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const kept: Notification[] = [];
      await Promise.all(
        mailNotifications.map(async (mailNotification) => {
          const sevenDaysLater = new Date(mailNotification.created_at);
          sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

          if (sevenDaysLater > today || !mailNotification.isRead) {
            kept.push({
              id: mailNotification.id,
              message: mailNotification.text,
              isRead: mailNotification.isRead,
              timestamp: formatDateTime(mailNotification.created_at),
            });
          } else {
            const { error } = await clientSupabase
              .from("mail_notifications")
              .delete()
              .eq("id", mailNotification.id);
            if (error) {
              console.error("Delete Mail Notification", error);
            }
          }
        })
      );
      setNotifications(kept);
    })();
  }, [userId, displayWorkspaceId, showNotifications]);

  // 通知の一覧の外を押したら閉じる。サイドバーの中は、通知のボタンが開け閉めするので除く
  useEffect(() => {
    if (!showNotifications) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !listRef.current?.contains(target) &&
        !sidebarRef.current?.contains(target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showNotifications]);

  const handleSelectWorkspace = (workspaceId: number) => {
    setDisplayWorkspaceId(workspaceId);
    setPageUpdated(true);
    // 開いているプロジェクトは前のワークスペースのものなので、タスク画面に戻る
    if (current?.kind === "project") {
      router.push("/task");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div ref={sidebarRef} className="relative">
        <AppSidebar
          workspaces={workspaces}
          currentWorkspaceId={displayWorkspaceId}
          projects={projects}
          current={current}
          unreadCount={notifications.filter((n) => !n.isRead).length}
          onSelectWorkspace={handleSelectWorkspace}
          onEditWorkspace={() =>
            router.push(`/editWorkspace?workspaceId=${displayWorkspaceId}`)
          }
          onOpenTasks={() => router.push("/task")}
          onOpenProject={(projectId) =>
            router.push(
              `/project?workspaceId=${displayWorkspaceId}&projectId=${projectId}`
            )
          }
          onOpenNotifications={() => setShowNotifications((open) => !open)}
          onOpenAccount={() => router.push("/account")}
          onLogout={() => useLogout()}
        />
      </div>
      {showNotifications && (
        <MailNotificationList
          notifications={notifications}
          listRef={listRef}
          style={{ left: "16.5rem", bottom: "1rem", top: "auto", right: "auto" }}
        />
      )}
      <main className="relative min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default AppShell;
