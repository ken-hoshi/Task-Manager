"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CircleCheck, ChevronRight, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import AddButton from "@/app/component/addButton/addButton";
import EditButton from "@/app/component/editButton/editButton";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import TaskGenreSummary from "@/app/component/taskDetails/taskGenreSummary";
import AttachedFileList from "@/app/component/taskDetails/attachedFileList";
import { AttachedFileData } from "@/app/component/taskDetails/types";
import { clientSupabase } from "@/app/lib/supabase/client";
import { TASK_STATUS_DOT_CLASSES, TASK_STATUS_LABELS } from "@/app/lib/taskStatus";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

interface Project {
  id: number;
  project_name: string;
}

interface SmallProject {
  id: number;
  project_id: number;
  small_project_name: string | null;
  isFinished: boolean;
  details: string | null;
}

interface SmallProjectMembers {
  smallProjectId: number;
  membersDataArray: { id: number; name: string }[];
}

interface SmallProjectStatus {
  smallProjectId: number;
  projectId: number;
  notStarted: number;
  processing: number;
  completed: number;
}

interface SmallProjectTaskGenres {
  smallProjectId: number;
  taskGenreDataArray: {
    taskGenreId: number;
    taskGenreName: string;
    numberOfPersons: number;
    startDate: string;
    deadlineDate: string;
    numberOfDays: number;
  }[];
}

interface AttachedFiles {
  id: number;
  fileDataArray: AttachedFileData[];
}

interface ProjectListProps {
  projectDataArray: Project[];
  smallProjectDataArray: SmallProject[];
  smallProjectMemberDataArray: SmallProjectMembers[];
  smallProjectStatusDataArray: SmallProjectStatus[];
  smallProjectTaskGenreArray: SmallProjectTaskGenres[];
  attachedFileDataArray: AttachedFiles[];
  userId: number;
}

interface StatusCountsValue {
  notStarted: number;
  processing: number;
  completed: number;
}

// ステータスごとの件数。色の点・日本語の名前・数を並べる
const StatusCounts: React.FC<{ counts: StatusCountsValue }> = ({ counts }) => (
  <ul className="m-0 flex list-none items-center gap-3 p-0 text-xs text-muted-foreground">
    {(
      [
        [1, counts.notStarted],
        [2, counts.processing],
        [3, counts.completed],
      ] as const
    ).map(([statusId, count]) => (
      <li key={statusId} className="inline-flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full", TASK_STATUS_DOT_CLASSES[statusId])} aria-hidden />
        {TASK_STATUS_LABELS[statusId]}
        <span className="font-medium tabular-nums text-foreground">{count}</span>
      </li>
    ))}
  </ul>
);

// 詳細の欄の見出しと中身
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1.5">
    <h4 className="m-0 text-xs font-medium text-muted-foreground">{title}</h4>
    <div className="text-sm">{children}</div>
  </section>
);

