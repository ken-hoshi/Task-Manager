import { clientSupabase } from "../supabase/client";

export async function getUserId(authUserId: string) {
  if (!authUserId) {
    console.error("No authUserId provided");
    return null;
  }

  try {
    const { data, error: userIdSelectError } = await clientSupabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (userIdSelectError) {
      throw userIdSelectError;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error Fetch User ID:", error);
    return null;
  }
}
