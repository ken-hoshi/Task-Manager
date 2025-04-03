import React, { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import styles from "./taskBoard.module.css";
import classNames from "classnames";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { clientSupabase } from "@/app/lib/supabase/client";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import EditButton from "@/app/component/editButton/editButton";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useRouter } from "next/navigation";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

interface StatusProps {
  id: number;
  status: string;
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: any[];
}

interface AttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
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

const ItemTypes = {
  TASK: "TASK",
};

const TaskItem = ({
  userId,
  task,
  taskId,
  attachedFileData,
  moveTask,
}: {
  userId: number;
  task: any;
  taskId: number;
  attachedFileData: AttachedFileProps[];
  moveTask: (id: string, status: string) => void;
}) => {
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [isOpen, setIsOpen] = useState(false);

  const [{ isDragging }, ref] = useDrag({
    type: "TASK",
    item: { id: task.id.toString(), status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const toggleArrow = () => {
    setIsOpen(!isOpen);
  };

  const attachedFileMatchedTaskId = attachedFileData.find(
    (attachedFile) => attachedFile.id === taskId
  );

  return (
    <div
      ref={ref}
      className={classNames(
        styles[`task-block`],
        isDragging && styles.dragging
      )}
    >
      <div className={styles[`blue-area`]}>
        <div className={styles[`arrow-container`]}>
          <span
            className={classNames("material-symbols-outlined", styles.arrow)}
            onClick={() => toggleArrow()}
          >
            {isOpen ? "arrow_drop_down" : "arrow_right"}
          </span>
        </div>
        <div className={styles[`task-name-area`]}>
          <span className={styles[`top-bar`]}></span>

          <div className={styles[`task-name`]}>{task.task_name}</div>
        </div>
        <div className={styles[`button-area`]}>
          <EditButton
            workspaceId={displayWorkspaceId || undefined}
            taskId={task.id}
            projectId={null}
            userId={userId}
          />
          <DeleteButton taskId={task.id} projectId={null} userId={userId} />
        </div>
      </div>

      <div className={styles[`deadline-area`]}>
        <div className={styles.label}>Period</div>
        {task.start_date.split("-").slice(1).join("/")} ~{" "}
        {task.deadline_date.split("-").slice(1).join("/")}
      </div>
      <div className={styles[`assigned-area`]}>
        <div className={styles.label}>Assigned</div>
        {task.users.name}
      </div>
      <div
        className={classNames(styles[`block-open-area`], isOpen && styles.open)}
      >
        <div className={styles[`details-area`]}>
          <div className={styles.label}>Details</div>
          <p>{task.details ? task.details : "No Details"}</p>
        </div>
        <div className={styles[`attached-file-area`]}>
          <div
            className={classNames(styles[`attached-file-label`], styles.label)}
          >
            Attached File
          </div>
          <div className={styles[`attached-file-flex-area`]}>
            {attachedFileMatchedTaskId &&
            attachedFileMatchedTaskId.fileDataArray.length > 0 ? (
              attachedFileMatchedTaskId.fileDataArray.map((file, index) => (
                <div
                  className={styles["display-attachedFile-container"]}
                  key={index}
                >
                  <div className={styles["file-info"]}>
                    <a href={file.url || "#"} download={file.file.name}>
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.downloadIcon
                        )}
                      >
                        download
                      </span>
                    </a>
                  </div>
                  <p>{file.file.name}</p>
                </div>
              ))
            ) : (
              <div className={styles[`no-attached-file`]}>No Attached File</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskList = ({
  userId,
  status,
  taskData,
  attachedFileData,
  moveTask,
}: {
  userId: number;
  status: StatusProps;
  taskData: any[];
  attachedFileData: AttachedFileProps[];
  moveTask: (id: string, status: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState([false, false, false]);

  const createDropHook = (index: number) => {
    const [{ isOver }, drop] = useDrop({
      accept: "TASK",
      drop: (item: { id: string; status: string }) => {
        moveTask(item.id, status.status);
      },
      hover: () => {
        const newHoverState = [false, false, false];
        newHoverState[index] = true;
        setIsHovered(newHoverState);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    useEffect(() => {
      if (!isOver) {
        setIsHovered([false, false, false]);
      }
    }, [isOver]);
    return drop;
  };

  return (
    <div
      ref={
        {
          1: createDropHook(0),
          2: createDropHook(1),
          3: createDropHook(2),
        }[status.id]
      }
    >
      <div
        className={classNames(
          styles.column,
          {
            1: isHovered[0]
              ? styles["hover-not-started-column"]
              : styles["not-started-column"],
            2: isHovered[1]
              ? styles["hover-processing-column"]
              : styles["processing-column"],
            3: isHovered[2]
              ? styles["hover-completed-column"]
              : styles["completed-column"],
          }[status.id]
        )}
      >
        {taskData &&
          Object.keys(taskData).length > 0 &&
          taskData.map((task: any, index: number) => (
            <TaskItem
              key={task.id}
              userId={userId}
              task={task}
              taskId={task.id}
              attachedFileData={attachedFileData}
              moveTask={moveTask}
            />
          ))}
      </div>
    </div>
  );
};

const TaskBoard: React.FC<TaskBoardProps> = ({
  userId,
  smallProjectIdList,
  displaySmallProjectId,
  taskData,
  statusData,
  taskAttachedFileData,
  filterMyTasks,
}) => {
  const [useDisplaySmallProjectId, setUseDisplaySmallProjectId] = useState(0);
  const [smallProjectTask, setSmallProjectTask] = useState<any[]>([]);
  const [taskAttachedFileListData, setTaskAttachedFileListData] = useState<
    AttachedFileProps[]
  >([]);

  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const router = useRouter();

  useEffect(() => {
    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId!
        : smallProjectIdList[0];

    setUseDisplaySmallProjectId(changedDisplaySmallProjectId);

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
        message: "Couldn't get Project Data.",
        color: 1,
      });
      router.push("/task");
    }

    if (smallProjectTask!.taskDataArray.length > 0) {
      setSmallProjectTask(smallProjectTask!.taskDataArray);
      setTaskAttachedFileListData(taskAttachedFileListData!.fileDataList);
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

      setSmallProjectTask(
        taskData?.map((task) =>
          task.smallProjectId === useDisplaySmallProjectId
            ? {
                ...task,
                taskDataArray: task.taskDataArray.map((taskData) =>
                  taskData.id.toString() === id
                    ? {
                        ...task,
                        status_id: statusId.id,
                        task_status: { status: status },
                      }
                    : task
                ),
              }
            : taskData
        )
      );
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
      setNotificationValue({
        message: "Couldn't update Status.",
        color: 1,
      });
      setPageUpdated(true);
      return;
    }
  };

  const getTaskDataByStatus = (statusId: number, tasks: any[]) => {
    if (tasks && tasks.length > 0) {
      const tasksByStatus = tasks.filter((task) => task.status_id === statusId);
      return tasksByStatus;
    } else {
      return [];
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.board}>
        {statusData.map((status) => (
          <div key={status.id}>
            <div className={styles[`status-icon-container`]}>
              <div
                className={classNames(
                  styles[`status-icon`],
                  styles[`not-started`],
                  {
                    1: styles["not-started"],
                    2: styles["processing"],
                    3: styles["completed"],
                  }[status.id]
                )}
              >
                {status.status}
              </div>
            </div>
            <TaskList
              userId={userId}
              status={status}
              taskData={getTaskDataByStatus(status.id, smallProjectTask!)}
              attachedFileData={taskAttachedFileListData}
              moveTask={moveTask}
            />
          </div>
        ))}
      </div>
    </DndProvider>
  );
};

export default TaskBoard;
