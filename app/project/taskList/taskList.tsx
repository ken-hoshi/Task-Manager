"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronRight,
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
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import EditButton from "@/app/component/editButton/editButton";
import TaskDetails, { type DetailTask } from "@/app/component/taskDetails/taskDetails";
import { AttachedFileData, TaskGenreDetail } from "@/app/component/taskDetails/types";
import { clientSupabase } from "@/app/lib/supabase/client";
import { formatDate } from "@/app/lib/formatDateTime";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { sortTasks, type TaskSortKey } from "@/app/lib/sortTasks";
import { TASK_STATUS_DOT_CLASSES, taskStatusLabel } from "@/app/lib/taskStatus";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

interface TaskGenreDataProps {
  taskGenreId: number;
  taskGenreName: string;
  numberOfPersons: number;
  startDate: string;
  deadlineDate: string;
  numberOfDays: number;
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: TaskGenreDataProps[];
}

// 一覧の1行に使うタスクの項目（fetchProjectDetailsData が返す行の一部）
interface ProjectTaskRow extends DetailTask {
  task_name: string;
  status_id: number;
  number_of_days: number;
  task_genre_id: number | null;
  task_status?: { status: string } | null;
  users: { name: string };
}

interface TasksDividedByTaskGenreIdProps {
  taskGenreId: number | null;
  taskGenreName: string | null;
  taskDataArray: ProjectTaskRow[];
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: ProjectTaskRow[];
}

interface TaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: { taskId: number; taskGenre: TaskGenreDetail }[];
}

interface AttachedFileProps {
  id: number;
  fileDataArray: AttachedFileData[];
}

interface TaskAttachedFileProps {
  smallProjectId: number;
  fileDataList: AttachedFileProps[];
}

interface StatusProps {
  id: number;
  status: string;
}

interface TaskListProps {
  userId: number;
  projectId: number;
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  taskData: TasksDividedBySmallProjectIdProps[];
  taskGenreData: TaskGenreProps[];
  smallProjectTaskGenreData: SmallProjectTaskGenreProps[];
  statusData: StatusProps[];
  taskAttachedFileData: TaskAttachedFileProps[];
  filterMyTasks: boolean;
}

// 並べ替えの段階。押すたびに 昇順 → 降順 → 元の順 と回る
interface SortState {
  key: TaskSortKey;
  step: 0 | 1 | 2;
}

const INITIAL_SORT: SortState = { key: "task_name", step: 0 };

// 担当者は表示名ではなく assigned_user_id の数値で並べる（以前からの仕様）
const COLUMNS: { key: TaskSortKey; label: string; className?: string }[] = [
  { key: "task_name", label: "タスク名", className: "pl-5" },
  { key: "status_id", label: "ステータス" },
  { key: "start_date", label: "開始" },
  { key: "deadline_date", label: "締切" },
  { key: "number_of_days", label: "日数", className: "text-right" },
  { key: "assigned_user_id", label: "担当者" },
];

// ジャンルの無いタスクのまとまり
const NO_GENRE_NAME = "ジャンルなし";

// ジャンルごとの並べ替えの state を引く鍵
const genreKey = (taskGenreId: number | null) =>
  taskGenreId === null ? "none" : String(taskGenreId);

