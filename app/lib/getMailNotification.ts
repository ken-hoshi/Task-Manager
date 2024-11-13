import { clientSupabase } from "./supabase/client";

export async function getMailNotifications(userId: number) {
  try {
    const { data: mailNotifications, error: mailNotificationsSelectError } =
      await clientSupabase
        .from("mail_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: true });

    if (mailNotificationsSelectError) {
      throw mailNotificationsSelectError;
    }

    return mailNotifications;
  } catch (error) {
    console.error("Error fetch Mail Notifications:", error);
    return [];
  }
}
