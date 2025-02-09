import { clientSupabase } from "../supabase/client";

export async function getSmallProjectWikiData(smallProjectIdList: number[]) {
  try {
    const { data: wikiData, error: selectWikiDataError } = await clientSupabase
      .from("wiki")
      .select("id, title, content, small_project_id")
      .in("small_project_id", smallProjectIdList)
      .order("created_at", { ascending: true });

    if (selectWikiDataError) {
      throw selectWikiDataError;
    }

    if (!wikiData || wikiData.length === 0) {
      return [];
    }

    const wikiDataArrayBySmallProjects = smallProjectIdList.map(
      (smallProjectId) => ({
        smallProjectId: smallProjectId,
        wikiDataArray: wikiData.filter(
          (wiki) => wiki.small_project_id === smallProjectId
        ),
      })
    );

    return wikiDataArrayBySmallProjects;
  } catch (error) {
    console.error("Error Get Small Project Wiki Data ", error);
    return [];
  }
}
