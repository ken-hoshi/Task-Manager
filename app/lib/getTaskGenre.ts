import { clientSupabase } from "./supabase/client";

export async function getTaskGenre(taskGenreId: number) {
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
        .select("id")
        .eq("task_genre_id", taskGenreId),
    ]);

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    if (selectTasksError) {
      throw selectTasksError;
    }

    if (!taskGenreData) {
      return [];
    }

    return {
      id:taskGenreData.id,
      taskGenreName: taskGenreData.task_genre_name,
      numberOfPersons: tasks.length,
      startDate: taskGenreData.start_date,
      deadlineDate: taskGenreData.deadline_date,
      numberOfDays: Math.ceil(
        (new Date(taskGenreData.deadline_date).getTime() -
          new Date(taskGenreData.start_date).getTime()) /
          (1000 * 60 * 60 * 24) +
          1
      ),
    };
  } catch (error) {
    console.error("Error get Task Genre:", error);
    return {};
  }
}
