import classNames from "classnames";
import styles from "./projectsArea.module.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddButton from "@/app/component/addButton/addButton";
import { Arrow } from "@/app/component/arrow/arrow";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import EditButton from "@/app/component/editButton/editButton";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { fetchProjectsData } from "@/app/lib/fetchProjectsData";

interface ProjectsAreaProps {
  projects: any[];
  projectMembers: string[];
  projectStatus: any[];
  attachmentFileList: File[][];
  downloadUrlList: (string | null)[][];
  userId: number;
}

const ProjectsArea: React.FC<ProjectsAreaProps> = ({
  projects,
  projectMembers,
  projectStatus,
  attachmentFileList,
  downloadUrlList,
  userId,
}) => {
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();

  const router = useRouter();

  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [projectMembersData, setProjectMembersData] = useState<string[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [projectArrowsData, setProjectArrowsData] = useState<boolean[]>([]);
  const [attachmentFileListData, setAttachmentFileListData] = useState<
    File[][]
  >([[]]);
  const [downloadUrlListData, setDownloadUrlListData] = useState<
    (string | null)[][]
  >([[]]);

  const [onFilter, setOnFiler] = useState(false);

  useEffect(() => {
    if (projects.length > 0) {
      setProjectsData(projects);
      setProjectArrowsData(new Array(projects.length).fill(false));
      setProjectMembersData(projectMembers);
      setProjectStatusData(projectStatus);
      setAttachmentFileListData(attachmentFileList);
      setDownloadUrlListData(downloadUrlList);
    }
  }, [pageUpdated]);

  const handleFilter = () => {
    if (!onFilter) {
      const filterProjects = async () => {
        const filteredProjects = await fetchProjectsData(userId);

        if (
          !filteredProjects.projectsData ||
          !filteredProjects.projectMembersData ||
          !filteredProjects.projectStatusData
        ) {
          console.error("Error fetch Projects Data: Projects Data are null");
          setNotificationValue({
            message: "Couldn't get the Projects data.",
            color: 1,
          });
        } else {
          const filteredProjectsIdList = filteredProjects.projectsData.map(
            (filteredProject) => filteredProject.id
          );

          const filteredAttachmentFilesData = projectsData.reduce(
            (result, project, index) => {
              if (filteredProjectsIdList.includes(project.id)) {
                result.attachmentFiles.push(attachmentFileListData[index]);
                result.downloadUrls.push(downloadUrlListData[index]);
              }
              return result;
            },
            {
              attachmentFiles: [],
              downloadUrls: [],
            }
          );

          const filteredProjectMembersList =
            filteredProjects.projectMembersData.map((projectMember) =>
              projectMember.map((member) => member.name).join("、")
            );

          setProjectsData(filteredProjects.projectsData);
          setProjectArrowsData(
            new Array(filteredProjects.projectsData.length).fill(false)
          );
          setProjectMembersData(filteredProjectMembersList);
          setProjectStatusData(filteredProjects.projectStatusData);
          setAttachmentFileListData(
            filteredAttachmentFilesData.attachmentFiles
          );
          setDownloadUrlListData(filteredAttachmentFilesData.downloadUrls);
        }
      };
      filterProjects();
    } else {
      setPageUpdated(true);
    }
    setOnFiler(!onFilter);
  };

  const handleNullCheck = (index: number, i: number) => {
    if (!downloadUrlList[index][i]) {
      console.error("Attached File is null.");
      setNotificationValue({
        message: "Couldn't download Attached File.",
        color: 1,
      });
    }
  };

  const handleTransitionProjectDetail = (projectId: number, userId: number) => {
    router.push(`/project?id=${projectId}&userId=${userId}`);
  };

  return (
    <div className={styles[`project-area`]}>
      <div className={styles["title"]}>
        <div className={styles[`title-icon-container`]}>
          <span
            className={classNames(
              "material-symbols-outlined",
              styles["title-icon"]
            )}
          >
            folder_check
          </span>
        </div>
        PROJECTS
      </div>
      <table>
        <thead>
          <tr>
            <th className={styles[`col-project-name`]}>
              Project Name
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-status-situation`]}>
              Status Situation
              <div className={styles.separator}></div>
            </th>
            <th className={styles[`col-actions`]}>
              <span
                className={classNames(
                  "material-symbols-outlined",
                  {
                    [styles.onFilter]: onFilter,
                    [styles.offFilter]: !onFilter,
                  },
                  styles.tooltip
                )}
                onClick={handleFilter}
              >
                {" "}
                filter_alt{" "}
                <span className={styles.tooltipText}>
                  自分が含まれるプロジェクトに絞り込みます。
                </span>
              </span>
              <div className={styles.separator}></div>
            </th>

            <th className={styles[`col-actions`]}>
              <AddButton target={0} userId={userId} />
            </th>
          </tr>
        </thead>

        <tbody>
          {projectsData.length > 0 ? (
            projectsData.map((project, index) => (
              <React.Fragment key={project.id}>
                <tr
                  className={classNames(
                    project.id == newItem.id && newItem.target == 0
                      ? styles.blink
                      : "",
                    styles[`record-hover`]
                  )}
                >
                  <td className={styles[`col-project-name`]}>
                    <div className={styles[`arrow-container`]}>
                      <Arrow
                        setProjectArrows={setProjectArrowsData}
                        projectArrows={projectArrowsData}
                        index={index}
                        target={0}
                      />
                    </div>
                    <p
                      className={styles[`project-name`]}
                      onClick={() =>
                        handleTransitionProjectDetail(project.id, userId)
                      }
                    >
                      {project.project_name}
                    </p>
                  </td>
                  <td
                    className={styles[`col-status-situation`]}
                    onClick={() =>
                      handleTransitionProjectDetail(project.id, userId)
                    }
                  >
                    <div className={styles[`status-situation-part`]}>
                      <div className={styles[`status-icon-part`]}>
                        <div
                          className={classNames(
                            styles[`status-icon`],
                            styles[`not-started`]
                          )}
                        >
                          Not Started
                        </div>
                        <div className={styles.value}>
                          {projectStatusData[index].notStarted}
                        </div>
                      </div>
                      <div className={styles[`status-icon-part`]}>
                        <div
                          className={classNames(
                            styles[`status-icon`],
                            styles[`processing`]
                          )}
                        >
                          Processing
                        </div>
                        <div className={styles.value}>
                          {projectStatusData[index].processing}
                        </div>
                      </div>
                      <div className={styles[`status-icon-part`]}>
                        <div
                          className={classNames(
                            styles[`status-icon`],
                            styles[`completed`]
                          )}
                        >
                          Completed
                        </div>
                        <div className={styles.value}>
                          {projectStatusData[index].completed}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className={styles[`col-actions`]}>
                    <EditButton
                      projectId={project.id}
                      taskId={null}
                      userId={userId}
                    />
                    <DeleteButton
                      projectId={project.id}
                      taskId={null}
                      userId={userId}
                    />
                  </td>
                </tr>

                <tr
                  className={
                    projectArrowsData[index]
                      ? styles.detailOpen
                      : styles.detailHidden
                  }
                >
                  <td colSpan={3}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <dt>Member</dt>
                        <dd>{projectMembersData[index]}</dd>
                        <dt>Detail</dt>
                        <dd className={styles[`detail-area`]}>
                          {project.details ? project.details : "No Detail"}
                        </dd>
                        <dt>Attached Files</dt>
                        <dd
                          className={classNames(
                            styles["attachmentFile-area"],
                            styles[`dd-last`]
                          )}
                        >
                          {attachmentFileListData[index] &&
                          attachmentFileListData[index].length > 0
                            ? attachmentFileListData[index].map(
                                (file: any, i) => (
                                  <div
                                    className={
                                      styles["display-attachmentFile-container"]
                                    }
                                    key={i}
                                  >
                                    <div className={styles["file-info"]}>
                                      <a
                                        href={
                                          downloadUrlListData[index][i] || "#"
                                        }
                                        onClick={() =>
                                          handleNullCheck(index, i)
                                        }
                                        download={file.name}
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles.downloadIcon
                                          )}
                                        >
                                          download
                                        </span>
                                      </a>
                                    </div>
                                    <p>{file.name}</p>
                                  </div>
                                )
                              )
                            : "No Attached File"}
                        </dd>
                      </dl>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={3} className={styles[`non-projects`]}>
                No Project
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsArea;
