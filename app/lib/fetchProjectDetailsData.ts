import { fetchAttachedFiles } from "./fetchAttachedFiles";
import { getProjectMember } from "./getProjectMember";
import { getProjectStatus } from "./getProjectStatus";
import { clientSupabase } from "./supabase/client";

export const fetchProjectDetailsData = async (projectId: number) => {
  try {
    const [projectMembersData, projectStatusData] = await Promise.all([
      getProjectMember(projectId),
      getProjectStatus(projectId),
    ]);
    const { data: projectData, error: selectProjectDataError } =
      await clientSupabase.from("projects").select("*").eq("id", projectId);

    if (selectProjectDataError) {
      throw selectProjectDataError;
    }
    if (!projectData || projectData.length === 0) {
      throw new Error("Project Data is null");
    }

    const attachedFiles = await fetchAttachedFiles(0, [projectId]);

    const { data: tasksData, error: selectTasksDataError } =
      await clientSupabase
        .from("tasks")
        .select("*, task_status(status), projects(project_name), users(name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (selectTasksDataError) {
      throw selectTasksDataError;
    }
    return {
      projectData,
      projectMembersData,
      projectStatusData,
      attachedFiles,
      tasksData,
    };
  } catch (error) {
    console.error("Error Fetch Project Details Data ", error);
    return {};
  }
};
