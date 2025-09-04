import { clientSupabase } from "../supabase/client";

export async function getSmallProjectData(
  userId: number | null,
  workspaceId: number
) {
  try {
    let query = clientSupabase
      .from("workspace")
      .select("projects(small_projects(*))")
      .eq("id", workspaceId)
      .order("id", { ascending: true });

    if (userId || userId === 0) {
      const {
        data: smallProjectBelongsUserData,
        error: selectSmallProjectBelongsUserDataError,
      } =
        userId === 0
          ? await clientSupabase
              .from("small_project_users")
              .select("small_projects(id)")
              .order("created_at", { ascending: true })
          : await clientSupabase
              .from("small_project_users")
              .select("small_projects(id)")
              .eq("user_id", userId)
              .order("created_at", { ascending: true });

      if (selectSmallProjectBelongsUserDataError) {
        throw selectSmallProjectBelongsUserDataError;
      }
      if (
        !smallProjectBelongsUserData ||
        smallProjectBelongsUserData.length === 0
      ) {
        return [];
      }

      const smallProjectBelongsUserIdList: number[] = (
        smallProjectBelongsUserData as any[]
      ).flatMap(
        (smallProjectBelongsUser) => smallProjectBelongsUser.small_projects.id
      );

      const { data: projectDataArray, error: selectProjectDataArrayError } =
        await query;

      if (selectProjectDataArrayError) {
        throw selectProjectDataArrayError;
      }

      const filteredSmallProjects = projectDataArray.flatMap((projectData) =>
        projectData.projects.flatMap((project) =>
          project.small_projects.filter((smallProject) =>
            smallProjectBelongsUserIdList.includes(smallProject.id)
          )
        )
      );

      return filteredSmallProjects;
    }

    const { data: projectDataArray, error: selectProjectDataArrayError } =
      await query;

    if (selectProjectDataArrayError) {
      throw selectProjectDataArrayError;
    }

    return (
      projectDataArray
        ?.flatMap((projectData) => projectData.projects)
        .flatMap((project) => project.small_projects) ?? []
    );
  } catch (error) {
    console.error("Fetch Small Project Data", error);
    return [];
  }
}
