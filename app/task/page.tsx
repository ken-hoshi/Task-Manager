"use client";

import styles from "./task.module.css";
import { useEffect, useMemo, useState } from "react";
import Header from "@/app/component/header/header";
import React from "react";
import { fetchProjectsData } from "../lib/fetchProjectsData";
import { usePageUpdateContext } from "../provider/pageUpdateProvider";
import { getUserId } from "../lib/getUserId";
import { useFormContext } from "../provider/formProvider";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "../provider/notificationProvider";
import NotificationBanner from "../component/notificationBanner/notificationBanner";
import { fetchTasksData } from "../lib/fetchTasksData";
import { getStatus } from "../lib/getStatus";
import Loading from "../component/loading/loading";
import MyTasksArea from "./myTasksArea/myTasksArea";
import ProjectsArea from "./projectsArea/projectsArea";
import { fetchAttachmentFiles } from "../lib/fetchAttachmentFiles";
import BackgroundImage1 from "../component/backgroundImage1/backgroundImage1";
import RobotButton from "../component/robotButton/robotButton";
import { GetSession } from "../hooks/getSession";
import { useSessionTimeout } from "../hooks/sessionTimeout";
import NotYetCompletedTasksArea from "./tasksNotYetCompletedArea/notYetCompletedTasksArea";
import { postMailNotifications } from "../lib/postMailNotifications";

interface StatusProps {
  id: number;
  status: string;
}

const Task: React.FC = () => {
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusProps[]>([]);

  const [projects, setProjects] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState<any[]>([]);
  const [attachmentFileList, setAttachmentFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);

  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [myTaskArrows, setMyTaskArrows] = useState<boolean[]>([]);

  const [notYetCompletedTasks, setNotYetCompletedTasks] = useState<any[]>([]);
  const [notYetCompletedTasksArrows, setNotYetCompletedTasksArrows] = useState<
    boolean[]
  >([]);

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
          throw new Error("User Id is null.");
        } else {
          setUserId(userId);
        }

        const projectData = await fetchProjectsData();
        if (
          !projectData.projectMembersData ||
          !projectData.projectStatusData ||
          !projectData.projectsData
        ) {
          throw new Error("Fetch ProjectsData is null.");
        } else {
          const projectMembers = projectData.projectMembersData.map(
            (projectMember) =>
              projectMember.map((member) => member.name).join("、")
          );
          setProjectMembers(projectMembers);
          setProjectStatus(projectData.projectStatusData);
          setProjects(projectData.projectsData);

          if (projectData.projectsData.length > 0) {
            const attachmentFilesPromises = projectData.projectsData.map(
              async (project) => {
                const projectId = project.id;
                return await fetchAttachmentFiles(0, projectId);
              }
            );
            const attachmentFiles = await Promise.all(attachmentFilesPromises);
            setAttachmentFileList(attachmentFiles);

            if (attachmentFiles.length > 0) {
              const urlList = attachmentFiles.map((subList) =>
                subList.map((file) => {
                  try {
                    return URL.createObjectURL(file);
                  } catch (error) {
                    console.error("Failed to create object URL:", error);
                    return null;
                  }
                })
              );
              setDownloadUrlList(urlList);
            }
          }
        }

        const tasksData = await fetchTasksData();
        if (!tasksData) {
          throw new Error("Fetch TasksData is null.");
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
                    return postMailNotifications(null, myTask.id, null, 4, []);
                  } else if (checkDateMatch(taskDeadline, tomorrow)) {
                    return postMailNotifications(null, myTask.id, null, 5, []);
                  } else if (checkDateMatch(taskDeadline, today)) {
                    return postMailNotifications(null, myTask.id, null, 6, []);
                  } else {
                    return;
                  }
                }
              );
              await Promise.all(notificationPromises);
            };
            postDeadlineNotifications();

            setMyTasks(myTasksData);
            setMyTaskArrows(new Array(myTasksData.length).fill(false));
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
            setNotYetCompletedTasksArrows(
              new Array(sortedNotYetCompletedTasks.length).fill(false)
            );
          }
        }

        const statusData = await getStatus();
        if (!statuses || statuses.length < 0) {
          throw new Error("Fetch StatusData is null.");
        } else {
          setStatuses(statusData);
        }

        setPageUpdated(false);
        setLoading(false);
      } catch (error) {
        console.error("Error fetch data:", error);
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
          <Header userId={userId} />
          <div className={styles.task}>
            <ProjectsArea
              projects={projects}
              projectMembers={projectMembers}
              projectStatus={projectStatus}
              attachmentFileList={attachmentFileList}
              downloadUrlList={downloadUrlList}
              userId={userId}
            />

            <div className={styles[`under-area`]}>
              <MyTasksArea
                myTasks={myTasks}
                myTaskArrows={myTaskArrows}
                setMyTaskArrows={setMyTaskArrows}
                userId={userId}
                statuses={statuses}
              />
              <NotYetCompletedTasksArea
                notYetCompletedTasks={notYetCompletedTasks}
                notYetCompletedTasksArrows={notYetCompletedTasksArrows}
                setNotYetCompletedTasksArrows={setNotYetCompletedTasksArrows}
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
