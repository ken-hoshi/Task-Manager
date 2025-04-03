import { clientSupabase } from "../supabase/client";

interface SmallProjectMembersProps {
  smallProjectId: number;
  membersDataArray: {
    id: number;
    name: string;
  }[];
}

interface SmallProjectUser {
  small_project_id: number;
  users: { id: number; name: string };
}

export async function getSmallProjectMember(
  smallProjectIdList: number[]
): Promise<SmallProjectMembersProps[]> {
  try {
    const {
      data: smallProjectUserData,
      error: smallProjectUserDataSelectError,
    } = await clientSupabase
      .from("small_project_users")
      .select("small_project_id, users!inner(id, name)")
      .in("small_project_id", smallProjectIdList);

    if (smallProjectUserDataSelectError) {
      throw smallProjectUserDataSelectError;
    }

    if (!smallProjectUserData || smallProjectUserData.length === 0) {
      return [];
    }

    const typedData = smallProjectUserData.map((item) => ({
      small_project_id: item.small_project_id,
      users: Array.isArray(item.users) ? item.users[0] : item.users,
    })) as SmallProjectUser[];

    const groupedData = typedData.reduce<{
      [key: number]: { id: number; name: string }[];
    }>((acc, curr) => {
      const projectId = curr.small_project_id;
      const user = curr.users;

      if (!acc[projectId]) {
        acc[projectId] = [];
      }

      acc[projectId].push({ id: user.id, name: user.name });
      return acc;
    }, {});

    const result: SmallProjectMembersProps[] = Object.entries(groupedData).map(
      ([smallProjectId, membersDataArray]) => ({
        smallProjectId: Number(smallProjectId),
        membersDataArray,
      })
    );

    return result;
  } catch (error) {
    console.error("Fetch Project Members", error);
    return [];
  }
}
