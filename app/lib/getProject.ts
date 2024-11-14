import { clientSupabase } from "./supabase/client";

export async function getProjects(userId?: number) {
  try {
    let query = clientSupabase
      .from("projects")
      .select("*")
      .order("id", { ascending: true });

    if (userId) {
      const { data: projectIds, error: projectUsersSelectError } =
        await clientSupabase
          .from("project_users")
          .select("project_id")
          .eq("user_id", userId)
          .order("id", { ascending: true });

      if (projectUsersSelectError) {
        throw projectUsersSelectError;
      }
      if (!projectIds || projectIds.length === 0) {
        return [];
      }

      const projectIdList = projectIds.map((projectId) => projectId.project_id);
      query = query.in("id", projectIdList);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      throw projectsError;
    }

    return projects;
  } catch (error) {
    console.error("Error Fetch Projects:", error);
    return [];
  }
}
