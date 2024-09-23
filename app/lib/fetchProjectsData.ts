import { getProjects } from "./getProject";
import { getProjectMember } from "./getProjectMember";
import { getProjectStatus } from "./getProjectStatus";

export const fetchProjectsData = async (userId?: number) => {
  try {
    const projectsData = userId
      ? await getProjects(userId)
      : await getProjects();

    if (!projectsData) {
      throw new Error("Projects data are Null");
    }

    const [projectMembersData, projectStatusData] = await Promise.all([
      Promise.all(projectsData.map((project) => getProjectMember(project.id))),
      Promise.all(projectsData.map((project) => getProjectStatus(project.id))),
    ]);
    if (!projectMembersData) {
      throw new Error("Project Members Data are Null");
    } else if (!projectStatusData) {
      throw new Error("project Status Data are Null");
    }

    return { projectsData, projectMembersData, projectStatusData };
  } catch (error) {
    console.error("Error fetch projects data:", error);
    return {};
  }
};
