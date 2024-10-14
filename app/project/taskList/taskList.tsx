import { Arrow } from "@/app/component/arrow/arrow";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import EditButton from "@/app/component/editButton/editButton";
import { selectBoxStyles } from "../suspenseProject/selectBoxStyles";
import classNames from "classnames";
import React, { useEffect, useState } from "react";
import Select, { SingleValue } from "react-select";
import styles from "./taskList.module.css";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import Comment from "@/app/component/comment/comment";
import AddButton from "@/app/component/addButton/addButton";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

interface Option {
  value: number;
  label: string;
}

interface StatusProps {
  id: number;
  status: string;
}

interface TaskListProps {
  userId: number;
  projectId: number;
  tasks: any[];
  statuses: StatusProps[];
  projectDetailArrows: boolean[];
  setProjectDetailArrows: React.Dispatch<React.SetStateAction<boolean[]>>;
  attachmentFileList: File[][];
  downloadUrlList: (string | null)[][];
  isChecked: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  userId,
  projectId,
  tasks,
  statuses,
  projectDetailArrows,
  setProjectDetailArrows,
  attachmentFileList,
  downloadUrlList,
  isChecked,
}) => {
  const [taskData, setTaskData] = useState<any[]>();
  const [attachmentFileData, setAttachmentFileData] = useState<any[]>();
  const [downloadUrlData, setDownloadUrlData] = useState<any[]>();

  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();

  useEffect(() => {
    if (tasks.length > 0) {
      if (isChecked) {
        const filteredTaskData = tasks.reduce(
          (result, task, index) => {
            if (task.assigned_user_id == userId) {
              result.tasks.push(task);
              result.projectDetailArrows.push(projectDetailArrows[index]);
              result.attachmentFiles.push(attachmentFileList[index]);
              result.downloadUrls.push(downloadUrlList[index]);
            }
            return result;
          },
          {
            tasks: [],
            projectDetailArrows: [],
            attachmentFiles: [],
            downloadUrls: [],
          }
        );
        setTaskData(filteredTaskData.tasks);
        setProjectDetailArrows(
          new Array(filteredTaskData.projectDetailArrows.length).fill(false)
        );
        setAttachmentFileData(filteredTaskData.attachmentFiles);
        setDownloadUrlData(filteredTaskData.downloadUrls);
      } else {
        setTaskData(tasks);
        setProjectDetailArrows(new Array(tasks.length).fill(false));
        setAttachmentFileData(attachmentFileList);
        setDownloadUrlData(downloadUrlList);
      }
    }
  }, [pageUpdated, isChecked]);

  const getStatusOptions = (selectedStatusId: number): Option[] => {
    return statuses
      .filter((status) => status.id !== selectedStatusId)
      .map((status) => ({ value: status.id, label: status.status }));
  };

  const handleStatusChange = async (
    taskId: number,
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
      console.error("Error updating status:", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  const handleNullCheck = (index: number, i: number) => {
    if (!downloadUrlData![index][i]) {
      console.error("Attached File is null.");
      setNotificationValue({
        message: "Couldn't download Attached File.",
        color: 1,
      });
    }
  };

  return (
    <div className={styles[`task-list`]}>
      <table>
        <thead>
          <tr className={styles[`tr-top`]}>
            <th className={styles[`col-task-name`]}>
              Task Name
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-status`]}>
              Status
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-start-day`]}>
              Start Day
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-deadline-day`]}>
              Deadline Day
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-assigned-person`]}>
              Assigned
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-actions`]}>
              <AddButton target={1} userId={userId} projectId={projectId} />
            </th>
          </tr>
        </thead>
        <tbody
          className={
            taskData && taskData.length > 0
              ? styles[`task-list-tbody`]
              : styles[`non-task-tbody`]
          }
        >
          {taskData && taskData.length > 0 ? (
            taskData.map((task, index) => (
              <React.Fragment key={task.id}>
                <tr
                  className={
                    task.id == newItem.id && newItem.target == 1
                      ? styles.blink
                      : ""
                  }
                >
                  <td className={styles[`col-task-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        projectDetailArrows={projectDetailArrows}
                        setProjectDetailArrows={setProjectDetailArrows}
                        index={index}
                        target={3}
                      />
                    </div>
                    <p className={styles[`task-name`]}>{task.task_name}</p>
                  </td>
                  <td className={styles[`col-status`]}>
                    <Select
                      value={{
                        value: Number(task.status_id),
                        label: task.task_status.status,
                      }}
                      options={getStatusOptions(task.status_id)}
                      styles={{
                        ...selectBoxStyles,
                        control: (baseStyles, state) => ({
                          ...selectBoxStyles.control(baseStyles, {
                            selectProps: { statusId: task.status_id },
                          }),
                        }),
                      }}
                      onChange={(selectedOption) =>
                        handleStatusChange(task.id, selectedOption)
                      }
                      isSearchable={false}
                    />
                  </td>
                  <td className={styles[`col-start-day`]}>{task.start_date}</td>
                  <td className={styles[`col-deadline-day`]}>
                    {task.deadline_date}
                  </td>

                  <td className={styles[`col-assigned-person`]}>
                    {task.users.name}
                  </td>
                  <td className={styles[`col-actions`]}>
                    <EditButton
                      taskId={task.id}
                      projectId={null}
                      userId={userId}
                    />
                    <DeleteButton
                      taskId={task.id}
                      projectId={null}
                      userId={userId}
                    />
                  </td>
                </tr>
                <tr
                  className={
                    projectDetailArrows[index]
                      ? styles.detailOpen
                      : styles.detailHidden
                  }
                >
                  <td colSpan={6}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <dt>Detail</dt>
                        <dd className={styles[`detail-area`]}>
                          {task.details ? task.details : "No Detail"}
                        </dd>
                        <dt>Attached Files</dt>
                        <dd className={styles["attachmentFile-area"]}>
                          {attachmentFileData![index] &&
                          attachmentFileData![index].length > 0
                            ? attachmentFileData![index].map(
                                (file: any, i: number) => (
                                  <div
                                    className={
                                      styles["display-attachmentFile-container"]
                                    }
                                    key={i}
                                  >
                                    <div className={styles["file-info"]}>
                                      <a
                                        href={downloadUrlData![index][i] || "#"}
                                        onClick={() =>
                                          handleNullCheck(index, i)
                                        }
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
                                    <p>{file.name}</p>
                                  </div>
                                )
                              )
                            : "No Attached File"}
                        </dd>

                        <Comment
                          userId={userId}
                          taskId={task.id}
                          projectDetail={true}
                        />
                      </dl>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={6} className={styles[`non-tasks`]}>
                No Task
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskList;
