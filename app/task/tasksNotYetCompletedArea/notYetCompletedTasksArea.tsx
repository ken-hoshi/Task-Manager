import classNames from "classnames";
import styles from "./notYetCompletedTasksArea.module.css";
import React, { useEffect, useState } from "react";
import { clientSupabase } from "../../lib/supabase/client";
import { useNotificationContext } from "../../provider/notificationProvider";
import { usePageUpdateContext } from "../../provider/pageUpdateProvider";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "../selectBoxStyles";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { formatDate } from "@/app/lib/formatDateTime";
import { fetchAttachedFiles } from "@/app/lib/api/fetchAttachedFiles";
import { getTaskGenreData } from "@/app/lib/api/getTaskGenreData";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import TaskDetails from "@/app/component/taskDetails/taskDetails";
import { useTaskResultForm } from "@/app/hooks/useTaskResultForm";

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

interface NotYetCompletedTasksAreaProps {
  notYetCompletedTasks: any[];
  userId: number;
  statuses: StatusProps[];
}

const NotYetCompletedTasksArea: React.FC<NotYetCompletedTasksAreaProps> = ({
  notYetCompletedTasks,
  userId,
  statuses,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated, pageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [notYetCompletedTaskList, setNotYetCompletedTaskList] = useState<any[]>(
    []
  );
  const [statusList, setStatusList] = useState<StatusProps[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
  const [taskGenreList, setTaskGenreList] = useState<any[]>([]);
  const [taskArrowJudgeData, setTaskArrowJudgeData] = useState<
    TaskArrowJudgeProps[]
  >([]);
  const [attachedFileList, setAttachedFileList] = useState<AttachedFileProps[]>(
    []
  );


  const resultForm = useTaskResultForm();

  const fetchAttachedFilesData = async () => {
    if (notYetCompletedTasks && notYetCompletedTasks.length > 0) {
      const taskIdList = notYetCompletedTasks.map(
        (notYetCompletedTask) => notYetCompletedTask.id
      );
      const attachedFileData = await fetchAttachedFiles(1, taskIdList);

      if (
        attachedFileData.some(
          (attachedFile) => attachedFile.fileDataArray.length > 0
        )
      ) {
        setAttachedFileList(attachedFileData);
      }
    }
  };

  const getTaskGenreDataArray = async (taskData: any[]) => {
    setTaskGenreList(await getTaskGenreData(taskData.map((task) => task.id)));
  };

  useEffect(() => {
    setStatusList(statuses);
    if (notYetCompletedTasks.length > 0) {
      const taskData = notYetCompletedTasks.filter(
        (task) => !task.small_projects.isFinished
      );
      setNotYetCompletedTaskList(taskData);

      const taskNearDeadlineStatuses = taskData.map((taskNotYetCompleted) => {
        return {
          value: taskNotYetCompleted.status_id,
          label: taskNotYetCompleted.task_status.status,
        };
      });
      setSelectedStatuses(taskNearDeadlineStatuses);

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

      getTaskGenreDataArray(taskData);
      fetchAttachedFilesData();
    } else {
      setNotYetCompletedTaskList([]);
      setSelectedStatuses([]);
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

      const postEmailNotificationsError = await postMailNotifications(
        displayWorkspaceId,
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
    } catch (error) {
      console.error("Update Status", error);
      setNotificationValue({
        message: "Couldn't update Status.",
        color: 1,
      });
    }
    setPageUpdated(true);
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
            <th className={styles[`col-assigned-person`]}>Assigned</th>
          </tr>
        </thead>
        <tbody>
          {notYetCompletedTaskList.length > 0 ? (
            notYetCompletedTaskList.map((notYetCompletedTask, index) => {
              const deadlineStatus = isDeadlineNear(
                notYetCompletedTask.deadline_date,
                notYetCompletedTask.status_id
              );

              const attachedFileMatchedTaskId = attachedFileList.find(
                (attachedFile) => attachedFile.id === notYetCompletedTask.id
              );

              const taskGenreData = taskGenreList.find(
                (taskGenre) => taskGenre.taskId === notYetCompletedTask.id
              );

              const taskArrowJudge = taskArrowJudgeData.find(
                (taskArrowJudge) =>
                  taskArrowJudge.taskId === notYetCompletedTask.id
              )?.arrowJudge;

              return (
                <React.Fragment key={notYetCompletedTask.id}>
                  <tr>
                    <td className={styles[`col-task-name`]}>
                      <div className={styles[`arrow-container`]}>
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.arrow
                          )}
                          onClick={() => toggleArrow(notYetCompletedTask.id)}
                        >
                          {taskArrowJudge ? "arrow_drop_down" : "arrow_right"}{" "}
                        </span>
                      </div>
                      <p className={styles[`task-name`]}>
                        {notYetCompletedTask.task_name}
                      </p>
                    </td>
                    <td className={styles[`col-status`]}>
                      <Select
                        value={selectedStatuses[index]}
                        options={getStatusOptions(
                          notYetCompletedTask.status_id
                        )}
                        styles={{
                          ...selectBoxStyles,
                          control: (baseStyles, state) => ({
                            ...selectBoxStyles.control(baseStyles, {
                              selectProps: {
                                statusId: notYetCompletedTask.status_id,
                              },
                            }),
                          }),
                        }}
                        onChange={(selectedOption) =>
                          handleStatusChange(
                            notYetCompletedTask.id,
                            index,
                            selectedOption
                          )
                        }
                        isSearchable={false}
                      />
                    </td>
                    <td
                      className={classNames(styles[`col-deadline`], {
                        [styles[`near-deadline`]]: deadlineStatus === 1,
                        [styles[`pass-deadline`]]: deadlineStatus === 2,
                      })}
                    >
                      <div className={styles[`deadline-date-container`]}>
                        <span
                          className={classNames({
                            [styles[`calendar-icon`]]: deadlineStatus === 0,
                            [styles[`alarm-yellow-icon`]]: deadlineStatus === 1,
                            [styles[`alarm-icon`]]: deadlineStatus === 2,
                          })}
                        ></span>
                        {formatDate(notYetCompletedTask.deadline_date)}
                      </div>
                    </td>
                    <td className={styles[`col-assigned-person`]}>
                      <div className={styles[`assigned-person-container`]}>
                        <span className={styles[`person-icon`]}></span>
                        {notYetCompletedTask.users.name}
                      </div>
                    </td>
                  </tr>
                  <TaskDetails
                    task={notYetCompletedTask}
                    taskGenre={taskGenreData}
                    attachedFiles={attachedFileMatchedTaskId?.fileDataArray}
                    userId={userId}
                    isOpen={!!taskArrowJudge}
                    colSpan={6}
                    resultForm={resultForm}
                    styles={styles}
                  />
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

export default NotYetCompletedTasksArea;
