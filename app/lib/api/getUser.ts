import { clientSupabase } from "../supabase/client";

export async function getUsers(workspaceId: number) {
  try {
    const { data: usersData, error: selectUsersDataError } =
      await clientSupabase
        .from("workspace_users")
        .select("users(id, name)")
        .eq("workspace_id", workspaceId);

    if (selectUsersDataError) {
      throw selectUsersDataError;
    }

    if (!usersData || usersData.length === 0) {
      return [];
    }
    return usersData.map((userData) => ({
      id: (Array.isArray(userData.users) ? userData.users[0] : userData.users)
        .id,

      name: (Array.isArray(userData.users) ? userData.users[0] : userData.users)
        .name,
    }));
  } catch (error) {
    console.error("Fetch Users", error);
    return [];
  }
}
