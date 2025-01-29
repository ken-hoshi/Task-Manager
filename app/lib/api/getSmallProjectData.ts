import { clientSupabase } from "../supabase/client";

export async function getSmallProjectData(userId?: number) {
  try {
    let query = clientSupabase
      .from("small_projects")
      .select("*")
      .order("id", { ascending: true });

    if (userId) {
      const { data: smallProjectData, error: smallProjectDataSelectError } =
        await clientSupabase
          .from("small_project_users")
          .select("small_projects(id)")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

      if (smallProjectDataSelectError) {
        throw smallProjectDataSelectError;
      }
      if (!smallProjectData || smallProjectData.length === 0) {
        return [];
      }

      const smallProjectIdList = smallProjectData.map(
        (smallProject: any) => smallProject.small_projects.id
      );
      query = query.in("id", smallProjectIdList);
    }

    const { data: smallProjects, error: smallProjectsError } = await query;

    if (smallProjectsError) {
      throw smallProjectsError;
    }

    return smallProjects;
  } catch (error) {
    console.error("Error Fetch Small Project Data ", error);
    return [];
  }
}
