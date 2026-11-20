"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronRight,
  ListFilter,
  ListTodo,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import AddButton from "@/app/component/addButton/addButton";
import EditButton from "@/app/component/editButton/editButton";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import TaskDetails, { type DetailTask } from "@/app/component/taskDetails/taskDetails";
import { AttachedFileData, TaskGenreDetail } from "@/app/component/taskDetails/types";
import { clientSupabase } from "@/app/lib/supabase/client";
import { fetchAttachedFiles } from "@/app/lib/api/fetchAttachedFiles";
import { getTaskGenreData } from "@/app/lib/api/getTaskGenreData";
import { formatDate } from "@/app/lib/formatDateTime";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { sortTasks, type TaskSortKey } from "@/app/lib/sortTasks";
import { isUnfinished, TASK_STATUS_DOT_CLASSES, taskStatusLabel } from "@/app/lib/taskStatus";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";

interface StatusProps {
  id: number;
  status: string;
}

interface AttachedFileProps {
  id: number;
  fileDataArray: AttachedFileData[];
}

// 表の1行に使うタスクの項目（fetchTasksData が返す行の一部）
export interface TaskRow extends DetailTask {
  task_name: string;
  status_id: number;
  number_of_days: number;
  task_status?: { status: string } | null;
  users: { name: string };
  small_projects: DetailTask["small_projects"] & { isFinished: boolean };
}

// "mine"：自分のタスク。並べ替え・未完了だけの絞り込み・追加・編集・削除ができる。
// "team"：チームの未完了のタスク。
// どちらの表でも、ステータスを変えると通知の処理を呼ぶ（送る相手は postMailNotifications が決め、変えた人が担当者なら送らない）
type TaskTableVariant = "mine" | "team";

interface TaskTableProps {
  variant: TaskTableVariant;
  title: string;
  description: string;
  tasks: TaskRow[];
  userId: number;
  statuses: StatusProps[];
}

type SortableKey = Extract<TaskSortKey, "task_name" | "status_id" | "deadline_date">;

// 並べ替えの段階。押すたびに 昇順 → 降順 → 元の順 と回る
interface SortState {
  key: SortableKey;
  step: 0 | 1 | 2;
}

const SORTABLE_COLUMNS: { key: SortableKey; label: string }[] = [
  { key: "task_name", label: "タスク名" },
  { key: "status_id", label: "ステータス" },
  { key: "deadline_date", label: "締切" },
];

