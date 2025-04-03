import { clientSupabase } from "../supabase/client";

export async function getWorkspace(userId: number) {
  try {
    const { data: workspaceData, error: selectWorkspaceDataError } =
      await clientSupabase
        .from("workspace_users")
        .select("workspace(id, workspace_name)")
        .eq("user_id", userId);

    if (selectWorkspaceDataError) {
      throw selectWorkspaceDataError;
    }
    return workspaceData;
  } catch (error) {
    console.error("Get Workspace", error);
    return [];
  }
}
