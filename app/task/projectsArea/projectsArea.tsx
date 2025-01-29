import classNames from "classnames";
import styles from "./projectsArea.module.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddButton from "@/app/component/addButton/addButton";
import DeleteButton from "@/app/component/deleteButton/deleteButton";
import EditButton from "@/app/component/editButton/editButton";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { formatDate } from "@/app/lib/formatDateTime";
import { clientSupabase } from "@/app/lib/supabase/client";
import Image from "next/image";

interface SmallProjectMembersProps {
  smallProjectId: any;
  membersDataArray: {
    id: number;
    name: string;
  }[];
}

interface SmallProjectStatusProps {
  smallProjectId: number;
  projectId: number;
  notStarted: number;
  processing: number;
  completed: number;
}

interface SmallProjectTaskGenreProps {
  smallProjectId: number;
  taskGenreDataArray: {
    taskGenreId: number;
    taskGenreName: string;
    numberOfPersons: number;
    startDate: string;
    deadlineDate: string;
    numberOfDays: number;
  }[];
}

interface ProjectArrowJudgeProps {
  projectId: number;
  arrowJudge: boolean;
}

interface AttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}

interface SmallProjectArrowJudgeProps {
  projectId: number;
  smallProjectBooleanArray: {
    [key: number]: boolean;
  }[];
}

interface ProjectsAreaProps {
  projectDataArray: any[];
  smallProjectDataArray: any[];
  smallProjectMemberDataArray: SmallProjectMembersProps[];
  smallProjectStatusDataArray: SmallProjectStatusProps[];
  smallProjectTaskGenreArray: SmallProjectTaskGenreProps[];
  attachedFileDataArray: AttachedFileProps[];
  userId: number;
}

