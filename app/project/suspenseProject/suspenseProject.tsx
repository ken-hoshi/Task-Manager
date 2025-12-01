"use client";

import styles from "./suspenseProject.module.css";
import BackgroundImage1 from "@/app/component/backgroundImage1/backgroundImage1";
import Header from "@/app/component/header/header";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { getStatus } from "@/app/lib/api/getStatus";
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
import { fetchProjectDetailsData } from "@/app/lib/api/fetchProjectDetailsData";
import { getTaskGenreData } from "@/app/lib/api/getTaskGenreData";
import Wiki from "../wiki/wiki";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { getSession } from "@/app/hooks/getSession";
import { useFormContext } from "@/app/provider/formProvider";
import { getDataUpdate } from "@/app/hooks/getDataUpdate";

interface StatusProps {
  id: number;
  status: string;
}

interface Params {
  workspaceId: number;
  projectId: number;
  smallProjectId?: number;
  userId: number;
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

interface TasksDividedBySmallProjectIdProps {
  smallProjectId: number;
  taskDataArray: any[];
}

interface TaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: { taskId: number; taskGenre: any }[];
}

interface SmallProjectAttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}

interface TaskAttachedFileProps {
  smallProjectId: number;
  fileDataList: {
    id: number;
    fileDataArray: {
      file: File;
      url: string;
    }[];
  }[];
}

interface WikiProps {
  smallProjectId: number;
  wikiDataArray: {
    id: number;
    title: string;
    content: string;
    small_project_id: number;
  }[];
}

enum Switch {
  list,
  board,
  calender,
  wiki,
}

