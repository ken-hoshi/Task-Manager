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
  DropdownMenuItem,
  DropdownMenuLabel,
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

interface AppSidebarProps {
  workspaces: SidebarWorkspace[];
  currentWorkspaceId: number | null;
  projects: SidebarProject[];
  // タスク画面を開いているときは null。プロジェクト画面ではそのプロジェクトの id
  currentProjectId: number | null;
  unreadCount: number;
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
  currentProjectId,
  unreadCount,
  onSelectWorkspace,
  onEditWorkspace,
  onOpenTasks,
  onOpenProject,
  onOpenNotifications,
  onOpenAccount,
  onLogout,
}: AppSidebarProps) {
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) ??
    workspaces[0];

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sm text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-2 font-semibold"
              aria-label="ワークスペースを切り替える"
            >
              <span className="truncate">
                {currentWorkspace?.workspaceName ?? "ワークスペース"}
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>ワークスペース</DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onSelect={() => onSelectWorkspace(workspace.id)}
                className={cn(
                  workspace.id === currentWorkspace?.id && "font-semibold"
                )}
              >
                {workspace.workspaceName}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onEditWorkspace}>
              <Settings className="size-4" />
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
            currentProjectId === null &&
              "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          aria-current={currentProjectId === null ? "page" : undefined}
          onClick={onOpenTasks}
        >
          <ListTodo className="size-4" />
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
          <ul className="space-y-0.5">
            {projects.map((project) => (
              <li key={project.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 px-2 font-normal",
                    project.id === currentProjectId &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                  aria-current={
                    project.id === currentProjectId ? "page" : undefined
                  }
                  onClick={() => onOpenProject(project.id)}
                >
                  <FolderKanban className="size-4 text-muted-foreground" />
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
          onClick={onOpenNotifications}
        >
          <Bell className="size-4" />
          通知
          {unreadCount > 0 && (
            <span
              className="ml-auto rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
              aria-label={`未読 ${unreadCount} 件`}
            >
              {unreadCount}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2"
          onClick={onOpenAccount}
        >
          <UserRound className="size-4" />
          アカウント
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
