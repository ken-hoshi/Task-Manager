import { clientSupabase } from "../supabase/client";

export const getSmallProjectIdList = async (projectId: number) => {
  try {
    const { data: smallProjectIdData, error: selectSmallProjectIdListError } =
      await clientSupabase
        .from("small_projects")
        .select("id")
        .eq("project_id", projectId)
        .order("id", { ascending: true });

    if (selectSmallProjectIdListError) {
      throw selectSmallProjectIdListError;
    }

    const smallProjectIdList: number[] = smallProjectIdData.map(
      (smallProjectId) => smallProjectId.id
    );
    return smallProjectIdList;
  } catch (error) {
    console.error("Get Small Project ID List", error);
    return [];
  }
};
