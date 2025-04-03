import { clientSupabase } from "../supabase/client";

export async function getTaskGenreData(taskIdList: number[]) {
  try {
    const { data: taskGenreData, error: selectTaskGenreDataError } =
      await clientSupabase
        .from("tasks")
        .select("*, users(name), task_genre(*)")
        .in("id", taskIdList)
        .order("id", { ascending: true });

    if (selectTaskGenreDataError) {
      throw selectTaskGenreDataError;
    }

    if (!taskGenreData || taskGenreData.length === 0) {
      return [];
    }

    const taskGenreDataArray = Promise.all(
      taskGenreData.map(async (task) => {
        if (!task.task_genre_id) {
          return {
            taskId: task.id,
            assignedUserTaskResultData: [
              {
                userId: task.assigned_user_id,
                userName: task.users.name,
                taskName: task.task_name,
                numberOfResultDays: task.number_of_result_days
                  ? task.number_of_result_days
                  : 0,
              },
            ],
          };
        }

        let assignedUserTaskResults: {
          userId: number;
          userName: string;
          taskId: number;
          taskName: string;
          numberOfResultDays: number;
        }[] = [];

        const {
          data: taskDataMatchedTaskGenreId,
          error: selectTaskDataMatchedTaskGenreIdError,
        } = await clientSupabase
          .from("tasks")
          .select("*, users(name)")
          .eq("task_genre_id", task.task_genre_id);

        if (selectTaskDataMatchedTaskGenreIdError) {
          throw selectTaskDataMatchedTaskGenreIdError;
        }

        if (
          taskDataMatchedTaskGenreId &&
          taskDataMatchedTaskGenreId.length > 0
        ) {
          assignedUserTaskResults = taskDataMatchedTaskGenreId.map((task) => {
            return {
              userId: task.assigned_user_id,
              userName: task.users.name,
              taskId: task.id,
              taskName: task.task_name,
              numberOfResultDays: task.number_of_result_days,
            };
          });
        }

        return {
          taskId: task.id,
          taskGenreId: task.task_genre_id,
          taskGenreName: task.task_genre.task_genre_name,
          numberOfPersons:
            taskDataMatchedTaskGenreId && taskDataMatchedTaskGenreId.length > 0
              ? taskDataMatchedTaskGenreId.length
              : 0,
          startDate: task.task_genre.start_date,
          deadlineDate: task.task_genre.deadline_date,
          numberOfDays: Math.ceil(
            (new Date(task.task_genre.deadline_date).getTime() -
              new Date(task.task_genre.start_date).getTime()) /
              (1000 * 60 * 60 * 24) +
              1
          ),
          assignedUserTaskResultData: assignedUserTaskResults,
        };
      })
    );
    return taskGenreDataArray;
  } catch (error) {
    console.error("Get Task Genre", error);
    return [];
  }
}
