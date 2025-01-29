"use client";

import styles from "./task.module.css";
import { useEffect, useMemo, useState } from "react";
import Header from "@/app/component/header/header";
import React from "react";
import { usePageUpdateContext } from "../provider/pageUpdateProvider";
import { getUserId } from "../lib/api/getUserId";
import { useFormContext } from "../provider/formProvider";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "../provider/notificationProvider";
import NotificationBanner from "../component/notificationBanner/notificationBanner";
import { fetchTasksData } from "../lib/api/fetchTasksData";
import { getStatus } from "../lib/api/getStatus";
import Loading from "../component/loading/loading";
import MyTasksArea from "./myTasksArea/myTasksArea";
import ProjectsArea from "./projectsArea/projectsArea";
import BackgroundImage1 from "../component/backgroundImage1/backgroundImage1";
import RobotButton from "../component/robotButton/robotButton";
import { GetSession } from "../hooks/getSession";
import { useSessionTimeout } from "../hooks/sessionTimeout";
import NotYetCompletedTasksArea from "./tasksNotYetCompletedArea/notYetCompletedTasksArea";
import { postMailNotifications } from "../lib/postMailNotifications";
import { getSmallProjectTaskGenre } from "../lib/api/getSmallProjectTaskGenre";
import { fetchAttachedFiles } from "../lib/api/fetchAttachedFiles";
import { getProjectData } from "../lib/api/getProjectData";
import { fetchSmallProjectData } from "../lib/api/fetchSmallProjectData";

interface StatusProps {
  id: number;
  status: string;
}

interface SmallProjectMembersProps {
  smallProjectId: number;
  membersDataArray: {
    id: number;
    name: string;
  }[];
}

interface SmallProjectStatusProps {
  smallProjectId: number;
  projectId: number;
  notStarted: number;
  processing: number;
  completed: number;
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: {
    taskGenreId: number;
    taskGenreName: string;
    numberOfPersons: number;
    startDate: string;
    deadlineDate: string;
    numberOfDays: number;
  }[];
}

interface AttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}

