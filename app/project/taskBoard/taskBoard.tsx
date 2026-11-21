"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/components/detail-section";
import { cn } from "@/lib/utils";
import AttachedFileList from "@/app/component/taskDetails/attachedFileList";
import { AttachedFileData } from "@/app/component/taskDetails/types";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import EditButton from "@/app/component/editButton/editButton";
import { clientSupabase } from "@/app/lib/supabase/client";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { TASK_STATUS_DOT_CLASSES, taskStatusLabel } from "@/app/lib/taskStatus";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

interface StatusProps {
  id: number;
  status: string;
}

// ボードのカードに使うタスクの項目（fetchProjectDetailsData が返す行の一部）
interface BoardTask {
  id: number;
  task_name: string;
  status_id: number;
  start_date: string;
  deadline_date: string;
  details: string | null;
  users: { name: string };
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: BoardTask[];
}

interface AttachedFileProps {
  id: number;
  fileDataArray: AttachedFileData[];
}

interface TaskAttachedFileProps {
  smallProjectId: number;
  fileDataList: AttachedFileProps[];
}

interface TaskBoardProps {
  userId: number;
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  taskData: TasksDividedBySmallProjectIdProps[];
  statusData: StatusProps[];
  taskAttachedFileData: TaskAttachedFileProps[];
  filterMyTasks: boolean;
}

// 「2026-11-19」を「11/19」にする
const monthDay = (date: string) => date.split("-").slice(1).join("/");

const periodText = (task: BoardTask) =>
  `${monthDay(task.start_date)} 〜 ${monthDay(task.deadline_date)}`;

// 列の id。置かれた列のステータスは、この id から statusData を引いて決める
const columnId = (statusId: number) => `status-${statusId}`;

// どの列に置くかの判定。マウスはポインタのある列（react-dnd と同じ）、ポインタの無いキーボードはカードの重なりで決める
export const boardCollisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

// キーボードで掴んでいる間、左右の矢印で隣の列へ移す（既定は少しずつ動くだけで、列を移るのに何回も押すことになる）
export const columnCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context }
) => {
  if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) return;
  event.preventDefault();

  const { collisionRect, droppableRects, droppableContainers } = context;
  if (!collisionRect) return;

  const currentCenter = collisionRect.left + collisionRect.width / 2;
  const centers = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      const rect = droppableRects.get(container.id);
      return rect ? [rect.left + rect.width / 2] : [];
    })
    .sort((a, b) => a - b);

  const target =
    event.code === KeyboardCode.Right
      ? centers.find((center) => center > currentCenter + 1)
      : [...centers].reverse().find((center) => center < currentCenter - 1);
  if (target === undefined) return;

  return { x: currentCoordinates.x + (target - currentCenter), y: currentCoordinates.y };
};

// 掴んでいる間に読み上げる文。useDraggable・useDroppable の data に入れた名前を使う
const announcements: Announcements = {
  onDragStart: ({ active }) => `「${active.data.current?.taskName}」を掴みました。`,
  onDragOver: ({ active, over }) =>
    over
      ? `「${active.data.current?.taskName}」は「${over.data.current?.label}」の列の上にあります。`
      : `「${active.data.current?.taskName}」は列の外にあります。`,
  onDragEnd: ({ active, over }) =>
    over
      ? `「${active.data.current?.taskName}」を「${over.data.current?.label}」の列に置きました。`
      : `「${active.data.current?.taskName}」を置かずに戻しました。`,
  onDragCancel: ({ active }) => `「${active.data.current?.taskName}」の移動をやめました。`,
};

const screenReaderInstructions = {
  draggable:
    "Enter か Space で掴みます。左右の矢印キーで列を移り、もう一度 Enter か Space で置きます。Escape か Tab でやめます。",
};

// カードの中身のうち、掴んでいる間の影にも使う部分
const CardSummary: React.FC<{ task: BoardTask }> = ({ task }) => (
  <dl className="m-0 grid grid-cols-[4rem_1fr] gap-y-1 px-3 pb-2.5 text-xs">
    <dt className="text-muted-foreground">期間</dt>
    <dd className="m-0 tabular-nums">{periodText(task)}</dd>
    <dt className="text-muted-foreground">担当者</dt>
    <dd className="m-0 truncate">{task.users.name}</dd>
  </dl>
);