const SuspenseProject: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [statusData, setStatusData] = useState<StatusProps[]>([]);
  const [params, setParams] = useState<Params>({
    workspaceId: 0,
    projectId: 0,
    smallProjectId: undefined,
    userId: 0,
  });
  const [tabJudgeList, setTabJudgeList] = useState({
    calender: true,
    list: false,
    board: false,
    wiki: false,
  });

  const [projectData, setProjectData] = useState<any>({});
  const [smallProjectData, setSmallProjectData] = useState<any[]>([]);
  const [smallProjectIds, setSmallProjectIds] = useState<number[]>([]);
  const [smallProjectMemberData, setSmallProjectMemberData] = useState<
    SmallProjectMembersProps[]
  >([]);
  const [smallProjectStatusData, setSmallProjectStatusData] = useState<
    SmallProjectStatusProps[]
  >([]);
  const [smallProjectTaskGenreData, setSmallProjectTaskGenreData] = useState<
    SmallProjectTaskGenreProps[]
  >([]);

  const [taskData, setTaskData] = useState<TasksDividedBySmallProjectIdProps[]>(
    []
  );
  const [taskGenreData, setTaskGenreData] = useState<TaskGenreProps[]>([]);
  const [smallProjectAttachedFileData, setSmallProjectAttachedFileData] =
    useState<SmallProjectAttachedFileProps[]>([]);
  const [taskAttachedFileData, setTaskAttachedFileData] = useState<
    TaskAttachedFileProps[]
  >([]);
  const [wikiData, setWikiData] = useState<WikiProps[]>([]);
  const { setBackForm } = useFormContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { notificationValue, setNotificationValue } = useNotificationContext();
  const { setDisplayWorkspaceId } = useDisplayWorkspaceIdContext();
  const [displaySmallProjectId, setDisplaySmallProjectId] = useState<
    number | null
  >(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsWorkspaceId = Number(searchParams.get("workspaceId"));
  const paramsProjectId = Number(searchParams.get("projectId"));
  const paramsSmallProjectId = Number(searchParams.get("smallProjectId"));
  const paramsUserId = Number(searchParams.get("userId"));

  const getTaskGenre = async (
    tasksDividedBySmallProjectId: TasksDividedBySmallProjectIdProps[]
  ) => {
    const allTaskIds = tasksDividedBySmallProjectId.flatMap((taskDivided) =>
      taskDivided.taskDataArray.map((taskData) => taskData.id)
    );
    const allTaskGenreData = await getTaskGenreData(allTaskIds);

    const taskGenreDataBySmallProject = tasksDividedBySmallProjectId.map(
      (taskData) => ({
        smallProjectId: taskData.smallProjectId,
        taskGenreDataArray: allTaskGenreData.map((allTaskGenre) => ({
          taskId: allTaskGenre.taskId,
          taskGenre: allTaskGenre,
        })),
      })
    );
    setTaskGenreData(taskGenreDataBySmallProject);
  };

  useEffect(() => {
    setDisplayWorkspaceId(paramsWorkspaceId);
    if (paramsSmallProjectId) {
      setDisplaySmallProjectId(paramsSmallProjectId);
      setParams({
        workspaceId: paramsWorkspaceId,
        projectId: paramsProjectId,
        smallProjectId: paramsSmallProjectId,
        userId: paramsUserId,
      });
    }
  }, []);

  useEffect(() => {
    const workspaceId = paramsWorkspaceId;
    const projectId = paramsProjectId;
    const userId = paramsUserId;
    if (!paramsSmallProjectId) {
      setParams({
        workspaceId: workspaceId,
        projectId: projectId,
        smallProjectId: undefined,
        userId: userId,
      });
    }

    (async () => {
      const session = await getSession();
      if (!session?.user.id) {
        console.error("Fetch Data: User ID couldn't get.");
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
        return;
      }

      try {
        const {
          projectData,
          smallProjectIdList,
          smallProjectData,
          smallProjectMembersData,
          smallProjectStatusData,
          smallProjectTaskGenreData,
          tasksDividedBySmallProjectId,
          smallProjectAttachedFileData,
          taskAttachedFileData,
          smallProjectWikiData,
        } = await fetchProjectDetailsData(projectId);

        if (
          !projectData ||
          !smallProjectIdList ||
          !smallProjectData ||
          !smallProjectMembersData ||
          !smallProjectStatusData ||
          !smallProjectTaskGenreData ||
          !tasksDividedBySmallProjectId ||
          !smallProjectAttachedFileData ||
          !taskAttachedFileData ||
          !smallProjectWikiData
        ) {
          throw new Error("Couldn't get Project Data.");
        }
        setProjectData(projectData);
        setSmallProjectData(smallProjectData);
        setSmallProjectIds(smallProjectIdList);
        setSmallProjectMemberData(smallProjectMembersData);
        setSmallProjectStatusData(smallProjectStatusData);
        setSmallProjectTaskGenreData(smallProjectTaskGenreData);
        setSmallProjectAttachedFileData(smallProjectAttachedFileData);
        setWikiData(smallProjectWikiData);

        if (
          (!paramsSmallProjectId && !displaySmallProjectId) ||
          (displaySmallProjectId &&
            !smallProjectIdList.includes(displaySmallProjectId))
        ) {
          setDisplaySmallProjectId(smallProjectIdList[0]);
        }

        if (filterMyTasks) {
          const filteredTask = tasksDividedBySmallProjectId.map((taskData) => ({
            ...taskData,
            taskDataArray: taskData.taskDataArray.filter(
              (task) => task.assigned_user_id == paramsUserId
            ),
          }));
          setTaskData(filteredTask);
        } else {
          setTaskData(tasksDividedBySmallProjectId);
        }
        await getTaskGenre(tasksDividedBySmallProjectId);
        setTaskAttachedFileData(taskAttachedFileData);

        const statusData = await getStatus();
        if (!statusData || statusData.length < 0) {
          throw new Error("Fetch StatusData couldn't get.");
        }
        setStatusData(statusData);
        setPageUpdated(false);
      } catch (error) {
        console.error("Fetch Project Details Data", error);
        setNotificationValue({
          message: "Couldn't get Project Data.",
          color: 1,
        });
        router.push("/task");
      }
      setLoading(false);
    })();
  }, [pageUpdated, displaySmallProjectId]);

  useSessionTimeout();
  getDataUpdate();

  const handleToggleFilterTask = () => {
    setFilterMyTasks(!filterMyTasks);
    setPageUpdated(true);
  };

  const handleTabSwitch = (target: Switch) => {
    switch (target) {
      case Switch.list:
        setTabJudgeList({
          list: true,
          board: false,
          calender: false,
          wiki: false,
        });
        break;
      case Switch.board:
        setTabJudgeList({
          list: false,
          board: true,
          calender: false,
          wiki: false,
        });
        break;
      case Switch.calender:
        setTabJudgeList({
          list: false,
          board: false,
          calender: true,
          wiki: false,
        });
        break;
      case Switch.wiki:
        setTabJudgeList({
          list: false,
          board: false,
          calender: false,
          wiki: true,
        });
        break;
      default:
        setTabJudgeList({
          list: true,
          board: false,
          calender: false,
          wiki: false,
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
            <Header
              workspaceDataArray={null}
              projectId={projectData.id}
              projectName={projectData.project_name}
              userId={params.userId}
            />
            <div className={styles[`project-container`]}>
              <ProjectDetails
                userId={params.userId}
                smallProjectData={smallProjectData}
                smallProjectStatusData={smallProjectStatusData}
                smallProjectMemberData={smallProjectMemberData}
                smallProjectTaskGenreData={smallProjectTaskGenreData}
                smallProjectAttachedFileData={smallProjectAttachedFileData}
                smallProjectIdList={smallProjectIds}
                displaySmallProjectId={displaySmallProjectId}
                setDisplaySmallProjectId={setDisplaySmallProjectId}
              />

              <div className={styles[`task-area`]}>
                <div className={styles[`tab-area`]}>
                  <div className={styles[`button-container`]}>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.calender && styles.active
                      )}
                      onClick={() => handleTabSwitch(Switch.calender)}
                    >
                      Calender
                    </button>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.list && styles.active
                      )}
                      onClick={() => handleTabSwitch(Switch.list)}
                    >
                      List
                    </button>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.board && styles.active
                      )}
                      onClick={() => handleTabSwitch(Switch.board)}
                    >
                      Board
                    </button>
                    <button
                      className={classNames(
                        styles[`tab-button`],
                        tabJudgeList.wiki && styles.active
                      )}
                      onClick={() => handleTabSwitch(Switch.wiki)}
                    >
                      Wiki
                    </button>
                  </div>
                  <div className={styles[`filter-switch-area`]}>
                    <div className={styles[`background-area`]}>
                      <p>My Tasks</p>
                      <div
                        className={classNames(styles.toggle, {
                          [styles.checked]: filterMyTasks,
                        })}
                        onClick={handleToggleFilterTask}
                      >
                        <input
                          type="checkbox"
                          name="check"
                          checked={filterMyTasks}
                          onChange={handleToggleFilterTask}
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
                      smallProjectIdList={smallProjectIds}
                      displaySmallProjectId={displaySmallProjectId}
                      taskData={taskData}
                      taskGenreData={taskGenreData}
                      smallProjectTaskGenreData={smallProjectTaskGenreData}
                      statusData={statusData}
                      taskAttachedFileData={taskAttachedFileData}
                      filterMyTasks={filterMyTasks}
                    />
                  )}
                  {tabJudgeList.board && (
                    <TaskBoard
                      userId={params.userId}
                      smallProjectIdList={smallProjectIds}
                      displaySmallProjectId={displaySmallProjectId}
                      taskData={taskData}
                      statusData={statusData}
                      taskAttachedFileData={taskAttachedFileData}
                      filterMyTasks={filterMyTasks}
                    />
                  )}

                  {tabJudgeList.calender && (
                    <TaskCalender
                      userId={params.userId}
                      projectId={params.projectId}
                      smallProjectIdList={smallProjectIds}
                      displaySmallProjectId={displaySmallProjectId}
                      taskData={taskData}
                      smallProjectTaskGenreData={smallProjectTaskGenreData}
                      filterMyTasks={filterMyTasks}
                      statusData={statusData}
                    />
                  )}
                  {tabJudgeList.wiki && (
                    <Wiki
                      userId={params.userId}
                      smallProjectIdList={smallProjectIds}
                      displaySmallProjectId={displaySmallProjectId}
                      wikiDataList={wikiData}
                    />
                  )}
                </div>
              </div>
            </div>
            {/* <div className={styles[`robot-button-container`]}>
              <RobotButton />
            </div> */}
          </div>
        )}
      </>
    </>
  );
};

export default SuspenseProject;
