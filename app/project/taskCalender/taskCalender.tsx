"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import holidayJp from "holiday-jp";
import {
  AlarmClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
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
import { Label } from "@/components/ui/label";
import { DateRangeField } from "@/components/date-range-field";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import TaskPopup from "@/app/component/taskPopup/taskPopup";
import { clientSupabase } from "@/app/lib/supabase/client";
import { formatDate } from "@/app/lib/formatDateTime";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { TASK_STATUS_DOT_CLASSES, taskStatusLabel } from "@/app/lib/taskStatus";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

interface TasksPeriodList {
  id: number;
  startDate: Date | null;
  deadlineDate: Date | null;
}

// カレンダーの1行に使うタスクの項目（fetchProjectDetailsData が返す行の一部）
interface CalendarTask {
  id: number;
  task_name: string;
  status_id: number;
  task_status?: { status: string } | null;
  task_genre_id: number | null;
  assigned_user_id: number;
  start_date: string;
  deadline_date: string;
  number_of_days: number;
  result_start_date: string | null;
  result_deadline_date: string | null;
  number_of_result_days: number | null;
  users: { name: string };
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: CalendarTask[];
}

interface TaskGenreProps {
  taskGenreId: number;
  taskGenreName: string;
  numberOfPersons: number;
  startDate: string;
  deadlineDate: string;
  numberOfDays: number;
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: TaskGenreProps[];
}

enum Target {
  task,
  taskResult,
  taskGenre,
}

interface StatusProps {
  id: number;
  status: string;
}

interface TaskCalenderProps {
  userId: number;
  projectId: number;
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  taskData: TasksDividedBySmallProjectIdProps[];
  smallProjectTaskGenreData: SmallProjectTaskGenreProps[];
  filterMyTasks: boolean;
  statusData: StatusProps[];
}

// 帯の色。凡例と表で同じものを使う
const BAR_CLASSES: Record<Target, string> = {
  [Target.taskGenre]: "bg-primary/30",
  [Target.task]: "bg-primary",
  [Target.taskResult]: "bg-status-done",
};

const LEGEND: { target: Target; label: string }[] = [
  { target: Target.taskGenre, label: "ジャンルの期間" },
  { target: Target.task, label: "予定の期間" },
  { target: Target.taskResult, label: "実績の期間" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 左の列の数（名前・ステータス・開始・締切・人/日・期間の変更）。編集の行はこの幅にまたがる
const LEFT_COLUMN_COUNT = 6;

// プロジェクト画面の「カレンダー」。表示している小プロジェクトのジャンル・タスク・実績の期間を、月ごとの帯で出す
const TaskCalender: React.FC<TaskCalenderProps> = ({
  userId,
  projectId,
  smallProjectIdList,
  displaySmallProjectId,
  taskData,
  smallProjectTaskGenreData,
  filterMyTasks,
  statusData,
}) => {
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [smallProjectTask, setSmallProjectTask] = useState<CalendarTask[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dates, setDates] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [today] = useState(new Date());
  const [tasksPeriodList, setTasksPeriodList] = useState<TasksPeriodList[]>([]);
  const [onEditTaskId, setOnEditTaskId] = useState<number | null>(null);
  const [updateTaskStartDate, setUpdateTaskStartDate] = useState<Date | null>(
    null
  );
  const [updateTaskEndDate, setUpdateTaskEndDate] = useState<Date | null>(null);
  const [tasksResultPeriodList, setTasksResultPeriodList] = useState<
    TasksPeriodList[]
  >([]);
  const [onEditResultTaskId, setOnEditResultTaskId] = useState<number | null>(
    null
  );
  const [updateTaskResultStartDate, setUpdateTaskResultStartDate] =
    useState<Date | null>(null);
  const [updateTaskResultEndDate, setUpdateTaskResultEndDate] =
    useState<Date | null>(null);
  const [smallProjectTaskGenre, setSmallProjectTaskGenre] =
    useState<TaskGenreProps[]>();
  const [tasksGenrePeriodList, setTasksGenrePeriodList] = useState<
    TasksPeriodList[]
  >([]);
  const [onEditTaskGenreId, setOnEditTaskGenreId] = useState<number | null>(
    null
  );
  const [updateTaskGenreStartDate, setUpdateTaskGenreStartDate] =
    useState<Date | null>(null);
  const [updateTaskGenreEndDate, setUpdateTaskGenreEndDate] =
    useState<Date | null>(null);
  const [taskGenreIdUseTaskPopup, setTaskGenreIdUseTaskPopup] = useState<
    null | number
  >(null);

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const router = useRouter();
  const fieldId = useId();

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId
        : smallProjectIdList[0];

    const smallProjectTask = taskData.find(
      (task) => task.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (smallProjectTaskGenre) =>
        smallProjectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    if (!smallProjectTask || !smallProjectTaskGenreListData) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "プロジェクトのデータを読めませんでした。",
        color: 1,
      });
      router.push("/task");
      return;
    }

    // 行ごとの期間を、その日の0時の Date にそろえる。項目の取り出し方は呼ぶ側が渡す
    const formatTaskPeriod = <T,>(
      list: T[],
      pick: (item: T) => {
        id: number;
        start: string | null;
        deadline: string | null;
      }
    ): TasksPeriodList[] => {
      return list.map((item) => {
        const { id, start, deadline } = pick(item);
        const startDate = new Date(start as string);
        startDate.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline as string);
        deadlineDate.setHours(0, 0, 0, 0);
        return {
          id,
          startDate: startDate,
          deadlineDate: deadlineDate,
        };
      });
    };

    if (smallProjectTask.taskDataArray.length > 0) {
      const taskList = filterMyTasks
        ? smallProjectTask.taskDataArray.filter(
            (task) => task.assigned_user_id === userId
          )
        : smallProjectTask.taskDataArray;

      const sortedTaskList = [...taskList].sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateA - dateB;
      });
      setSmallProjectTask(sortedTaskList);

      if (taskList.length > 0) {
        setTasksPeriodList(
          formatTaskPeriod(taskList, (task) => ({
            id: task.id,
            start: task.start_date,
            deadline: task.deadline_date,
          }))
        );
        setTasksResultPeriodList(
          formatTaskPeriod(taskList, (task) => ({
            id: task.id,
            start: task.result_start_date,
            deadline: task.result_deadline_date,
          }))
        );
      }
    } else {
      setSmallProjectTask([]);
      setTasksPeriodList([]);
      setTasksResultPeriodList([]);
    }

    if (smallProjectTaskGenreListData.taskGenreDataArray.length > 0) {
      setSmallProjectTaskGenre(smallProjectTaskGenreListData.taskGenreDataArray);
      setTasksGenrePeriodList(
        formatTaskPeriod(smallProjectTaskGenreListData.taskGenreDataArray, (genre) => ({
          id: genre.taskGenreId,
          start: genre.startDate,
          deadline: genre.deadlineDate,
        }))
      );
    } else {
      setSmallProjectTaskGenre([]);
      setTasksGenrePeriodList([]);
    }

    if (
      smallProjectTask.taskDataArray.length > 0 ||
      smallProjectTaskGenreListData.taskGenreDataArray.length > 0
    ) {
      const currentYear = currentMonth.getFullYear();
      const currentHolidays = holidayJp.between(
        new Date(currentYear, 0, 1),
        new Date(currentYear, 11, 31)
      );
      setHolidays(currentHolidays.map((holiday) => new Date(holiday.date)));

      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );
      const dates: Date[] = [];
      for (
        let d = new Date(startOfMonth);
        d <= endOfMonth;
        d.setDate(d.getDate() + 1)
      ) {
        dates.push(new Date(d));
      }
      setDates(dates);
    }
  }, [pageUpdated, currentMonth, filterMyTasks, displaySmallProjectId]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const cancelTaskPeriod = (target: Target) => {
    switch (target) {
      case Target.task:
        setUpdateTaskStartDate(null);
        setUpdateTaskEndDate(null);
        setOnEditTaskId(null);
        break;

      case Target.taskResult:
        setUpdateTaskResultStartDate(null);
        setUpdateTaskResultEndDate(null);
        setOnEditResultTaskId(null);
        break;

      case Target.taskGenre:
        setUpdateTaskGenreStartDate(null);
        setUpdateTaskGenreEndDate(null);
        setOnEditTaskGenreId(null);
        break;
    }
  };

  // 期間の欄で選んだ開始日と終了日を、保存に使う state に入れる
  const handlePeriodChange = (
    target: Target,
    [start, end]: [Date | null, Date | null]
  ) => {
    switch (target) {
      case Target.task:
        setUpdateTaskStartDate(start);
        setUpdateTaskEndDate(end);
        break;
      case Target.taskResult:
        setUpdateTaskResultStartDate(start);
        setUpdateTaskResultEndDate(end);
        break;
      case Target.taskGenre:
        setUpdateTaskGenreStartDate(start);
        setUpdateTaskGenreEndDate(end);
        break;
    }
  };

  const handleStatusChange = async (taskId: number, statusId: number) => {
    try {
      const { error } = await clientSupabase
        .from("tasks")
        .update({ status_id: statusId })
        .eq("id", taskId);

      if (error) {
        throw error;
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

  const updateTaskPeriod = async (taskId: number, target: Target) => {
    try {
      let startDate,
        endDate,
        startField,
        endField,
        numberOfDaysDaysField,
        tableName;

      switch (target) {
        case Target.task:
          startDate = updateTaskStartDate;
          endDate = updateTaskEndDate;
          startField = "start_date";
          endField = "deadline_date";
          numberOfDaysDaysField = "number_of_days";
          tableName = "tasks";
          break;

        case Target.taskResult:
          startDate = updateTaskResultStartDate;
          endDate = updateTaskResultEndDate;
          startField = "result_start_date";
          endField = "result_deadline_date";
          numberOfDaysDaysField = "number_of_result_days";
          tableName = "tasks";
          break;

        case Target.taskGenre:
          startDate = updateTaskGenreStartDate;
          endDate = updateTaskGenreEndDate;
          startField = "start_date";
          endField = "deadline_date";
          tableName = "task_genre";
          break;

        default:
          throw new Error("Invalid target");
      }

      if (startDate) {
        const numberOfDays = endDate
          ? Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1
          : 1;

        const updateData: { [key: string]: Date | number } = {
          [startField]: new Date(startDate.setDate(startDate.getDate() + 1)),
          [endField]: endDate
            ? new Date(endDate.setDate(endDate.getDate() + 1))
            : startDate,
        };

        if (
          (target === Target.task || target === Target.taskResult) &&
          numberOfDaysDaysField
        ) {
          updateData[numberOfDaysDaysField] = numberOfDays;
        }

        const { error: taskUpdateError } = await clientSupabase
          .from(tableName)
          .update(updateData)
          .eq("id", taskId);

        if (taskUpdateError) {
          throw taskUpdateError;
        }

        if (target == Target.task || target == Target.taskResult) {
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
        }
      } else {
        return;
      }

      setPageUpdated(true);
      if (target === Target.task) {
        setUpdateTaskStartDate(null);
        setUpdateTaskEndDate(null);
        setOnEditTaskId(null);
      } else if (target === Target.taskResult) {
        setUpdateTaskResultStartDate(null);
        setUpdateTaskResultEndDate(null);
        setOnEditResultTaskId(null);
      } else if (target === Target.taskGenre) {
        setUpdateTaskGenreStartDate(null);
        setUpdateTaskGenreEndDate(null);
        setOnEditTaskGenreId(null);
      }

      setNotificationValue({
        message: "期間を更新しました。",
        color: 0,
      });
    } catch (error) {
      console.error("Update Task", error);

      setPageUpdated(true);
      if (target === Target.task) {
        setUpdateTaskStartDate(null);
        setUpdateTaskEndDate(null);
        setOnEditTaskId(null);
      } else if (target === Target.taskResult) {
        setUpdateTaskResultStartDate(null);
        setUpdateTaskResultEndDate(null);
        setOnEditResultTaskId(null);
      } else if (target === Target.taskGenre) {
        setUpdateTaskGenreStartDate(null);
        setUpdateTaskGenreEndDate(null);
        setOnEditTaskGenreId(null);
      }

      setNotificationValue({
        message: "期間を更新できませんでした。",
        color: 1,
      });
    }
  };

  const toggleTaskPopup = (taskGenreId?: number) => {
    setTaskGenreIdUseTaskPopup(
      taskGenreId && !taskGenreIdUseTaskPopup ? taskGenreId : null
    );
  };

  const toggleEditButton = (id: number, target: Target) => {
    if (onEditResultTaskId || onEditTaskId || onEditTaskGenreId) {
      return;
    }
    switch (target) {
      case Target.task:
        setOnEditTaskId(id);
        break;
      case Target.taskResult:
        setOnEditResultTaskId(id);
        break;
      case Target.taskGenre:
        setOnEditTaskGenreId(id);
        break;
    }
  };

  const isEditing =
    onEditResultTaskId !== null || onEditTaskId !== null || onEditTaskGenreId !== null;

  // 編集の行を閉じたら（保存・やめる）、開いた行の「期間を変更」にフォーカスを戻す。
  // 戻さないと、消えた行と一緒にフォーカスが body へ落ち、キーボードでは表のどこにいたか分からなくなる
  const returnFocusTo = useRef<string | null>(null);
  useEffect(() => {
    if (isEditing || !returnFocusTo.current) return;
    document.getElementById(returnFocusTo.current)?.focus();
    returnFocusTo.current = null;
  }, [isEditing]);

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const isHoliday = (date: Date) =>
    holidays.some((holiday) => holiday.toDateString() === date.toDateString());

  const inPeriod = (period: TasksPeriodList | undefined, date: Date) =>
    Boolean(
      period &&
        period.startDate &&
        period.deadlineDate &&
        date >= period.startDate &&
        date <= period.deadlineDate
    );

  // 日付のマス。期間に入る日は帯の色で塗る。マスは見るだけで、押しても何も起きない
  const renderDayCells = (period: TasksPeriodList | undefined, target: Target) =>
    dates.map((date) => {
      const filled = inPeriod(period, date);
      return (
        <td
          key={date.getDate()}
          className={cn(
            "h-8 border-l p-0",
            isSameDay(date, today) && "bg-primary/5"
          )}
        >
          {filled && <div className={cn("h-3", BAR_CLASSES[target])} />}
        </td>
      );
    });

  // 行ごとの「期間を変更」のボタンと、編集の行・期間の欄の id
  const editButtonId = (target: Target, id: number) => `${fieldId}-edit-${target}-${id}`;
  const editorRowId = (target: Target, id: number) => `${fieldId}-editor-${target}-${id}`;

  // 期間を変更する行のボタン。編集中は、ほかの行のボタンを押せなくする
  const renderEditButton = (
    id: number,
    target: Target,
    editingId: number | null,
    label: string
  ) => (
    <Button
      id={editButtonId(target, id)}
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-expanded={editingId === id}
      aria-controls={editingId === id ? editorRowId(target, id) : undefined}
      disabled={isEditing && editingId !== id}
      onClick={() => {
        returnFocusTo.current = editButtonId(target, id);
        toggleEditButton(id, target);
      }}
    >
      <Pencil className="size-4" aria-hidden />
    </Button>
  );

  // 「期間を変更」で、その行のすぐ下に出す編集の行
  const renderEditorRow = (
    id: number,
    target: Target,
    label: string,
    start: Date | null,
    end: Date | null
  ) => {
    const inputId = `${fieldId}-${target}-${id}`;
    return (
      <tr id={editorRowId(target, id)} className="border-t bg-primary/5">
        <td colSpan={LEFT_COLUMN_COUNT} className="sticky left-0 z-10 bg-card px-3 py-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-60 space-y-1">
              <Label htmlFor={inputId}>{label}</Label>
              <DateRangeField
                id={inputId}
                start={start ?? undefined}
                end={end ?? undefined}
                onChange={(range) => handlePeriodChange(target, range)}
                portalId="project-calendar-datepicker"
              />
            </div>
            <Button size="sm" disabled={!start} onClick={() => updateTaskPeriod(id, target)}>
              保存
            </Button>
            <Button size="sm" variant="outline" onClick={() => cancelTaskPeriod(target)}>
              やめる
            </Button>
          </div>
        </td>
        <td colSpan={dates.length} />
      </tr>
    );
  };

  // タスクの行と、その実績の行
  const renderTaskRows = (task: CalendarTask) => {
    const deadlineStatus = isDeadlineNear(task.deadline_date, task.status_id);
    const statusName = taskStatusLabel(task.status_id, task.task_status?.status);
    return (
      <React.Fragment key={task.id}>
        <tr className="border-t">
          <th scope="row" className="sticky left-0 z-10 max-w-56 truncate bg-card px-3 py-1.5 text-left font-medium">
            {task.task_name}
          </th>
          {/* ボタンは行の見出しの外に置く（中に置くと、マスへ移るたびにボタンの名前まで読み上げる） */}
          <td className="px-2 py-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    className="shrink-0 gap-1.5"
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
          <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{formatDate(task.start_date)}</td>
          <td
            className={cn(
              "px-2 py-1.5 whitespace-nowrap tabular-nums",
              deadlineStatus === 1 && "font-medium text-deadline-near",
              deadlineStatus === 2 && "font-medium text-overdue"
            )}
          >
            <span className="inline-flex items-center gap-1">
              {deadlineStatus !== 0 && <AlarmClock className="size-3.5" aria-hidden />}
              {formatDate(task.deadline_date)}
              {deadlineStatus === 1 && <span className="sr-only">（期限が近い）</span>}
              {deadlineStatus === 2 && <span className="sr-only">（期限切れ）</span>}
            </span>
          </td>
          <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
            {(1.0).toFixed(1) + " / " + task.number_of_days.toFixed(1)}
          </td>
          <td className="px-1 py-1 text-center">
            {renderEditButton(task.id, Target.task, onEditTaskId, `「${task.task_name}」の予定の期間を変更`)}
          </td>
          {renderDayCells(tasksPeriodList.find((p) => p.id === task.id), Target.task)}
        </tr>
        {onEditTaskId === task.id &&
          renderEditorRow(
            task.id,
            Target.task,
            `「${task.task_name}」の予定の期間`,
            updateTaskStartDate,
            updateTaskEndDate
          )}

        <tr className="text-muted-foreground">
          <th scope="row" className="sticky left-0 z-10 bg-card py-1.5 pr-3 pl-6 text-left font-normal">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" aria-hidden />
              <span className="sr-only">実績：</span>
              {task.users.name}
            </span>
          </th>
          <td />
          <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
            {task.result_start_date && formatDate(task.result_start_date)}
          </td>
          <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
            {task.result_deadline_date && formatDate(task.result_deadline_date)}
          </td>
          <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
            {task.number_of_result_days &&
              (1.0).toFixed(1) + " / " + task.number_of_result_days.toFixed(1)}
          </td>
          <td className="px-1 py-1 text-center">
            {renderEditButton(
              task.id,
              Target.taskResult,
              onEditResultTaskId,
              `「${task.task_name}」の実績の期間を変更`
            )}
          </td>
          {renderDayCells(tasksResultPeriodList.find((p) => p.id === task.id), Target.taskResult)}
        </tr>
        {onEditResultTaskId === task.id &&
          renderEditorRow(
            task.id,
            Target.taskResult,
            `「${task.task_name}」の実績の期間`,
            updateTaskResultStartDate,
            updateTaskResultEndDate
          )}
      </React.Fragment>
    );
  };

  const tasksWithoutGenre = smallProjectTask.filter((task) => !task.task_genre_id);
  const hasRows =
    smallProjectTask.length > 0 ||
    (smallProjectTaskGenre !== undefined && smallProjectTaskGenre.length > 0);

  return (
    <>
      {taskGenreIdUseTaskPopup && (
        <TaskPopup
          onClose={toggleTaskPopup}
          workspaceId={displayWorkspaceId!}
          userId={userId}
          projectId={projectId}
          smallProjectId={displaySmallProjectId}
          taskId={null}
          taskGenreId={taskGenreIdUseTaskPopup}
        />
      )}
      <section
        aria-labelledby="project-calendar-month"
        className="overflow-hidden rounded-xl border bg-card text-sm text-card-foreground shadow-xs"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="前の月" onClick={goToPreviousMonth}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <h3
              id="project-calendar-month"
              className="m-0 min-w-28 text-center text-base font-semibold tabular-nums"
              aria-live="polite"
            >
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h3>
            <Button variant="outline" size="icon-sm" aria-label="次の月" onClick={goToNextMonth}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
          <ul
            aria-label="凡例"
            className="m-0 flex list-none flex-wrap items-center gap-4 p-0 text-xs text-muted-foreground"
          >
            {LEGEND.map(({ target, label }) => (
              <li key={target} className="inline-flex items-center gap-1.5">
                <span className={cn("h-3 w-5 rounded-sm", BAR_CLASSES[target])} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </header>

        {!hasRows ? (
          // 「自分のタスクだけ」で0件のときは、一覧と同じく絞り込みを外せば出ると伝える
          <EmptyState
            icon={CalendarRange}
            title={filterMyTasks ? "自分のタスクはありません" : "ジャンルもタスクもありません"}
            description={
              filterMyTasks
                ? "「自分のタスクだけ」を外すと、ほかの人のタスクも出ます。"
                : "プロジェクトの編集でジャンルを足すか、「一覧」の「タスクを追加」から作ると、ここに出ます。"
            }
          />
        ) : (
          // relative：読み上げ用の文字（sr-only、絶対配置）を、この箱の中に収める。無いと main を基準に置かれ、画面全体が横にはみ出す
          <div className="relative overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 w-56 min-w-56 bg-muted px-3 py-2 text-left font-medium">
                    名前
                  </th>
                  <th scope="col" className="min-w-24 px-2 py-2 text-left font-medium">
                    ステータス
                  </th>
                  <th scope="col" className="min-w-20 px-2 py-2 text-left font-medium">
                    開始
                  </th>
                  <th scope="col" className="min-w-24 px-2 py-2 text-left font-medium">
                    締切
                  </th>
                  <th scope="col" className="min-w-20 px-2 py-2 text-right font-medium">
                    人 / 日
                  </th>
                  <th scope="col" className="w-10 px-1 py-2">
                    <span className="sr-only">期間の変更</span>
                  </th>
                  {dates.map((date) => {
                    const day = date.getDay();
                    const red = day === 0 || isHoliday(date);
                    const isToday = isSameDay(date, today);
                    return (
                      <th
                        key={date.getDate()}
                        scope="col"
                        className={cn(
                          "w-7 min-w-7 border-l px-0 py-1 text-center font-medium tabular-nums",
                          day === 6 && "text-primary",
                          red && "text-destructive",
                          isToday && "bg-primary/5"
                        )}
                      >
                        <span
                          className={cn(
                            "mx-auto flex size-5 items-center justify-center rounded-full",
                            isToday && "bg-primary text-primary-foreground"
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <span className="block text-[0.625rem] font-normal">{WEEKDAYS[day]}</span>
                        {isToday && <span className="sr-only">（今日）</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {smallProjectTaskGenre?.map((taskGenre) => (
                  <React.Fragment key={taskGenre.taskGenreId}>
                    <tr className="border-t bg-muted/40 font-medium">
                      <th scope="row" className="sticky left-0 z-10 max-w-56 truncate bg-muted px-3 py-1.5 text-left">
                        {taskGenre.taskGenreName}
                      </th>
                      <td className="px-2 py-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label={`「${taskGenre.taskGenreName}」にタスクを追加`}
                          onClick={() => toggleTaskPopup(taskGenre.taskGenreId)}
                        >
                          <Plus aria-hidden />
                          追加
                        </Button>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{formatDate(taskGenre.startDate)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{formatDate(taskGenre.deadlineDate)}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                        {(taskGenre.numberOfPersons ?? 0).toFixed(1) +
                          " / " +
                          (taskGenre.numberOfDays ?? 0).toFixed(1)}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {renderEditButton(
                          taskGenre.taskGenreId,
                          Target.taskGenre,
                          onEditTaskGenreId,
                          `「${taskGenre.taskGenreName}」の期間を変更`
                        )}
                      </td>
                      {renderDayCells(
                        tasksGenrePeriodList.find((p) => p.id === taskGenre.taskGenreId),
                        Target.taskGenre
                      )}
                    </tr>
                    {onEditTaskGenreId === taskGenre.taskGenreId &&
                      renderEditorRow(
                        taskGenre.taskGenreId,
                        Target.taskGenre,
                        `「${taskGenre.taskGenreName}」の期間`,
                        updateTaskGenreStartDate,
                        updateTaskGenreEndDate
                      )}
                    {smallProjectTask
                      .filter((task) => task.task_genre_id === taskGenre.taskGenreId)
                      .map(renderTaskRows)}
                  </React.Fragment>
                ))}
                {tasksWithoutGenre.length > 0 && (
                  <>
                    <tr className="border-t bg-muted/40 font-medium">
                      <th scope="row" className="sticky left-0 z-10 bg-muted px-3 py-1.5 text-left">
                        ジャンルなし
                      </th>
                      <td colSpan={LEFT_COLUMN_COUNT - 1} />
                      {dates.map((date) => (
                        <td
                          key={date.getDate()}
                          className={cn("border-l", isSameDay(date, today) && "bg-primary/5")}
                        />
                      ))}
                    </tr>
                    {tasksWithoutGenre.map(renderTaskRows)}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default TaskCalender;
