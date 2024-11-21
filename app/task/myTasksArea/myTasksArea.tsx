import classNames from "classnames";
import styles from "./myTasksArea.module.css";
import { Arrow } from "../../component/arrow/arrow";
import React, { useEffect, useState } from "react";
import Comment from "../../component/comment/comment";
import DeleteButton from "../../component/deleteButton/deleteButton";
import AddButton from "../../component/addButton/addButton";
import { useFlashDisplayContext } from "../../provider/flashDisplayProvider";
import EditButton from "../../component/editButton/editButton";
import { clientSupabase } from "../../lib/supabase/client";
import { useNotificationContext } from "../../provider/notificationProvider";
import { usePageUpdateContext } from "../../provider/pageUpdateProvider";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "../selectBoxStyles";
import { formatDate } from "@/app/lib/formatDateTime";
import { fetchAttachedFiles } from "@/app/lib/fetchAttachedFiles";
import { getTaskGenreData } from "@/app/lib/getTaskGenre";
import DatePicker from "react-datepicker";

interface StatusProps {
  id: number;
  status: string;
}

interface MyTasksAreaProps {
  myTasks: any[];
  myTaskArrows: boolean[];
  setMyTaskArrows: React.Dispatch<React.SetStateAction<boolean[]>>;
  userId: number;
  statuses: StatusProps[];
}

interface Option {
  value: number;
  label: string;
}

