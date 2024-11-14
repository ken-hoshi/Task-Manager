import { clientSupabase } from "./supabase/client";

export async function getProjectStatus(projectId: number) {
  try {
    const { data: statusList, error: statusSelectError } = await clientSupabase
      .from("tasks")
      .select("status_id")
      .eq("project_id", projectId);

    if (statusSelectError) {
      throw statusSelectError;
    }
    if (!statusList || statusList.length === 0) {
      return {
        notStarted: 0,
        processing: 0,
        completed: 0,
      };
    }

    const statusIdList = statusList.map((status) => status.status_id);

    const statusIdLength = statusIdList.reduce((score, currentValue) => {
      score[currentValue] = (score[currentValue] || 0) + 1;
      return score;
    }, {});

    return {
      notStarted: statusIdLength[1] || 0,
      processing: statusIdLength[2] || 0,
      completed: statusIdLength[3] || 0,
    };
  } catch (error) {
    console.error("Error Fetch Project Status:", error);
    return {};
  }
}
