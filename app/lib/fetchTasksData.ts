import { clientSupabase } from "./supabase/client";

export async function fetchTasksData(userId?: number) {
  try {
    if (userId) {
      const { data: tasks, error: tasksSelectError } = await clientSupabase
        .from("tasks")
        .select(
          "*, task_status(status), projects(project_name), users(name)"
        )
        .eq("assigned_user_id", userId)
        .order("id", { ascending: true });


      if (tasksSelectError) {
        throw tasksSelectError;
      }
      if (!tasks || tasks.length === 0) {
        return [];
      }
      return tasks;
    }
    const { data: tasks, error: tasksSelectError } = await clientSupabase
      .from("tasks")
      .select(
        "*, task_status(status), projects(project_name), users(name)"
      )
      .order("id", { ascending: true });

    if (tasksSelectError) {
      throw tasksSelectError;
    }
    if (!tasks || tasks.length === 0) {
      return [];
    }
    return tasks;
  } catch (error) {
    console.error("Error Fetch Tasks:", error);
    return [];
  }
}
