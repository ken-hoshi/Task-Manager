"use client";

import { Pencil } from "lucide-react";
import AppShell from "@/app/component/appShell/appShell";
import ProjectPopup from "@/app/component/projectPopup/projectPopup";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { getStatus } from "@/app/lib/api/getStatus";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
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
import { getUserId } from "@/app/lib/api/getUserId";
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

// タブの値と、タブに出す名前
type ProjectTab = "list" | "calendar" | "board" | "wiki";

const PROJECT_TABS: { value: ProjectTab; label: string }[] = [
  { value: "list", label: "一覧" },
  { value: "calendar", label: "カレンダー" },
  { value: "board", label: "ボード" },
  { value: "wiki", label: "Wiki" },
];

const SuspenseProject: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [statusData, setStatusData] = useState<StatusProps[]>([]);
  const [params, setParams] = useState<Params>({
    workspaceId: 0,
    projectId: 0,
    smallProjectId: undefined,
  });
  const [userId, setUserId] = useState(0);
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [tab, setTab] = useState<ProjectTab>("list");

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
    [],
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

  const getTaskGenre = async (
    tasksDividedBySmallProjectId: TasksDividedBySmallProjectIdProps[],
  ) => {
    const allTaskIds = tasksDividedBySmallProjectId.flatMap((taskDivided) =>
      taskDivided.taskDataArray.map((taskData) => taskData.id),
    );
    const allTaskGenreData = await getTaskGenreData(allTaskIds);

    const taskGenreDataBySmallProject = tasksDividedBySmallProjectId.map(
      (taskData) => ({
        smallProjectId: taskData.smallProjectId,
        taskGenreDataArray: allTaskGenreData.map((allTaskGenre) => ({
          taskId: allTaskGenre.taskId,
          taskGenre: allTaskGenre,
        })),
      }),
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
      });
    }
  }, []);

  useEffect(() => {
    const workspaceId = paramsWorkspaceId;
    const projectId = paramsProjectId;
    if (!paramsSmallProjectId) {
      setParams({
        workspaceId: workspaceId,
        projectId: projectId,
        smallProjectId: undefined,
      });
    }

    (async () => {
      const session = await getSession();
      // URL ではなくログイン中の人から決める
      const sessionUserId = session ? await getUserId(session.user.id) : null;
      if (!sessionUserId) {
        console.error("Fetch Data: User ID couldn't get.");
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
        return;
      }

      setUserId(sessionUserId);

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
              (task) => task.assigned_user_id == sessionUserId,
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
          message: "プロジェクトのデータを読めませんでした。",
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

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}
      {/* 今いるプロジェクトは、読み込み中でも分かるように URL から決める */}
      <AppShell
        userId={userId}
        current={{ kind: "project", id: paramsProjectId }}
      >
        {loading ? (
          <Loading />
        ) : (
          <div className="relative min-h-full">
            <div className="space-y-4 px-6 pt-6 pb-24">
              {/* 以前はヘッダーにあったプロジェクト名と編集の入口。戻る矢印はサイドバーの「タスク」に任せた */}
              <div className="flex items-center gap-2">
                <h1 className="m-0 truncate text-xl font-semibold">
                  {projectData.project_name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="プロジェクトを編集"
                  onClick={() => setShowProjectPopup(true)}
                >
                  <Pencil className="size-4" aria-hidden />
                  編集
                </Button>
                {showProjectPopup && (
                  <ProjectPopup
                    onClose={() => setShowProjectPopup(false)}
                    projectId={projectData.id}
                    userId={userId}
                  />
                )}
              </div>

              <ProjectDetails
                userId={userId}
                smallProjectData={smallProjectData}
                smallProjectStatusData={smallProjectStatusData}
                smallProjectMemberData={smallProjectMemberData}
                smallProjectTaskGenreData={smallProjectTaskGenreData}
                smallProjectAttachedFileData={smallProjectAttachedFileData}
                smallProjectIdList={smallProjectIds}
                displaySmallProjectId={displaySmallProjectId}
                setDisplaySmallProjectId={setDisplaySmallProjectId}
              />

              <Tabs
                value={tab}
                onValueChange={(value) => {
                  const next = PROJECT_TABS.find((t) => t.value === value);
                  if (next) setTab(next.value);
                }}
                className="gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList aria-label="タスクの見せ方">
                    {PROJECT_TABS.map(({ value, label }) => (
                      <TabsTrigger key={value} value={value} className="px-3">
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="filter-my-tasks"
                      checked={filterMyTasks}
                      onCheckedChange={handleToggleFilterTask}
                    />
                    <Label htmlFor="filter-my-tasks">自分のタスクだけ</Label>
                  </div>
                </div>

                {/* 中身の部品はまだ作り直していない。開いているタブの部品だけを描くのは以前と同じ */}
                <TabsContent value="list">
                  <TaskList
                    userId={userId}
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
                </TabsContent>
                <TabsContent value="calendar">
                  <TaskCalender
                    userId={userId}
                    projectId={params.projectId}
                    smallProjectIdList={smallProjectIds}
                    displaySmallProjectId={displaySmallProjectId}
                    taskData={taskData}
                    smallProjectTaskGenreData={smallProjectTaskGenreData}
                    filterMyTasks={filterMyTasks}
                    statusData={statusData}
                  />
                </TabsContent>
                <TabsContent value="board">
                  <TaskBoard
                    userId={userId}
                    smallProjectIdList={smallProjectIds}
                    displaySmallProjectId={displaySmallProjectId}
                    taskData={taskData}
                    statusData={statusData}
                    taskAttachedFileData={taskAttachedFileData}
                    filterMyTasks={filterMyTasks}
                  />
                </TabsContent>
                <TabsContent value="wiki">
                  <Wiki
                    userId={userId}
                    smallProjectIdList={smallProjectIds}
                    displaySmallProjectId={displaySmallProjectId}
                    wikiDataList={wikiData}
                  />
                </TabsContent>
              </Tabs>
            </div>
            <div className="absolute right-4 bottom-4">
              <RobotButton />
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
};

export default SuspenseProject;
