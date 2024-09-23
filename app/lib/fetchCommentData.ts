import { clientSupabase } from "./supabase/client";

export async function fetchCommentData(taskId: number) {
  try {
    const { data: commentData, error: commentDataSelectError } =
      await clientSupabase
        .from("comments")
        .select("*,users(name)")
        .eq( "task_id", taskId )
        .order("created_at", { ascending: true });

    if (commentDataSelectError) {
      throw commentDataSelectError;
    }
    if (!commentData || commentData.length === 0) {
      return [];
    }

    return commentData;
  } catch (error) {
    console.error("Error fetch comments:", error);
    return [];
  }
}
