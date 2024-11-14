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
import { formatDate } from "@/app/lib/formatDateTime";

interface ProjectsAreaProps {
  projects: any[];
  projectMembers: string[][];
  projectStatus: any[];
  projectTaskGenre: any[];
  attachedFileList: File[][];
  downloadUrlList: (string | null)[][];
  userId: number;
}

const ProjectsArea: React.FC<ProjectsAreaProps> = ({
  projects,
  projectMembers,
  projectStatus,
  projectTaskGenre,
  attachedFileList,
  downloadUrlList,
  userId,
}) => {
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();

  const router = useRouter();

  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [projectMembersData, setProjectMembersData] = useState<string[][]>([]);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [projectTaskGenreData, setProjectTaskGenreData] = useState<any[]>([]);
  const [projectArrowsData, setProjectArrowsData] = useState<boolean[]>([]);
  const [attachedFileListData, setAttachedFileListData] = useState<File[][]>([
    [],
  ]);
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
      setProjectTaskGenreData(projectTaskGenre);
      setAttachedFileListData(attachedFileList);
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
          console.error("Error Fetch Projects Data: Projects Data are null");
          setNotificationValue({
            message: "Couldn't get the Projects data.",
            color: 1,
          });
        } else {
          const filteredProjectsIdList = filteredProjects.projectsData.map(
            (filteredProject) => filteredProject.id
          );

          const filteredAttachedFilesData = projectsData.reduce(
            (result, project, index) => {
              if (filteredProjectsIdList.includes(project.id)) {
                result.attachedFiles.push(attachedFileListData[index]);
                result.downloadUrls.push(downloadUrlListData[index]);
              }
              return result;
            },
            {
              attachedFiles: [],
              downloadUrls: [],
            }
          );

          const filteredProjectMembersList =
            filteredProjects.projectMembersData.map((projectMember) =>
              projectMember.map((member) => member.name)
            );

          setProjectsData(filteredProjects.projectsData);
          setProjectArrowsData(
            new Array(filteredProjects.projectsData.length).fill(false)
          );
          setProjectMembersData(filteredProjectMembersList);
          setProjectStatusData(filteredProjects.projectStatusData);
          setAttachedFileListData(filteredAttachedFilesData.attachedFiles);
          setDownloadUrlListData(filteredAttachedFilesData.downloadUrls);
        }
      };
      filterProjects();
    } else {
      setPageUpdated(true);
    }
    setOnFiler(!onFilter);
  };

  const handleTransitionProjectDetails = (
    projectId: number,
    userId: number
  ) => {
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
      <table className={styles[`project-table`]}>
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
                    [styles[`on-filter`]]: onFilter,
                    [styles[`off-filter`]]: !onFilter,
                  },
                  styles.tooltip
                )}
                onClick={handleFilter}
              >
                {" "}
                filter_alt{" "}
                <span className={styles[`tooltip-text`]}>
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
                        handleTransitionProjectDetails(project.id, userId)
                      }
                    >
                      {project.project_name}
                    </p>
                  </td>
                  <td
                    className={styles[`col-status-situation`]}
                    onClick={() =>
                      handleTransitionProjectDetails(project.id, userId)
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
                      ? styles[`details-open`]
                      : styles[`details-hidden`]
                  }
                >
                  <td colSpan={3}>
                    <div className={styles[`scrollable-content`]}>
                      <dl>
                        <dt>Member</dt>
                        <dd className={styles[`member-area`]}>
                          {projectMembersData[index].map(
                            (projectMember, index) => (
                              <div className={styles.member} key={index}>
                                {projectMember}
                              </div>
                            )
                          )}
                        </dd>

                        <dt>Task Genre</dt>
                        <dd>
                          {projectTaskGenreData[index] ? (
                            <div className={styles[`task-genre-area`]}>
                              {projectTaskGenreData[index].map(
                                (projectTaskGenre: any, index: number) => (
                                  <div
                                    className={styles[`task-genre-block`]}
                                    key={index}
                                  >
                                    <div className={styles[`task-genre-name`]}>
                                      {projectTaskGenre.taskGenreName}
                                    </div>

                                    <div
                                      className={
                                        styles[`task-genre-table-container`]
                                      }
                                    >
                                      <table>
                                        <tbody>
                                          <tr>
                                            <td>Period</td>
                                            <td>
                                              {formatDate(
                                                projectTaskGenre.startDate
                                              )}{" "}
                                              ~
                                              {formatDate(
                                                projectTaskGenre.deadlineDate
                                              )}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Days</td>
                                            <td>
                                              {projectTaskGenre.numberOfDays.toFixed(
                                                1
                                              )}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons</td>
                                            <td>
                                              {projectTaskGenre.numberOfPersons}
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Persons/Days</td>
                                            <td>
                                              {(
                                                projectTaskGenre.numberOfDays *
                                                projectTaskGenre.numberOfPersons
                                              ).toFixed(1)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className={styles[`non-task-genre`]}>
                              No Task Genre
                            </div>
                          )}
                        </dd>
                        <dt>Details</dt>
                        <dd className={styles[`details-area`]}>
                          {project.details ? (
                            <div className={styles[`details-text`]}>
                              {project.details}
                            </div>
                          ) : (
                            "No Details"
                          )}
                        </dd>
                        <dt>Attached File</dt>
                        <dd
                          className={classNames(
                            styles["attached-file-area"],
                            styles[`dd-last`]
                          )}
                        >
                          {attachedFileListData[index] &&
                          attachedFileListData[index].length > 0
                            ? attachedFileListData[index].map(
                                (file: any, i) => (
                                  <div
                                    className={
                                      styles["display-attached-file-container"]
                                    }
                                    key={i}
                                  >
                                    <div className={styles["file-info"]}>
                                      <a
                                        href={
                                          downloadUrlListData[index][i] || "#"
                                        }
                                        download={file.name}
                                      >
                                        <span
                                          className={classNames(
                                            "material-symbols-outlined",
                                            styles[`download-icon`]
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
