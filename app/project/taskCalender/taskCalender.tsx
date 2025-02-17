import React, { useEffect, useState } from "react";
import styles from "./taskCalender.module.css";
import classNames from "classnames";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { clientSupabase } from "@/app/lib/supabase/client";
import holidayJp from "holiday-jp";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useRouter } from "next/navigation";
import { formatDate } from "@/app/lib/formatDateTime";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import { selectBoxStyles } from "./selectBoxStyles";
import Select, { SingleValue } from "react-select";
import TaskPopup from "@/app/component/taskPopup/taskPopup";

interface TasksPeriodList {
  id: number;
  startDate: Date | null;
  deadlineDate: Date | null;
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: any[];
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

interface Option {
  value: number;
  label: string;
}

interface StatusOption {
  taskId: number;
  option: Option;
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
  const [useDisplaySmallProjectId, setUseDisplaySmallProjectId] = useState(0);
  const [smallProjectTask, setSmallProjectTask] = useState<any[]>([]);
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
  const [clickCount, setClickCount] = useState<number>(0);
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
  const [selectedStatuses, setSelectedStatuses] = useState<StatusOption[]>([]);
  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [taskGenreIdUseTaskPopup, setTaskGenreIdUseTaskPopup] = useState<
    null | number
  >(null);

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
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

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (smallProjectTaskGenre) =>
        smallProjectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    if (!smallProjectTask || !smallProjectTaskGenreListData) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "Couldn't get Project Data.",
        color: 1,
      });
      router.push("/task");
    }

    const formatTaskPeriod = (
      list: any[],
      startField: string,
      deadlineField: string
    ) => {
      return list.map((item) => {
        const startDate = new Date(item[startField]);
        startDate.setHours(0, 0, 0, 0);

        const deadlineDate = new Date(item[deadlineField]);
        deadlineDate.setHours(0, 0, 0, 0);

        return {
          id: item.id ?? item.taskGenreId,
          startDate: startDate,
          deadlineDate: deadlineDate,
        };
      });
    };

    if (smallProjectTask!.taskDataArray.length > 0) {
      setStatusList(statusData);

      const taskList = filterMyTasks
        ? smallProjectTask!.taskDataArray.filter(
            (task) => task.assigned_user_id === userId
          )
        : smallProjectTask!.taskDataArray;
      const sortedTaskList = [...taskList].sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateA - dateB;
      });
      setSmallProjectTask(sortedTaskList);

      if (taskList.length > 0) {
        const tasksPeriod = formatTaskPeriod(
          taskList,
          "start_date",
          "deadline_date"
        );
        setTasksPeriodList(tasksPeriod);

        const tasksResultPeriod = formatTaskPeriod(
          taskList,
          "result_start_date",
          "result_deadline_date"
        );
        setTasksResultPeriodList(tasksResultPeriod);

        const taskStatuses = taskList.map((task) => {
          return {
            taskId: task.id,
            option: {
              value: task.status_id,
              label: task.task_status.status,
            },
          };
        });
        setSelectedStatuses(taskStatuses);
      }
    } else {
      setSmallProjectTask([]);
      setTasksPeriodList([]);
      setTasksResultPeriodList([]);
      setSelectedStatuses([]);
    }

    if (smallProjectTaskGenreListData!.taskGenreDataArray.length > 0) {
      setSmallProjectTaskGenre(
        smallProjectTaskGenreListData!.taskGenreDataArray
      );

      const tasksGenrePeriod = formatTaskPeriod(
        smallProjectTaskGenreListData!.taskGenreDataArray,
        "startDate",
        "deadlineDate"
      );
      setTasksGenrePeriodList(tasksGenrePeriod);
    } else {
      setSmallProjectTaskGenre([]);
      setTasksGenrePeriodList([]);
    }

    if (
      (smallProjectTask!.taskDataArray &&
        smallProjectTask!.taskDataArray.length > 0) ||
      (smallProjectTaskGenreListData!.taskGenreDataArray &&
        smallProjectTaskGenreListData!.taskGenreDataArray.length > 0)
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
        setClickCount(0);
        setOnEditTaskId(null);
        break;

      case Target.taskResult:
        setUpdateTaskResultStartDate(null);
        setUpdateTaskResultEndDate(null);
        setClickCount(0);
        setOnEditResultTaskId(null);
        break;

      case Target.taskGenre:
        setUpdateTaskGenreStartDate(null);
        setUpdateTaskGenreEndDate(null);
        setClickCount(0);
        setOnEditTaskGenreId(null);
        break;
    }
  };

  const handleTaskDateClick = (date: Date) => {
    if (clickCount === 0) {
      setUpdateTaskStartDate(date);
      setUpdateTaskEndDate(null);
      setClickCount((prevCount) => prevCount + 1);
    } else if (
      (date == updateTaskStartDate && !updateTaskEndDate) ||
      updateTaskStartDate == updateTaskEndDate
    ) {
      setUpdateTaskStartDate(null);
      setUpdateTaskEndDate(null);
      setClickCount(0);
    } else {
      setUpdateTaskEndDate(date);
      setClickCount((prevCount) => prevCount + 1);
    }
  };

  const handleTaskResultDateClick = (date: Date) => {
    if (clickCount === 0) {
      setUpdateTaskResultStartDate(date);
      setUpdateTaskResultEndDate(null);
      setClickCount((prevCount) => prevCount + 1);
    } else if (
      (date == updateTaskResultStartDate && !updateTaskResultEndDate) ||
      updateTaskResultStartDate == updateTaskResultEndDate
    ) {
      setUpdateTaskResultStartDate(null);
      setUpdateTaskResultEndDate(null);
      setClickCount(0);
    } else {
      setUpdateTaskResultEndDate(date);
      setClickCount((prevCount) => prevCount + 1);
    }
  };

  const handleTaskGenreDateClick = (date: Date) => {
    if (clickCount === 0) {
      setUpdateTaskGenreStartDate(date);
      setUpdateTaskGenreEndDate(null);
      setClickCount((prevCount) => prevCount + 1);
    } else if (
      (date == updateTaskGenreStartDate && !updateTaskGenreEndDate) ||
      updateTaskGenreStartDate == updateTaskGenreEndDate
    ) {
      setUpdateTaskGenreStartDate(null);
      setUpdateTaskGenreEndDate(null);
      setClickCount(0);
    } else {
      setUpdateTaskGenreEndDate(date);
      setClickCount((prevCount) => prevCount + 1);
    }
  };

  const getStatusOptions = (selectedStatusId: number): Option[] => {
    return statusList
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
    } catch (error) {
      console.error("Error Update Status ", error);
      setNotificationValue({
        message: "Couldn't update Status.",
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
      setClickCount(0);
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
        message: "Task was updated.",
        color: 0,
      });
    } catch (error) {
      console.error("Error Update Task ", error);

      setPageUpdated(true);
      setClickCount(0);
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
        message: "Couldn't update Task Data.",
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

  const getCellClassName = (date: Date, target: Target) => {
    let startDate, endDate;
    const highlightClass = styles[`edit-highlight`];

    switch (target) {
      case Target.task:
        startDate = updateTaskStartDate;
        endDate = updateTaskEndDate;
        break;
      case Target.taskResult:
        startDate = updateTaskResultStartDate;
        endDate = updateTaskResultEndDate;
        break;
      case Target.taskGenre:
        startDate = updateTaskGenreStartDate;
        endDate = updateTaskGenreEndDate;
        break;
    }

    if (startDate && endDate) {
      return date >= startDate && date <= endDate ? highlightClass : "";
    } else if (startDate) {
      return date.getTime() === startDate.getTime() ? highlightClass : "";
    }

    return "";
  };

  const getDateAttributes = (date: Date, today: Date, holidays: Date[]) => {
    const dayOfWeek = date.getDay();
    return {
      isSaturday: dayOfWeek === 6,
      isSunday: dayOfWeek === 0,
      isHoliday: holidays.some(
        (holiday) => holiday.toDateString() === date.toDateString()
      ),
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
    };
  };

  const isSameDateAsToday = (date: Date): boolean => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <>
      {taskGenreIdUseTaskPopup && (
        <TaskPopup
          onClose={toggleTaskPopup}
          userId={userId}
          projectId={projectId}
          smallProjectId={displaySmallProjectId}
          taskId={null}
          taskGenreId={taskGenreIdUseTaskPopup}
        />
      )}
      {(smallProjectTask && smallProjectTask.length > 0) ||
      (smallProjectTaskGenre && smallProjectTaskGenre.length > 0) ? (
        <div className={styles[`calender-area`]}>
          <div className={styles.navigation}>
            <button onClick={goToPreviousMonth}>
              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.arrow
                )}
              >
                arrow_back
              </span>
            </button>
            <span>
              {currentMonth.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button onClick={goToNextMonth}>
              {" "}
              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.arrow
                )}
              >
                arrow_forward
              </span>
            </button>
          </div>

          <div className={styles[`description-area`]}>
            <div className={styles[`task-genre-description-area`]}>
              <div className={styles.square}></div>
              <div>Task Genre Period</div>
            </div>

            <div className={styles[`task-description-area`]}>
              <div className={styles.square}></div>
              <div>Estimated Task Period</div>
            </div>

            <div className={styles[`task-result-description-area`]}>
              <div className={styles.square}></div>
              <div>Task Result Period</div>
            </div>
          </div>

          <div className={styles[`calender-container`]}>
            <table className={styles[`calender-table`]}>
              <thead>
                <tr>
                  <th
                    className={classNames(
                      styles[`task-name`],
                      styles[`sticky-col`]
                    )}
                  >
                    Task Name
                  </th>
                  <th className={styles[`task-start-date`]}>Start</th>
                  <th className={styles[`task-deadline-date`]}>Deadline</th>
                  <th className={styles[`task-person-days`]}>
                    Persons
                    <br />
                    /Days
                  </th>
                  <th className={styles[`task-period-edit`]}></th>
                  {dates.map((date, index) => {
                    const { isSaturday, isSunday, isHoliday, isToday } =
                      getDateAttributes(date, today, holidays);
                    return (
                      <th
                        key={index}
                        className={classNames({
                          [styles.saturday]: isSaturday,
                          [styles.sunday]: isSunday || isHoliday,
                          [styles.today]: isToday,
                        })}
                      >
                        {date.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {smallProjectTaskGenre?.map((taskGenre, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className={styles[`task-genre-name`]}>
                        <div className={styles[`task-genre-name-area`]}>
                          <p>{taskGenre.taskGenreName}</p>
                          <div className={styles[`button-area`]}>
                            <div className={styles[`add-button-container`]}>
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.add
                                )}
                                onClick={() =>
                                  toggleTaskPopup(taskGenre.taskGenreId)
                                }
                              >
                                {" "}
                                add{" "}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={styles[`task-start-date`]}>
                        <div className={styles[`date-container`]}>
                          <span className={styles[`calendar-icon`]}></span>
                          {formatDate(taskGenre.startDate)}
                        </div>
                      </td>
                      <td className={styles[`task-deadline-date`]}>
                        <div className={styles[`date-container`]}>
                          <span className={styles[`calendar-icon`]}></span>
                          {formatDate(taskGenre.deadlineDate)}
                        </div>
                      </td>
                      <td className={styles[`task-person-days`]}>
                        {(taskGenre.numberOfPersons ?? 0).toFixed(1) +
                          " / " +
                          (taskGenre.numberOfDays ?? 0).toFixed(1)}
                      </td>
                      <td className={styles[`task-period-edit`]}>
                        {taskGenre.taskGenreId !== onEditTaskGenreId && (
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.edit
                            )}
                            onClick={() =>
                              toggleEditButton(taskGenre.taskGenreId, 2)
                            }
                          >
                            edit
                          </span>
                        )}
                        {taskGenre.taskGenreId == onEditTaskGenreId && (
                          <div className={styles[`button-container`]}>
                            <button
                              className={styles[`check-button`]}
                              onClick={() =>
                                updateTaskPeriod(taskGenre.taskGenreId, 2)
                              }
                            >
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.check
                                )}
                              >
                                check_small
                              </span>
                            </button>

                            <button
                              className={styles[`cancel-button`]}
                              onClick={() => cancelTaskPeriod(2)}
                            >
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.cancel
                                )}
                              >
                                close_small
                              </span>
                            </button>
                          </div>
                        )}
                      </td>

                      {dates.map((date, index) => {
                        const taskPeriod = tasksGenrePeriodList.find(
                          (tasksPeriod) =>
                            tasksPeriod.id === taskGenre.taskGenreId
                        );
                        if (taskGenre.taskGenreId == onEditTaskGenreId) {
                          return (
                            <td
                              key={index}
                              onClick={() => handleTaskGenreDateClick(date)}
                              className={getCellClassName(
                                date,
                                Target.taskGenre
                              )}
                            />
                          );
                        } else {
                          return (
                            <td
                              key={index}
                              className={
                                taskPeriod &&
                                taskPeriod.startDate &&
                                taskPeriod.deadlineDate &&
                                date >= taskPeriod.startDate &&
                                date <= taskPeriod.deadlineDate
                                  ? styles[`task-genre-highlight`]
                                  : isSameDateAsToday(date)
                                  ? styles.today
                                  : ""
                              }
                            />
                          );
                        }
                      })}
                    </tr>
                    {smallProjectTask
                      ?.filter(
                        (task) => task.task_genre_id === taskGenre.taskGenreId
                      )
                      .map((task, index) => {
                        const findSelectedStatus = selectedStatuses.find(
                          (status) => status.taskId === task.id
                        );
                        return (
                          <React.Fragment key={index}>
                            <tr>
                              <td
                                className={classNames(
                                  styles[`task-name`],
                                  index % 2 === 0
                                    ? styles[`odd-color`]
                                    : styles[`even-color`]
                                )}
                              >
                                <div className={styles[`task-name-area`]}>
                                  <p>{task.task_name}</p>
                                  <div className={styles[`right-area`]}>
                                    {findSelectedStatus && (
                                      <Select
                                        value={findSelectedStatus.option}
                                        options={getStatusOptions(
                                          task.status_id
                                        )}
                                        styles={{
                                          ...selectBoxStyles,
                                          control: (baseStyles, state) => ({
                                            ...selectBoxStyles.control(
                                              baseStyles,
                                              {
                                                selectProps: {
                                                  statusId: task.status_id,
                                                },
                                              }
                                            ),
                                          }),
                                        }}
                                        onChange={(selectedOption) =>
                                          handleStatusChange(
                                            task.id,
                                            selectedOption
                                          )
                                        }
                                        isSearchable={false}
                                      />
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className={styles[`task-start-date`]}>
                                <div className={styles[`date-container`]}>
                                  <span
                                    className={styles[`calendar-icon`]}
                                  ></span>
                                  {formatDate(task.start_date)}
                                </div>
                              </td>
                              <td
                                className={`${styles[`task-deadline-date`]} ${
                                  isDeadlineNear(
                                    task.deadline_date,
                                    task.status_id
                                  )
                                    ? styles["near-deadline"]
                                    : ""
                                }`}
                              >
                                <div className={styles[`date-container`]}>
                                  <span
                                    className={
                                      isDeadlineNear(
                                        task.deadline_date,
                                        task.status_id
                                      )
                                        ? styles[`alarm-icon`]
                                        : styles[`calendar-icon`]
                                    }
                                  ></span>
                                  {formatDate(task.deadline_date)}
                                </div>
                              </td>
                              <td className={styles[`task-person-days`]}>
                                {(1.0).toFixed(1) +
                                  " / " +
                                  task.number_of_days.toFixed(1)}
                              </td>
                              <td className={styles[`task-period-edit`]}>
                                {task.id !== onEditTaskId && (
                                  <div className={styles[`button-area`]}>
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.edit
                                      )}
                                      onClick={() =>
                                        toggleEditButton(task.id, 0)
                                      }
                                    >
                                      edit
                                    </span>
                                  </div>
                                )}
                                {task.id == onEditTaskId && (
                                  <div className={styles[`button-container`]}>
                                    <button
                                      className={styles[`check-button`]}
                                      onClick={() =>
                                        updateTaskPeriod(task.id, 0)
                                      }
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.check
                                        )}
                                      >
                                        check_small
                                      </span>
                                    </button>

                                    <button
                                      className={styles[`cancel-button`]}
                                      onClick={() => cancelTaskPeriod(0)}
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.cancel
                                        )}
                                      >
                                        close_small
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {dates.map((date, index) => {
                                const taskPeriod = tasksPeriodList.find(
                                  (tasksPeriod) => tasksPeriod.id === task.id
                                );
                                if (task.id == onEditTaskId) {
                                  return (
                                    <td
                                      key={index}
                                      onClick={() => handleTaskDateClick(date)}
                                      className={getCellClassName(
                                        date,
                                        Target.task
                                      )}
                                    />
                                  );
                                } else {
                                  return (
                                    <td
                                      key={index}
                                      className={
                                        taskPeriod &&
                                        taskPeriod.startDate &&
                                        taskPeriod.deadlineDate &&
                                        date >= taskPeriod.startDate &&
                                        date <= taskPeriod.deadlineDate
                                          ? styles[`task-highlight`]
                                          : isSameDateAsToday(date)
                                          ? styles.today
                                          : ""
                                      }
                                    />
                                  );
                                }
                              })}
                            </tr>

                            <tr>
                              <td
                                className={classNames(
                                  styles[`result-task-name`],
                                  index % 2 === 0
                                    ? styles[`odd-color`]
                                    : styles[`even-color`]
                                )}
                              >
                                <div className={styles[`result-area`]}>
                                  <p>{task.users.name}</p>
                                </div>
                              </td>
                              <td className={styles[`task-start-date`]}>
                                {task.result_start_date && (
                                  <div className={styles[`date-container`]}>
                                    <span
                                      className={styles[`calendar-icon`]}
                                    ></span>
                                    {formatDate(task.result_start_date)}
                                  </div>
                                )}
                              </td>
                              <td className={styles[`task-deadline-date`]}>
                                {task.result_deadline_date && (
                                  <div className={styles[`date-container`]}>
                                    <span
                                      className={styles[`calendar-icon`]}
                                    ></span>
                                    {formatDate(task.result_deadline_date)}
                                  </div>
                                )}
                              </td>

                              <td className={styles[`task-person-days`]}>
                                {task.number_of_result_days &&
                                  (1.0).toFixed(1) +
                                    " / " +
                                    task.number_of_result_days.toFixed(1)}
                              </td>
                              <td className={styles[`task-period-edit`]}>
                                <div className={styles[`button-area`]}>
                                  {task.id !== onEditResultTaskId && (
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.edit
                                      )}
                                      onClick={() =>
                                        toggleEditButton(task.id, 1)
                                      }
                                    >
                                      edit
                                    </span>
                                  )}
                                </div>
                                {task.id == onEditResultTaskId && (
                                  <div className={styles[`button-container`]}>
                                    <button
                                      className={styles[`check-button`]}
                                      onClick={() =>
                                        updateTaskPeriod(task.id, 1)
                                      }
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.check
                                        )}
                                      >
                                        check_small
                                      </span>
                                    </button>

                                    <button
                                      className={styles[`cancel-button`]}
                                      onClick={() => cancelTaskPeriod(1)}
                                    >
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.cancel
                                        )}
                                      >
                                        close_small
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {dates.map((date, index) => {
                                const taskResultPeriod =
                                  tasksResultPeriodList.find(
                                    (tasksResultPeriod) =>
                                      tasksResultPeriod.id === task.id
                                  );
                                if (task.id == onEditResultTaskId) {
                                  return (
                                    <td
                                      key={index}
                                      onClick={() =>
                                        handleTaskResultDateClick(date)
                                      }
                                      className={getCellClassName(
                                        date,
                                        Target.taskResult
                                      )}
                                    />
                                  );
                                } else {
                                  return (
                                    <td
                                      key={index}
                                      className={
                                        taskResultPeriod &&
                                        taskResultPeriod.startDate &&
                                        taskResultPeriod.deadlineDate &&
                                        date >= taskResultPeriod.startDate &&
                                        date <= taskResultPeriod.deadlineDate
                                          ? styles[`result-highlight`]
                                          : isSameDateAsToday(date)
                                          ? styles.today
                                          : ""
                                      }
                                    />
                                  );
                                }
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                ))}

                {smallProjectTask &&
                  smallProjectTask?.filter((task) => !task.task_genre_id)
                    .length > 0 && (
                    <>
                      <tr>
                        <td className={styles[`task-genre-name`]}>
                          <div className={styles[`task-genre-name-area`]}>
                            <p>No Task Genre</p>
                          </div>
                        </td>
                        <td className={styles[`task-start-date`]}></td>
                        <td className={styles[`task-deadline-date`]}></td>
                        <td className={styles[`task-person-days`]}></td>
                        <td className={styles[`task-period-edit`]}></td>
                        {dates.map((date, index) => (
                          <td
                            key={index}
                            className={
                              isSameDateAsToday(date) ? styles.today : ""
                            }
                          />
                        ))}
                      </tr>

                      {smallProjectTask
                        ?.filter((task) => !task.task_genre_id)
                        .map((task, index) => {
                          const findSelectedStatus = selectedStatuses.find(
                            (status) => status.taskId === task.id
                          );
                          return (
                            <React.Fragment key={index}>
                              <tr>
                                <td
                                  className={classNames(
                                    styles[`task-name`],
                                    index % 2 === 0
                                      ? styles[`odd-color`]
                                      : styles[`even-color`]
                                  )}
                                >
                                  <div className={styles[`task-name-area`]}>
                                    <p>{task.task_name}</p>
                                    <div className={styles[`right-area`]}>
                                      {findSelectedStatus && (
                                        <Select
                                          value={findSelectedStatus.option}
                                          options={getStatusOptions(
                                            task.status_id
                                          )}
                                          styles={{
                                            ...selectBoxStyles,
                                            control: (baseStyles, state) => ({
                                              ...selectBoxStyles.control(
                                                baseStyles,
                                                {
                                                  selectProps: {
                                                    statusId: task.status_id,
                                                  },
                                                }
                                              ),
                                            }),
                                          }}
                                          onChange={(selectedOption) =>
                                            handleStatusChange(
                                              task.id,
                                              selectedOption
                                            )
                                          }
                                          isSearchable={false}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className={styles[`task-start-date`]}>
                                  {task.start_date && (
                                    <div className={styles[`date-container`]}>
                                      <span
                                        className={styles[`calendar-icon`]}
                                      ></span>
                                      {formatDate(task.start_date)}
                                    </div>
                                  )}
                                </td>
                                <td className={styles[`task-deadline-date`]}>
                                  {task.deadline_date && (
                                    <div className={styles[`date-container`]}>
                                      <span
                                        className={styles[`calendar-icon`]}
                                      ></span>
                                      {formatDate(task.deadline_date)}
                                    </div>
                                  )}
                                </td>

                                <td className={styles[`task-person-days`]}>
                                  {task.number_of_days &&
                                    (1.0).toFixed(1) +
                                      " / " +
                                      task.number_of_days.toFixed(1)}
                                </td>
                                <td className={styles[`task-period-edit`]}>
                                  <div className={styles[`button-area`]}>
                                    {task.id !== onEditTaskId && (
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.edit
                                        )}
                                        onClick={() =>
                                          toggleEditButton(task.id, 0)
                                        }
                                      >
                                        edit
                                      </span>
                                    )}
                                  </div>
                                  {task.id == onEditTaskId && (
                                    <div className={styles[`button-container`]}>
                                      <button
                                        className={styles[`check-button`]}
                                        onClick={() =>
                                          updateTaskPeriod(task.id, 0)
                                        }
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.check
                                          )}
                                        >
                                          check_small
                                        </span>
                                      </button>

                                      <button
                                        className={styles[`cancel-button`]}
                                        onClick={() => cancelTaskPeriod(0)}
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.cancel
                                          )}
                                        >
                                          close_small
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                                {dates.map((date, index) => {
                                  const taskPeriod = tasksPeriodList.find(
                                    (tasksPeriod) => tasksPeriod.id === task.id
                                  );
                                  if (task.id == onEditTaskId) {
                                    return (
                                      <td
                                        key={index}
                                        onClick={() =>
                                          handleTaskDateClick(date)
                                        }
                                        className={getCellClassName(
                                          date,
                                          Target.task
                                        )}
                                      />
                                    );
                                  } else {
                                    return (
                                      <td
                                        key={index}
                                        className={
                                          taskPeriod &&
                                          taskPeriod.startDate &&
                                          taskPeriod.deadlineDate &&
                                          date >= taskPeriod.startDate &&
                                          date <= taskPeriod.deadlineDate
                                            ? styles[`task-highlight`]
                                            : isSameDateAsToday(date)
                                            ? styles.today
                                            : ""
                                        }
                                      />
                                    );
                                  }
                                })}
                              </tr>

                              <tr>
                                <td
                                  className={classNames(
                                    styles[`result-task-name`],
                                    index % 2 === 0
                                      ? styles[`odd-color`]
                                      : styles[`even-color`]
                                  )}
                                >
                                  <div className={styles[`result-area`]}>
                                    <p>{task.users.name}</p>
                                  </div>
                                </td>
                                <td className={styles[`task-start-date`]}>
                                  {task.result_start_date && (
                                    <div className={styles[`date-container`]}>
                                      <span
                                        className={styles[`calendar-icon`]}
                                      ></span>
                                      {formatDate(task.result_start_date)}
                                    </div>
                                  )}
                                </td>
                                <td className={styles[`task-deadline-date`]}>
                                  {task.result_deadline_date && (
                                    <div className={styles[`date-container`]}>
                                      <span
                                        className={styles[`calendar-icon`]}
                                      ></span>
                                      {formatDate(task.result_deadline_date)}
                                    </div>
                                  )}
                                </td>

                                <td className={styles[`task-person-days`]}>
                                  {task.number_of_result_days &&
                                    (1.0).toFixed(1) +
                                      " / " +
                                      task.number_of_result_days.toFixed(1)}
                                </td>
                                <td className={styles[`task-period-edit`]}>
                                  <div className={styles[`button-area`]}>
                                    {task.id !== onEditResultTaskId && (
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.edit
                                        )}
                                        onClick={() =>
                                          toggleEditButton(task.id, 1)
                                        }
                                      >
                                        edit
                                      </span>
                                    )}
                                  </div>
                                  {task.id == onEditResultTaskId && (
                                    <div className={styles[`button-container`]}>
                                      <button
                                        className={styles[`check-button`]}
                                        onClick={() =>
                                          updateTaskPeriod(task.id, 1)
                                        }
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.check
                                          )}
                                        >
                                          check_small
                                        </span>
                                      </button>

                                      <button
                                        className={styles[`cancel-button`]}
                                        onClick={() => cancelTaskPeriod(1)}
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.cancel
                                          )}
                                        >
                                          close_small
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {dates.map((date, index) => {
                                  const taskResultPeriod =
                                    tasksResultPeriodList.find(
                                      (tasksResultPeriod) =>
                                        tasksResultPeriod.id === task.id
                                    );
                                  if (task.id == onEditResultTaskId) {
                                    return (
                                      <td
                                        key={index}
                                        onClick={() =>
                                          handleTaskResultDateClick(date)
                                        }
                                        className={getCellClassName(
                                          date,
                                          Target.taskResult
                                        )}
                                      />
                                    );
                                  } else {
                                    return (
                                      <td
                                        key={index}
                                        className={
                                          taskResultPeriod &&
                                          taskResultPeriod.startDate &&
                                          taskResultPeriod.deadlineDate &&
                                          date >= taskResultPeriod.startDate &&
                                          date <= taskResultPeriod.deadlineDate
                                            ? styles[`result-highlight`]
                                            : isSameDateAsToday(date)
                                            ? styles.today
                                            : ""
                                        }
                                      />
                                    );
                                  }
                                })}
                              </tr>
                            </React.Fragment>
                          );
                        })}
                    </>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles[`non-tasks`]}>No Task</div>
      )}
    </>
  );
};

export default TaskCalender;
