import { fetchAttachedFiles } from "./fetchAttachedFiles";
import { getSmallProjectMember } from "./getSmallProjectMember";
import { getSmallProjectStatus } from "./getSmallProjectStatus";
import { getSmallProjectTaskGenre } from "./getSmallProjectTaskGenre";
import { clientSupabase } from "../supabase/client";
import { getSmallProjectWikiData } from "./getSmallProjectWikiData";

export const fetchProjectDetailsData = async (projectId: number) => {
  try {
    const [projectPromiseResult, smallProjectPromiseResult] = await Promise.all(
      [
        clientSupabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single(),
        clientSupabase
          .from("small_projects")
          .select("*")
          .eq("project_id", projectId)
          .order("id", { ascending: true }),
        ,
      ]
    );

    if (projectPromiseResult.error) {
      throw projectPromiseResult.error;
    }

    if (smallProjectPromiseResult.error) {
      throw smallProjectPromiseResult.error;
    }

    if (!projectPromiseResult.data || projectPromiseResult.data.length === 0) {
      throw new Error("Project Data couldn't get.");
    }

    if (
      !smallProjectPromiseResult ||
      smallProjectPromiseResult.data.length === 0
    ) {
      throw new Error("Small Project Id couldn't get.");
    }

    const smallProjectIdList: number[] = smallProjectPromiseResult.data
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((smallProject) => smallProject.id);

    const [
      smallProjectMembersData,
      smallProjectStatusData,
      smallProjectTaskGenreData,
      smallProjectAttachedFileData,
      smallProjectWikiData
    ] = await Promise.all([
      getSmallProjectMember(smallProjectIdList),
      getSmallProjectStatus(smallProjectIdList),
      getSmallProjectTaskGenre(smallProjectIdList),
      fetchAttachedFiles(0, smallProjectIdList),
      getSmallProjectWikiData(smallProjectIdList)
    ]);

    const { data: tasksData, error: selectTasksDataError } =
      await clientSupabase
        .from("tasks")
        .select(
          "*, task_status(status), small_projects (id, small_project_name, projects (project_name)), users(name)"
        )
        .in("small_project_id", smallProjectIdList)
        .order("created_at", { ascending: true });

    if (selectTasksDataError) {
      throw selectTasksDataError;
    }

    const tasksDividedBySmallProjectId = smallProjectIdList.map(
      (smallProjectId) => {
        return {
          smallProjectId: smallProjectId,
          taskDataArray: tasksData.filter(
            (task) => task.small_projects.id === smallProjectId
          ),
        };
      }
    );

    const taskAttachedFileData = await Promise.all(
      tasksDividedBySmallProjectId.map(async (tasks) => ({
        smallProjectId: tasks.smallProjectId,
        fileDataList: await fetchAttachedFiles(
          1,
          tasks.taskDataArray.map((taskData) => taskData.id)
        ),
      }))
    );

    const projectData = projectPromiseResult.data;
    const smallProjectData = smallProjectPromiseResult.data;
    return {
      projectData,
      smallProjectIdList,
      smallProjectData,
      smallProjectMembersData,
      smallProjectStatusData,
      smallProjectTaskGenreData,
      tasksDividedBySmallProjectId,
      smallProjectAttachedFileData,
      taskAttachedFileData,
      smallProjectWikiData
    };
  } catch (error) {
    console.error("Error Fetch Project Details Data ", error);
    return {};
  }
};
