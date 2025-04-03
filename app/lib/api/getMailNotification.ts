import { clientSupabase } from "../supabase/client";

export async function getMailNotifications(
  userId: number,
  workspaceId: number
) {
  try {
    const { data: mailNotifications, error: mailNotificationsSelectError } =
      await clientSupabase
        .from("mail_notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

    if (mailNotificationsSelectError) {
      throw mailNotificationsSelectError;
    }

    return mailNotifications;
  } catch (error) {
    console.error("Fetch Mail Notifications", error);
    return [];
  }
}
