import classNames from "classnames";
import styles from "./notYetCompletedTasksArea.module.css";
import { Arrow } from "../../component/arrow/arrow";
import React, { useEffect, useState } from "react";
import Comment from "../../component/comment/comment";
import { clientSupabase } from "../../lib/supabase/client";
import { useNotificationContext } from "../../provider/notificationProvider";
import { usePageUpdateContext } from "../../provider/pageUpdateProvider";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "../selectBoxStyles";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { formatDate } from "@/app/lib/formatDateTime";
import { fetchAttachedFiles } from "@/app/lib/fetchAttachedFiles";
import { getTaskGenre } from "@/app/lib/getTaskGenre";

interface StatusProps {
  id: number;
  status: string;
}

interface NotYetCompletedTasksAreaProps {
  notYetCompletedTasks: any[];
  notYetCompletedTasksArrows: boolean[];
  setNotYetCompletedTasksArrows: React.Dispatch<
    React.SetStateAction<boolean[]>
  >;
  userId: number;
  statuses: StatusProps[];
}

interface Option {
  value: number;
  label: string;
}

const NotYetCompletedTasksArea: React.FC<NotYetCompletedTasksAreaProps> = ({
  notYetCompletedTasks,
  notYetCompletedTasksArrows,
  setNotYetCompletedTasksArrows,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();

  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [taskGenreList, setTaskGenreList] = useState<any[]>([]);
  const [attachedFileList, setAttachedFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);

  useEffect(() => {
    setStatusList(statuses);

    const taskNearDeadlineStatuses = notYetCompletedTasks.map(
      (taskNotYetCompleted) => {
        return {
          value: taskNotYetCompleted.status_id,
          label: taskNotYetCompleted.task_status.status,
        };
      }
    );
    setSelectedStatuses(taskNearDeadlineStatuses);

    const fetchTaskGenreData = async () => {
      const taskGenreIdList = notYetCompletedTasks.map(
        (notYetCompletedTask) => notYetCompletedTask.task_genre_id
      );
      const taskGenreDataArray = await Promise.all(
        taskGenreIdList.map(async (taskGenreId) => {
          if (!taskGenreId) {
            return {};
          } else {
            return await getTaskGenre(taskGenreId);
          }
        })
      );
      setTaskGenreList(taskGenreDataArray);
    };
    fetchTaskGenreData();

    const fetchAttachedFilesData = async () => {
      if (notYetCompletedTasks && notYetCompletedTasks.length > 0) {
        const taskIdList = notYetCompletedTasks.map(
          (notYetCompletedTask) => notYetCompletedTask.id
        );
        const attachedFiles = await fetchAttachedFiles(1, taskIdList);
        setAttachedFileList(attachedFiles);

        if (attachedFiles.length > 0) {
          const urlList = attachedFiles.map((subList) =>
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
    fetchAttachedFilesData();
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
      console.error("Error update status:", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  return (
    <div className={styles[`not-yet-completed-tasks-area`]}>
      <div className={styles.title}>
        <div className={styles[`title-icon-container`]}>
          <span
            className={classNames(
              "material-symbols-outlined",
              styles["title-icon"]
            )}
          >
            folder_check
          </span>
        </div>
        NOT YET COMPLETED TASKS
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
          {notYetCompletedTasks.length > 0 ? (
            notYetCompletedTasks?.map((taskNotYetCompleted, index) => (
              <React.Fragment key={taskNotYetCompleted.id}>
                <tr>
                  <td className={styles[`col-task-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        setNotYetCompletedTasksArrows={
                          setNotYetCompletedTasksArrows
                        }
                        notYetCompletedTasksArrows={notYetCompletedTasksArrows}
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
                    {formatDate(taskNotYetCompleted.deadline_date)}
                  </td>
                  <td className={styles[`col-assigned-person`]}>
                    {taskNotYetCompleted.users.name}
                  </td>
                </tr>
                <tr
                  className={
                    notYetCompletedTasksArrows[index]
                    ? styles[`details-open`]
                    : styles[`details-hidden`]
                  }
                >
                  <td colSpan={6}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <div className={styles[`scrollable-content-container`]}>
                          <div className={styles[`left-part`]}>
                            <dt>Project</dt>
                            <dd className={styles[`project-name`]}>
                              <div className={styles[`white-text`]}>
                                {taskNotYetCompleted.projects.project_name}
                              </div>
                            </dd>

                            <dt>Period</dt>
                            <dd>
                              <div>
                                <div className={styles[`white-text`]}>
                                  {formatDate(taskNotYetCompleted.start_date)}
                                </div>
                                〜
                                <div className={styles[`white-text`]}>
                                  {formatDate(
                                    taskNotYetCompleted.deadline_date
                                  )}
                                </div>
                              </div>
                            </dd>

                            <dt>Days</dt>
                            <dd>
                              <div className={styles[`white-text`]}>
                                {taskNotYetCompleted.number_of_days.toFixed(1)}
                              </div>
                            </dd>
                          </div>

                          <div className={styles[`right-part`]}>
                            <dt>Task Genre</dt>
                            <dd>
                              {taskGenreList[index] &&
                              Object.keys(taskGenreList[index]).length > 0 ? (
                                <div className={styles[`task-genre-area`]}>
                                  <div className={styles[`task-genre-block`]}>
                                    <div className={styles[`task-genre-name`]}>
                                      {taskGenreList[index].taskGenreName}
                                    </div>

                                    <div
                                      className={
                                        styles[`task-genre-table-container`]
                                      }
                                    >
                                      <table>
                                        <tbody>
                                          <tr>
                                            <td>Period</td>
                                            <td>
                                              {formatDate(
                                                taskGenreList[index].startDate
                                              )}{" "}
                                              ~
                                              {formatDate(
                                                taskGenreList[index]
                                                  .deadlineDate
                                              )}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Days</td>
                                            <td>
                                              {(
                                                taskGenreList[index]
                                                  .numberOfDays ?? 0
                                              ).toFixed(1)}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons</td>
                                            <td>
                                              {
                                                taskGenreList[index]
                                                  .numberOfPersons
                                              }
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons/Days</td>
                                            <td>
                                              {(
                                                (taskGenreList[index]
                                                  .numberOfDays ?? 0) *
                                                (taskGenreList[index]
                                                  .numberOfPersons ?? 0)
                                              ).toFixed(1)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={styles[`non-task-genre`]}>
                                  No Task Genre
                                </div>
                              )}
                            </dd>
                          </div>
                        </div>
                        <dt>Details</dt>
                        <dd className={styles[`details-area`]}>
                          {taskNotYetCompleted.details ? (
                            <div className={styles[`details-text`]}>
                              {taskNotYetCompleted.details}
                            </div>
                          ) : (
                            "No Details"
                          )}
                        </dd>
                        <dt>Attached File</dt>
                        <dd className={styles["attachedFile-area"]}>
                          {attachedFileList[index] &&
                          attachedFileList[index].length > 0
                            ? attachedFileList[index].map((file: File, i) => (
                                <div
                                  className={
                                    styles["display-attachedFile-container"]
                                  }
                                  key={i}
                                >
                                  <div className={styles["file-info"]}>
                                    <a
                                      href={downloadUrlList[index][i] || "#"}
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

export default NotYetCompletedTasksArea;