const MyTasksArea: React.FC<MyTasksAreaProps> = ({
  myTasks,
  myTaskArrows,
  setMyTaskArrows,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();

  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [taskGenreList, setTaskGenreList] = useState<any[]>([]);
  const [selectedResultDeadlineDate, setSelectedResultDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedResultStartDate, setSelectedResultStartDate] = useState<
    Date | undefined
  >(undefined);
  const [numberOfResultDays, setNumberOfResultDays] = useState<
    number | string | undefined
  >("");
  const [attachedFileList, setAttachedFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);
  const [postLoading, setPostLoading] = useState(true);

  useEffect(() => {
    setStatusList(statuses);

    const myTaskStatuses = myTasks.map((myTask) => {
      return {
        value: myTask.status_id,
        label: myTask.task_status.status,
      };
    });
    setSelectedStatuses(myTaskStatuses);
    const fetchTaskGenreData = async () => {
      const taskGenreIdList = myTasks.map((myTask) => myTask.task_genre_id);
      const taskGenreDataArray = await Promise.all(
        taskGenreIdList.map(async (taskGenreId, index) => {
          if (!taskGenreId) {
            return {
              assignedUserTaskResultData: [
                {
                  userName: myTasks[index].users.name,
                  numberOfResultDays: myTasks[index].number_of_result_days
                    ? myTasks[index].number_of_result_days
                    : 0,
                },
              ],
            };
          } else {
            return await getTaskGenreData(taskGenreId);
          }
        })
      );
      setTaskGenreList(taskGenreDataArray);
    };
    fetchTaskGenreData();

    const fetchAttachedFilesData = async () => {
      if (myTasks && myTasks.length > 0) {
        const taskIdList = myTasks.map((myTask) => myTask.id);
        const attachedFiles = await fetchAttachedFiles(1, taskIdList);
        setAttachedFileList(attachedFiles);

        if (attachedFiles.length > 0) {
          const urlList = attachedFiles.map((subList) =>
            subList.map((file) => {
              try {
                return URL.createObjectURL(file);
              } catch (error) {
                console.error("Failed to create object URL ", error);
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
    <div className={styles[`my-task-area`]}>
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
        MY TASKS
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
            <th className={styles[`col-actions`]}>
              <AddButton target={1} userId={userId} />
            </th>
          </tr>
        </thead>
        <tbody>
          {myTasks.length > 0 ? (
            myTasks?.map((myTask, index) => (
              <React.Fragment key={myTask.id}>
                <tr
                  className={
                    myTask.id == newItem.id && newItem.target == 1
                      ? styles.blink
                      : ""
                  }
                >
                  <td className={styles[`col-task-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        setMyTasksArrows={setMyTaskArrows}
                        myTasksArrows={myTaskArrows}
                        index={index}
                        target={1}
                      />
                    </div>
                    <p className={styles[`task-name`]}>{myTask.task_name}</p>
                  </td>
                  <td className={styles[`col-status`]}>
                    <Select
                      value={selectedStatuses[index]}
                      options={getStatusOptions(myTask.status_id)}
                      styles={{
                        ...selectBoxStyles,
                        control: (baseStyles, state) => ({
                          ...selectBoxStyles.control(baseStyles, {
                            selectProps: { statusId: myTask.status_id },
                          }),
                        }),
                      }}
                      onChange={(selectedOption) =>
                        handleStatusChange(myTask.id, index, selectedOption)
                      }
                      isSearchable={false}
                    />
                  </td>
                  <td className={styles[`col-deadline`]}>
                    {formatDate(myTask.deadline_date)}
                  </td>
                  <td className={styles[`col-assigned-person`]}>
                    {myTask.users.name}
                  </td>
                  <td className={styles[`col-actions`]}>
                    <EditButton
                      taskId={myTask.id}
                      projectId={null}
                      userId={userId}
                    />
                    <DeleteButton
                      taskId={myTask.id}
                      projectId={null}
                      userId={userId}
                    />
                  </td>
                </tr>
                <tr
                  className={
                    myTaskArrows[index]
                      ? styles[`details-open`]
                      : styles[`details-hidden`]
                  }
                >
                  <td colSpan={5}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <div className={styles[`scrollable-content-container`]}>
                          <div className={styles[`flex-area`]}>
                            <div className={styles.flex}>
                              <dt>Project</dt>
                              <dd className={styles[`project-name`]}>
                                <div className={styles[`white-text`]}>
                                  {myTask.projects.project_name}
                                </div>
                              </dd>
                            </div>
                            <div className={styles.flex}>
                              <dt>Period</dt>
                              <dd>
                                <div>
                                  <div className={styles[`white-text`]}>
                                    {formatDate(myTask.start_date)}
                                  </div>
                                  〜
                                  <div className={styles[`white-text`]}>
                                    {formatDate(myTask.deadline_date)}
                                  </div>
                                </div>
                              </dd>
                            </div>
                          </div>

                          <div className={styles[`flex-area`]}>
                            <div className={styles.flex}>
                              <dt>Task Genre</dt>
                              <dd>
                                {taskGenreList[index] &&
                                taskGenreList[index].taskGenreName ? (
                                  <div className={styles[`task-genre-area`]}>
                                    <div className={styles[`task-genre-block`]}>
                                      <div
                                        className={styles[`task-genre-name`]}
                                      >
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
                            <div className={styles.flex}>
                              <dt>Task Result</dt>
                              <dd>
                                {taskGenreList &&
                                  taskGenreList[index] &&
                                  Object.keys(taskGenreList[index]).length >
                                    0 &&
                                  taskGenreList[index]
                                    .assignedUserTaskResultData.length > 0 && (
                                    <div
                                      className={
                                        styles["user-result-value-area"]
                                      }
                                    >
                                      <div>
                                        {taskGenreList[
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
                                                {
                                                  assignedUserTaskResult.userName
                                                }
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
                                              taskGenreList[
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
                                              (taskGenreList[index]
                                                .numberOfDays ?? 0) *
                                                (taskGenreList[index]
                                                  .numberOfPersons ?? 0)
                                                ? styles[`value-green`]
                                                : styles[`value-red`]
                                            }
                                          >
                                            {taskGenreList[
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
                                              (taskGenreList[index]
                                                .numberOfDays ?? 0) *
                                              (taskGenreList[index]
                                                .numberOfPersons ?? 0)
                                            ).toFixed(1)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                <form
                                  onSubmit={(e) => handleSubmit(e, myTask.id)}
                                  className={styles[`task-result-form`]}
                                >
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

                                  <div className={styles["form-container"]}>
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
                                      {" days"}
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
                              </dd>
                            </div>
                          </div>
                        </div>

                        <dt>Details</dt>
                        <dd className={styles[`details-area`]}>
                          {myTask.details ? (
                            <div className={styles[`details-text`]}>
                              {myTask.details}
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

                        <Comment userId={userId} taskId={myTask.id} />
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

export default MyTasksArea;