// プロジェクト画面の「一覧」。表示している小プロジェクトのタスクを、ジャンルごとの表に分けて出す
const TaskList: React.FC<TaskListProps> = ({
  userId,
  projectId,
  smallProjectIdList,
  displaySmallProjectId,
  taskData,
  statusData,
  taskGenreData,
  smallProjectTaskGenreData,
  taskAttachedFileData,
  filterMyTasks,
}) => {
  const [tasksDividedByTaskGenreId, setTasksDividedByTaskGenreId] = useState<
    TasksDividedByTaskGenreIdProps[]
  >([]);
  const [taskGenreListData, setTaskGenreListData] = useState<
    { taskId: number; taskGenre: TaskGenreDetail }[]
  >([]);
  const [taskAttachedFileListData, setTaskAttachedFileListData] = useState<
    AttachedFileProps[]
  >([]);
  const [openTaskIds, setOpenTaskIds] = useState<Set<number>>(new Set());
  const [sortStates, setSortStates] = useState<Record<string, SortState>>({});

  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const router = useRouter();

  // 並べ替えは小プロジェクトごとのもの。切り替えたら元の順に戻す（以前と同じ）
  useEffect(() => {
    setSortStates({});
  }, [displaySmallProjectId]);

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId!
        : smallProjectIdList[0];

    const smallProjectTask = taskData.find(
      (task) => task.smallProjectId === changedDisplaySmallProjectId
    );

    const taskGenreListData = taskGenreData.find(
      (taskGenre) => taskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (smallProjectTaskGenre) =>
        smallProjectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const taskAttachedFileListData = taskAttachedFileData.find(
      (taskAttachedFile) =>
        taskAttachedFile.smallProjectId === changedDisplaySmallProjectId
    );

    if (
      !smallProjectTask ||
      !taskGenreListData ||
      !smallProjectTaskGenreListData ||
      !taskAttachedFileListData
    ) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "プロジェクトのデータを読めませんでした。",
        color: 1,
      });
      router.push("/task");
      return;
    }

    if (
      smallProjectTaskGenreListData.taskGenreDataArray.length > 0 ||
      smallProjectTask.taskDataArray.length > 0
    ) {
      const dividedTasks: TasksDividedByTaskGenreIdProps[] =
        smallProjectTaskGenreListData.taskGenreDataArray.map(
          (taskGenreData) => ({
            taskGenreId: taskGenreData.taskGenreId,
            taskGenreName: taskGenreData.taskGenreName,
            taskDataArray: smallProjectTask.taskDataArray.filter(
              (taskData) => taskData.task_genre_id === taskGenreData.taskGenreId
            ),
          })
        );

      const nullGenreTasks = smallProjectTask.taskDataArray.filter(
        (taskData) => !taskData.task_genre_id
      );

      if (nullGenreTasks.length > 0) {
        dividedTasks.push({
          taskGenreId: null,
          taskGenreName: null,
          taskDataArray: nullGenreTasks,
        });
      }
      setTasksDividedByTaskGenreId(dividedTasks);
      setTaskGenreListData(taskGenreListData.taskGenreDataArray);
      setTaskAttachedFileListData(taskAttachedFileListData.fileDataList);
    } else {
      setTasksDividedByTaskGenreId([]);
      setTaskGenreListData([]);
      setTaskAttachedFileListData([]);
    }

    // 一覧から消えたタスク（絞り込み・削除）の開閉の状態は捨てる。残っているタスクは開いたままにする（以前と同じ）
    const ids = new Set(smallProjectTask.taskDataArray.map((task) => task.id));
    setOpenTaskIds((prev) => {
      const kept = [...prev].filter((id) => ids.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [filterMyTasks, pageUpdated, displaySmallProjectId]);

  const handleStatusChange = async (taskId: number, statusId: number) => {
    try {
      const { error } = await clientSupabase
        .from("tasks")
        .update({ status_id: statusId })
        .eq("id", taskId);

      if (error) {
        throw error;
      }

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
        console.error(
          "Error post mail notifications ",
          postEmailNotificationsError
        );
      }
    } catch (error) {
      console.error("Update Status", error);
      setNotificationValue({
        message: "ステータスを変更できませんでした。",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  const toggleDetails = (taskId: number) => {
    setOpenTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // 並べ替えるときは、以前と同じく開いている詳細をすべて閉じる
  const handleSort = (taskGenreId: number | null, key: TaskSortKey) => {
    setOpenTaskIds(new Set());
    setSortStates((prev) => {
      const current = prev[genreKey(taskGenreId)] ?? INITIAL_SORT;
      const next: SortState =
        current.key === key
          ? { key, step: ((current.step + 1) % 3) as SortState["step"] }
          : { key, step: 1 };
      return { ...prev, [genreKey(taskGenreId)]: next };
    });
  };

  // ジャンルの表ごとに並ぶので、読み上げではジャンルの名前を含めて区別する
  const renderAddButton = (taskGenreId: number | null, genreName?: string) => (
    <AddButton
      target={1}
      userId={userId}
      workspaceId={displayWorkspaceId || undefined}
      projectId={projectId}
      smallProjectId={displaySmallProjectId || undefined}
      taskGenreId={taskGenreId || undefined}
      label="タスクを追加"
      accessibleName={genreName ? `「${genreName}」にタスクを追加` : undefined}
    />
  );

  // 「自分のタスクだけ」で0件のときは、絞り込みを外せば出ると伝える
  const emptyDescription = (inGenre: boolean) =>
    filterMyTasks
      ? "「自分のタスクだけ」を外すと、ほかの人のタスクも出ます。"
      : inGenre
        ? "このジャンルの「タスクを追加」から作ると、ここに出ます。"
        : "「タスクを追加」から作ると、ここに出ます。";

  // ジャンルもタスクも無いときは、ジャンルの無い「タスクを追加」だけを出す
  if (tasksDividedByTaskGenreId.length === 0) {
    return (
      <section
        aria-labelledby="project-task-list-empty"
        className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h3 id="project-task-list-empty" className="m-0 text-base font-semibold">
            タスク
          </h3>
          {renderAddButton(null)}
        </header>
        <EmptyState
          icon={ListTodo}
          title={filterMyTasks ? "自分のタスクはありません" : "タスクはありません"}
          description={emptyDescription(false)}
        />
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {tasksDividedByTaskGenreId.map((group) => {
        const key = genreKey(group.taskGenreId);
        const sort = sortStates[key] ?? INITIAL_SORT;
        const tasks =
          sort.step === 0
            ? group.taskDataArray
            : sortTasks(group.taskDataArray, sort.key, sort.step === 1 ? 0 : 1);
        const titleId = `project-genre-${key}`;
        const genreName = group.taskGenreName ?? NO_GENRE_NAME;

        const ariaSort = (columnKey: TaskSortKey) => {
          if (sort.key !== columnKey || sort.step === 0) return "none" as const;
          return sort.step === 1 ? ("ascending" as const) : ("descending" as const);
        };

        const sortIcon = (columnKey: TaskSortKey) => {
          if (sort.key !== columnKey || sort.step === 0)
            return <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden />;
          return sort.step === 1 ? (
            <ArrowDown className="size-3.5" aria-hidden />
          ) : (
            <ArrowUp className="size-3.5" aria-hidden />
          );
        };

        return (
          <section
            key={key}
            aria-labelledby={titleId}
            className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
          >
            <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
              <h3 id={titleId} className="m-0 flex items-center gap-2 text-base font-semibold">
                {genreName}
                <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                  {tasks.length}
                </span>
              </h3>
              {renderAddButton(group.taskGenreId, genreName)}
            </header>

            {tasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title={filterMyTasks ? "自分のタスクはありません" : "タスクはありません"}
                description={emptyDescription(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={ariaSort(column.key)}
                          className={cn("px-3 py-2 text-left font-medium", column.className)}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded hover:text-foreground"
                            onClick={() => handleSort(group.taskGenreId, column.key)}
                          >
                            {column.label}
                            {sortIcon(column.key)}
                          </button>
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-2 pr-5 text-right font-medium">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const isOpen = openTaskIds.has(task.id);
                      const deadlineStatus = isDeadlineNear(task.deadline_date, task.status_id);
                      const detailsId = `project-task-details-${task.id}`;
                      const statusName = taskStatusLabel(task.status_id, task.task_status?.status);

                      return (
                        <React.Fragment key={task.id}>
                          <tr
                            className={cn(
                              "border-t transition-colors hover:bg-muted/40",
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
                                    {statusData.map((status) => (
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
                            <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                                {formatDate(task.start_date)}
                              </span>
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
                            <td className="px-3 py-2 text-right tabular-nums">
                              {task.number_of_days.toFixed(1)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1.5">
                                <UserRound className="size-4 text-muted-foreground" aria-hidden />
                                {task.users.name}
                              </span>
                            </td>
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
                          </tr>
                          {isOpen && (
                            <tr id={detailsId} className="border-t">
                              <td colSpan={COLUMNS.length + 1} className="p-0">
                                <TaskDetails
                                  task={task}
                                  taskGenre={
                                    taskGenreListData.find((genre) => genre.taskId === task.id)?.taskGenre
                                  }
                                  attachedFiles={
                                    taskAttachedFileListData.find((file) => file.id === task.id)
                                      ?.fileDataArray
                                  }
                                  userId={userId}
                                  showProject={false}
                                  headingLevel={4}
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
      })}
    </div>
  );
};

export default TaskList;