// タスク画面の「プロジェクト」の表。プロジェクトを開くと小プロジェクトが、小プロジェクトを開くと詳細が出る
const ProjectList: React.FC<ProjectListProps> = ({
  projectDataArray,
  smallProjectDataArray,
  smallProjectMemberDataArray,
  smallProjectStatusDataArray,
  smallProjectTaskGenreArray,
  attachedFileDataArray,
  userId,
}) => {
  const router = useRouter();
  const { setPageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();

  const [showFinished, setShowFinished] = useState(false);
  const [openProjectIds, setOpenProjectIds] = useState<Set<number>>(new Set());
  const [openSmallProjectIds, setOpenSmallProjectIds] = useState<Set<number>>(new Set());

  // 小プロジェクトがすべて終わったプロジェクト。「完了したプロジェクトを表示」でこれだけを出す
  const finishedProjectIds = useMemo(() => {
    const finishedByProject = new Map<number, boolean[]>();
    smallProjectDataArray.forEach(({ project_id, isFinished }) => {
      finishedByProject.set(project_id, [...(finishedByProject.get(project_id) ?? []), isFinished]);
    });
    return new Set(
      [...finishedByProject.entries()]
        .filter(([, flags]) => flags.every(Boolean))
        .map(([projectId]) => projectId)
    );
  }, [smallProjectDataArray]);

  const visibleProjects = projectDataArray.filter((project) =>
    showFinished ? finishedProjectIds.has(project.id) : !finishedProjectIds.has(project.id)
  );

  // 以前と同じく、プロジェクトの開閉は読み直しのあとも残し、小プロジェクトの開閉は読み直すたびに閉じる
  useEffect(() => {
    setOpenSmallProjectIds(new Set());
    const ids = new Set(projectDataArray.map((project) => project.id));
    setOpenProjectIds((prev) => {
      const kept = [...prev].filter((id) => ids.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [projectDataArray, smallProjectDataArray]);

  const smallProjectsOf = (projectId: number) =>
    smallProjectDataArray.filter((smallProject) => smallProject.project_id === projectId);

  const statusOf = (smallProjectId: number): StatusCountsValue => {
    const status = smallProjectStatusDataArray.find((s) => s.smallProjectId === smallProjectId);
    return {
      notStarted: status?.notStarted ?? 0,
      processing: status?.processing ?? 0,
      completed: status?.completed ?? 0,
    };
  };

  const totalStatusOf = (projectId: number): StatusCountsValue =>
    smallProjectStatusDataArray
      .filter((status) => status.projectId === projectId)
      .reduce(
        (total, status) => ({
          notStarted: total.notStarted + status.notStarted,
          processing: total.processing + status.processing,
          completed: total.completed + status.completed,
        }),
        { notStarted: 0, processing: 0, completed: 0 }
      );

  const toggleProject = (projectId: number) => {
    const willClose = openProjectIds.has(projectId);
    setOpenProjectIds((prev) => {
      const next = new Set(prev);
      if (willClose) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    // プロジェクトを閉じたら、その中の小プロジェクトも閉じる
    if (willClose) {
      const childIds = new Set(smallProjectsOf(projectId).map((smallProject) => smallProject.id));
      setOpenSmallProjectIds((prev) => new Set([...prev].filter((id) => !childIds.has(id))));
    }
  };

  const toggleSmallProject = (smallProjectId: number) => {
    setOpenSmallProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(smallProjectId)) next.delete(smallProjectId);
      else next.add(smallProjectId);
      return next;
    });
  };

  const openProjectPage = (projectId: number, smallProjectId: number | null) => {
    router.push(
      smallProjectId
        ? `/project?workspaceId=${displayWorkspaceId}&projectId=${projectId}&smallProjectId=${smallProjectId}`
        : `/project?workspaceId=${displayWorkspaceId}&projectId=${projectId}`
    );
  };

  // shortcut: 更新を待たずに画面を読み直す（前からの動き）。読み直しが更新より先に済むと、表示が古いまま残る
  const handleToggleFinished = (smallProject: SmallProject) => {
    (async () => {
      const { error } = await clientSupabase
        .from("small_projects")
        .update({ isFinished: !smallProject.isFinished })
        .eq("id", smallProject.id);
      if (error) {
        console.error("Update Small Projects", error);
        setNotificationValue({ message: "小プロジェクトを更新できませんでした。", color: 1 });
      }
    })();
    setPageUpdated(true);
  };

  const handleToggleShowFinished = () => {
    setShowFinished(!showFinished);
    setPageUpdated(true);
  };

  // 小プロジェクトの詳細。メンバー・ジャンル・詳細・添付
  const renderDetails = (smallProject: SmallProject) => {
    const members =
      smallProjectMemberDataArray.find((m) => m.smallProjectId === smallProject.id)
        ?.membersDataArray ?? [];
    const genres =
      smallProjectTaskGenreArray.find((g) => g.smallProjectId === smallProject.id)
        ?.taskGenreDataArray ?? [];
    const files = attachedFileDataArray.find((f) => f.id === smallProject.id)?.fileDataArray;

    return (
      <div className="grid gap-5 bg-muted/40 px-6 py-5 md:grid-cols-2">
        <Section title="メンバー">
          {members.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {members.map((member) => (
                <li key={member.id} className="rounded-full bg-background px-2.5 py-0.5 text-xs ring-1 ring-border">
                  {member.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-muted-foreground">メンバーはいません</p>
          )}
        </Section>
        <Section title="ジャンル">
          {genres.length > 0 ? (
            <div className="space-y-4">
              {genres.map((genre) => (
                <TaskGenreSummary
                  key={genre.taskGenreId}
                  taskGenre={{ ...genre, taskId: 0, assignedUserTaskResultData: [] }}
                />
              ))}
            </div>
          ) : (
            <p className="m-0 text-muted-foreground">ジャンルはありません</p>
          )}
        </Section>
        <Section title="詳細">
          {smallProject.details ? (
            <p className="m-0 whitespace-pre-wrap">{smallProject.details}</p>
          ) : (
            <p className="m-0 text-muted-foreground">詳細はありません</p>
          )}
        </Section>
        <Section title="添付ファイル">
          <AttachedFileList fileDataArray={files} />
        </Section>
      </div>
    );
  };

  // 押すとプロジェクト画面へ移る名前。移ると分かるよう、矢印を添えたリンクの見た目にする
  const renderNameLink = (name: string, onClick: () => void, strong: boolean) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex min-w-0 items-center gap-1 rounded text-left hover:text-primary",
        strong ? "font-semibold" : "font-medium"
      )}
    >
      <span className="truncate underline-offset-4 group-hover:underline">{name}</span>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
    </button>
  );

  return (
    <section
      aria-labelledby="project-list-title"
      className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 id="project-list-title" className="m-0 flex items-center gap-2 text-base font-semibold">
            プロジェクト
            <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
              {visibleProjects.length}
            </span>
          </h2>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            名前を押すと、そのプロジェクトの画面に移ります。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFinished ? "secondary" : "outline"}
            size="sm"
            aria-pressed={showFinished}
            onClick={handleToggleShowFinished}
          >
            <CircleCheck className="size-4" aria-hidden />
            完了したプロジェクトを表示
          </Button>
          <AddButton target={0} userId={userId} label="プロジェクトを追加" />
        </div>
      </header>

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={showFinished ? "完了したプロジェクトはありません" : "プロジェクトはありません"}
          description={
            showFinished
              ? "小プロジェクトをすべて完了にしたプロジェクトが、ここに出ます。"
              : "「プロジェクトを追加」から作ると、ここに出ます。"
          }
        />
      ) : (
        <ul className="m-0 list-none divide-y p-0">
          {visibleProjects.map((project) => {
            const smallProjects = smallProjectsOf(project.id);
            const isOpen = openProjectIds.has(project.id);
            const panelId = `project-panel-${project.id}`;
            // 名前の無い小プロジェクトが1件だけなら、小プロジェクトの行を出さずに詳細を出す
            const onlyUnnamed =
              smallProjects.length === 1 && !smallProjects[0].small_project_name;

            return (
              <li
                key={project.id}
                className={cn(
                  newItem.id == project.id && newItem.target == 0 && "bg-primary/10 motion-safe:animate-pulse"
                )}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 pr-5">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      aria-label={`「${project.project_name}」の${onlyUnnamed ? "詳細" : "小プロジェクト"}を${isOpen ? "閉じる" : "開く"}`}
                      onClick={() => toggleProject(project.id)}
                    >
                      <ChevronRight
                        className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                        aria-hidden
                      />
                    </Button>
                    {renderNameLink(project.project_name, () => openProjectPage(project.id, null), true)}
                  </div>
                  <StatusCounts counts={totalStatusOf(project.id)} />
                  <div className="flex gap-0.5">
                    <EditButton projectId={project.id} taskId={null} userId={userId} targetName={project.project_name} />
                    <DeleteButton projectId={project.id} taskId={null} userId={userId} targetName={project.project_name} />
                  </div>
                </div>

                {isOpen && (
                  <div id={panelId} className="border-t">
                    {onlyUnnamed ? (
                      renderDetails(smallProjects[0])
                    ) : smallProjects.length === 0 ? (
                      <p className="m-0 px-12 py-3 text-muted-foreground">小プロジェクトはありません</p>
                    ) : (
                      <ul className="m-0 list-none divide-y p-0">
                        {smallProjects.map((smallProject) => {
                          const isSmallOpen = openSmallProjectIds.has(smallProject.id);
                          const detailsId = `small-project-details-${smallProject.id}`;
                          const name = smallProject.small_project_name ?? "";
                          return (
                            <li key={smallProject.id}>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 pr-5 pl-9">
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-expanded={isSmallOpen}
                                    aria-controls={detailsId}
                                    aria-label={`「${name}」の詳細を${isSmallOpen ? "閉じる" : "開く"}`}
                                    onClick={() => toggleSmallProject(smallProject.id)}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        "size-4 text-muted-foreground transition-transform",
                                        isSmallOpen && "rotate-90"
                                      )}
                                      aria-hidden
                                    />
                                  </Button>
                                  {renderNameLink(name, () => openProjectPage(project.id, smallProject.id), false)}
                                </div>
                                <StatusCounts counts={statusOf(smallProject.id)} />
                                <Button
                                  variant={smallProject.isFinished ? "secondary" : "outline"}
                                  size="sm"
                                  aria-pressed={smallProject.isFinished}
                                  aria-label={`「${name}」を完了にする`}
                                  className={cn(smallProject.isFinished && "text-status-done")}
                                  onClick={() => handleToggleFinished(smallProject)}
                                >
                                  <CircleCheck className="size-4" aria-hidden />
                                  {smallProject.isFinished ? "完了" : "完了にする"}
                                </Button>
                              </div>
                              {isSmallOpen && (
                                <div id={detailsId} className="border-t">
                                  {renderDetails(smallProject)}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ProjectList;
