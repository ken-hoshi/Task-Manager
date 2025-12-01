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
import { useSessionTimeout } from "../hooks/sessionTimeout";
import NotYetCompletedTasksArea from "./tasksNotYetCompletedArea/notYetCompletedTasksArea";
import { postMailNotifications } from "../lib/postMailNotifications";
import { getSmallProjectTaskGenre } from "../lib/api/getSmallProjectTaskGenre";
import { fetchAttachedFiles } from "../lib/api/fetchAttachedFiles";
import { getProjectData } from "../lib/api/getProjectData";
import { fetchSmallProjectData } from "../lib/api/fetchSmallProjectData";
import { getSession } from "../hooks/getSession";
import { Logout } from "../hooks/logout";
import { getWorkspace } from "../lib/api/getWorkspace";
import { useDisplayWorkspaceIdContext } from "../provider/displayWorkspaceIdProvider";
import { getDataUpdate } from "../hooks/getDataUpdate";

interface WorkspaceProps {
  id: number;
  workspaceName: string;
}

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
  const [workspaceDataArray, setWorkspaceDataArray] = useState<
    WorkspaceProps[]
  >([]);
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

  const { displayWorkspaceId, setDisplayWorkspaceId } =
    useDisplayWorkspaceIdContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { notificationValue } = useNotificationContext();
  const { setBackForm } = useFormContext();
  const { useLogout } = Logout();
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
    (async () => {
      try {
        const session = await getSession();
        if (!session?.user.id) {
          throw new Error("Session Data couldn't get.");
        }

        const userId = await getUserId(session!.user.id);
        if (!userId) {
          throw new Error("User Id couldn't get.");
        }
        setUserId(userId);

        const workspaceUserBelongsData = await getWorkspace(userId);

        if (workspaceUserBelongsData.length === 0) {
          router.push("/createWorkspace?atSignUp=false");
        } else {
          const workspaceData = workspaceUserBelongsData
            .map((workspaceData) =>
              Array.isArray(workspaceData.workspace)
                ? workspaceData.workspace[0]
                : workspaceData.workspace
            )
            .map((workspaceData) => ({
              id: workspaceData.id,
              workspaceName: workspaceData.workspace_name,
            }));
          setWorkspaceDataArray(workspaceData);
          if (!displayWorkspaceId) {
            setDisplayWorkspaceId(workspaceData[0].id);
          }

          const projectData = await getProjectData(
            null,
            displayWorkspaceId ? displayWorkspaceId : workspaceData[0].id
          );
          if (!projectData) {
            throw new Error("Fetch Project Data couldn't get.");
          }

          const smallProjectData = await fetchSmallProjectData(
            displayWorkspaceId ? displayWorkspaceId : workspaceData[0].id
          );
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

            const tasksData = await fetchTasksData(
              displayWorkspaceId ? displayWorkspaceId : workspaceData[0].id
            );
            if (!tasksData) {
              throw new Error("Fetch TasksData couldn't get.");
            }
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

              (async () => {
                const notificationPromises = myTasksData
                  .filter((myTask) => myTask.status_id !== 3)
                  .map(async (myTask: any) => {
                    const taskDeadline = new Date(myTask.deadline_date);

                    if (checkDateMatch(taskDeadline, dayAfterTomorrow)) {
                      return postMailNotifications(
                        displayWorkspaceId,
                        null,
                        myTask.id,
                        null,
                        null,
                        null,
                        4,
                        []
                      );
                    } else if (checkDateMatch(taskDeadline, tomorrow)) {
                      return postMailNotifications(
                        displayWorkspaceId,
                        null,
                        myTask.id,
                        null,
                        null,
                        null,
                        5,
                        []
                      );
                    } else if (checkDateMatch(taskDeadline, today)) {
                      return postMailNotifications(
                        displayWorkspaceId,
                        null,
                        myTask.id,
                        null,
                        null,
                        null,
                        6,
                        []
                      );
                    } else {
                      return;
                    }
                  });
                await Promise.all(notificationPromises);
              })();

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
          setLoading(false);
        }
        setPageUpdated(false);
        return;
      } catch (error) {
        console.error("Fetch Data", error);
        setBackForm(true);
        alert("データの取得に失敗しました。");
      }
      await useLogout();
    })();
  }, [pageUpdated, displayWorkspaceId]);

  useSessionTimeout();
  getDataUpdate();

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
          <Header
            workspaceDataArray={workspaceDataArray}
            projectId={null}
            projectName={null}
            userId={userId}
          />
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
          {/* <div className={styles[`robot-button-container`]}>
            <RobotButton />
          </div> */}
        </div>
      )}
    </>
  );
};

export default Task;
