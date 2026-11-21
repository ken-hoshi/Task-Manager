"use client";

import {
  Bell,
  ChevronsUpDown,
  FolderKanban,
  ListTodo,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SidebarWorkspace {
  id: number;
  workspaceName: string;
}

export interface SidebarProject {
  id: number;
  projectName: string;
}

// 今どの画面にいるか。タスク・プロジェクト・ワークスペースの設定のどれでもない画面（アカウントなど）では null
export type SidebarCurrent =
  | { kind: "tasks" }
  | { kind: "project"; id: number }
  | { kind: "workspaceSettings" }
  | null;

interface AppSidebarProps {
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: number | null;
  projects: SidebarProject[];
  current: SidebarCurrent;
  unreadCount: number;
  // 通知の一覧が開いているか と、その一覧の id。読み上げに開閉を伝える
  notificationsOpen?: boolean;
  notificationsId?: string;
  onSelectWorkspace: (workspaceId: number) => void;
  onEditWorkspace: () => void;
  onOpenTasks: () => void;
  onOpenProject: (projectId: number) => void;
  onOpenNotifications: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
}

// 画面の左に置く移動の枠（台帳 決定14）。データは持たず、呼び出す画面から受け取る
export function AppSidebar({
  workspaces,
  currentWorkspaceId,
  projects,
  current,
  unreadCount,
  notificationsOpen = false,
  notificationsId,
  onSelectWorkspace,
  onEditWorkspace,
  onOpenTasks,
  onOpenProject,
  onOpenNotifications,
  onOpenAccount,
  onLogout,
}: AppSidebarProps) {
  // 一覧に無いとき（読み込み前・抜けた直後）は、別のワークスペースの名前を出さない
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId
  );
  const isTasksCurrent = current?.kind === "tasks";
  const currentProjectId = current?.kind === "project" ? current.id : null;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sm text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-2 font-semibold">
              <span className="truncate">
                <span className="sr-only">ワークスペースを切り替える: </span>
                {currentWorkspace?.workspaceName ?? "ワークスペース"}
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>ワークスペース</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentWorkspace ? String(currentWorkspace.id) : ""}
                onValueChange={(value) => onSelectWorkspace(Number(value))}
              >
                {workspaces.map((workspace) => (
                  <DropdownMenuRadioItem key={workspace.id} value={String(workspace.id)}>
                    {workspace.workspaceName}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onEditWorkspace}>
              <Settings className="size-4" aria-hidden />
              ワークスペースの設定
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav aria-label="メイン" className="flex-1 overflow-y-auto p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 px-2",
            isTasksCurrent && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          aria-current={isTasksCurrent ? "page" : undefined}
          onClick={onOpenTasks}
        >
          <ListTodo className="size-4" aria-hidden />
          タスク
        </Button>

        <p className="mt-5 mb-1 px-2 text-xs font-medium text-muted-foreground">
          プロジェクト
        </p>
        {projects.length === 0 ? (
          <p className="px-2 py-1.5 text-muted-foreground">
            プロジェクトはまだありません
          </p>
        ) : (
          <ul className="m-0 list-none space-y-0.5 p-0">
            {projects.map((project) => (
              <li key={project.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 px-2 font-normal",
                    project.id === currentProjectId &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                  aria-current={project.id === currentProjectId ? "page" : undefined}
                  onClick={() => onOpenProject(project.id)}
                >
                  <FolderKanban className="size-4 text-muted-foreground" aria-hidden />
                  <span className="truncate">{project.projectName}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2"
          aria-expanded={notificationsOpen}
          aria-controls={notificationsOpen ? notificationsId : undefined}
          onClick={onOpenNotifications}
        >
          <Bell className="size-4" aria-hidden />
          通知
          {unreadCount > 0 && (
            <>
              <span
                className="ml-auto rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
                aria-hidden
              >
                {unreadCount}
              </span>
              <span className="sr-only">未読 {unreadCount} 件</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2"
          onClick={onOpenAccount}
        >
          <UserRound className="size-4" aria-hidden />
          アカウント
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut className="size-4" aria-hidden />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
