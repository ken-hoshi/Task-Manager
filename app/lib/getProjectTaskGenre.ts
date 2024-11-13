import { clientSupabase } from "./supabase/client";

export async function getProjectTaskGenre(projectIdList: number[]) {
  try {
    const [
      { data: taskGenreData, error: selectTaskGenreDataError },
      { data: taskGenreIdList, error: selectTaskGenreIdListError },
    ] = await Promise.all([
      clientSupabase
        .from("task_genre")
        .select("*")
        .order("id", { ascending: true }),
      clientSupabase.from("tasks").select("task_genre_id"),
    ]);

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    if (!taskGenreData) {
      return [];
    }

    if (selectTaskGenreIdListError) {
      throw selectTaskGenreIdListError;
    }

    const taskGenreArrayByProjects = projectIdList.map((projectId) => {
      return taskGenreData
        .filter((taskGenre) => taskGenre.project_id === projectId)
        .map((taskGenre) => {
          return {
            id: taskGenre.id,
            taskGenreName: taskGenre.task_genre_name,
            numberOfPersons: taskGenreIdList.filter(
              (taskGenreId) => taskGenreId.task_genre_id === taskGenre.id
            ).length,
            startDate: taskGenre.start_date,
            deadlineDate: taskGenre.deadline_date,
            numberOfDays: Math.ceil(
              (new Date(taskGenre.deadline_date).getTime() -
                new Date(taskGenre.start_date).getTime()) /
                (1000 * 60 * 60 * 24) +
                1
            ),
          };
        });
    });
    return taskGenreArrayByProjects;
  } catch (error) {
    console.error("Error get project Task Genre:", error);
    return [];
  }
}
