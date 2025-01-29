import { getSmallProjectData } from "./getSmallProjectData";
import { getSmallProjectMember } from "./getSmallProjectMember";
import { getSmallProjectStatus } from "./getSmallProjectStatus";

export const fetchSmallProjectData = async (userId?: number) => {
  try {
    const smallProjectData = userId
      ? await getSmallProjectData(userId)
      : await getSmallProjectData();

    if (!smallProjectData) {
      throw new Error("Small Project Data couldn't get.");
    }

    const smallProjectIdList = smallProjectData.map(
      (smallProject) => smallProject.id
    );

    const [smallProjectMembersData, smallProjectStatusData] = await Promise.all(
      [
        getSmallProjectMember(smallProjectIdList),
        getSmallProjectStatus(smallProjectIdList),
      ]
    );
    if (!smallProjectMembersData) {
      throw new Error("Small Project Member Data couldn't get.");
    } else if (!smallProjectStatusData) {
      throw new Error("Small Project Status Data couldn't get.");
    }

    return {
      smallProjectData,
      smallProjectMembersData,
      smallProjectStatusData,
    };
  } catch (error) {
    console.error("Error Fetch Small Project Data ", error);
    return {};
  }
};
