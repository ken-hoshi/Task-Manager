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
import { useRouter } from "next/navigation";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";
import Image from "next/image";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import AttachedFileList from "@/app/component/taskDetails/attachedFileList";
import TaskGenreSummary from "@/app/component/taskDetails/taskGenreSummary";
import TaskResultList from "@/app/component/taskDetails/taskResultList";
import { useTaskResultForm } from "@/app/hooks/useTaskResultForm";
import { sortTasks, TaskSortKey } from "@/app/lib/sortTasks";

interface TaskGenreDataProps {
  taskGenreId: number;
  taskGenreName: string;
  numberOfPersons: number;
  startDate: string;
  deadlineDate: string;
  numberOfDays: number;
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: TaskGenreDataProps[];
}

interface TasksDividedByTaskGenreIdProps {
  taskGenreId: number | null;
  taskGenreName: string | null;
  taskDataArray: any[];
}

interface TaskArrowJudgeProps {
  taskId: any;
  arrowJudge: boolean;
}

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: any[];
}

interface TaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: { taskId: number; taskGenre: any }[];
}

interface AttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}

interface TaskAttachedFileProps {
  smallProjectId: number;
  fileDataList: AttachedFileProps[];
}

interface Option {
  value: number;
  label: string;
}

interface StatusProps {
  id: number;
  status: string;
}

enum Sort {
  taskName,
  status,
  startDate,
  deadlineDate,
  numberOfDays,
  assignedUser,
}

interface SortProps {
  taskGenreId: number | null;
  clickCount: number;
}

interface TaskListProps {
  userId: number;
  projectId: number;
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  taskData: TasksDividedBySmallProjectIdProps[];
  taskGenreData: TaskGenreProps[];
  smallProjectTaskGenreData: SmallProjectTaskGenreProps[];
  statusData: StatusProps[];
  taskAttachedFileData: TaskAttachedFileProps[];
  filterMyTasks: boolean;
}

