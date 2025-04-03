import { clientSupabase } from "../supabase/client";

export async function getProjectData(
  userId: number | null,
  workspaceId: number
) {
  try {
    let query = clientSupabase
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (userId) {
      const { data: projectIdData, error: projectIdDataSelectError } =
        await clientSupabase
          .from("small_project_users")
          .select("small_projects(project_id)")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

      if (projectIdDataSelectError) {
        throw projectIdDataSelectError;
      }
      if (!projectIdData || projectIdData.length === 0) {
        return [];
      }

      const projectIdList = projectIdData.map(
        (projectId: any) => projectId.small_projects.project_id
      );

      query = query.in("id", projectIdList);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      throw projectsError;
    }

    return projects;
  } catch (error) {
    console.error("Fetch Project Data", error);
    return [];
  }
}
