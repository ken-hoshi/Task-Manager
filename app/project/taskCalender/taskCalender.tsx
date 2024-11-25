import React, { useEffect, useState } from "react";
import styles from "./taskCalender.module.css";
import classNames from "classnames";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { clientSupabase } from "@/app/lib/supabase/client";
import holidayJp from "holiday-jp";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

interface TasksPeriodList {
  id: number;
  startDate: Date | null;
  deadlineDate: Date | null;
}

interface TaskCalenderProps {
  userId: number;
  tasks: any[];
  projectTaskGenreList: any[];
  isChecked: boolean;
}

enum Target {
  task,
  taskResult,
  taskGenre,
}

const TaskCalender: React.FC<TaskCalenderProps> = ({
  userId,
  tasks,
  projectTaskGenreList,
  isChecked,
}) => {
  const [taskData, setTaskData] = useState<any[]>();
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

  const [taskGenreData, setTaskGenreData] = useState<any[]>();
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

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();

  useEffect(() => {
    if (tasks.length > 0) {
      const taskList = isChecked
        ? tasks.filter((task) => task.assigned_user_id === userId)
        : tasks;
      const sortedTaskList = [...taskList].sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateA - dateB;
      });

      setTaskData(sortedTaskList);

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
            id: item.id,
            startDate: startDate,
            deadlineDate: deadlineDate,
          };
        });
      };

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
      }

      if (projectTaskGenreList.length > 0) {
        setTaskGenreData(projectTaskGenreList);

        const tasksGenrePeriod = formatTaskPeriod(
          projectTaskGenreList,
          "startDate",
          "deadlineDate"
        );
        setTasksGenrePeriodList(tasksGenrePeriod);
      }
    }

    if (
      (tasks && tasks.length > 0) ||
      (projectTaskGenreList && projectTaskGenreList.length > 0)
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
  }, [pageUpdated, currentMonth, isChecked]);

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
        message: "Task was not updated.",
        color: 1,
      });
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

  return (
    <>
      {(taskData && taskData.length > 0) ||
      (taskGenreData && taskGenreData.length > 0) ? (
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
                  <th className={styles[`task-name`]}>Task Name</th>
                  {dates.map((date, index) => {
                    const dayOfWeek = date.getDay();
                    const isSaturday = dayOfWeek === 6;
                    const isSunday = dayOfWeek === 0;
                    const isHoliday = holidays.some(
                      (holiday) =>
                        holiday.toDateString() === date.toDateString()
                    );
                    const isToday =
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();
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
                {taskGenreData?.map((taskGenre, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className={styles[`task-genre-name`]}>
                        <div className={styles[`task-genre-name-area`]}>
                          <p>{taskGenre.taskGenreName}</p>
                          <div className={styles[`button-area`]}>
                            {taskGenre.id !== onEditTaskGenreId && (
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.edit
                                )}
                                onClick={() =>
                                  setOnEditTaskGenreId(taskGenre.id)
                                }
                              >
                                edit
                              </span>
                            )}
                          </div>
                        </div>
                        {taskGenre.id == onEditTaskGenreId && (
                          <div className={styles[`button-container`]}>
                            <button
                              className={styles[`check-button`]}
                              onClick={() => updateTaskPeriod(taskGenre.id, 2)}
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
                          (tasksPeriod) => tasksPeriod.id === taskGenre.id
                        );
                        if (taskGenre.id == onEditTaskGenreId) {
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
                                  : ""
                              }
                            />
                          );
                        }
                      })}
                    </tr>
                    {taskData
                      ?.filter((task) => task.task_genre_id === taskGenre.id)
                      .map((task, index) => (
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
                                <div className={styles[`button-area`]}>
                                  {task.id !== onEditTaskId && (
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.edit
                                      )}
                                      onClick={() => setOnEditTaskId(task.id)}
                                    >
                                      edit
                                    </span>
                                  )}
                                </div>
                              </div>
                              {task.id == onEditTaskId && (
                                <div className={styles[`button-container`]}>
                                  <button
                                    className={styles[`check-button`]}
                                    onClick={() => updateTaskPeriod(task.id, 0)}
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
                                <div className={styles[`button-area`]}>
                                  {task.id !== onEditResultTaskId && (
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.edit
                                      )}
                                      onClick={() =>
                                        setOnEditResultTaskId(task.id)
                                      }
                                    >
                                      edit
                                    </span>
                                  )}
                                </div>
                              </div>
                              {task.id == onEditResultTaskId && (
                                <div className={styles[`button-container`]}>
                                  <button
                                    className={styles[`check-button`]}
                                    onClick={() => updateTaskPeriod(task.id, 1)}
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
                                        : ""
                                    }
                                  />
                                );
                              }
                            })}
                          </tr>
                        </React.Fragment>
                      ))}
                  </React.Fragment>
                ))}

                {taskData &&
                  taskData?.filter((task) => !task.task_genre_id).length >
                    0 && (
                    <>
                      <tr>
                        <td className={styles[`task-genre-name`]}>
                          <div className={styles[`task-genre-name-area`]}>
                            <p>Other</p>
                          </div>
                        </td>
                        {dates.map((_, index) => (
                          <td key={index} />
                        ))}
                      </tr>

                      {taskData
                        ?.filter((task) => !task.task_genre_id)
                        .map((task, index) => (
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
                                  <div className={styles[`button-area`]}>
                                    {task.id !== onEditTaskId && (
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.edit
                                        )}
                                        onClick={() => setOnEditTaskId(task.id)}
                                      >
                                        edit
                                      </span>
                                    )}
                                  </div>
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
                                  <div className={styles[`button-area`]}>
                                    {task.id !== onEditResultTaskId && (
                                      <span
                                        className={classNames(
                                          "material-symbols-outlined",
                                          styles.edit
                                        )}
                                        onClick={() =>
                                          setOnEditResultTaskId(task.id)
                                        }
                                      >
                                        edit
                                      </span>
                                    )}
                                  </div>
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
                                          : ""
                                      }
                                    />
                                  );
                                }
                              })}
                            </tr>
                          </React.Fragment>
                        ))}
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