const ProjectsArea: React.FC<ProjectsAreaProps> = ({
  projectDataArray,
  smallProjectDataArray,
  smallProjectMemberDataArray,
  smallProjectStatusDataArray,
  smallProjectTaskGenreArray,
  attachedFileDataArray,
  userId,
}) => {
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { newItem } = useFlashDisplayContext();
  const { setNotificationValue } = useNotificationContext();
  const router = useRouter();

  const [projectData, setProjectData] = useState<any[]>([]);
  const [smallProjectData, setSmallProjectData] = useState<any[]>([]);

  const [smallProjectMemberData, setSmallProjectMemberData] = useState<
    SmallProjectMembersProps[]
  >([]);
  const [smallProjectStatusData, setSmallProjectStatusData] = useState<
    SmallProjectStatusProps[]
  >([]);

  const [smallProjectTaskGenreData, setSmallProjectTaskGenreData] = useState<
    SmallProjectTaskGenreProps[]
  >([]);
  const [attachedFileData, setAttachedFileData] = useState<AttachedFileProps[]>(
    []
  );

  const [projectArrowJudgeData, setProjectArrowJudgeData] = useState<
    ProjectArrowJudgeProps[]
  >([]);
  const [smallProjectArrowJudgeData, setSmallProjectArrowJudgeData] = useState<
    SmallProjectArrowJudgeProps[]
  >([]);

  const [filterFinishedProjects, setFilterFinishedProjects] = useState(false);

  useEffect(() => {
    if (projectDataArray.length > 0) {
      const projectGroups = smallProjectDataArray.reduce(
        (acc, { project_id, isFinished }) => {
          if (!acc[project_id]) {
            acc[project_id] = [];
          }
          acc[project_id].push(isFinished);
          return acc;
        },
        {}
      );

      const finishedProjectIdList = Object.entries(projectGroups)
        .filter(([_, isFinishedArray]) =>
          (isFinishedArray as boolean[]).every(Boolean)
        )
        .map(([projectId]) => Number(projectId));

      setProjectData(
        projectDataArray.filter((projectData) =>
          filterFinishedProjects
            ? finishedProjectIdList.includes(projectData.id)
            : !finishedProjectIdList.includes(projectData.id)
        )
      );
      setSmallProjectData(smallProjectDataArray);
      setSmallProjectMemberData(smallProjectMemberDataArray);
      setSmallProjectStatusData(smallProjectStatusDataArray);
      setSmallProjectTaskGenreData(smallProjectTaskGenreArray);
      setAttachedFileData(attachedFileDataArray);

      if (projectArrowJudgeData.some((project) => project.arrowJudge)) {
        const detailsOpenProjectIdList = projectDataArray
          .filter((projectArrowJudge) => projectArrowJudge.arrowJudge)
          .map((projectArrowJudge) => projectArrowJudge.projectId);

        setProjectArrowJudgeData(
          projectDataArray.map((project) => ({
            projectId: project.id,
            arrowJudge: detailsOpenProjectIdList.includes(project.id)
              ? true
              : false,
          }))
        );
      } else {
        setProjectArrowJudgeData(
          projectDataArray.map((project) => ({
            projectId: project.id,
            arrowJudge: false,
          }))
        );
      }

      const transformedSmallProjectArrowsObject = Object.values(
        smallProjectStatusDataArray.reduce(
          (groupedProjects, { smallProjectId, projectId }) => {
            if (!groupedProjects[projectId]) {
              groupedProjects[projectId] = {
                projectId,
                smallProjectBooleanArray: [],
              };
            }
            groupedProjects[projectId].smallProjectBooleanArray.push({
              [smallProjectId]: false,
            });

            return groupedProjects;
          },
          {} as Record<
            number,
            {
              projectId: number;
              smallProjectBooleanArray: { [key: number]: boolean }[];
            }
          >
        )
      );
      setSmallProjectArrowJudgeData(transformedSmallProjectArrowsObject);
    } else {
      setProjectData([]);
      setSmallProjectData([]);
      setSmallProjectMemberData([]);
      setSmallProjectStatusData([]);
      setSmallProjectTaskGenreData([]);
      setAttachedFileData([]);
      setProjectArrowJudgeData([]);
      setSmallProjectArrowJudgeData([]);
    }
  }, [pageUpdated]);

  const createSmallProjectArrayMatchedProjectId = (projectId: number) => {
    return smallProjectData.filter(
      (smallProject) => smallProject.project_id === projectId
    );
  };

  const findSmallProjectStatusMatchedSmallProjectId = (
    smallProjectId: number
  ) => {
    return smallProjectStatusData.find(
      (smallProjectStatus) =>
        smallProjectStatus.smallProjectId === smallProjectId
    );
  };

  const outputTotalStatusValue = (projectId: number) => {
    const filteredSmallProjectStatusData = smallProjectStatusData.filter(
      (smallProjectStatus) => smallProjectStatus.projectId === projectId
    );
    return filteredSmallProjectStatusData.reduce(
      (totals, project) => {
        totals.notStartedTotalValue += project.notStarted;
        totals.processingTotalValue += project.processing;
        totals.completedTotalValue += project.completed;
        return totals;
      },
      {
        notStartedTotalValue: 0,
        processingTotalValue: 0,
        completedTotalValue: 0,
      }
    );
  };

  const toggleProjectArrow = (projectId: number) => {
    setProjectArrowJudgeData((prevProjectArrowJudgeData) =>
      prevProjectArrowJudgeData.map((projectArrowJudgeData) => {
        if (projectArrowJudgeData.projectId === projectId) {
          if (projectArrowJudgeData.arrowJudge) {
            setSmallProjectArrowJudgeData((prevSmallProjectArrowJudgeData) =>
              prevSmallProjectArrowJudgeData.map((smallProjectArrowJudgeData) =>
                smallProjectArrowJudgeData.projectId === projectId
                  ? {
                      ...smallProjectArrowJudgeData,
                      smallProjectBooleanArray:
                        smallProjectArrowJudgeData.smallProjectBooleanArray.map(
                          (item) => {
                            const updatedItem: { [key: number]: boolean } = {};
                            Object.keys(item).forEach((key) => {
                              updatedItem[Number(key)] = false;
                            });
                            return updatedItem;
                          }
                        ),
                    }
                  : smallProjectArrowJudgeData
              )
            );
          }
          return {
            projectId: projectArrowJudgeData.projectId,
            arrowJudge: !projectArrowJudgeData.arrowJudge,
          };
        } else {
          return projectArrowJudgeData;
        }
      })
    );
  };

  const toggleSmallProjectArrow = (
    projectId: number,
    smallProjectId: number
  ) => {
    setSmallProjectArrowJudgeData((prevData) =>
      prevData.map((project) => {
        if (project.projectId === projectId) {
          return {
            ...project,
            smallProjectBooleanArray: project.smallProjectBooleanArray.map(
              (smallProject) => {
                if (smallProjectId in smallProject) {
                  return {
                    ...smallProject,
                    [smallProjectId]: !smallProject[smallProjectId],
                  };
                }
                return smallProject;
              }
            ),
          };
        }
        return project;
      })
    );
  };

  const handleTransitionProjectDetails = (
    projectId: number,
    userId: number
  ) => {
    router.push(`/project?id=${projectId}&userId=${userId}`);
  };

  const handleFinishedSmallProject = (
    smallProjectId: number,
    boolValue: boolean
  ) => {
    const updateSmallProjectFinishedValue = async () => {
      const { error: updateSmallProjectError } = await clientSupabase
        .from("small_projects")
        .update({
          isFinished: !boolValue,
        })
        .eq("id", smallProjectId);

      if (updateSmallProjectError) {
        console.error("Error Update Small Projects", updateSmallProjectError);
        setNotificationValue({
          message: "Couldn't update the Small Project data.",
          color: 1,
        });
      }
    };
    updateSmallProjectFinishedValue();
    setPageUpdated(true);
  };

  const handleToggleFilterFinishedProjects = () => {
    setFilterFinishedProjects(!filterFinishedProjects);
    setPageUpdated(true);
  };

  return (
    <div className={styles[`project-area`]}>
      <div className={styles[`title-area`]}>
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
        <div className={styles[`background-area`]}>
          <p>Finished Project</p>
          <div
            className={classNames(styles.toggle, {
              [styles.checked]: filterFinishedProjects,
            })}
            onClick={handleToggleFilterFinishedProjects}
          >
            <input
              type="checkbox"
              name="check"
              checked={filterFinishedProjects}
              onChange={handleToggleFilterFinishedProjects}
              className={styles.input}
            />
          </div>
        </div>
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
              <div className={styles[`add-button-container`]}>
                <AddButton target={0} userId={userId} />
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {projectData.length > 0 ? (
            projectData.map((project) => {
              const smallProjectArrayMatchedProjectId =
                createSmallProjectArrayMatchedProjectId(project.id);
              const totalStatusValueObject = outputTotalStatusValue(project.id);
              const taskGenreMatchedSmallProjectId =
                smallProjectTaskGenreData.find(
                  (smallProjectTaskGenre) =>
                    smallProjectTaskGenre.smallProjectId ===
                    smallProjectArrayMatchedProjectId[0].id
                );
              const attachedFileMatchedSmallProjectId = attachedFileData.find(
                (attachedFile) =>
                  attachedFile.id === smallProjectArrayMatchedProjectId[0].id
              );
              const projectArrowJudge = projectArrowJudgeData.find(
                (projectArrowJudge) =>
                  projectArrowJudge.projectId === project.id
              )!.arrowJudge;
              return (
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
                      <div className={styles[`project-name-container`]}>
                        <div className={styles[`arrow-container`]}>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.arrow
                            )}
                            onClick={() => toggleProjectArrow(project.id)}
                          >
                            {projectArrowJudge
                              ? "arrow_drop_down"
                              : "arrow_right"}{" "}
                          </span>
                        </div>
                        <p
                          className={styles[`project-name`]}
                          onClick={() =>
                            handleTransitionProjectDetails(project.id, userId)
                          }
                        >
                          {project.project_name}
                        </p>
                      </div>
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
                            {totalStatusValueObject.notStartedTotalValue}
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
                            {totalStatusValueObject.processingTotalValue}
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
                            {totalStatusValueObject.completedTotalValue}
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

                  {smallProjectArrayMatchedProjectId.length > 0 &&
                    (smallProjectArrayMatchedProjectId.length === 1 &&
                    smallProjectArrayMatchedProjectId[0].small_project_name ===
                      "Small Project Name 1" ? (
                      <tr
                        className={classNames(
                          projectArrowJudge
                            ? styles[`details-open`]
                            : styles[`details-hidden`],
                          styles[`open-area`]
                        )}
                      >
                        <td colSpan={3}>
                          <Image
                            src="/img/background-image2.jpeg"
                            alt="background-image2"
                            className={styles[`background-image2`]}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={true}
                          />
                          <div className={styles[`scrollable-content`]}>
                            <dl>
                              <dt>Member</dt>
                              <dd className={styles[`member-area`]}>
                                {smallProjectMemberData
                                  .find(
                                    (smallProjectMember) =>
                                      smallProjectMember.smallProjectId ===
                                      smallProjectArrayMatchedProjectId[0].id
                                  )!
                                  .membersDataArray.map(
                                    (
                                      projectMember: {
                                        id: number;
                                        name: string;
                                      },
                                      index
                                    ) => (
                                      <div
                                        className={styles.member}
                                        key={index}
                                      >
                                        {projectMember.name}
                                      </div>
                                    )
                                  )}
                              </dd>

                              <dt>Task Genre</dt>
                              <dd>
                                {taskGenreMatchedSmallProjectId &&
                                taskGenreMatchedSmallProjectId
                                  .taskGenreDataArray.length > 0 ? (
                                  <div className={styles[`task-genre-area`]}>
                                    {taskGenreMatchedSmallProjectId.taskGenreDataArray.map(
                                      (projectTaskGenre, index) => (
                                        <div
                                          className={styles[`task-genre-block`]}
                                          key={index}
                                        >
                                          <div
                                            className={
                                              styles[`task-genre-name`]
                                            }
                                          >
                                            {projectTaskGenre.taskGenreName}
                                          </div>

                                          <div
                                            className={
                                              styles[
                                                `task-genre-table-container`
                                              ]
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
                                                    {
                                                      projectTaskGenre.numberOfPersons
                                                    }
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
                                {smallProjectArrayMatchedProjectId[0]
                                  .details ? (
                                  <div className={styles[`details-text`]}>
                                    {
                                      smallProjectArrayMatchedProjectId[0]
                                        .details
                                    }
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
                                {attachedFileMatchedSmallProjectId &&
                                attachedFileMatchedSmallProjectId.fileDataArray
                                  .length > 0
                                  ? attachedFileMatchedSmallProjectId.fileDataArray.map(
                                      (fileData, index) => (
                                        <div
                                          className={
                                            styles[
                                              "display-attached-file-container"
                                            ]
                                          }
                                          key={index}
                                        >
                                          <div className={styles["file-info"]}>
                                            <a
                                              href={fileData.url || "#"}
                                              download={fileData.file.name}
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
                                          <p>{fileData.file.name}</p>
                                        </div>
                                      )
                                    )
                                  : "No Attached File"}
                              </dd>
                            </dl>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      smallProjectArrayMatchedProjectId.map((smallProject) => {
                        const smallProjectStatus =
                          findSmallProjectStatusMatchedSmallProjectId(
                            smallProject.id
                          );

                        const smallProjectArrowJudge =
                          smallProjectArrowJudgeData
                            .find(
                              (smallProjectArrow) =>
                                smallProjectArrow.projectId === project.id
                            )
                            ?.smallProjectBooleanArray.some(
                              (smallProjectBoolean) =>
                                smallProjectBoolean[smallProject.id] === true
                            );

                        const taskGenreMatchedSmallProjectId =
                          smallProjectTaskGenreData.find(
                            (smallProjectTaskGenre) =>
                              smallProjectTaskGenre.smallProjectId ===
                              smallProject.id
                          );

                        const attachedFileMatchedSmallProjectId =
                          attachedFileData.find(
                            (attachedFile) =>
                              attachedFile.id === smallProject.id
                          );

                        return (
                          <React.Fragment key={smallProject.id}>
                            <tr
                              className={
                                projectArrowJudge
                                  ? styles[`details-open`]
                                  : styles[`details-hidden`]
                              }
                            >
                              <td className={styles[`col-small-project-name`]}>
                                <div
                                  className={
                                    styles[`small-project-name-container`]
                                  }
                                >
                                  <div className={styles[`arrow-container`]}>
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.arrow
                                      )}
                                      onClick={() =>
                                        toggleSmallProjectArrow(
                                          project.id,
                                          smallProject.id
                                        )
                                      }
                                    >
                                      {smallProjectArrowJudge
                                        ? "arrow_drop_down"
                                        : "arrow_right"}
                                    </span>
                                  </div>
                                  <p className={styles[`small-project-name`]}>
                                    {smallProject.small_project_name}
                                  </p>
                                </div>
                              </td>
                              <td
                                className={styles[`col-finished-button`]}
                                onClick={() =>
                                  handleFinishedSmallProject(
                                    smallProject.id,
                                    smallProject.isFinished
                                  )
                                }
                              >
                                <div
                                  className={classNames(
                                    styles[`finished-button-area`],
                                    smallProject.isFinished
                                      ? styles[`finished-button-green`]
                                      : styles[`finished-button-black`]
                                  )}
                                >
                                  <p>Finished</p>
                                  <span
                                    className={classNames(
                                      "material-symbols-outlined",
                                      styles.check
                                    )}
                                  >
                                    select_check_box
                                  </span>
                                </div>
                              </td>
                            </tr>

                            <tr
                              className={classNames(
                                smallProjectArrowJudge
                                  ? styles[`details-open`]
                                  : styles[`details-hidden`],
                                styles[`open-area`]
                              )}
                            >
                              <td colSpan={3}>
                                <Image
                                  src="/img/background-image2.jpeg"
                                  alt="background-image2"
                                  className={styles[`background-image2`]}
                                  fill
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  priority={true}
                                />
                                <div className={styles[`scrollable-content`]}>
                                  <dl>
                                    <dt>Status</dt>
                                    <dd className={styles[`status-area`]}>
                                      <div
                                        className={
                                          styles[`status-situation-part`]
                                        }
                                      >
                                        <div
                                          className={styles[`status-icon-part`]}
                                        >
                                          <div
                                            className={classNames(
                                              styles[`status-icon`],
                                              styles[`not-started`]
                                            )}
                                          >
                                            Not Started
                                          </div>
                                          <div className={styles.value}>
                                            {smallProjectStatus!.notStarted}
                                          </div>
                                        </div>
                                        <div
                                          className={styles[`status-icon-part`]}
                                        >
                                          <div
                                            className={classNames(
                                              styles[`status-icon`],
                                              styles[`processing`]
                                            )}
                                          >
                                            Processing
                                          </div>
                                          <div className={styles.value}>
                                            {smallProjectStatus!.processing}
                                          </div>
                                        </div>
                                        <div
                                          className={styles[`status-icon-part`]}
                                        >
                                          <div
                                            className={classNames(
                                              styles[`status-icon`],
                                              styles[`completed`]
                                            )}
                                          >
                                            Completed
                                          </div>
                                          <div className={styles.value}>
                                            {smallProjectStatus!.completed}
                                          </div>
                                        </div>
                                      </div>
                                    </dd>

                                    <dt>Member</dt>
                                    <dd className={styles[`member-area`]}>
                                      {smallProjectMemberData
                                        .find(
                                          (smallProjectMember) =>
                                            smallProjectMember.smallProjectId ===
                                            smallProject.id
                                        )!
                                        .membersDataArray.map(
                                          (projectMember, index) => (
                                            <div
                                              className={styles.member}
                                              key={index}
                                            >
                                              {projectMember.name}
                                            </div>
                                          )
                                        )}
                                    </dd>

                                    <dt>Task Genre</dt>
                                    <dd>
                                      {taskGenreMatchedSmallProjectId &&
                                      taskGenreMatchedSmallProjectId
                                        .taskGenreDataArray.length > 0 ? (
                                        <div
                                          className={styles[`task-genre-area`]}
                                        >
                                          {taskGenreMatchedSmallProjectId.taskGenreDataArray.map(
                                            (projectTaskGenre, index) => (
                                              <div
                                                className={
                                                  styles[`task-genre-block`]
                                                }
                                                key={index}
                                              >
                                                <div
                                                  className={
                                                    styles[`task-genre-name`]
                                                  }
                                                >
                                                  {
                                                    projectTaskGenre.taskGenreName
                                                  }
                                                </div>

                                                <div
                                                  className={
                                                    styles[
                                                      `task-genre-table-container`
                                                    ]
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
                                                          {
                                                            projectTaskGenre.numberOfPersons
                                                          }
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
                                        <div
                                          className={styles[`non-task-genre`]}
                                        >
                                          No Task Genre
                                        </div>
                                      )}
                                    </dd>
                                    <dt>Details</dt>
                                    <dd className={styles[`details-area`]}>
                                      {smallProject.details ? (
                                        <div className={styles[`details-text`]}>
                                          {smallProject.details}
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
                                      {attachedFileMatchedSmallProjectId &&
                                      attachedFileMatchedSmallProjectId
                                        .fileDataArray.length > 0
                                        ? attachedFileMatchedSmallProjectId.fileDataArray.map(
                                            (fileData, index) => (
                                              <div
                                                className={
                                                  styles[
                                                    "display-attached-file-container"
                                                  ]
                                                }
                                                key={index}
                                              >
                                                <div
                                                  className={
                                                    styles["file-info"]
                                                  }
                                                >
                                                  <a
                                                    href={fileData.url || "#"}
                                                    download={
                                                      fileData.file.name
                                                    }
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
                                                <p>{fileData.file.name}</p>
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
                        );
                      })
                    ))}
                </React.Fragment>
              );
            })
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
