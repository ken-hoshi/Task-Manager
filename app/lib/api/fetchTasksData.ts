import { clientSupabase } from "../supabase/client";

export async function fetchTasksData(userId?: number) {
  try {
    if (userId) {
      const { data: tasks, error: tasksSelectError } = await clientSupabase
        .from("tasks")
        .select(
          "*, task_status(status), small_projects (small_project_name, projects (project_name)), users(name)"
        )
        .eq("assigned_user_id", userId)
        .order("created_at", { ascending: true });

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
        "*, task_status(status), small_projects (small_project_name, projects (project_name), isFinished), users(name)"
      )
      .order("created_at", { ascending: true });

    if (tasksSelectError) {
      throw tasksSelectError;
    }
    if (!tasks || tasks.length === 0) {
      return [];
    }
    return tasks;
  } catch (error) {
    console.error("Error Fetch Tasks ", error);
    return [];
  }
}
