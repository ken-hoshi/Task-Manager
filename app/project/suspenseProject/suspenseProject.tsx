"use client";

import styles from "./suspenseProject.module.css";
import BackgroundImage1 from "@/app/component/backgroundImage1/backgroundImage1";
import Header from "@/app/component/header/header";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { fetchAttachmentFiles } from "@/app/lib/fetchAttachmentFiles";
import { fetchProjectDetailData } from "@/app/lib/fetchProjectDetailData";
import { getStatus } from "@/app/lib/getStatus";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import classNames from "classnames";
import { useEffect, useState } from "react";
import ProjectDetail from "../projectDetail/projectDetail";
import TaskBoard from "../taskBoard/taskBoard";
import TaskCalender from "../taskCalender/taskCalender";
import TaskList from "../taskList/taskList";
import { useRouter, useSearchParams } from "next/navigation";
import RobotButton from "@/app/component/robotButton/robotButton";
import { useSessionTimeout } from "@/app/hooks/sessionTimeout";

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
  const [projectMembers, setProjectMembers] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<(string | null)[]>([]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [projectDetailArrows, setProjectDetailArrows] = useState<boolean[]>([]);
  const [attachmentFileList, setAttachmentFileList] = useState<File[][]>([[]]);
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

    const fetchProjectDetail = async () => {
      try {
        const projectDetailData = await fetchProjectDetailData(projectId);
        if (
          !projectDetailData.projectData ||
          !projectDetailData.projectMembersData ||
          !projectDetailData.projectStatusData
        ) {
          throw new Error("Project Detail Data are null");
        } else {
          const projectMembers = projectDetailData.projectMembersData
            .map((projectMember) => projectMember.name)
            .join("、");
          setProjectMembers(projectMembers);
          setProjectData(projectDetailData.projectData[0]);
          setProjectStatus(projectDetailData.projectStatusData);
          setAttachmentFiles(projectDetailData.attachmentFiles);
          setProjectDetailArrows(
            new Array(projectDetailData.tasksData.length).fill(false)
          );
          setTasks(projectDetailData.tasksData);

          if (projectDetailData.attachmentFiles.length > 0) {
            const urlList = projectDetailData.attachmentFiles.map((file) => {
              try {
                return URL.createObjectURL(file);
              } catch (error) {
                console.error("Failed to create object URL:", error);
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
            projectDetailData.tasksData &&
            projectDetailData.tasksData.length > 0
          ) {
            const attachmentFilesPromises = projectDetailData.tasksData.map(
              async (task) => {
                const taskId = task.id;
                return await fetchAttachmentFiles(1, taskId);
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
        setPageUpdated(false);
        setLoading(false);
      } catch (error) {
        console.error("Error fetch Project Detail Data:", error);
        setNotificationValue({
          message: "Couldn't get Project Data.",
          color: 1,
        });
        router.push("/task");
      }
    };
    fetchProjectDetail();
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
              <ProjectDetail
                userId={params.userId}
                projectId={params.projectId}
                projectData={projectData}
                projectStatus={projectStatus}
                projectMembers={projectMembers}
                attachmentFiles={attachmentFiles}
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
                      statuses={statuses}
                      projectDetailArrows={projectDetailArrows}
                      setProjectDetailArrows={setProjectDetailArrows}
                      attachmentFileList={attachmentFileList}
                      downloadUrlList={downloadUrlList}
                      isChecked={isChecked}
                    />
                  )}

                  {tabJudgeList.board && (
                    <TaskBoard
                      userId={params.userId}
                      tasks={tasks}
                      statuses={statuses}
                      attachmentFileList={attachmentFileList}
                      downloadUrlList={downloadUrlList}
                      isChecked={isChecked}
                    />
                  )}

                  {tabJudgeList.calender && (
                    <TaskCalender
                      userId={params.userId}
                      tasks={tasks}
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