const Task: React.FC = () => {
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusProps[]>([]);

  const [projectDataArray, setProjectDataArray] = useState<any[]>([]);
  const [smallProjectDataArray, setSmallProjectDataArray] = useState<any[]>([]);

  const [smallProjectMemberDataArray, setSmallProjectMemberDataArray] =
    useState<SmallProjectMembersProps[]>([]);
  const [smallProjectStatusDataArray, setSmallProjectStatusDataArray] =
    useState<SmallProjectStatusProps[]>([]);

  const [smallProjectTaskGenreArray, setSmallProjectTaskGenreArray] = useState<
    SmallProjectTaskGenreProps[]
  >([]);
  const [attachedFileDataArray, setAttachedFileDataArray] = useState<
    AttachedFileProps[]
  >([]);

  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [notYetCompletedTasks, setNotYetCompletedTasks] = useState<any[]>([]);

  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { notificationValue } = useNotificationContext();
  const { setBackForm } = useFormContext();
  const { useGetSession } = GetSession();

  const router = useRouter();

  const today = new Date();
  const tomorrow = useMemo(() => {
    const memoTomorrow = new Date(today);
    memoTomorrow.setDate(today.getDate() + 1);
    return memoTomorrow;
  }, [today]);

  const dayAfterTomorrow = useMemo(() => {
    const memoDayAfterTomorrow = new Date(today);
    memoDayAfterTomorrow.setDate(today.getDate() + 2);
    return memoDayAfterTomorrow;
  }, [today]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = await useGetSession();
        if (!session || !session.user.id) {
          setBackForm(true);
          alert("データの取得に失敗しました。");
          router.push("/");
        }

        const userId = await getUserId(session!.user.id);
        if (!userId) {
          throw new Error("User Id couldn't get.");
        } else {
          setUserId(userId);
        }

        const projectData = await getProjectData();
        if (!projectData) {
          throw new Error("Fetch Project Data couldn't get.");
        }

        const smallProjectData = await fetchSmallProjectData();
        if (
          !smallProjectData.smallProjectData ||
          !smallProjectData.smallProjectMembersData ||
          !smallProjectData.smallProjectStatusData
        ) {
          throw new Error("Fetch ProjectsData couldn't get.");
        }

        if (projectData.length > 0) {
          setProjectDataArray(projectData);
          setSmallProjectDataArray(smallProjectData.smallProjectData);
          setSmallProjectMemberDataArray(
            smallProjectData.smallProjectMembersData
          );
          setSmallProjectStatusDataArray(
            smallProjectData.smallProjectStatusData
          );

          const smallProjectIdList = smallProjectData.smallProjectData.map(
            (smallProject) => smallProject.id
          );
          setSmallProjectTaskGenreArray(
            await getSmallProjectTaskGenre(smallProjectIdList)
          );

          const attachedFileData = await fetchAttachedFiles(
            0,
            smallProjectIdList
          );
          if (
            attachedFileData.some(
              (attachedFiles) => attachedFiles.fileDataArray.length > 0
            )
          ) {
            setAttachedFileDataArray(attachedFileData);
          }

          const tasksData = await fetchTasksData();
          if (!tasksData) {
            throw new Error("Fetch TasksData couldn't get.");
          } else {
            const myTasksData = tasksData.filter(
              (taskData) => taskData.assigned_user_id === userId
            );

            if (myTasksData.length > 0) {
              const checkDateMatch = (taskDeadline: Date, targetDate: Date) => {
                return (
                  taskDeadline.getFullYear() === targetDate.getFullYear() &&
                  taskDeadline.getMonth() === targetDate.getMonth() &&
                  taskDeadline.getDate() === targetDate.getDate()
                );
              };

              const postDeadlineNotifications = async () => {
                const notificationPromises = myTasksData.map(
                  async (myTask: any) => {
                    const taskDeadline = new Date(myTask.deadline_date);

                    if (checkDateMatch(taskDeadline, dayAfterTomorrow)) {
                      return postMailNotifications(
                        null,
                        myTask.id,
                        null,
                        null,
                        4,
                        []
                      );
                    } else if (checkDateMatch(taskDeadline, tomorrow)) {
                      return postMailNotifications(
                        null,
                        myTask.id,
                        null,
                        null,
                        5,
                        []
                      );
                    } else if (checkDateMatch(taskDeadline, today)) {
                      return postMailNotifications(
                        null,
                        myTask.id,
                        null,
                        null,
                        6,
                        []
                      );
                    } else {
                      return;
                    }
                  }
                );
                await Promise.all(notificationPromises);
              };
              postDeadlineNotifications();

              setMyTasks(myTasksData);
            } else {
              setMyTasks([]);
            }

            const notYetCompletedTasksData = tasksData.filter(
              (taskData) => taskData.task_status.status !== "Completed"
            );
            if (notYetCompletedTasksData.length > 0) {
              const sortedNotYetCompletedTasks = notYetCompletedTasksData.sort(
                (a, b) =>
                  new Date(a.deadline_date).getTime() -
                  new Date(b.deadline_date).getTime()
              );
              setNotYetCompletedTasks(sortedNotYetCompletedTasks);
            } else {
              setNotYetCompletedTasks([]);
            }
          }

          const statusData = await getStatus();
          if (!statuses || statuses.length < 0) {
            throw new Error("Fetch StatusData couldn't get.");
          }
          setStatuses(statusData);
        } else {
          setProjectDataArray([]);
          setSmallProjectDataArray([]);
          setSmallProjectMemberDataArray([]);
          setSmallProjectStatusDataArray([]);
          setSmallProjectTaskGenreArray([]);
          setAttachedFileDataArray([]);
          setMyTasks([]);
          setNotYetCompletedTasks([]);
        }

        setPageUpdated(false);
        setLoading(false);
      } catch (error) {
        console.error("Error Fetch Data ", error);
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
      }
    };
    fetchData();
  }, [pageUpdated]);

  useSessionTimeout();

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      {loading ? (
        <Loading />
      ) : (
        <div className={styles[`task-container`]}>
          <BackgroundImage1 />
          <Header projectId={null} projectName={null} userId={userId} />
          <div className={styles.task}>
            <ProjectsArea
              projectDataArray={projectDataArray}
              smallProjectDataArray={smallProjectDataArray}
              smallProjectMemberDataArray={smallProjectMemberDataArray}
              smallProjectStatusDataArray={smallProjectStatusDataArray}
              smallProjectTaskGenreArray={smallProjectTaskGenreArray}
              attachedFileDataArray={attachedFileDataArray}
              userId={userId}
            />

            <div className={styles[`under-area`]}>
              <MyTasksArea
                myTasks={myTasks}
                userId={userId}
                statuses={statuses}
              />
              <NotYetCompletedTasksArea
                notYetCompletedTasks={notYetCompletedTasks}
                userId={userId}
                statuses={statuses}
              />
            </div>
          </div>
          <div className={styles[`robot-button-container`]}>
            <RobotButton />
          </div>
        </div>
      )}
    </>
  );
};

export default Task;
