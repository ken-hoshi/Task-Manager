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
import { formatDate } from "@/app/lib/formatDateTime";
import DatePicker from "react-datepicker";

interface Option {
  value: number;
  label: string;
}

interface StatusProps {
  id: number;
  status: string;
}

enum Sort {
  startDate,
  deadlineDate,
}

interface TaskListProps {
  userId: number;
  projectId: number;
  tasks: any[];
  taskGenreList: any[];
  statuses: StatusProps[];
  projectDetailsArrows: boolean[];
  setProjectDetailsArrows: React.Dispatch<React.SetStateAction<boolean[]>>;
  attachedFileList: File[][];
  downloadUrlList: (string | null)[][];
  isChecked: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  userId,
  projectId,
  tasks,
  statuses,
  taskGenreList,
  projectDetailsArrows,
  setProjectDetailsArrows,
  attachedFileList,
  downloadUrlList,
  isChecked,
}) => {
  const [taskData, setTaskData] = useState<any[]>();
  const [taskGenreData, setTaskGenreData] = useState<any[]>();
  const [attachedFileData, setAttachedFileData] = useState<any[]>();
  const [downloadUrlData, setDownloadUrlData] = useState<any[]>();

  const [selectedResultDeadlineDate, setSelectedResultDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedResultStartDate, setSelectedResultStartDate] = useState<
    Date | undefined
  >(undefined);
  const [numberOfResultDays, setNumberOfResultDays] = useState<
    number | string | undefined
  >("");

  const [startDateClickCount, setStartDateClickCount] = useState(0);
  const [deadlineDateClickCount, setDeadlineDateClickCount] = useState(0);

  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const [postLoading, setPostLoading] = useState(true);

  useEffect(() => {
    if (tasks.length > 0) {
      if (isChecked) {
        const filteredTaskData = tasks.reduce(
          (result, task, index) => {
            if (task.assigned_user_id == userId) {
              result.tasks.push(task);
              result.taskGenreList.push(taskGenreList[index]);
              result.projectDetailsArrows.push(projectDetailsArrows[index]);
              result.attachedFiles.push(attachedFileList[index]);
              result.downloadUrls.push(downloadUrlList[index]);
            }
            return result;
          },
          {
            tasks: [],
            taskGenreList: [],
            projectDetailsArrows: [],
            attachedFiles: [],
            downloadUrls: [],
          }
        );
        setTaskData(filteredTaskData.tasks);
        setTaskGenreData(filteredTaskData.taskGenreList);
        setProjectDetailsArrows(
          new Array(filteredTaskData.projectDetailsArrows.length).fill(false)
        );
        setAttachedFileData(filteredTaskData.attachedFiles);
        setDownloadUrlData(filteredTaskData.downloadUrls);
      } else {
        setTaskData(tasks);
        setTaskGenreData(taskGenreList);
        setProjectDetailsArrows(new Array(tasks.length).fill(false));
        setAttachedFileData(attachedFileList);
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
          "Error post mail notifications ",
          postEmailNotificationsError
        );
      }
    } catch (error) {
      console.error("Error Update Status ", error);
      setNotificationValue({
        message: "Couldn't change the Status data.",
        color: 1,
      });
    }
    setPageUpdated(true);
  };

  const handleResultDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, deadline] = dates;
    setSelectedResultStartDate(start ?? undefined);
    setSelectedResultDeadlineDate(deadline ?? undefined);

    if (start && deadline) {
      const numberOfResultDays = Math.ceil(
        (deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1
      );
      setNumberOfResultDays(numberOfResultDays);
    }
  };

  const sort = (sort: Sort) => {
    if (!taskData) return;

    const handleSort = (
      sortKey: "start_date" | "deadline_date",
      clickCount: number,
      setClickCount: React.Dispatch<React.SetStateAction<number>>
    ) => {
      if (clickCount === 2) {
        setTaskData(tasks);
        setTaskGenreData(taskGenreList);
        setAttachedFileData(attachedFileList);
        setDownloadUrlData(downloadUrlList);
        setClickCount(0);
      } else {
        const sortedTasks = [...taskData].sort((a, b) => {
          const dateA = new Date(a[sortKey]).getTime();
          const dateB = new Date(b[sortKey]).getTime();
          return clickCount === 0 ? dateA - dateB : dateB - dateA;
        });

        const sortOrder = sortedTasks.map((task) => taskData.indexOf(task));
        setTaskData(sortedTasks);
        setTaskGenreData(sortOrder.map((index) => taskGenreList[index]));
        setAttachedFileData(sortOrder.map((index) => attachedFileList[index]));
        setDownloadUrlData(sortOrder.map((index) => downloadUrlList[index]));
        setClickCount((prev) => prev + 1);
      }
    };

    if (sort === Sort.startDate) {
      setDeadlineDateClickCount(0);
      handleSort("start_date", startDateClickCount, setStartDateClickCount);
    } else if (sort === Sort.deadlineDate) {
      setStartDateClickCount(0);
      handleSort(
        "deadline_date",
        deadlineDateClickCount,
        setDeadlineDateClickCount
      );
    }
  };

  const handleSubmit = async (
    e: { preventDefault: () => void },
    taskId: number
  ) => {
    e.preventDefault();

    if (!postLoading) return;
    setPostLoading(false);

    const startDateWithTime = new Date(selectedResultStartDate!);
    startDateWithTime.setHours(9, 0, 0, 0);

    const deadlineDateWithTime = new Date(selectedResultDeadlineDate!);
    deadlineDateWithTime.setHours(9, 0, 0, 0);

    try {
      const { error: taskResultUpdateError } = await clientSupabase
        .from("tasks")
        .update({
          result_start_date: startDateWithTime,
          result_deadline_date: deadlineDateWithTime,
          number_of_result_days: numberOfResultDays,
        })
        .eq("id", taskId);

      if (taskResultUpdateError) {
        throw taskResultUpdateError;
      }

      setNotificationValue({
        message: "Task Result was added.",
        color: 0,
      });
      setPostLoading(true);
      setPageUpdated(true);
    } catch (error) {
      console.error("Error Add Task Result ", error);
      setNotificationValue({
        message: "Task Result was not added.",
        color: 1,
      });
      setPostLoading(true);
      setPageUpdated(true);
    }
    setSelectedResultDeadlineDate(undefined);
    setSelectedResultStartDate(undefined);
    setNumberOfResultDays(undefined);
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
            <th
              className={styles[`col-start-date`]}
              onClick={() => sort(Sort.startDate)}
            >
              <div className={styles[`date-col-container`]}>
                Start Date
                {startDateClickCount === 0 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    swap_vert
                  </span>
                )}
                {startDateClickCount === 1 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    keyboard_double_arrow_down
                  </span>
                )}
                {startDateClickCount === 2 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    keyboard_double_arrow_up
                  </span>
                )}
              </div>

              <div className={styles.separator}></div>
            </th>
            <th
              className={styles[`col-deadline-date`]}
              onClick={() => sort(Sort.deadlineDate)}
            >
              <div className={styles[`date-col-container`]}>
                Deadline Date
                {deadlineDateClickCount === 0 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    swap_vert
                  </span>
                )}
                {deadlineDateClickCount === 1 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    keyboard_double_arrow_down
                  </span>
                )}
                {deadlineDateClickCount === 2 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.sort
                    )}
                  >
                    keyboard_double_arrow_up
                  </span>
                )}
              </div>
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-days`]}>
              Days
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
                        projectDetailsArrows={projectDetailsArrows}
                        setProjectDetailsArrows={setProjectDetailsArrows}
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
                  <td className={styles[`col-start-date`]}>
                    {formatDate(task.start_date)}
                  </td>
                  <td className={styles[`col-deadline-date`]}>
                    {formatDate(task.deadline_date)}
                  </td>

                  <td className={styles[`col-days`]}>
                    {task.number_of_days.toFixed(1)}
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
                    projectDetailsArrows[index]
                      ? styles[`details-open`]
                      : styles[`details-hidden`]
                  }
                >
                  <td colSpan={7}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <div className={styles[`flex-content`]}>
                          <div className={styles.flex}>
                            <dt>Task Genre</dt>
                            <dd>
                              {taskGenreData &&
                              taskGenreData[index] &&
                              taskGenreData[index].taskGenreName ? (
                                <div className={styles[`task-genre-area`]}>
                                  <div className={styles[`task-genre-block`]}>
                                    <div className={styles[`task-genre-name`]}>
                                      {taskGenreData[index].taskGenreName}
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
                                                taskGenreData[index].startDate
                                              )}{" "}
                                              ~
                                              {formatDate(
                                                taskGenreData[index]
                                                  .deadlineDate
                                              )}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Days</td>
                                            <td>
                                              {(
                                                taskGenreData[index]
                                                  .numberOfDays ?? 0
                                              ).toFixed(1)}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons</td>
                                            <td>
                                              {
                                                taskGenreData[index]
                                                  .numberOfPersons
                                              }
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons/Days</td>
                                            <td>
                                              {(
                                                (taskGenreData[index]
                                                  .numberOfDays ?? 0) *
                                                (taskGenreData[index]
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

                          <div className={styles.flex}>
                            <dt>Task Result</dt>

                            <dd>
                              {taskGenreData &&
                                taskGenreData[index] &&
                                Object.keys(taskGenreData[index]).length > 0 &&
                                taskGenreData[index].assignedUserTaskResultData
                                  .length > 0 && (
                                  <div
                                    className={styles["user-result-value-area"]}
                                  >
                                    <div>
                                      {taskGenreData[
                                        index
                                      ].assignedUserTaskResultData.map(
                                        (
                                          assignedUserTaskResult: {
                                            userName: string;
                                            numberOfResultDays: number;
                                          },
                                          i: number
                                        ) => (
                                          <div
                                            key={i}
                                            className={
                                              styles["assigned-user-list"]
                                            }
                                          >
                                            <div>
                                              {assignedUserTaskResult.userName}
                                            </div>
                                            <div>
                                              {(assignedUserTaskResult.numberOfResultDays
                                                ? assignedUserTaskResult.numberOfResultDays
                                                : 0
                                              ).toFixed(1)}
                                              {" days"}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                    <div className={styles["result-area"]}>
                                      <div>Result</div>
                                      <div className={styles["result-value"]}>
                                        <div
                                          className={
                                            taskGenreData[
                                              index
                                            ].assignedUserTaskResultData.reduce(
                                              (
                                                acc: number,
                                                curr: {
                                                  userName: string;
                                                  numberOfResultDays: number;
                                                }
                                              ) =>
                                                acc + curr.numberOfResultDays,
                                              0
                                            ) <=
                                            (taskGenreData[index]
                                              .numberOfDays ?? 0) *
                                              (taskGenreData[index]
                                                .numberOfPersons ?? 0)
                                              ? styles[`value-green`]
                                              : styles[`value-red`]
                                          }
                                        >
                                          {taskGenreData[
                                            index
                                          ].assignedUserTaskResultData
                                            .reduce(
                                              (
                                                acc: number,
                                                curr: {
                                                  userName: string;
                                                  numberOfResultDays: number;
                                                }
                                              ) =>
                                                acc + curr.numberOfResultDays,
                                              0
                                            )
                                            .toFixed(1)}
                                        </div>
                                        <div>
                                          {" / "}
                                          {(
                                            (taskGenreData[index]
                                              .numberOfDays ?? 0) *
                                            (taskGenreData[index]
                                              .numberOfPersons ?? 0)
                                          ).toFixed(1)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {userId === task.assigned_user_id && (
                                <form
                                  onSubmit={(e) => handleSubmit(e, task.id)}
                                  className={styles[`task-result-form`]}
                                >
                                  <div className={styles["form-container"]}>
                                    <div>
                                      <DatePicker
                                        selected={selectedResultStartDate}
                                        onChange={handleResultDateRangeChange}
                                        startDate={selectedResultStartDate}
                                        endDate={selectedResultDeadlineDate}
                                        selectsRange
                                        dateFormat="yyyy/MM/dd"
                                        className={styles[`date-picker`]}
                                        calendarClassName={
                                          styles[`custom-calendar`]
                                        }
                                        showIcon
                                        required
                                      />
                                      <p className={styles.instruction}>
                                        Period
                                      </p>
                                    </div>
                                    <div>
                                      <input
                                        type="number"
                                        name="numberOfResultDays"
                                        step="0.1"
                                        min="0"
                                        className={
                                          styles[`number-of-result-days-form`]
                                        }
                                        value={
                                          numberOfResultDays !== undefined
                                            ? numberOfResultDays
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const inputValue = e.target.value;
                                          setNumberOfResultDays(
                                            inputValue
                                              ? Number(inputValue)
                                              : undefined
                                          );
                                        }}
                                        required
                                      />
                                      <p className={styles.instruction}>Days</p>
                                    </div>
                                    <div className={styles[`button-container`]}>
                                      <button
                                        className={styles.confirm}
                                        type="submit"
                                      >
                                        {postLoading ? (
                                          "confirm"
                                        ) : (
                                          <div
                                            className={styles[`button-spinner`]}
                                          ></div>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              )}
                            </dd>
                          </div>
                        </div>

                        <div className={styles[`flex-content`]}>
                          <div className={styles.flex}>
                            <dt>Details</dt>
                            <dd className={styles[`details-area`]}>
                              {task.details ? (
                                <div className={styles[`details-text`]}>
                                  {task.details}
                                </div>
                              ) : (
                                "No Details"
                              )}
                            </dd>
                          </div>
                          <div className={styles.flex}>
                            <dt>Attached File</dt>
                            <dd className={styles["attachedFile-area"]}>
                              {attachedFileData![index] &&
                              attachedFileData![index].length > 0
                                ? attachedFileData![index].map(
                                    (file: any, i: number) => (
                                      <div
                                        className={
                                          styles[
                                            "display-attachedFile-container"
                                          ]
                                        }
                                        key={i}
                                      >
                                        <div className={styles["file-info"]}>
                                          <a
                                            href={
                                              downloadUrlData![index][i] || "#"
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
                          </div>
                        </div>

                        <Comment
                          userId={userId}
                          taskId={task.id}
                          projectDetails={true}
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