// タスク画面の「自分のタスク」「チームの未完了のタスク」の表。
// 以前は myTasksArea と notYetCompletedTasksArea の2つに同じ作りが重複していた
const TaskTable: React.FC<TaskTableProps> = ({
  variant,
  title,
  description,
  tasks,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const { newItem } = useFlashDisplayContext();

  const [onlyNotCompleted, setOnlyNotCompleted] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "task_name", step: 0 });
  const [openTaskIds, setOpenTaskIds] = useState<Set<number>>(new Set());
  const [taskGenreList, setTaskGenreList] = useState<TaskGenreDetail[]>([]);
  const [attachedFileList, setAttachedFileList] = useState<AttachedFileProps[]>([]);

  const isMine = variant === "mine";

  // 終わった小プロジェクトのタスクは出さない。絞り込み中は未完了だけ
  const visibleTasks = useMemo(() => {
    const unfinished = tasks.filter((task) => !task.small_projects.isFinished);
    const filtered = onlyNotCompleted
      ? unfinished.filter(isUnfinished)
      : unfinished;
    if (sort.step === 0) return filtered;
    return sortTasks(filtered, sort.key, sort.step === 1 ? 0 : 1);
  }, [tasks, onlyNotCompleted, sort]);

  // 一覧から消えたタスク（完了にした・削除した）の開閉の状態は捨てる。未完了に戻したとき開いたまま出てこないように
  useEffect(() => {
    const ids = new Set(tasks.map((task) => task.id));
    setOpenTaskIds((prev) => {
      const kept = [...prev].filter((id) => ids.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [tasks]);

  // ジャンルと添付は、出しうるタスク（終わった小プロジェクトのもの以外）の分をまとめて読む。
  // 画面が読み直すと tasks が新しい配列になるので、それで読み直す
  useEffect(() => {
    const taskIds = tasks
      .filter((task) => !task.small_projects.isFinished)
      .map((task) => task.id);
    if (taskIds.length === 0) {
      setTaskGenreList([]);
      setAttachedFileList([]);
      return;
    }
    let ignore = false;
    (async () => {
      const [genres, files] = await Promise.all([
        getTaskGenreData(taskIds),
        fetchAttachedFiles(1, taskIds),
      ]);
      if (ignore) return;
      setTaskGenreList(genres);
      setAttachedFileList(files);
    })();
    return () => {
      ignore = true;
    };
  }, [tasks]);

  const closeAllDetails = () => setOpenTaskIds(new Set());

  const toggleDetails = (taskId: number) => {
    setOpenTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSort = (key: SortableKey) => {
    closeAllDetails();
    setSort((prev) =>
      prev.key === key
        ? { key, step: ((prev.step + 1) % 3) as SortState["step"] }
        : { key, step: 1 }
    );
  };

  const handleFilter = () => {
    closeAllDetails();
    // 絞り込みを外すときは、以前と同じく画面全体を読み直す
    if (onlyNotCompleted) setPageUpdated(true);
    setOnlyNotCompleted(!onlyNotCompleted);
  };

  const handleStatusChange = async (taskId: number, statusId: number) => {
    try {
      const { error } = await clientSupabase
        .from("tasks")
        .update({ status_id: statusId })
        .eq("id", taskId);
      if (error) throw error;

      const postEmailNotificationsError = await postMailNotifications(
        displayWorkspaceId,
        userId,
        taskId,
        null,
        null,
        null,
        1,
        []
      );
      if (postEmailNotificationsError) {
        console.error("Error post mail notifications ", postEmailNotificationsError);
      }
    } catch (error) {
      console.error("Update Status", error);
      setNotificationValue({ message: "ステータスを変更できませんでした。", color: 1 });
    }
    setPageUpdated(true);
  };

  const sortIcon = (key: SortableKey) => {
    if (sort.key !== key || sort.step === 0)
      return <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden />;
    return sort.step === 1 ? (
      <ArrowDown className="size-3.5" aria-hidden />
    ) : (
      <ArrowUp className="size-3.5" aria-hidden />
    );
  };

  const ariaSort = (key: SortableKey) => {
    if (sort.key !== key || sort.step === 0) return "none" as const;
    return sort.step === 1 ? ("ascending" as const) : ("descending" as const);
  };

  const columnCount = isMine ? 5 : 4;

  return (
    <section
      aria-labelledby={`task-table-${variant}`}
      className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2
            id={`task-table-${variant}`}
            className="m-0 flex items-center gap-2 text-base font-semibold"
          >
            {title}
            <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
              {visibleTasks.length}
            </span>
          </h2>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {isMine && (
          <div className="flex items-center gap-2">
            <Button
              variant={onlyNotCompleted ? "secondary" : "outline"}
              size="sm"
              aria-pressed={onlyNotCompleted}
              onClick={handleFilter}
            >
              <ListFilter className="size-4" aria-hidden />
              未完了だけ表示
            </Button>
            <AddButton
              target={1}
              userId={userId}
              workspaceId={displayWorkspaceId || undefined}
              label="タスクを追加"
            />
          </div>
        )}
      </header>

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={onlyNotCompleted ? "未完了のタスクはありません" : "タスクはありません"}
          description={
            onlyNotCompleted
              ? "「未完了だけ表示」を外すと、完了したタスクも出ます。"
              : isMine
                ? "担当のタスクができると、ここに出ます。"
                : "チームの未完了のタスクは、すべて片づいています。"
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {SORTABLE_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={isMine ? ariaSort(column.key) : undefined}
                    className={cn(
                      "px-3 py-2 text-left font-medium",
                      column.key === "task_name" && "pl-5"
                    )}
                  >
                    {isMine ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded hover:text-foreground"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortIcon(column.key)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  担当者
                </th>
                {isMine && (
                  <th scope="col" className="px-3 py-2 pr-5 text-right font-medium">
                    <span className="sr-only">操作</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => {
                const isOpen = openTaskIds.has(task.id);
                const deadlineStatus = isDeadlineNear(task.deadline_date, task.status_id);
                const detailsId = `task-details-${variant}-${task.id}`;
                const statusName = taskStatusLabel(task.status_id, task.task_status?.status);

                return (
                  <React.Fragment key={task.id}>
                    <tr
                      className={cn(
                        "border-t transition-colors hover:bg-muted/40",
                        isMine &&
                          newItem.id == task.id &&
                          newItem.target == 1 &&
                          "bg-primary/10 motion-safe:animate-pulse"
                      )}
                    >
                      <td className="py-2 pr-3 pl-3">
                        <button
                          type="button"
                          className="flex w-full items-center gap-1.5 rounded text-left font-medium"
                          aria-expanded={isOpen}
                          aria-controls={detailsId}
                          onClick={() => toggleDetails(task.id)}
                        >
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform",
                              isOpen && "rotate-90"
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{task.task_name}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              aria-label={`「${task.task_name}」のステータス: ${statusName}（変更する）`}
                            >
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  TASK_STATUS_DOT_CLASSES[task.status_id] ?? "bg-muted-foreground"
                                )}
                                aria-hidden
                              />
                              {statusName}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36">
                            <DropdownMenuLabel>ステータス</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={String(task.status_id)}
                              onValueChange={(value) => {
                                const statusId = Number(value);
                                if (statusId !== task.status_id) {
                                  handleStatusChange(task.id, statusId);
                                }
                              }}
                            >
                              {statuses.map((status) => (
                                <DropdownMenuRadioItem key={status.id} value={String(status.id)}>
                                  <span
                                    className={cn(
                                      "size-2 rounded-full",
                                      TASK_STATUS_DOT_CLASSES[status.id] ?? "bg-muted-foreground"
                                    )}
                                    aria-hidden
                                  />
                                  {taskStatusLabel(status.id, status.status)}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 whitespace-nowrap tabular-nums",
                          deadlineStatus === 1 && "font-medium text-deadline-near",
                          deadlineStatus === 2 && "font-medium text-overdue"
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {deadlineStatus === 0 ? (
                            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                          ) : (
                            <AlarmClock className="size-4" aria-hidden />
                          )}
                          {formatDate(task.deadline_date)}
                          {deadlineStatus === 1 && <span className="sr-only">（期限が近い）</span>}
                          {deadlineStatus === 2 && <span className="sr-only">（期限切れ）</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-4 text-muted-foreground" aria-hidden />
                          {task.users.name}
                        </span>
                      </td>
                      {isMine && (
                        <td className="px-3 py-2 pr-5">
                          <div className="flex justify-end gap-0.5">
                            <EditButton
                              workspaceId={displayWorkspaceId || undefined}
                              taskId={task.id}
                              projectId={null}
                              userId={userId}
                              targetName={task.task_name}
                            />
                            <DeleteButton
                              taskId={task.id}
                              projectId={null}
                              userId={userId}
                              targetName={task.task_name}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr id={detailsId} className="border-t">
                        <td colSpan={columnCount} className="p-0">
                          <TaskDetails
                            task={task}
                            taskGenre={taskGenreList.find((genre) => genre.taskId === task.id)}
                            attachedFiles={
                              attachedFileList.find((file) => file.id === task.id)?.fileDataArray
                            }
                            userId={userId}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TaskTable;
