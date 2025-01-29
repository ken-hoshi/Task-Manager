import { clientSupabase } from "../supabase/client";

export async function getSmallProjectTaskGenre(smallProjectIdList: number[]) {
  try {
    const [
      { data: taskGenreData, error: selectTaskGenreDataError },
      { data: taskGenreIdList, error: selectTaskGenreIdListError },
    ] = await Promise.all([
      clientSupabase
        .from("task_genre")
        .select("*")
        .order("start_date", { ascending: true }),
      clientSupabase.from("tasks").select("task_genre_id"),
    ]);

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    if (!taskGenreData || taskGenreData.length === 0) {
      return [];
    }

    if (selectTaskGenreIdListError) {
      throw selectTaskGenreIdListError;
    }

    const taskGenreArrayBySmallProjects = smallProjectIdList.map(
      (smallProjectId) => ({
        smallProjectId: smallProjectId,
        taskGenreDataArray: taskGenreData
          .filter((taskGenre) => taskGenre.small_project_id === smallProjectId)
          .map((taskGenre) => {
            return {
              taskGenreId: taskGenre.id,
              taskGenreName: taskGenre.task_genre_name,
              numberOfPersons:
                taskGenreIdList && taskGenreIdList.length > 0
                  ? taskGenreIdList.filter(
                      (taskGenreId) =>
                        taskGenreId.task_genre_id === taskGenre.id
                    ).length
                  : 0,
              startDate: taskGenre.start_date,
              deadlineDate: taskGenre.deadline_date,
              numberOfDays: Math.ceil(
                (new Date(taskGenre.deadline_date).getTime() -
                  new Date(taskGenre.start_date).getTime()) /
                  (1000 * 60 * 60 * 24) +
                  1
              ),
            };
          }),
      })
    );
    return taskGenreArrayBySmallProjects;
  } catch (error) {
    console.error("Error Get project Task Genre ", error);
    return [];
  }
}
