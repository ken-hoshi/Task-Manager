import classNames from "classnames";
import styles from "./myTasksArea.module.css";
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
import { fetchAttachedFiles } from "@/app/lib/api/fetchAttachedFiles";
import { getTaskGenreData } from "@/app/lib/api/getTaskGenreData";
import DatePicker from "react-datepicker";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import Image from "next/image";

interface StatusProps {
  id: number;
  status: string;
}

interface Option {
  value: number;
  label: string;
}

interface TaskArrowJudgeProps {
  taskId: any;
  arrowJudge: boolean;
}

interface AttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}

interface MyTasksAreaProps {
  myTasks: any[];
  userId: number;
  statuses: StatusProps[];
}

const MyTasksArea: React.FC<MyTasksAreaProps> = ({
  myTasks,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();

  const [myTaskList, setMyTaskList] = useState<any[]>([]);
  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [taskGenreList, setTaskGenreList] = useState<any[]>([]);
  const [taskArrowJudgeData, setTaskArrowJudgeData] = useState<
    TaskArrowJudgeProps[]
  >([]);
  const [selectedResultDeadlineDate, setSelectedResultDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedResultStartDate, setSelectedResultStartDate] = useState<
    Date | undefined
  >(undefined);
  const [numberOfResultDays, setNumberOfResultDays] = useState<
    number | string | undefined
  >("");
  const [attachedFileList, setAttachedFileList] = useState<AttachedFileProps[]>(
    []
  );
  const [postLoading, setPostLoading] = useState(false);
  const [onFilter, setOnFiler] = useState(false);

  const fetchAttachedFilesData = async (myTasks: any[]) => {
    if (myTasks && myTasks.length > 0) {
      const taskIdList = myTasks.map((myTask) => myTask.id);
      const attachedFileData = await fetchAttachedFiles(1, taskIdList);
      setAttachedFileList(attachedFileData);
    }
  };

  const getTaskGenreDataArray = async (taskData: any[]) => {
    setTaskGenreList(await getTaskGenreData(taskData.map((task) => task.id)));
  };

  useEffect(() => {
    setStatusList(statuses);

    if (myTasks.length > 0) {
      const taskData = onFilter
        ? myTasks.filter(
            (task) => task.status_id !== 3 && !task.small_projects.isFinished
          )
        : myTasks.filter((task) => !task.small_projects.isFinished);

      const myTaskStatuses = taskData.map((task) => {
        return {
          value: task.status_id,
          label: task.task_status.status,
        };
      });
      setSelectedStatuses(myTaskStatuses);

      getTaskGenreDataArray(taskData);
      setMyTaskList(taskData);

      if (taskArrowJudgeData.some((task) => task.arrowJudge)) {
        const detailsOpenTaskIdList = taskArrowJudgeData
          .filter((taskArrowJudge) => taskArrowJudge.arrowJudge)
          .map((taskArrowJudge) => taskArrowJudge.taskId);

        setTaskArrowJudgeData(
          taskData.map((task) => ({
            taskId: task.id,
            arrowJudge: detailsOpenTaskIdList.includes(task.id) ? true : false,
          }))
        );
      } else {
        setTaskArrowJudgeData(
          taskData.map((task) => ({
            taskId: task.id,
            arrowJudge: false,
          }))
        );
      }
      fetchAttachedFilesData(taskData);
    } else {
      setMyTaskList([]);
      setTaskGenreList([]);
      setTaskArrowJudgeData([]);
      setAttachedFileList([]);
    }
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
        message: "Couldn't update Status.",
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

  const handleFilter = () => {
    if (!onFilter) {
      const notCompletedMyTasks = myTasks.filter(
        (task) => task.status_id !== 3 && !task.small_projects.isFinished
      );

      const myTaskStatuses = notCompletedMyTasks.map((myTask) => {
        return {
          value: myTask.status_id,
          label: myTask.task_status.status,
        };
      });
      setSelectedStatuses(myTaskStatuses);

      setMyTaskList(notCompletedMyTasks);
      getTaskGenreDataArray(notCompletedMyTasks);
      fetchAttachedFilesData(notCompletedMyTasks);
      setTaskArrowJudgeData(
        notCompletedMyTasks.map((task) => ({
          taskId: task.id,
          arrowJudge: false,
        }))
      );
    } else {
      setPageUpdated(true);
    }
    setOnFiler(!onFilter);
  };

  const toggleArrow = (taskId: number) => {
    setTaskArrowJudgeData((prevTaskArrowJudgeData) =>
      prevTaskArrowJudgeData.map((taskArrowJudgeData) => {
        if (taskArrowJudgeData.taskId === taskId) {
          return {
            taskId: taskArrowJudgeData.taskId,
            arrowJudge: !taskArrowJudgeData.arrowJudge,
          };
        } else {
          return taskArrowJudgeData;
        }
      })
    );
  };

  const handleResetResult = async (
    e: { preventDefault: () => void },
    taskId: number
  ) => {
    e.preventDefault();

    try {
      const { error: taskResultUpdateError } = await clientSupabase
        .from("tasks")
        .update({
          result_start_date: null,
          result_deadline_date: null,
          number_of_result_days: null,
        })
        .eq("id", taskId);

      if (taskResultUpdateError) {
        throw taskResultUpdateError;
      }

      setPageUpdated(true);
    } catch (error) {
      console.error("Error Update Task Result Data", error);
      setNotificationValue({
        message: "Couldn't update Task Result Data.",
        color: 1,
      });
      setPageUpdated(true);
    }
  };

  const handleSubmit = async (
    e: { preventDefault: () => void },
    taskId: number
  ) => {
    e.preventDefault();

    if (postLoading) return;
    setPostLoading(true);

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

      setPostLoading(false);
      setPageUpdated(true);
    } catch (error) {
      console.error("Error Add Task Result ", error);
      setNotificationValue({
        message: "Couldn't add Task Result Data.",
        color: 1,
      });
      setPostLoading(false);
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
              <div className={styles[`filter-button-container`]}>
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    {
                      [styles[`on-filter`]]: onFilter,
                      [styles[`off-filter`]]: !onFilter,
                    },
                    styles.tooltip
                  )}
                  onClick={handleFilter}
                >
                  {" "}
                  filter_alt{" "}
                  <span className={styles[`tooltip-text`]}>
                    未完了のタスクに絞り込みます。
                  </span>
                </span>
              </div>
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-actions`]}>
              <div className={styles[`add-button-container`]}>
                <AddButton target={1} userId={userId} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {myTaskList.length > 0 ? (
            myTaskList?.map((myTask, index) => {
              const attachedFileMatchedTaskId = attachedFileList.find(
                (attachedFile) => attachedFile.id === myTask.id
              );

              const taskGenreData = taskGenreList.find(
                (taskGenre) => taskGenre.taskId === myTask.id
              );

              const taskGenreProductionCostTotalValue = taskGenreData
                ? (taskGenreData.numberOfDays ?? 0) *
                  (taskGenreData.numberOfPersons ?? 0)
                : 0;
              const taskArrowJudge = taskArrowJudgeData.find(
                (taskArrowJudge) => taskArrowJudge.taskId === myTask.id
              )!.arrowJudge;

              return (
                <React.Fragment key={myTask.id}>
                  <tr
                    className={
                      myTask.id == newItem.id && newItem.target == 1
                        ? styles.blink
                        : ""
                    }
                  >
                    <td className={styles[`col-task-name`]}>
                      <div className={styles[`task-name-container`]}>
                        <div className={styles[`arrow-container`]}>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.arrow
                            )}
                            onClick={() => toggleArrow(myTask.id)}
                          >
                            {taskArrowJudge ? "arrow_drop_down" : "arrow_right"}{" "}
                          </span>
                        </div>
                        <p className={styles[`task-name`]}>
                          {myTask.task_name}
                        </p>
                      </div>
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
                    <td
                      className={`${styles[`col-deadline`]} ${
                        isDeadlineNear(myTask.deadline_date, myTask.status_id)
                          ? styles["near-deadline"]
                          : ""
                      }`}
                    >
                      <div className={styles[`deadline-date-container`]}>
                        <span
                          className={
                            isDeadlineNear(
                              myTask.deadline_date,
                              myTask.status_id
                            )
                              ? styles[`alarm-icon`]
                              : styles[`calendar-icon`]
                          }
                        ></span>
                        {formatDate(myTask.deadline_date)}
                      </div>
                    </td>
                    <td className={styles[`col-assigned-person`]}>
                      <div className={styles[`assigned-person-container`]}>
                        <span className={styles[`person-icon`]}></span>
                        {myTask.users.name}
                      </div>
                    </td>
                    <td className={styles[`col-actions`]}>
                      <div className={styles[`icon-area`]}>
                        <div>
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
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr
                    className={
                      taskArrowJudge
                        ? styles[`details-open`]
                        : styles[`details-hidden`]
                    }
                  >
                    <td colSpan={5}>
                      <Image
                        src="/img/background-image2.jpeg"
                        alt="background-image2"
                        className={styles[`background-image2`]}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={true}
                      />
                      <div className={styles[`scrollable-content`]}>
                        <dl>
                          <div
                            className={styles[`scrollable-content-container`]}
                          >
                            <div className={styles[`flex-area`]}>
                              <div className={styles.flex}>
                                <dt>Project Name</dt>
                                <dd className={styles[`project-name`]}>
                                  <div
                                    className={styles[`project-name-container`]}
                                  >
                                    <div className={styles[`project-element`]}>
                                      Project :
                                    </div>
                                    <div
                                      className={styles[`white-text-container`]}
                                    >
                                      <div className={styles[`white-text`]}>
                                        {
                                          myTask.small_projects.projects
                                            .project_name
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={
                                      styles[`small-project-name-container`]
                                    }
                                  >
                                    <div
                                      className={
                                        styles[`small-project-element`]
                                      }
                                    >
                                      Small Project :
                                    </div>
                                    <div
                                      className={styles[`white-text-container`]}
                                    >
                                      <div className={styles[`white-text`]}>
                                        {
                                          myTask.small_projects
                                            .small_project_name
                                        }
                                      </div>
                                    </div>
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
                                  {taskGenreData &&
                                  taskGenreData.taskGenreId ? (
                                    <div className={styles[`task-genre-area`]}>
                                      <div
                                        className={styles[`task-genre-block`]}
                                      >
                                        <div
                                          className={styles[`task-genre-name`]}
                                        >
                                          {taskGenreData.taskGenreName}
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
                                                    taskGenreData.startDate
                                                  )}{" "}
                                                  ~
                                                  {formatDate(
                                                    taskGenreData.deadlineDate
                                                  )}
                                                </td>
                                              </tr>
                                              <tr>
                                                <td>Days</td>
                                                <td>
                                                  {(
                                                    taskGenreData.numberOfDays ??
                                                    0
                                                  ).toFixed(1)}
                                                </td>
                                              </tr>
                                              <tr>
                                                <td>Persons</td>
                                                <td>
                                                  {
                                                    taskGenreData.numberOfPersons
                                                  }
                                                </td>
                                              </tr>
                                              <tr>
                                                <td>Persons/Days</td>
                                                <td>
                                                  {(
                                                    (taskGenreData.numberOfDays ??
                                                      0) *
                                                    (taskGenreData.numberOfPersons ??
                                                      0)
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
                                    taskGenreData.assignedUserTaskResultData
                                      .length > 0 && (
                                      <div className={styles["result-area"]}>
                                        <div
                                          className={styles["user-result-area"]}
                                        >
                                          <div>
                                            {taskGenreData.assignedUserTaskResultData.map(
                                              (
                                                assignedUserTaskResult: {
                                                  userId: number;
                                                  userName: string;
                                                  taskId: number;
                                                  taskName: string;
                                                  numberOfResultDays: number;
                                                },
                                                index: number
                                              ) => (
                                                <div
                                                  className={
                                                    styles[
                                                      "assigned-user-list-container"
                                                    ]
                                                  }
                                                  key={index}
                                                >
                                                  <div
                                                    className={
                                                      styles[
                                                        "assigned-user-list"
                                                      ]
                                                    }
                                                  >
                                                    <div>
                                                      {
                                                        assignedUserTaskResult.userName
                                                      }
                                                    </div>
                                                    <div
                                                      className={
                                                        styles[
                                                          "result-task-name"
                                                        ]
                                                      }
                                                    >
                                                      {
                                                        assignedUserTaskResult.taskName
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
                                                  {userId ===
                                                    assignedUserTaskResult.userId && (
                                                    <div
                                                      className={
                                                        styles[
                                                          "cancel-icon-container"
                                                        ]
                                                      }
                                                    >
                                                      <span
                                                        className={classNames(
                                                          "material-symbols-outlined",
                                                          styles[`cancel-icon`]
                                                        )}
                                                        onClick={(e) =>
                                                          handleResetResult(
                                                            e,
                                                            assignedUserTaskResult.taskId
                                                          )
                                                        }
                                                      >
                                                        cancel
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>

                                        <div
                                          className={
                                            styles["sum-result-area-container"]
                                          }
                                        >
                                          <div
                                            className={
                                              styles["sum-result-area"]
                                            }
                                          >
                                            <div>Result</div>
                                            <div
                                              className={styles["sum-value"]}
                                            >
                                              <div
                                                className={
                                                  taskGenreData.assignedUserTaskResultData.reduce(
                                                    (
                                                      acc: number,
                                                      curr: {
                                                        userName: string;
                                                        numberOfResultDays: number;
                                                      }
                                                    ) =>
                                                      acc +
                                                      curr.numberOfResultDays,
                                                    0
                                                  ) <=
                                                    taskGenreProductionCostTotalValue ||
                                                  taskGenreProductionCostTotalValue ===
                                                    0
                                                    ? styles[`value-green`]
                                                    : styles[`value-red`]
                                                }
                                              >
                                                {taskGenreData.assignedUserTaskResultData
                                                  .reduce(
                                                    (
                                                      acc: number,
                                                      curr: {
                                                        userName: string;
                                                        numberOfResultDays: number;
                                                      }
                                                    ) =>
                                                      acc +
                                                      curr.numberOfResultDays,
                                                    0
                                                  )
                                                  .toFixed(1)}
                                              </div>
                                              <div>
                                                {" / "}
                                                {(
                                                  (taskGenreData.numberOfDays ??
                                                    0) *
                                                  (taskGenreData.numberOfPersons ??
                                                    0)
                                                ).toFixed(1)}
                                              </div>
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
                                      <div
                                        className={styles[`button-container`]}
                                      >
                                        <button
                                          className={styles.confirm}
                                          type="submit"
                                        >
                                          {postLoading ? (
                                            <div
                                              className={
                                                styles[`button-spinner`]
                                              }
                                            ></div>
                                          ) : (
                                            "confirm"
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
                            {attachedFileMatchedTaskId &&
                            attachedFileMatchedTaskId.fileDataArray.length > 0
                              ? attachedFileMatchedTaskId.fileDataArray.map(
                                  (fileData, index) => (
                                    <div
                                      className={
                                        styles["display-attachedFile-container"]
                                      }
                                      key={index}
                                    >
                                      <div className={styles["file-info"]}>
                                        <a
                                          href={fileData.url || "#"}
                                          download={fileData.file.name}
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
                                      <p>{fileData.file.name}</p>
                                    </div>
                                  )
                                )
                              : "No Attached File"}
                          </dd>

                          <Comment userId={userId} taskId={myTask.id} />
                        </dl>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })
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
