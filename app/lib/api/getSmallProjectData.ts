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
      const { data: projectDataArray, error: selectProjectDataArrayError } =
        await query;

      if (selectProjectDataArrayError) {
        throw selectProjectDataArrayError;
      }

      const workspaceSmallProjects = projectDataArray.flatMap((projectData) =>
        projectData.projects.flatMap((project) => project.small_projects)
      );
      if (workspaceSmallProjects.length === 0) {
        return [];
      }

      // メンバーの行は、このワークスペースの小プロジェクトの分だけ読む（userId が 0 なら全員分）
      let smallProjectUsersQuery = clientSupabase
        .from("small_project_users")
        .select("small_project_id")
        .in(
          "small_project_id",
          workspaceSmallProjects.map((smallProject) => smallProject.id)
        );
      if (userId !== 0) {
        smallProjectUsersQuery = smallProjectUsersQuery.eq("user_id", userId);
      }

      const {
        data: smallProjectBelongsUserData,
        error: selectSmallProjectBelongsUserDataError,
      } = await smallProjectUsersQuery;

      if (selectSmallProjectBelongsUserDataError) {
        throw selectSmallProjectBelongsUserDataError;
      }

      const smallProjectBelongsUserIdList = (
        smallProjectBelongsUserData ?? []
      ).map((smallProjectUser) => smallProjectUser.small_project_id);

      return workspaceSmallProjects.filter((smallProject) =>
        smallProjectBelongsUserIdList.includes(smallProject.id)
      );
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
