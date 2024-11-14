"use client";

import EditButton from "@/app/component/editButton/editButton";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import classNames from "classnames";
import { useState } from "react";
import styles from "./projectDetails.module.css";
import { formatDate } from "@/app/lib/formatDateTime";

interface ProjectDetailsProps {
  userId: number;
  projectId: number;
  projectData: any;
  projectStatus: any;
  projectMembers: string[];
  projectTaskGenreList: any[];
  attachedFiles: File[];
  downloadUrls: (string | null)[];
}

interface ProjectDetailsArrowProps {
  projectMember: boolean;
  taskGenre: boolean;
  details: boolean;
  attachedFiles: boolean;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  userId,
  projectId,
  projectData,
  projectStatus,
  projectMembers,
  projectTaskGenreList,
  attachedFiles,
  downloadUrls,
}) => {
  const { setNotificationValue } = useNotificationContext();

  const [projectDeatilArrow, setProjectDetailsArrow] =
    useState<ProjectDetailsArrowProps>({
      projectMember: false,
      taskGenre: false,
      details: false,
      attachedFiles: false,
    });

  const toggleProjectDetailsArrow = (target: string) => {
    setProjectDetailsArrow((prevData) => ({
      ...prevData,
      [target]: !prevData[target as keyof ProjectDetailsArrowProps],
    }));
  };

  return (
    <>
      <div className={styles[`project-area`]}>
        <table>
          <thead>
            <tr>
              <th>
                <p className={styles[`project-name`]}>
                  {projectData.project_name}
                </p>
                <div className={styles[`edit-button-container`]}>
                  <EditButton
                    projectId={projectId}
                    taskId={null}
                    userId={userId}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles[`col-status-situation`]}>
                <div className={styles[`status-icon-part`]}>
                  <div
                    className={classNames(
                      styles[`status-icon`],
                      styles[`not-started`]
                    )}
                  >
                    Not Started
                  </div>
                  <div className={styles.value}>{projectStatus.notStarted}</div>
                </div>
                <div className={styles[`status-icon-part`]}>
                  <div
                    className={classNames(
                      styles[`status-icon`],
                      styles.processing
                    )}
                  >
                    Processing
                  </div>
                  <div className={styles.value}>{projectStatus.processing}</div>
                </div>
                <div className={styles[`status-icon-part`]}>
                  <div
                    className={classNames(
                      styles[`status-icon`],
                      styles.completed
                    )}
                  >
                    Complete
                  </div>
                  <div className={styles.value}>{projectStatus.completed}</div>
                </div>
              </td>
            </tr>

            <tr>
              <td className={styles[`scrollable-content-td`]}>
                <div className={styles[`scrollable-content`]}>
                  <dl>
                    <div className={styles[`col-members`]}>
                      <dt>
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.arrow
                          )}
                          onClick={() =>
                            toggleProjectDetailsArrow("projectMember")
                          }
                        >
                          {projectDeatilArrow.projectMember
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Member</p>
                      </dt>

                      <dd
                        className={
                          projectDeatilArrow.projectMember
                            ? classNames(
                                styles[`details-open`],
                                styles["member-area"]
                              )
                            : styles[`details-hidden`]
                        }
                      >
                        {projectMembers.map((projectMember, index) => (
                          <div className={styles.member} key={index}>
                            {projectMember}
                          </div>
                        ))}
                      </dd>
                    </div>
                  </dl>

                  <dl>
                    <div className={styles[`col-task-genre`]}>
                      <dt>
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.arrow
                          )}
                          onClick={() => toggleProjectDetailsArrow("taskGenre")}
                        >
                          {projectDeatilArrow.taskGenre
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Task Genre</p>
                      </dt>

                      <dd
                        className={
                          projectDeatilArrow.taskGenre
                            ? styles[`details-open`]
                            : styles[`details-hidden`]
                        }
                      >
                        {projectTaskGenreList &&
                        projectTaskGenreList.length > 0 ? (
                          <div className={styles[`task-genre-area`]}>
                            {projectTaskGenreList.map(
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
                    </div>
                  </dl>

                  <dl>
                    <div className={styles[`col-details`]}>
                      <dt>
                        {" "}
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.arrow
                          )}
                          onClick={() => toggleProjectDetailsArrow("details")}
                        >
                          {projectDeatilArrow.details
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Details</p>
                      </dt>
                      <dd
                        className={
                          projectDeatilArrow.details
                            ? classNames(
                                styles[`details-open`],
                                styles[`details-text`]
                              )
                            : styles[`details-hidden`]
                        }
                      >
                        {projectData.details ? (
                          projectData.details
                        ) : (
                          <p>No Details</p>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <dl>
                    <div className={styles[`col-attached-file`]}>
                      <dt>
                        {" "}
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles.arrow
                          )}
                          onClick={() =>
                            toggleProjectDetailsArrow("attachedFiles")
                          }
                        >
                          {projectDeatilArrow.attachedFiles
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Attached File</p>
                      </dt>

                      <dd
                        className={
                          projectDeatilArrow.attachedFiles
                            ? classNames(
                                styles[`details-open`],
                                styles["attachedFile-area"]
                              )
                            : styles[`details-hidden`]
                        }
                      >
                        {attachedFiles.length !== 0 ? (
                          attachedFiles.map((file: any, index) => (
                            <div
                              className={
                                styles["display-attachedFile-container"]
                              }
                              key={index}
                            >
                              <div className={styles["file-info"]}>
                                <a
                                  href={downloadUrls[index] || "#"}
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
                          ))
                        ) : (
                          <p> No Attached File</p>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ProjectDetails;