const TaskCard: React.FC<{
  userId: number;
  task: BoardTask;
  attachedFiles: AttachedFileData[] | undefined;
}> = ({ userId, task, attachedFiles }) => {
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = useId();
  const nameId = useId();
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef } = useDraggable({
    id: String(task.id),
    data: { taskName: task.task_name },
    attributes: { roleDescription: "移動のボタン" },
  });
  // 付ける先は本物の button なので、role と tabIndex は要らない
  const { role: _role, tabIndex: _tabIndex, ...handleAttributes } = attributes;

  // マウスはカードのどこを掴んでも動かせる。ただし次の場合は始めない。
  // ・タッチ（以前も指では掴めなかった。指でのスクロールを妨げない）
  // ・編集・削除のダイアログの中（画面では外に出ているが、React のイベントはカードまで伝わってくる）
  // ・カードの中のボタンやリンク（「移動」のボタンは除く）と、文字を選べる詳細の欄
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const target = event.target as Element;
    if (!event.currentTarget.contains(target)) return;
    const control = target.closest("button, a, input, textarea, select, [data-no-drag]");
    if (control && !control.hasAttribute("data-drag-handle")) return;
    listeners?.onPointerDown(event);
  };

  // Enter・Space の長押しで、掴んだ直後に置いてしまわないようにする（KeyboardSensor はキーの繰り返しを区別しない）
  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat && (event.code === KeyboardCode.Enter || event.code === KeyboardCode.Space)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <article
      ref={setNodeRef}
      aria-labelledby={nameId}
      onPointerDown={handlePointerDown}
      className={cn(
        "cursor-grab rounded-lg border bg-card shadow-xs select-none",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-0.5 py-1.5 pr-1.5 pl-1">
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon-xs"
          data-drag-handle
          data-move-task={task.id}
          aria-label={`「${task.task_name}」を移動`}
          className="cursor-grab text-muted-foreground"
          {...handleAttributes}
          onKeyDownCapture={handleKeyDownCapture}
          onKeyDown={(event) => listeners?.onKeyDown(event)}
        >
          <GripVertical aria-hidden />
        </Button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 rounded text-left text-sm font-medium"
          aria-expanded={isOpen}
          aria-controls={isOpen ? detailsId : undefined}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90"
            )}
            aria-hidden
          />
          <span id={nameId} className="truncate">
            {task.task_name}
          </span>
        </button>
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
      <CardSummary task={task} />
      {isOpen && (
        <div
          id={detailsId}
          data-no-drag
          className="cursor-auto space-y-3 border-t bg-muted/40 px-3 py-2.5 select-text"
        >
          <DetailSection level={4} title="詳細">
            {task.details ? (
              <p className="m-0 whitespace-pre-wrap">{task.details}</p>
            ) : (
              <p className="m-0 text-muted-foreground">詳細はありません</p>
            )}
          </DetailSection>
          <DetailSection level={4} title="添付ファイル">
            <AttachedFileList fileDataArray={attachedFiles} />
          </DetailSection>
        </div>
      )}
    </article>
  );
};

