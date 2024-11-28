"use client";

import styles from "./suspenseProject.module.css";
import BackgroundImage1 from "@/app/component/backgroundImage1/backgroundImage1";
import Header from "@/app/component/header/header";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { getStatus } from "@/app/lib/getStatus";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import classNames from "classnames";
import { useEffect, useState } from "react";
import ProjectDetails from "../projectDetails/projectDetails";
import TaskBoard from "../taskBoard/taskBoard";
import TaskCalender from "../taskCalender/taskCalender";
import TaskList from "../taskList/taskList";
import { useRouter, useSearchParams } from "next/navigation";
import RobotButton from "@/app/component/robotButton/robotButton";
import { useSessionTimeout } from "@/app/hooks/sessionTimeout";
import { fetchAttachedFiles } from "@/app/lib/fetchAttachedFiles";
import { fetchProjectDetailsData } from "@/app/lib/fetchProjectDetailsData";
import { getProjectTaskGenre } from "@/app/lib/getProjectTaskGenre";
import { getTaskGenreData } from "@/app/lib/getTaskGenre";

interface StatusProps {
  id: number;
  status: string;
}

interface Params {
  projectId: number;
  userId: number;
}

const SuspenseProject: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [statuses, setStatuses] = useState<StatusProps[]>([]);
  const [params, setParams] = useState<Params>({ projectId: 0, userId: 0 });
  const [tabJudgeList, setTabJudgeList] = useState({
    list: true,
    board: false,
    calender: false,
  });

  const [projectData, setProjectData] = useState<any>({});
  const [projectStatus, setProjectStatus] = useState<any>({});
  const [projectTaskGenreList, setProjectTaskGenreList] = useState<any>([]);
  const [taskGenreList, setTaskGenreList] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<(string | null)[]>([]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [projectDetailsArrows, setProjectDetailsArrows] = useState<boolean[]>(
    []
  );
  const [attachedFileList, setAttachedFileList] = useState<File[][]>([[]]);
  const [downloadUrlList, setDownloadUrlList] = useState<(string | null)[][]>([
    [],
  ]);
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { notificationValue, setNotificationValue } = useNotificationContext();

  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsProjectId = searchParams.get("id");
  const paramsUserId = searchParams.get("userId");

  useEffect(() => {
    const projectId = Number(paramsProjectId);
    const userId = Number(paramsUserId);
    setParams({ projectId: projectId, userId: userId });

    const fetchProjectDetails = async () => {
      try {
        const [projectDetailsData, projectTaskGenreData] = await Promise.all([
          fetchProjectDetailsData(projectId),
          getProjectTaskGenre([projectId]),
        ]);
        if (
          !projectDetailsData.projectData ||
          !projectDetailsData.projectMembersData ||
          !projectDetailsData.projectStatusData
        ) {
          throw new Error("Project Details Data are null");
        } else {
          setProjectTaskGenreList(projectTaskGenreData[0]);

          const projectMembers = projectDetailsData.projectMembersData.map(
            (projectMember) => projectMember.name
          );
          setProjectMembers(projectMembers);
          setProjectData(projectDetailsData.projectData[0]);
          setProjectStatus(projectDetailsData.projectStatusData);
          setAttachedFiles(projectDetailsData.attachedFiles[0]);
          setProjectDetailsArrows(
            new Array(projectDetailsData.tasksData.length).fill(false)
          );
          setTasks(projectDetailsData.tasksData);

          if (projectDetailsData.tasksData) {
            const taskGenreIdList = projectDetailsData.tasksData.map(
              (task) => task.task_genre_id
            );

            const taskGenreDataArray = await Promise.all(
              taskGenreIdList.map(async (taskGenreId, index) => {
                if (!taskGenreId) {
                  return {
                    assignedUserTaskResultData: [
                      {
                        userId:
                          projectDetailsData.tasksData[index].assigned_user_id,
                        userName:
                          projectDetailsData.tasksData[index].users.name,
                        numberOfResultDays: projectDetailsData.tasksData[index]
                          .number_of_result_days
                          ? projectDetailsData.tasksData[index]
                              .number_of_result_days
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
          }

          if (projectDetailsData.attachedFiles.length > 0) {
            const urlList = projectDetailsData.attachedFiles[0].map((file) => {
              try {
                return URL.createObjectURL(file);
              } catch (error) {
                console.error("Failed to create object URL ", error);
                return null;
              }
            });
            setDownloadUrls(urlList);
          }

          const statusData = await getStatus();
          if (!statuses || statuses.length < 0) {
            throw new Error("Fetch StatusData is null.");
          } else {
            setStatuses(statusData);
          }

          if (
            projectDetailsData.tasksData &&
            projectDetailsData.tasksData.length > 0
          ) {
            const taskIdList = projectDetailsData.tasksData.map(
              (task) => task.id
            );
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
        }
        setPageUpdated(false);
        setLoading(false);
      } catch (error) {
        console.error("Error Fetch Project Details Data ", error);
        setNotificationValue({
          message: "Couldn't get Project Data.",
          color: 1,
        });
        router.push("/task");
      }
    };
    fetchProjectDetails();
  }, [pageUpdated]);

  useSessionTimeout();

  const handleToggle = () => {
    if (!isChecked) {
      setPageUpdated(false);
    }
    setIsChecked(!isChecked);
  };

  const handleTabSwitch = (target: number) => {
    switch (target) {
      case 0:
        setTabJudgeList({
          list: true,
          board: false,
          calender: false,
        });
        break;
      case 1:
        setTabJudgeList({
          list: false,
          board: true,
          calender: false,
        });
        break;
      case 2:
        setTabJudgeList({
          list: false,
          board: false,
          calender: true,
        });
        break;
      default:
        setTabJudgeList({
          list: true,
          board: false,
          calender: false,
        });
        break;
    }
  };

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}
      <>
        {loading ? (
          <Loading />
        ) : (
          <div className={styles.project}>
            <BackgroundImage1 />
            <Header isBackButton={true} userId={params.userId} />
            <div className={styles[`project-container`]}>
              <ProjectDetails
                userId={params.userId}
                projectId={params.projectId}
                projectData={projectData}
                projectStatus={projectStatus}
                projectMembers={projectMembers}
                projectTaskGenreList={projectTaskGenreList}
                attachedFiles={attachedFiles}
                downloadUrls={downloadUrls}
              />

              <div className={styles[`task-area`]}>
                <div className={styles[`tab-area`]}>
                  <div className={styles[`tab-container`]}>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.list && styles.active
                      )}
                      onClick={() => handleTabSwitch(0)}
                    >
                      List
                    </button>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.board && styles.active
                      )}
                      onClick={() => handleTabSwitch(1)}
                    >
                      Board
                    </button>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.calender && styles.active
                      )}
                      onClick={() => handleTabSwitch(2)}
                    >
                      Calender
                    </button>
                  </div>
                  <div className={styles[`filter-switch-area`]}>
                    <div className={styles[`background-area`]}>
                      <p>My Tasks</p>
                      <div
                        className={classNames(styles.toggle, {
                          [styles.checked]: isChecked,
                        })}
                        onClick={handleToggle}
                      >
                        <input
                          type="checkbox"
                          name="check"
                          checked={isChecked}
                          onChange={handleToggle}
                          className={styles.input}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={classNames(styles[`tab-content`])}>
                  {tabJudgeList.list && (
                    <TaskList
                      userId={params.userId}
                      projectId={params.projectId}
                      tasks={tasks}
                      setTasks={setTasks}
                      taskGenreList={taskGenreList}
                      projectTaskGenreList={projectTaskGenreList}
                      statuses={statuses}
                      projectDetailsArrows={projectDetailsArrows}
                      setProjectDetailsArrows={setProjectDetailsArrows}
                      attachedFileList={attachedFileList}
                      downloadUrlList={downloadUrlList}
                      isChecked={isChecked}
                    />
                  )}

                  {tabJudgeList.board && (
                    <TaskBoard
                      userId={params.userId}
                      tasks={tasks}
                      statuses={statuses}
                      attachedFileList={attachedFileList}
                      downloadUrlList={downloadUrlList}
                      isChecked={isChecked}
                    />
                  )}

                  {tabJudgeList.calender && (
                    <TaskCalender
                      userId={params.userId}
                      tasks={tasks}
                      projectTaskGenreList={projectTaskGenreList}
                      isChecked={isChecked}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className={styles[`robot-button-container`]}>
              <RobotButton />
            </div>
          </div>
        )}
      </>
    </>
  );
};

export default SuspenseProject;
