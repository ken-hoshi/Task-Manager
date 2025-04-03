import { clientSupabase } from "../supabase/client";

export async function fetchTasksData(workspaceId: number) {
  try {
    const { data: projectDataArray, error: selectProjectDataArrayError } =
      await clientSupabase
        .from("workspace")
        .select("projects(small_projects(id))")
        .eq("id", workspaceId)
        .order("id", { ascending: true });

    if (selectProjectDataArrayError) {
      throw selectProjectDataArrayError;
    }

    if (!projectDataArray || projectDataArray.length === 0) {
      return [];
    }

    const smallProjectIdList: number[] = projectDataArray
      ?.flatMap((projectData) => projectData.projects)
      .flatMap((project) => project.small_projects)
      .map((smallProject) => smallProject.id);

    const { data: tasks, error: tasksSelectError } = await clientSupabase
      .from("tasks")
      .select(
        "*, task_status(status), small_projects (small_project_name, projects (project_name), isFinished), users(name)"
      )
      .in("small_project_id", smallProjectIdList)
      .order("created_at", { ascending: true });

    if (tasksSelectError) {
      throw tasksSelectError;
    }
    if (!tasks || tasks.length === 0) {
      return [];
    }
    return tasks;
  } catch (error) {
    console.error("Fetch Tasks", error);
    return [];
  }
}