const BoardColumn: React.FC<{
  userId: number;
  status: StatusProps;
  tasks: BoardTask[];
  attachedFileData: AttachedFileProps[];
  filterMyTasks: boolean;
}> = ({ userId, status, tasks, attachedFileData, filterMyTasks }) => {
  const label = taskStatusLabel(status.id, status.status);
  const titleId = useId();
  const { active, isOver, setNodeRef } = useDroppable({
    id: columnId(status.id),
    data: { label },
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={titleId}
      className={cn(
        "flex min-h-96 min-w-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        active && "border-dashed border-primary/50",
        isOver && "border-solid border-primary bg-primary/5"
      )}
    >
      <h3 id={titleId} className="m-0 flex items-center gap-2 px-3 py-2.5 text-sm font-semibold">
        <span
          className={cn(
            "size-2 rounded-full",
            TASK_STATUS_DOT_CLASSES[status.id] ?? "bg-muted-foreground"
          )}
          aria-hidden
        />
        {label}
        <span className="rounded-full bg-background px-2 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </h3>
      {tasks.length === 0 ? (
        <p className="m-0 px-3 py-6 text-center text-xs text-muted-foreground">
          {filterMyTasks ? "自分のタスクはありません" : "タスクはありません"}
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-2 pt-0">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                userId={userId}
                task={task}
                attachedFiles={attachedFileData.find((file) => file.id === task.id)?.fileDataArray}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// プロジェクト画面の「ボード」。ステータスごとの列に、タスクのカードを並べる。カードを別の列へ移すとステータスが変わる
const TaskBoard: React.FC<TaskBoardProps> = ({
  userId,
  smallProjectIdList,
  displaySmallProjectId,
  taskData,
  statusData,
  taskAttachedFileData,
  filterMyTasks,
}) => {
  const [smallProjectTask, setSmallProjectTask] = useState<BoardTask[]>([]);
  const [taskAttachedFileListData, setTaskAttachedFileListData] = useState<
    AttachedFileProps[]
  >([]);
  const [draggingTask, setDraggingTask] = useState<BoardTask | null>(null);
  const focusAfterMove = useRef<{ taskId: number; statusId: number } | null>(null);

  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const router = useRouter();

  const sensors = useSensors(
    // 少し動かしてから始める（カードを押しただけでは掴まない）
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnCoordinateGetter,
      // 既定では Tab で置いてしまうので、やめる操作にする
      keyboardCodes: {
        start: [KeyboardCode.Space, KeyboardCode.Enter],
        cancel: [KeyboardCode.Esc, KeyboardCode.Tab],
        end: [KeyboardCode.Space, KeyboardCode.Enter],
      },
    })
  );

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId
        : smallProjectIdList[0];

    const smallProjectTask = taskData.find(
      (task) => task.smallProjectId === changedDisplaySmallProjectId
    );

    const taskAttachedFileListData = taskAttachedFileData.find(
      (taskAttachedFile) =>
        taskAttachedFile.smallProjectId === changedDisplaySmallProjectId
    );

    if (!smallProjectTask || !taskAttachedFileListData) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "プロジェクトのデータを読めませんでした。",
        color: 1,
      });
      router.push("/task");
      return;
    }

    if (smallProjectTask.taskDataArray.length > 0) {
      setSmallProjectTask(smallProjectTask.taskDataArray);
      setTaskAttachedFileListData(taskAttachedFileListData.fileDataList);
    } else {
      setSmallProjectTask([]);
      setTaskAttachedFileListData([]);
    }
  }, [filterMyTasks, pageUpdated, displaySmallProjectId]);

  const moveTask = async (id: string, status: string) => {
    try {
      const { data: statusId, error: selectStatusIdError } =
        await clientSupabase
          .from("task_status")
          .select("id")
          .eq("status", status)
          .single();

      if (selectStatusIdError) {
        throw selectStatusIdError;
      }

      if (!statusId) {
        throw new Error("Status Id couldn't get.");
      }

      const { error: updateStatusError } = await clientSupabase
        .from("tasks")
        .update({ status_id: statusId.id })
        .eq("id", Number(id));

      if (updateStatusError) {
        throw updateStatusError;
      }
      setPageUpdated(true);

      const postEmailNotificationsError = await postMailNotifications(
        displayWorkspaceId,
        userId,
        Number(id),
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
      // 移らなかったので、移した先へフォーカスを戻す予定を取り消す
      focusAfterMove.current = null;
      setNotificationValue({
        message: "ステータスを変更できませんでした。",
        color: 1,
      });
      setPageUpdated(true);
      return;
    }
  };

  const getTaskDataByStatus = (statusId: number, tasks: BoardTask[]) =>
    tasks.filter((task) => task.status_id === statusId);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggingTask(
      smallProjectTask.find((task) => String(task.id) === String(active.id)) ?? null
    );
  };

  const handleDragEnd = ({ active, activatorEvent, over }: DragEndEvent) => {
    setDraggingTask(null);
    const status = statusData.find((row) => columnId(row.id) === over?.id);
    if (!status) return;
    // 同じ列に置いたら何も変わらないので、保存も通知もしない
    const task = smallProjectTask.find((row) => String(row.id) === String(active.id));
    if (task?.status_id === status.id) return;
    if (activatorEvent instanceof KeyboardEvent) {
      focusAfterMove.current = { taskId: Number(active.id), statusId: status.id };
    }
    moveTask(String(active.id), status.status);
  };

  // キーボードで置くと、カードは別の列に描き直されてフォーカスが body へ落ちる。
  // 読み直しの途中では古い列のカードが一度描かれるので、移した先の列に出てから「移動」のボタンへ戻す。
  // 読み直しを待つ間に別の欄へ移っていたら、フォーカスを奪わない
  useEffect(() => {
    const target = focusAfterMove.current;
    if (!target) return;
    const moved = smallProjectTask.some(
      (task) => task.id === target.taskId && task.status_id === target.statusId
    );
    if (!moved) return;
    focusAfterMove.current = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    document.querySelector<HTMLElement>(`[data-move-task="${target.taskId}"]`)?.focus();
  }, [smallProjectTask]);

  return (
    <DndContext
      id="project-task-board"
      sensors={sensors}
      collisionDetection={boardCollisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingTask(null)}
    >
      <div className="grid grid-cols-3 items-stretch gap-4">
        {statusData.map((status) => (
          <BoardColumn
            key={status.id}
            userId={userId}
            status={status}
            tasks={getTaskDataByStatus(status.id, smallProjectTask)}
            attachedFileData={taskAttachedFileListData}
            filterMyTasks={filterMyTasks}
          />
        ))}
      </div>
      {/* 通知の帯・Sheet・Dialog より下に出す。置いたあと元の位置へ戻る動きは付けない */}
      <DragOverlay dropAnimation={null} zIndex={30}>
        {draggingTask && (
          <div className="cursor-grabbing rounded-lg border bg-card shadow-md">
            <p className="m-0 truncate px-3 py-2 text-sm font-medium">{draggingTask.task_name}</p>
            <CardSummary task={draggingTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
