import { clientSupabase } from "./supabase/client";

export async function getTaskGenreData(taskGenreId: number) {
  try {
    const [
      { data: taskGenreData, error: selectTaskGenreDataError },
      { data: tasks, error: selectTasksError },
    ] = await Promise.all([
      clientSupabase
        .from("task_genre")
        .select("*")
        .eq("id", taskGenreId)
        .single(),
      clientSupabase
        .from("tasks")
        .select("*,users(name)")
        .eq("task_genre_id", taskGenreId),
    ]);

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    if (selectTasksError) {
      throw selectTasksError;
    }

    if (!taskGenreData || taskGenreData.length > 0) {
      return [];
    }

    let assignedUserTaskResults: {
      userId: number;
      userName: string;
      taskName: string;
      numberOfResultDays: number;
    }[] = [];

    if (tasks && tasks.length > 0) {
      assignedUserTaskResults = tasks.map((task) => {
        return {
          userId: task.assigned_user_id,
          userName: task.users.name,
          taskName: task.task_name,
          numberOfResultDays: task.number_of_result_days,
        };
      });
    }

    return {
      id: taskGenreData.id,
      taskGenreName: taskGenreData.task_genre_name,
      numberOfPersons: tasks && tasks.length > 0 ? tasks.length : 0,
      startDate: taskGenreData.start_date,
      deadlineDate: taskGenreData.deadline_date,
      numberOfDays: Math.ceil(
        (new Date(taskGenreData.deadline_date).getTime() -
          new Date(taskGenreData.start_date).getTime()) /
          (1000 * 60 * 60 * 24) +
          1
      ),
      assignedUserTaskResultData: assignedUserTaskResults,
    };
  } catch (error) {
    console.error("Error Get Task Genre ", error);
    return {};
  }
}
