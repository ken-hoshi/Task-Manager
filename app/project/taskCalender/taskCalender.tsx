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
  startDay: Date | null;
  deadlineDay: Date | null;
}

interface TaskCalenderProps {
  userId: number;
  tasks: any[];
  isChecked: boolean;
}

const TaskCalender: React.FC<TaskCalenderProps> = ({
  userId,
  tasks,
  isChecked,
}) => {
  const [taskData, setTaskData] = useState<any[]>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dates, setDates] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [tasksPeriodList, setTasksPeriodList] = useState<TasksPeriodList[]>([]);
  const [clickCount, setClickCount] = useState<number>(0);
  const [onEditTaskId, setOnEditTaskId] = useState<number | null>(null);
  const [updateStartDate, setUpdateStartDate] = useState<Date | null>(null);
  const [updateEndDate, setUpdateEndDate] = useState<Date | null>(null);

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();

  useEffect(() => {
    if (tasks.length > 0) {
      const taskList = isChecked
        ? tasks.filter((task) => task.assigned_user_id === userId)
        : tasks;
      setTaskData(taskList);

      const tasksPeriod = taskList.map((task) => {
        const startDay = new Date(task.start_date);
        startDay.setHours(0, 0, 0, 0);

        const deadlineDay = new Date(task.deadline_date);
        deadlineDay.setHours(0, 0, 0, 0);

        return {
          id: task.id,
          startDay: startDay,
          deadlineDay: deadlineDay,
        };
      });
      setTasksPeriodList(tasksPeriod);

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

  const cancelTaskPeriod = () => {
    setUpdateStartDate(null);
    setUpdateEndDate(null);
    setClickCount(0);
    setOnEditTaskId(null);
  };

  const handleDateClick = (date: Date, taskId: number) => {
    if (clickCount === 0) {
      setUpdateStartDate(date);
      setUpdateEndDate(null);
      setClickCount((prevCount) => prevCount + 1);
    } else if (
      (date == updateStartDate && !updateEndDate) ||
      updateStartDate == updateEndDate
    ) {
      setUpdateStartDate(null);
      setUpdateEndDate(null);
      setClickCount(0);
    } else {
      setUpdateEndDate(date);
      setClickCount((prevCount) => prevCount + 1);
    }
  };

  const updateTaskPeriod = async (taskId: number) => {
    try {
      if (updateStartDate) {
        const { error: taskUpdateError } = await clientSupabase
          .from("tasks")
          .update({
            start_date: new Date(
              updateStartDate.setDate(updateStartDate.getDate() + 1)
            ),
            deadline_date:
              updateStartDate && updateEndDate
                ? new Date(updateEndDate.setDate(updateEndDate.getDate() + 1))
                : updateStartDate,
          })
          .eq("id", taskId);

        if (taskUpdateError) {
          throw taskUpdateError;
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
      } else {
        return;
      }

      setPageUpdated(true);
      setClickCount(0);
      setUpdateStartDate(null);
      setUpdateEndDate(null);
      setOnEditTaskId(null);

      setNotificationValue({
        message: "Task was updated.",
        color: 0,
      });
    } catch (error) {
      console.error("Error update task :", error);

      setPageUpdated(true);
      setClickCount(0);
      setUpdateStartDate(null);
      setUpdateEndDate(null);
      setOnEditTaskId(null);

      setNotificationValue({
        message: "Task was not updated.",
        color: 1,
      });
    }
  };

  const getCellClassName = (date: Date) => {
    if (updateStartDate && updateEndDate) {
      return date >= updateStartDate && date <= updateEndDate
        ? styles.editHighlight
        : "";
    } else if (updateStartDate) {
      return date.getTime() === updateStartDate.getTime()
        ? styles.editHighlight
        : "";
    }
    return "";
  };

  return (
    <>
      {taskData && taskData.length > 0 ? (
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
          <div className={styles[`calender-container`]}>
            <table className={styles.calendarTable}>
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
                    const today = currentMonth;
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
                {taskData.map((task, index) => (
                  <tr key={index}>
                    <td className={styles[`task-name`]}>
                      <div className={styles[`task-name-area`]}>
                        <p>{task.task_name}</p>
                        <div className={styles[`button-area`]}>
                          {task.id == onEditTaskId ? (
                            <div className={styles[`button-container`]}>
                              <button
                                className={styles[`check-button`]}
                                onClick={() => updateTaskPeriod(task.id)}
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
                                onClick={() => cancelTaskPeriod()}
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
                          ) : (
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
                    </td>
                    {dates.map((date, index) => {
                      const taskPeriod = tasksPeriodList.find(
                        (tasksPeriod) => tasksPeriod.id === task.id
                      );
                      if (task.id == onEditTaskId) {
                        return (
                          <td
                            key={index}
                            onClick={() => handleDateClick(date, task.id)}
                            className={getCellClassName(date)}
                          />
                        );
                      } else {
                        return (
                          <td
                            key={index}
                            className={
                              taskPeriod &&
                              taskPeriod.startDay &&
                              taskPeriod.deadlineDay &&
                              date >= taskPeriod.startDay &&
                              date <= taskPeriod.deadlineDay
                                ? styles.highlight
                                : ""
                            }
                          />
                        );
                      }
                    })}
                  </tr>
                ))}
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
