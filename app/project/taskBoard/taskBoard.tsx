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

interface StatusProps {
  id: number;
  status: string;
}

interface TaskBoardProps {
  userId: number;
  tasks: any[];
  statuses: StatusProps[];
  attachedFileList: File[][];
  downloadUrlList: (string | null)[][];
  isChecked: boolean;
}

const ItemTypes = {
  TASK: "TASK",
};

const TaskItem = ({
  userId,
  task,
  attachedFiles,
  downloadUrls,
  index,
  moveTask,
}: {
  userId: number;
  task: any;
  index: number;
  attachedFiles: File[];
  downloadUrls: (string | null)[];
  moveTask: (id: string, status: string) => void;
}) => {
  const { setNotificationValue } = useNotificationContext();
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
          <EditButton taskId={task.id} projectId={null} userId={userId} />
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
            Attached-file
          </div>
          <div className={styles[`attached-file-flex-area`]}>
            {attachedFiles && attachedFiles.length > 0 ? (
              attachedFiles.map((file: any, index: number) => (
                <div
                  className={styles["display-attachedFile-container"]}
                  key={index}
                >
                  <div className={styles["file-info"]}>
                    <a href={downloadUrls[index] || "#"} download={file.name}>
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
                  <p>{file.name}</p>
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
  moveTask,
}: {
  userId: number;
  status: StatusProps;
  taskData: any;
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
          taskData.tasksByStatus.length > 0 &&
          taskData.tasksByStatus.map((task: any, index: number) => (
            <TaskItem
              userId={userId}
              key={task.id}
              task={task}
              attachedFiles={taskData.attachedFilesByStatus[index]}
              downloadUrls={taskData.downloadUrlsByStatus[index]}
              index={index}
              moveTask={moveTask}
            />
          ))}
      </div>
    </div>
  );
};

const TaskBoard: React.FC<TaskBoardProps> = ({
  userId,
  tasks,
  statuses,
  attachedFileList,
  downloadUrlList,
  isChecked,
}) => {
  const [taskData, setTaskData] = useState<any[]>();
  const [attachedFileData, setAttachedFileData] = useState<any[]>();
  const [downloadUrlData, setDownloadUrlData] = useState<any[]>();

  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();

  useEffect(() => {
    if (tasks.length > 0) {
      if (isChecked) {
        const filteredTaskData = tasks.reduce(
          (result, task, index) => {
            if (task.assigned_user_id == userId) {
              result.tasks.push(task);
              result.attachedFiles.push(attachedFileList[index]);
              result.downloadUrls.push(downloadUrlList[index]);
            }
            return result;
          },
          {
            tasks: [],
            attachedFiles: [],
            downloadUrls: [],
          }
        );
        setTaskData(filteredTaskData.tasks);
        setAttachedFileData(filteredTaskData.attachedFiles);
        setDownloadUrlData(filteredTaskData.downloadUrls);
      } else {
        setTaskData(tasks);
        setAttachedFileData(attachedFileList);
        setDownloadUrlData(downloadUrlList);
      }
    }
  }, [pageUpdated, isChecked]);

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
        throw new Error("Status Id is null");
      }

      const { error: updateStatusError } = await clientSupabase
        .from("tasks")
        .update({ status_id: statusId.id })
        .eq("id", Number(id));

      if (updateStatusError) {
        throw updateStatusError;
      }
      setPageUpdated(true);

      setTaskData(
        taskData?.map((task) =>
          task.id.toString() === id
            ? {
                ...task,
                status_id: statusId.id,
                task_status: { status: status },
              }
            : task
        )
      );
      const postEmailNotificationsError = await postMailNotifications(
        userId,
        Number(id),
        null,
        1,
        []
      );
      if (postEmailNotificationsError) {
        console.error(
          "Error post mail notifications:",
          postEmailNotificationsError
        );
      }
    } catch (error) {
      console.error("Error Update status:", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
      setPageUpdated(true);
      return;
    }
  };

  const getTaskDataByStatus = (
    statusId: number,
    tasks: any[],
    attachedFileList: File[][],
    downloadUrlList: (string | null)[][]
  ) => {
    if (tasks && tasks.length > 0) {
      const filteredTaskDataByStatus = tasks?.reduce(
        (result, task, index) => {
          if (task.status_id === statusId) {
            result.tasksByStatus.push(task);
            result.attachedFilesByStatus.push(attachedFileList[index]);
            result.downloadUrlsByStatus.push(downloadUrlList[index]);
          }
          return result;
        },
        {
          tasksByStatus: [],
          attachedFilesByStatus: [],
          downloadUrlsByStatus: [],
        }
      );
      return filteredTaskDataByStatus;
    } else {
      return {};
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.board}>
        {statuses.map((status) => (
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
              taskData={getTaskDataByStatus(
                status.id,
                taskData!,
                attachedFileData!,
                downloadUrlData!
              )}
              moveTask={moveTask}
            />
          </div>
        ))}
      </div>
    </DndProvider>
  );
};

export default TaskBoard;
