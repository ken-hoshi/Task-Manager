import { clientSupabase } from "../supabase/client";

interface ProjectStatus {
  notStarted: number;
  processing: number;
  completed: number;
}

export async function getSmallProjectStatus(
  smallProjectIdList: number[]
): Promise<
  {
    smallProjectId: number;
    projectId: number;
    notStarted: number;
    processing: number;
    completed: number;
  }[]
> {
  try {
    const { data: smallProjectList, error: smallProjectListSelectError } =
      await clientSupabase
        .from("small_projects")
        .select("id, project_id")
        .in("id", smallProjectIdList);

    if (smallProjectListSelectError) {
      throw smallProjectListSelectError;
    }

    if (!smallProjectList || smallProjectList.length === 0) {
      return [];
    }

    const { data: taskList, error: statusSelectError } = await clientSupabase
      .from("tasks")
      .select("small_project_id, status_id")
      .in("small_project_id", smallProjectIdList);

    if (statusSelectError) {
      throw statusSelectError;
    }

    const projectStatusMap: Record<number, ProjectStatus> = {};

    if (taskList) {
      for (const record of taskList) {
        const { small_project_id, status_id } = record;

        if (!projectStatusMap[small_project_id]) {
          projectStatusMap[small_project_id] = {
            notStarted: 0,
            processing: 0,
            completed: 0,
          };
        }

        if (status_id === 1) {
          projectStatusMap[small_project_id].notStarted += 1;
        } else if (status_id === 2) {
          projectStatusMap[small_project_id].processing += 1;
        } else if (status_id === 3) {
          projectStatusMap[small_project_id].completed += 1;
        }
      }
    }

    const result = smallProjectList.map((smallProject) => ({
      smallProjectId: smallProject.id,
      projectId: smallProject.project_id,
      notStarted: projectStatusMap[smallProject.id]?.notStarted || 0,
      processing: projectStatusMap[smallProject.id]?.processing || 0,
      completed: projectStatusMap[smallProject.id]?.completed || 0,
    }));

    return result;
  } catch (error) {
    console.error("Error Fetching Small Project Statuses", error);
    return [];
  }
}
