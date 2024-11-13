import { clientSupabase } from "./supabase/client";

export async function getProjectMember(projectId: number) {
  try {
    const { data: userIds, error: userIdsSelectError } = await clientSupabase
      .from("project_users")
      .select("user_id")
      .eq("project_id", projectId);

    if (userIdsSelectError) {
      throw userIdsSelectError;
    }
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const userIdList = userIds.map((userId) => userId.user_id);
    const { data: users, error: userSelectError } = await clientSupabase
      .from("users")
      .select("id, name")
      .in("id", userIdList);

    if (userSelectError) {
      throw userSelectError;
    }
    if (!users || users.length === 0) {
      return [];
    }
    return users;
  } catch (error) {
    console.error("Error fetch Project Members:", error);
    return [];
  }
}
