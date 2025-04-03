import { clientSupabase } from "../supabase/client";

export async function getUserId(authUserId: string) {
  try {
    if (!authUserId) {
      throw new Error("Auth User Id was not provided");
    }
    const { data, error: userIdSelectError } = await clientSupabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId);

    if (userIdSelectError) {
      throw userIdSelectError;
    }

    if (!data || data.length === 0 || data.length > 1) {
      return null;
    }

    return data[0].id;
  } catch (error) {
    console.error("Fetch User ID", error);
    return null;
  }
}