const TaskList: React.FC<TaskListProps> = ({
  userId,
  projectId,
  smallProjectIdList,
  displaySmallProjectId,
  taskData,
  statusData,
  taskGenreData,
  smallProjectTaskGenreData,
  taskAttachedFileData,
  filterMyTasks,
}) => {
  const [useDisplaySmallProjectId, setUseDisplaySmallProjectId] = useState(0);
  const [tasksDividedByTaskGenreId, setTasksDividedByTaskGenreId] = useState<
    TasksDividedByTaskGenreIdProps[]
  >([]);
  const [taskGenreListData, setTaskGenreListData] = useState<
    { taskId: number; taskGenre: any }[]
  >([]);

  const [taskAttachedFileListData, setTaskAttachedFileListData] = useState<
    AttachedFileProps[]
  >([]);


  const [taskArrowJudgeData, setTaskArrowJudgeData] = useState<
    TaskArrowJudgeProps[]
  >([]);

  const [taskNameClickCount, setTaskNameClickCount] = useState<SortProps[]>([]);
  const [statusClickCount, setStatusClickCount] = useState<SortProps[]>([]);
  const [startDateClickCount, setStartDateClickCount] = useState<SortProps[]>(
    []
  );
  const [deadlineDateClickCount, setDeadlineDateClickCount] = useState<
    SortProps[]
  >([]);
  const [numberOfDaysClickCount, setNumberOfDaysClickCount] = useState<
    SortProps[]
  >([]);
  const [assignedUserClickCount, setAssignedUserClickCount] = useState<
    SortProps[]
  >([]);

  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();

  const router = useRouter();
  const resultForm = useTaskResultForm();

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

    const taskGenreListData = taskGenreData.find(
      (taskGenre) => taskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (smallProjectTaskGenre) =>
        smallProjectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const taskAttachedFileListData = taskAttachedFileData.find(
      (taskAttachedFile) =>
        taskAttachedFile.smallProjectId === changedDisplaySmallProjectId
    );

    if (
      !smallProjectTask ||
      !taskGenreListData ||
      !smallProjectTaskGenreListData ||
      !taskAttachedFileListData
    ) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "Couldn't get Project Data.",
        color: 1,
      });
      router.push("/task");
    }

    if (
      smallProjectTaskGenreListData!.taskGenreDataArray.length > 0 ||
      smallProjectTask!.taskDataArray.length > 0
    ) {
      const dividedTasks: TasksDividedByTaskGenreIdProps[] =
        smallProjectTaskGenreListData!.taskGenreDataArray.map(
          (taskGenreData) => ({
            taskGenreId: taskGenreData.taskGenreId,
            taskGenreName: taskGenreData.taskGenreName,
            taskDataArray: smallProjectTask!.taskDataArray.filter(
              (taskData) => taskData.task_genre_id === taskGenreData.taskGenreId
            ),
          })
        );

      const nullGenreTasks = smallProjectTask!.taskDataArray.filter(
        (taskData) => !taskData.task_genre_id
      );

      if (nullGenreTasks.length > 0) {
        dividedTasks.push({
          taskGenreId: null,
          taskGenreName: null,
          taskDataArray: nullGenreTasks,
        });
      }
      setTasksDividedByTaskGenreId(dividedTasks);

      const clickCountData = dividedTasks.map((dividedTask) => ({
        taskGenreId: dividedTask.taskGenreId,
        clickCount: 0,
      }));
      setTaskNameClickCount(clickCountData);
      setStatusClickCount(clickCountData);
      setStartDateClickCount(clickCountData);
      setDeadlineDateClickCount(clickCountData);
      setAssignedUserClickCount(clickCountData);
      setNumberOfDaysClickCount(clickCountData);

      if (taskArrowJudgeData.some((task) => task.arrowJudge)) {
        const detailsOpenTaskIdList = taskArrowJudgeData
          .filter((taskArrowJudge) => taskArrowJudge.arrowJudge)
          .map((taskArrowJudge) => taskArrowJudge.taskId);

        setTaskArrowJudgeData(
          smallProjectTask!.taskDataArray.map((task) => ({
            taskId: task.id,
            arrowJudge: detailsOpenTaskIdList.includes(task.id) ? true : false,
          }))
        );
      } else {
        setTaskArrowJudgeData(
          smallProjectTask!.taskDataArray.map((task) => ({
            taskId: task.id,
            arrowJudge: false,
          }))
        );
      }

      setTaskGenreListData(taskGenreListData!.taskGenreDataArray);
      setTaskAttachedFileListData(taskAttachedFileListData!.fileDataList);
    } else {
      setTasksDividedByTaskGenreId([]);
      setTaskArrowJudgeData([]);
      setTaskGenreListData([]);
      setTaskAttachedFileListData([]);
    }
  }, [filterMyTasks, pageUpdated, displaySmallProjectId]);

  const getStatusOptions = (selectedStatusId: number): Option[] => {
    return statusData
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

  const sort = (sortTarget: Sort, taskGenreId: number | null) => {
    const taskDataDividedByTaskGenreId = tasksDividedByTaskGenreId.find(
      (tasksDividedByTaskGenreIdData) =>
        tasksDividedByTaskGenreIdData.taskGenreId === taskGenreId
    );
    if (
      !taskDataDividedByTaskGenreId ||
      taskDataDividedByTaskGenreId!.taskDataArray.length === 0
    )
      return;

    const handleSort = (
      sortKey: TaskSortKey,
      clickCount: number,
      setClickCount: React.Dispatch<React.SetStateAction<SortProps[]>>
    ) => {
      if (clickCount === 2) {
        const smallProjectTask = taskData.find(
          (task) => task.smallProjectId === useDisplaySmallProjectId
        );

        const taskDataArrayDividedByTaskGenre =
          smallProjectTask!.taskDataArray.filter(
            (taskData) => taskData.task_genre_id === taskGenreId
          );
        setTasksDividedByTaskGenreId((prevTasksDividedByTaskGenreId) =>
          prevTasksDividedByTaskGenreId.map(
            (prevTasksDividedByTaskGenreIdData) =>
              prevTasksDividedByTaskGenreIdData.taskGenreId === taskGenreId
                ? {
                    taskGenreId: prevTasksDividedByTaskGenreIdData.taskGenreId,
                    taskGenreName:
                      prevTasksDividedByTaskGenreIdData.taskGenreName,
                    taskDataArray: taskDataArrayDividedByTaskGenre,
                  }
                : prevTasksDividedByTaskGenreIdData
          )
        );

        setTaskGenreListData(
          taskGenreData.find(
            (taskGenre) => taskGenre.smallProjectId === useDisplaySmallProjectId
          )!.taskGenreDataArray
        );
        setTaskAttachedFileListData(
          taskAttachedFileData.find(
            (taskAttachedFile) =>
              taskAttachedFile.smallProjectId === useDisplaySmallProjectId
          )!.fileDataList
        );
        setClickCount((clickCount) =>
          clickCount.map((countData) =>
            countData.taskGenreId === taskGenreId
              ? { taskGenreId: countData.taskGenreId, clickCount: 0 }
              : countData
          )
        );
      } else {
        const sortedTasks = sortTasks(
          taskDataDividedByTaskGenreId!.taskDataArray,
          sortKey,
          clickCount
        );

        setTasksDividedByTaskGenreId((prevTasksDividedByTaskGenreId) =>
          prevTasksDividedByTaskGenreId.map(
            (prevTasksDividedByTaskGenreIdData) =>
              prevTasksDividedByTaskGenreIdData.taskGenreId === taskGenreId
                ? {
                    taskGenreId: prevTasksDividedByTaskGenreIdData.taskGenreId,
                    taskGenreName:
                      prevTasksDividedByTaskGenreIdData.taskGenreName,
                    taskDataArray: sortedTasks,
                  }
                : prevTasksDividedByTaskGenreIdData
          )
        );
        setClickCount((clickCount) =>
          clickCount.map((countData) =>
            countData.taskGenreId === taskGenreId
              ? {
                  taskGenreId: countData.taskGenreId,
                  clickCount: countData.clickCount + 1,
                }
              : countData
          )
        );
      }
    };
    setTaskArrowJudgeData((prevTaskArrowJudgeData) =>
      prevTaskArrowJudgeData.map((taskArrowJudgeData) => ({
        taskId: taskArrowJudgeData.taskId,
        arrowJudge: false,
      }))
    );

    const resetClickCounts = (
      setClickCount: React.Dispatch<React.SetStateAction<SortProps[]>>[]
    ) => {
      setClickCount.forEach((setter) => {
        setter((prev) => prev.map((item) => ({ ...item, clickCount: 0 })));
      });
    };

    const findClickCount = (clickCountData: SortProps[]) =>
      clickCountData.find(
        (ClickCount) => ClickCount.taskGenreId === taskGenreId
      )!.clickCount;

    switch (sortTarget) {
      case Sort.taskName:
        resetClickCounts([
          setStatusClickCount,
          setStartDateClickCount,
          setDeadlineDateClickCount,
          setNumberOfDaysClickCount,
          setAssignedUserClickCount,
        ]);
        handleSort(
          "task_name",
          findClickCount(taskNameClickCount),
          setTaskNameClickCount
        );
        break;
      case Sort.status:
        resetClickCounts([
          setTaskNameClickCount,
          setStartDateClickCount,
          setDeadlineDateClickCount,
          setNumberOfDaysClickCount,
          setAssignedUserClickCount,
        ]);
        handleSort(
          "status_id",
          findClickCount(statusClickCount),
          setStatusClickCount
        );
        break;
      case Sort.startDate:
        resetClickCounts([
          setTaskNameClickCount,
          setStatusClickCount,
          setDeadlineDateClickCount,
          setNumberOfDaysClickCount,
          setAssignedUserClickCount,
        ]);
        handleSort(
          "start_date",
          findClickCount(startDateClickCount),
          setStartDateClickCount
        );
        break;
      case Sort.deadlineDate:
        resetClickCounts([
          setTaskNameClickCount,
          setStatusClickCount,
          setStartDateClickCount,
          setNumberOfDaysClickCount,
          setAssignedUserClickCount,
        ]);
        handleSort(
          "deadline_date",
          findClickCount(deadlineDateClickCount),
          setDeadlineDateClickCount
        );
        break;
      case Sort.numberOfDays:
        resetClickCounts([
          setTaskNameClickCount,
          setStatusClickCount,
          setStartDateClickCount,
          setDeadlineDateClickCount,
          setAssignedUserClickCount,
        ]);
        handleSort(
          "number_of_days",
          findClickCount(numberOfDaysClickCount),
          setNumberOfDaysClickCount
        );
        break;
      case Sort.assignedUser:
        resetClickCounts([
          setTaskNameClickCount,
          setStatusClickCount,
          setStartDateClickCount,
          setDeadlineDateClickCount,
          setNumberOfDaysClickCount,
        ]);
        handleSort(
          "assigned_user_id",
          findClickCount(assignedUserClickCount),
          setAssignedUserClickCount
        );
        break;
      default:
        break;
    }
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
    <div className={styles[`task-list-area`]}>
      {tasksDividedByTaskGenreId.length > 0 ? (
        <div className={styles[`task-list-content-area`]}>
          {tasksDividedByTaskGenreId.map((taskDividedByTaskGenreId, index) => {
            const findClickCount = (clickCountData: SortProps[]) =>
              clickCountData.find(
                (clickCount) =>
                  clickCount.taskGenreId ===
                  taskDividedByTaskGenreId.taskGenreId
              )!.clickCount;

            return (
              <div className={styles[`table-area`]} key={index}>
                <div className={styles[`task-genre-table-name`]}>
                  {taskDividedByTaskGenreId.taskGenreName
                    ? taskDividedByTaskGenreId.taskGenreName
                    : "No Task Genre"}
                </div>
                <table>
                  <thead>
                    <tr className={styles[`tr-top`]}>
                      <th
                        className={styles[`col-task-name`]}
                        onClick={() =>
                          sort(
                            Sort.taskName,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Task Name
                          {findClickCount(taskNameClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(taskNameClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(taskNameClickCount) === 2 && (
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
                        className={styles[`col-status`]}
                        onClick={() =>
                          sort(
                            Sort.status,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Status
                          {findClickCount(statusClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(statusClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(statusClickCount) === 2 && (
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
                        className={styles[`col-start-date`]}
                        onClick={() =>
                          sort(
                            Sort.startDate,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Start Date
                          {findClickCount(startDateClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(startDateClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(startDateClickCount) === 2 && (
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
                        onClick={() =>
                          sort(
                            Sort.deadlineDate,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Deadline Date
                          {findClickCount(deadlineDateClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(deadlineDateClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(deadlineDateClickCount) === 2 && (
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
                        className={styles[`col-days`]}
                        onClick={() =>
                          sort(
                            Sort.numberOfDays,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Days
                          {findClickCount(numberOfDaysClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(numberOfDaysClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(numberOfDaysClickCount) === 2 && (
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
                        className={styles[`col-assigned-person`]}
                        onClick={() =>
                          sort(
                            Sort.assignedUser,
                            taskDividedByTaskGenreId.taskGenreId
                          )
                        }
                      >
                        <div className={styles[`date-col-container`]}>
                          Assigned
                          {findClickCount(assignedUserClickCount) === 0 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              swap_vert
                            </span>
                          )}
                          {findClickCount(assignedUserClickCount) === 1 && (
                            <span
                              className={classNames(
                                "material-symbols-outlined",
                                styles.sort
                              )}
                            >
                              keyboard_double_arrow_down
                            </span>
                          )}
                          {findClickCount(assignedUserClickCount) === 2 && (
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
                      <th className={styles[`col-actions`]}>
                        <div className={styles[`add-button-container`]}>
                          <AddButton
                            target={1}
                            userId={userId}
                            workspaceId={displayWorkspaceId || undefined}
                            projectId={projectId}
                            smallProjectId={displaySmallProjectId || undefined}
                            taskGenreId={
                              taskDividedByTaskGenreId.taskGenreId || undefined
                            }
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={
                      taskDividedByTaskGenreId.taskDataArray.length > 0
                        ? styles[`task-list-tbody`]
                        : styles[`non-task-tbody`]
                    }
                  >
                    {taskDividedByTaskGenreId.taskDataArray.length > 0 ? (
                      taskDividedByTaskGenreId.taskDataArray.map((task) => {
                        const taskGenreMatchedTaskId = taskGenreListData!.find(
                          (taskGenre) => taskGenre.taskId === task.id
                        );

                        const attachedFileMatchedTaskId =
                          taskAttachedFileListData.find(
                            (attachedFile) => attachedFile.id === task.id
                          );

                        const taskArrowJudge = taskArrowJudgeData.find(
                          (taskArrowJudge) => taskArrowJudge.taskId === task.id
                        )?.arrowJudge;

                        const deadlineStatus = isDeadlineNear(
                          task.deadline_date,
                          task.status_id
                        );

                        return (
                          <React.Fragment key={task.id}>
                            <tr
                              className={
                                task.id == newItem.id && newItem.target == 1
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
                                      onClick={() => toggleArrow(task.id)}
                                    >
                                      {taskArrowJudge
                                        ? "arrow_drop_down"
                                        : "arrow_right"}{" "}
                                    </span>
                                  </div>
                                  <p className={styles[`task-name`]}>
                                    {task.task_name}
                                  </p>
                                </div>
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
                                        selectProps: {
                                          statusId: task.status_id,
                                        },
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
                                <div className={styles[`start-date-container`]}>
                                  <span
                                    className={styles[`calendar-icon`]}
                                  ></span>
                                  <span>{formatDate(task.start_date)}</span>
                                </div>
                              </td>
                              <td
                                className={classNames(
                                  styles[`col-deadline-date`],
                                  {
                                    [styles[`near-deadline`]]:
                                      deadlineStatus === 1,
                                    [styles[`pass-deadline`]]:
                                      deadlineStatus === 2,
                                  }
                                )}
                              >
                                <div
                                  className={styles[`deadline-date-container`]}
                                >
                                  <span
                                    className={classNames({
                                      [styles[`calendar-icon`]]:
                                        deadlineStatus === 0,
                                      [styles[`alarm-yellow-icon`]]:
                                        deadlineStatus === 1,
                                      [styles[`alarm-icon`]]:
                                        deadlineStatus === 2,
                                    })}
                                  ></span>
                                  <span>{formatDate(task.deadline_date)}</span>
                                </div>
                              </td>
                              <td className={styles[`col-days`]}>
                                {task.number_of_days.toFixed(1)}
                              </td>
                              <td className={styles[`col-assigned-person`]}>
                                <div
                                  className={
                                    styles[`assigned-person-container`]
                                  }
                                >
                                  <span
                                    className={styles[`person-icon`]}
                                  ></span>
                                  {task.users.name}
                                </div>
                              </td>
                              <td className={styles[`col-actions`]}>
                                <div
                                  className={styles[`actions-button-container`]}
                                >
                                  {/* この表はまだ作り直していないので、以前と同じく縦に並べる */}
                                  <div className="flex flex-col items-center">
                                    <EditButton
                                      workspaceId={
                                        displayWorkspaceId || undefined
                                      }
                                      taskId={task.id}
                                      projectId={null}
                                      userId={userId}
                                      targetName={task.task_name}
                                    />
                                    <DeleteButton
                                      taskId={task.id}
                                      projectId={null}
                                      userId={userId}
                                      targetName={task.task_name}
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
                              <td colSpan={7}>
                                <div className={styles[`img-container`]}>
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
                                      <div className={styles[`flex-content`]}>
                                        <div className={styles.flex}>
                                          <dt>Task Genre</dt>
                                          <dd>
                                            <TaskGenreSummary
                                              taskGenre={taskGenreMatchedTaskId?.taskGenre}
                                            />
                                          </dd>
                                        </div>

                                        <div className={styles.flex}>
                                          <dt>Task Result</dt>

                                          <dd>
                                            <TaskResultList
                                              taskGenre={taskGenreMatchedTaskId?.taskGenre}
                                              userId={userId}
                                              onReset={resultForm.handleResetResult}
                                            />
                                            {userId ===
                                              task.assigned_user_id && (
                                              <form
                                                onSubmit={(e) =>
                                                  resultForm.handleSubmit(e, task.id)
                                                }
                                                className={
                                                  styles[`task-result-form`]
                                                }
                                              >
                                                <div
                                                  className={
                                                    styles[
                                                      "top-input-container"
                                                    ]
                                                  }
                                                >
                                                  <div>
                                                    <DatePicker
                                                      selected={
                                                        resultForm.selectedResultStartDate
                                                      }
                                                      onChange={
                                                        resultForm.handleResultDateRangeChange
                                                      }
                                                      startDate={
                                                        resultForm.selectedResultStartDate
                                                      }
                                                      endDate={
                                                        resultForm.selectedResultDeadlineDate
                                                      }
                                                      selectsRange
                                                      dateFormat="yyyy/MM/dd"
                                                      className={
                                                        styles[`date-picker`]
                                                      }
                                                      calendarClassName={
                                                        styles[
                                                          `custom-calendar`
                                                        ]
                                                      }
                                                      showIcon
                                                      required
                                                    />
                                                    <p
                                                      className={
                                                        styles.instruction
                                                      }
                                                    >
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
                                                        styles[
                                                          `number-of-result-days-form`
                                                        ]
                                                      }
                                                      value={
                                                        resultForm.numberOfResultDays !==
                                                        undefined
                                                          ? resultForm.numberOfResultDays
                                                          : ""
                                                      }
                                                      onChange={(e) => {
                                                        const inputValue =
                                                          e.target.value;
                                                        resultForm.setNumberOfResultDays(
                                                          inputValue
                                                            ? Number(inputValue)
                                                            : undefined
                                                        );
                                                      }}
                                                      required
                                                    />
                                                    <p
                                                      className={
                                                        styles.instruction
                                                      }
                                                    >
                                                      Days
                                                    </p>
                                                  </div>
                                                </div>
                                                <div
                                                  className={
                                                    styles[
                                                      `under-input-container`
                                                    ]
                                                  }
                                                >
                                                  <div
                                                    className={
                                                      styles[`button-container`]
                                                    }
                                                  >
                                                    <button
                                                      className={styles.confirm}
                                                      type="submit"
                                                    >
                                                      {resultForm.postLoading ? (
                                                        <div
                                                          className={
                                                            styles[
                                                              `button-spinner`
                                                            ]
                                                          }
                                                        ></div>
                                                      ) : (
                                                        "confirm"
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
                                          <dd
                                            className={styles[`details-area`]}
                                          >
                                            {task.details ? (
                                              <div
                                                className={
                                                  styles[`details-text`]
                                                }
                                              >
                                                {task.details}
                                              </div>
                                            ) : (
                                              "No Details"
                                            )}
                                          </dd>
                                        </div>
                                        <div className={styles.flex}>
                                          <dt>Attached File</dt>
                                          <dd
                                            className={
                                              styles["attachedFile-area"]
                                            }
                                          >
                                            <AttachedFileList
                                              fileDataArray={attachedFileMatchedTaskId?.fileDataArray}
                                            />
                                          </dd>
                                        </div>
                                      </div>

                                    </dl>
                                    {/* プロジェクト画面を作り直すまでの置き方。dl の外に置き、この画面の dt・dd の CSS が効かないようにする */}
                                    <section
                                      aria-label="コメント"
                                      className="mx-8 mt-4 mb-2 text-left"
                                    >
                                      <h4 className="m-0 mb-2 text-sm font-medium">
                                        コメント
                                      </h4>
                                      <Comment userId={userId} taskId={task.id} />
                                    </section>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
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
          })}
        </div>
      ) : (
        <div className={styles[`task-list-content-area`]}>
          <div className={styles[`table-container`]}>
            <table>
              <thead>
                <tr className={styles[`tr-top`]}>
                  <th className={styles[`col-task-name`]}>
                    <div className={styles[`date-col-container`]}>
                      Task Name
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>
                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-status`]}>
                    <div className={styles[`date-col-container`]}>
                      Status
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>
                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-start-date`]}>
                    <div className={styles[`date-col-container`]}>
                      Start Date
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>

                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-deadline-date`]}>
                    <div className={styles[`date-col-container`]}>
                      Deadline Date
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>
                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-days`]}>
                    <div className={styles[`date-col-container`]}>
                      Days
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>
                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-assigned-person`]}>
                    <div className={styles[`date-col-container`]}>
                      Assigned
                      <span
                        className={classNames(
                          "material-symbols-outlined",
                          styles.sort
                        )}
                      >
                        swap_vert
                      </span>
                    </div>
                    <div className={styles.separator}></div>
                  </th>
                  <th className={styles[`col-actions`]}>
                    <div className={styles[`add-button-container`]}>
                      <AddButton
                        target={1}
                        userId={userId}
                        workspaceId={displayWorkspaceId || undefined}
                        projectId={projectId}
                        smallProjectId={displaySmallProjectId || undefined}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={styles[`non-task-tbody`]}>
                <tr>
                  <td colSpan={6} className={styles[`non-tasks`]}>
                    No Task
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
