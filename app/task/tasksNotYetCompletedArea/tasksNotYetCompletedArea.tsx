import classNames from "classnames";
import styles from "./tasksNotYetCompletedArea.module.css";
import { Arrow } from "../../component/arrow/arrow";
import React, { useEffect, useState } from "react";
import Comment from "../../component/comment/comment";
import { clientSupabase } from "../../lib/supabase/client";
import { useNotificationContext } from "../../provider/notificationProvider";
import { usePageUpdateContext } from "../../provider/pageUpdateProvider";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "../selectBoxStyles";
import { fetchAttachmentFiles } from "../../lib/fetchAttachmentFiles";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

interface StatusProps {
  id: number;
  status: string;
}

interface TasksNotYetCompletedAreaProps {
  tasksNotYetCompleted: any[];
  tasksNotYetCompletedArrows: boolean[];
  setTasksNotYetCompletedArrows: React.Dispatch<
    React.SetStateAction<boolean[]>
  >;
  userId: number;
  statuses: StatusProps[];
}

interface Option {
  value: number;
  label: string;
}

const TasksNotYetCompletedArea: React.FC<TasksNotYetCompletedAreaProps> = ({
  tasksNotYetCompleted,
  tasksNotYetCompletedArrows,
  setTasksNotYetCompletedArrows,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();

  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [attachmentFileList, setAttachmentFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);

  useEffect(() => {
    setStatusList(statuses);

    const taskNearDeadlineStatuses = tasksNotYetCompleted.map(
      (taskNotYetCompleted) => {
        return {
          value: taskNotYetCompleted.status_id,
          label: taskNotYetCompleted.task_status.status,
        };
      }
    );
    setSelectedStatuses(taskNearDeadlineStatuses);

    const fetchAttachmentFilesData = async () => {
      if (tasksNotYetCompleted && tasksNotYetCompleted.length > 0) {
        const attachmentFilesPromises = tasksNotYetCompleted.map(
          async (taskNotYetCompleted) => {
            const taskId = taskNotYetCompleted.id;
            return await fetchAttachmentFiles(1, taskId);
          }
        );
        const attachmentFiles = await Promise.all(attachmentFilesPromises);
        setAttachmentFileList(attachmentFiles);

        if (attachmentFiles.length > 0) {
          const urlList = attachmentFiles.map((subList) =>
            subList.map((file) => {
              try {
                return URL.createObjectURL(file);
              } catch (error) {
                console.error("Failed to create object URL:", error);
                return null;
              }
            })
          );
          setDownloadUrlList(urlList);
        }
      }
    };
    fetchAttachmentFilesData();
  }, [pageUpdated]);

  const getStatusOptions = (selectedStatusId: number): Option[] => {
    return statusList
      .filter((status) => status.id !== selectedStatusId)
      .map((status) => ({ value: status.id, label: status.status }));
  };

  const handleStatusChange = async (
    taskId: number,
    index: number,
    selectedStatusOptions: SingleValue<Option>
  ) => {
    try {
      const { error } = await clientSupabase
        .from("tasks")
        .update({ status_id: selectedStatusOptions!.value })
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      const postEmailNotificationsError = await postMailNotifications(
        userId,
        taskId,
        null,
        1
      );
      if (postEmailNotificationsError) {
        console.error(
          "Error post mail notifications:",
          postEmailNotificationsError
        );
      }
    } catch (error) {
      console.error("Error update status:", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  const handleNullCheck = (index: number, i: number) => {
    if (!downloadUrlList[index][i]) {
      console.error("Attached File is null.");
      setNotificationValue({
        message: "Couldn't download Attached File.",
        color: 1,
      });
    }
  };

  return (
    <div className={styles[`task-not-yet-completed-area`]}>
      <div className={styles.title}>
        <span className={styles["title-icon"]}>📁</span>
        Tasks not yet completed
      </div>

      <table>
        <thead>
          <tr>
            <th className={styles[`col-task-name`]}>
              Task Name
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-status`]}>
              Status
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-deadline`]}>
              Deadline
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-assigned-person`]}>
              Assigned
              <div className={styles.separator}></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasksNotYetCompleted.length > 0 ? (
            tasksNotYetCompleted?.map((taskNotYetCompleted, index) => (
              <React.Fragment key={taskNotYetCompleted.id}>
                <tr>
                  <td className={styles[`col-task-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        setTasksNotYetCompletedArrows={
                          setTasksNotYetCompletedArrows
                        }
                        tasksNotYetCompletedArrows={tasksNotYetCompletedArrows}
                        index={index}
                        target={2}
                      />
                    </div>
                    <p className={styles[`task-name`]}>
                      {taskNotYetCompleted.task_name}
                    </p>
                  </td>
                  <td className={styles[`col-status`]}>
                    <Select
                      value={selectedStatuses[index]}
                      options={getStatusOptions(taskNotYetCompleted.status_id)}
                      styles={{
                        ...selectBoxStyles,
                        control: (baseStyles, state) => ({
                          ...selectBoxStyles.control(baseStyles, {
                            selectProps: {
                              statusId: taskNotYetCompleted.status_id,
                            },
                          }),
                        }),
                      }}
                      onChange={(selectedOption) =>
                        handleStatusChange(
                          taskNotYetCompleted.id,
                          index,
                          selectedOption
                        )
                      }
                      isSearchable={false}
                    />
                  </td>
                  <td className={styles[`col-deadline`]}>
                    {taskNotYetCompleted.deadline_date}
                  </td>
                  <td className={styles[`col-assigned-person`]}>
                    {taskNotYetCompleted.users.name}
                  </td>
                </tr>
                <tr
                  className={
                    tasksNotYetCompletedArrows[index]
                      ? styles.detailOpen
                      : styles.detailHidden
                  }
                >
                  <td colSpan={6}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <div className={styles[`scrollable-content-container`]}>
                          <div className={styles[`project-part`]}>
                            <dt>Project</dt>
                            <dd className={styles[`project-name`]}>
                              {taskNotYetCompleted.projects.project_name}
                            </dd>
                          </div>
                          <div className={styles[`period-part`]}>
                            <dt>Period</dt>
                            <dd>
                              {taskNotYetCompleted.start_date}　〜　
                              {taskNotYetCompleted.deadline_date}
                            </dd>
                          </div>
                        </div>
                        <dt>Detail</dt>
                        <dd>
                          {taskNotYetCompleted.details
                            ? taskNotYetCompleted.details
                            : "No Detail"}
                        </dd>
                        <dt>Attached Files</dt>
                        <dd className={styles["attachmentFile-area"]}>
                          {attachmentFileList[index] &&
                          attachmentFileList[index].length > 0
                            ? attachmentFileList[index].map((file: any, i) => (
                                <div
                                  className={
                                    styles["display-attachmentFile-container"]
                                  }
                                  key={i}
                                >
                                  <div className={styles["file-info"]}>
                                    <a
                                      href={downloadUrlList[index][i] || "#"}
                                      onClick={() => handleNullCheck(index, i)}
                                      download={file.name}
                                    >
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
                                  <p>
                                    {
                                      file.name
                                        .split("/")
                                        .pop()
                                        .split("-timestamp-")[0]
                                    }
                                  </p>
                                </div>
                              ))
                            : "No Attached File"}
                        </dd>

                        <Comment
                          userId={userId}
                          taskId={taskNotYetCompleted.id}
                        />
                      </dl>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={3} className={styles[`non-tasks`]}>
                No Task
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TasksNotYetCompletedArea;
