import { clientSupabase } from "../supabase/client";

export async function getSmallProjectTaskGenre(smallProjectIdList: number[]) {
  try {
    const { data: taskGenreData, error: selectTaskGenreDataError } =
      await clientSupabase
        .from("task_genre")
        .select("*, tasks(assigned_user_id)")
        .in("small_project_id", smallProjectIdList)
        .order("start_date", { ascending: true });

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    // ジャンルが無い小プロジェクトも、空の配列を持つ要素として返す（呼び出し側は要素がある前提）
    const taskGenreArrayBySmallProjects = smallProjectIdList.map(
      (smallProjectId) => ({
        smallProjectId: smallProjectId,
        taskGenreDataArray: (taskGenreData ?? [])
          .filter((taskGenre) => taskGenre.small_project_id === smallProjectId)
          .map((taskGenre) => {
            return {
              taskGenreId: taskGenre.id,
              taskGenreName: taskGenre.task_genre_name,
              numberOfPersons: new Set(
                (taskGenre.tasks ?? []).map(
                  (task: { assigned_user_id: number | null }) =>
                    task.assigned_user_id
                )
              ).size,
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
    console.error("Get project Task Genre", error);
    return [];
  }
}
