import { clientSupabase } from "../supabase/client";

export async function getStatus() {
  try {
    const { data: statusList, error: statusSelectError } = await clientSupabase
      .from("task_status")
      .select("*");

    if (statusSelectError) {
      throw statusSelectError;
    }

    if (!statusList || statusList.length === 0) {
      return [];
    }

    return statusList;
  } catch (error) {
    console.error("Error Fetch Status ", error);
    return [];
  }
}
