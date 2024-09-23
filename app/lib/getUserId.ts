import { clientSupabase } from "./supabase/client";

export async function getUserId(authUserId: string) {
  try {
    const { data, error: userIdSelectError } = await clientSupabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (userIdSelectError) {
      throw userIdSelectError;
    }

    if (data && data.id) {
      return data.id;
    } else {
      throw new Error("user_id not found");
    }
  } catch (error) {
    console.error("Error fetch User ID:", error);
    return null;
  }
}
