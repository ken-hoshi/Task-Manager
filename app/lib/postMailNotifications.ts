import { getProjectMember } from "./getProjectMember";
import { clientSupabase } from "./supabase/client";

export async function postMailNotifications(
  otherId: number | null,
  taskId: number | null,
  projectId: number | null,
  type: number,
  idList: number[]
) {
  try {
    if (
      !otherId &&
      taskId &&
      !projectId &&
      (type === 4 || type === 5 || type === 6)
    ) {
      const { data: taskData, error: selectTaskDataError } =
        await clientSupabase
          .from("tasks")
          .select("task_name, assigned_user_id")
          .eq("id", taskId)
          .single();

      if (selectTaskDataError) {
        throw selectTaskDataError;
      }

      const text =
        "タスク「" +
        taskData.task_name +
        "」の期限は" +
        { 4: "明後日", 5: "明日", 6: "本日" }[type] +
        "です！";

      const {
        data: mailNotificationsData,
        error: selectMailNotificationsDataError,
      } = await clientSupabase
        .from("mail_notifications")
        .select("id")
        .eq("user_id", taskData.assigned_user_id)
        .eq("text", text);

      if (selectMailNotificationsDataError) {
        throw selectMailNotificationsDataError;
      }

      if (mailNotificationsData.length === 0) {
        const { error: insertMailNotificationsError } = await clientSupabase
          .from("mail_notifications")
          .insert({
            user_id: taskData.assigned_user_id,
            text: text,
            created_at: new Date().toISOString(),
          });

        if (insertMailNotificationsError) {
          throw insertMailNotificationsError;
        }
      }
    } else if (taskId && !projectId) {
      const [taskResult, userResult] = await Promise.all([
        clientSupabase
          .from("tasks")
          .select("task_name, assigned_user_id")
          .eq("id", taskId)
          .single(),

        clientSupabase.from("users").select("name").eq("id", otherId).single(),
      ]);
      const { data: taskData, error: taskDataSelectError } = taskResult;
      const { data: userName, error: userNameSelectError } = userResult;

      if (taskDataSelectError) {
        throw taskDataSelectError;
      }

      if (userNameSelectError) {
        throw userNameSelectError;
      }

      if (otherId != taskData.assigned_user_id) {
        const text =
          userName.name +
          "さんがタスク「" +
          taskData.task_name +
          (type === 3 ? "」に" : "」を") +
          { 0: "追加", 1: "編集", 2: "削除", 3: "コメント" }[type] +
          "しました。";

        const { error: insertMailNotificationsError } = await clientSupabase
          .from("mail_notifications")
          .insert({
            user_id: taskData.assigned_user_id,
            text: text,
            created_at: new Date().toISOString(),
          });

        if (insertMailNotificationsError) {
          throw insertMailNotificationsError;
        }
      }
    } else if (projectId && !taskId) {
      const { data: projectData, error: projectDataSelectError } =
        await clientSupabase
          .from("projects")
          .select("project_name")
          .eq("id", projectId)
          .single();

      if (projectDataSelectError) {
        throw projectDataSelectError;
      }

      const text = {
        0:
          "プロジェクト「" +
          projectData.project_name +
          "」のメンバーに追加されました。",
        1:
          "プロジェクト「" +
          projectData.project_name +
          "」のメンバーから削除されました。",
        3: "プロジェクト「" + projectData.project_name + "」が削除されました。",
      }[type];

      if ((type === 0 || type === 1) && idList && idList.length > 0) {
        await Promise.all(
          idList
            .filter((id) => id != otherId)
            .map(async (filteredId) => {
              const { error: insertMailNotificationsError } =
                await clientSupabase.from("mail_notifications").insert({
                  user_id: filteredId,
                  text: text,
                  created_at: new Date().toISOString(),
                });

              if (insertMailNotificationsError) {
                throw insertMailNotificationsError;
              }
            })
        );
      } else {
        const projectMembers = await getProjectMember(projectId);

        if (projectMembers && projectMembers.length > 0) {
          await Promise.all(
            projectMembers
              .filter((projectMember) => projectMember.id != otherId)
              .map(async (filteredMember) => {
                const { error: insertMailNotificationsError } =
                  await clientSupabase.from("mail_notifications").insert({
                    user_id: filteredMember.id,
                    text: text,
                    created_at: new Date().toISOString(),
                  });

                if (insertMailNotificationsError) {
                  throw insertMailNotificationsError;
                }
              })
          );
        }
      }
    } else {
      throw new Error("Task ID or Project ID is null");
    }
    return;
  } catch (error) {
    return error;
  }
}
