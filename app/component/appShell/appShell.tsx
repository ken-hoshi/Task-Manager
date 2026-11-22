"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppSidebar,
  type SidebarCurrent,
  type SidebarProject,
  type SidebarWorkspace,
} from "@/components/app-sidebar";
import MailNotificationList, {
  type Notification,
} from "../mailNotificationList/mailNotificationList";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getWorkspace } from "@/app/lib/api/getWorkspace";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getMailNotifications } from "@/app/lib/api/getMailNotification";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { Logout } from "@/app/hooks/logout";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

const NOTIFICATION_LIST_ID = "app-shell-notifications";

interface AppShellProps {
  // ページがまだ読み込み中なら 0。0 の間は何も読まない
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
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [projects, setProjects] = useState<SidebarProject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // 画面が読み直しを求めた（pageUpdated が true になった）回数。false に戻るときには読み直さない
  const [refreshCount, setRefreshCount] = useState(0);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageUpdated) setRefreshCount((count) => count + 1);
  }, [pageUpdated]);

  // ワークスペースの名前を変えられるのは設定の画面だけなので、そこでだけ一覧を読み直す
  const workspaceListRefresh = current?.kind === "workspaceSettings" ? refreshCount : 0;

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    (async () => {
      const workspaceUserBelongsData = await getWorkspace(userId);
      if (ignore) return;
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
      setWorkspacesLoaded(true);
    })();
    return () => {
      ignore = true;
    };
  }, [userId, workspaceListRefresh]);

  // ワークスペースを素早く切り替えたとき、前のワークスペースの遅れた応答で上書きしない
  useEffect(() => {
    if (!displayWorkspaceId) return;
    let ignore = false;
    (async () => {
      const projectData = await getProjectData(null, displayWorkspaceId);
      if (ignore) return;
      setProjects(
        (projectData ?? []).map((project) => ({
          id: project.id,
          projectName: project.project_name,
        }))
      );
    })();
    return () => {
      ignore = true;
    };
  }, [displayWorkspaceId, refreshCount]);

  // 通知は開け閉めと画面の読み直しのたびに読み直す。7日を過ぎた既読の通知は消す（以前のヘッダーの処理と同じ）
  useEffect(() => {
    if (!userId || !displayWorkspaceId) return;
    let ignore = false;
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
      if (!ignore) setNotifications(kept);
    })();
    return () => {
      ignore = true;
    };
  }, [userId, displayWorkspaceId, showNotifications, refreshCount]);

  // 通知の一覧は、外を押すか Escape で閉じる。サイドバーの中は、通知のボタンが開け閉めするので除く
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications]);

  const handleSelectWorkspace = (workspaceId: number) => {
    if (workspaceId === displayWorkspaceId) return;
    setDisplayWorkspaceId(workspaceId);
    if (current?.kind === "project") {
      // 開いているプロジェクトは前のワークスペースのものなので、タスク画面に戻る。
      // タスク画面は開いたときに読むので、読み直しは求めない
      router.push("/task");
    } else if (current?.kind === "workspaceSettings") {
      // 設定の画面は URL のワークスペースを読むので、切り替え先の設定を開く
      router.push(`/editWorkspace?workspaceId=${workspaceId}`);
    } else if (current?.kind === "tasks") {
      // アカウント画面の中身はワークスペースに関係しないので、読み直さない（書きかけの入力を守る）
      setPageUpdated(true);
    }
  };

  const handleEditWorkspace = () => {
    const workspaceId = displayWorkspaceId ?? workspaces[0]?.id;
    if (workspaceId) {
      router.push(`/editWorkspace?workspaceId=${workspaceId}`);
    } else if (workspacesLoaded) {
      // 所属が1つも無いと分かったときだけ、作成へ移す
      router.push("/createWorkspace?atSignUp=false");
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
          notificationsOpen={showNotifications}
          notificationsId={NOTIFICATION_LIST_ID}
          onSelectWorkspace={handleSelectWorkspace}
          onEditWorkspace={handleEditWorkspace}
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
          id={NOTIFICATION_LIST_ID}
          notifications={notifications}
          listRef={listRef}
        />
      )}
      <main className="relative min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default AppShell;
