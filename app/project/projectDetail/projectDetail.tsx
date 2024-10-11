"use client";

import EditButton from "@/app/component/editButton/editButton";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import classNames from "classnames";
import { useState } from "react";
import styles from "./projectDetail.module.css";

interface ProjectDetailProps {
  userId: number;
  projectId: number;
  projectData: any;
  projectStatus: any;
  projectMembers: string;
  attachmentFiles: File[];
  downloadUrls: (string | null)[];
}

interface Params {
  projectId: number;
  userId: number;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  userId,
  projectId,
  projectData,
  projectStatus,
  projectMembers,
  attachmentFiles,
  downloadUrls,
}) => {
  const { setNotificationValue } = useNotificationContext();

  const handleNullCheck = (index: number) => {
    if (!downloadUrls[index]) {
      console.error("Attached File is null.");
      setNotificationValue({
        message: "Couldn't download Attached File.",
        color: 1,
      });
    }
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
                <div className={styles[`editButton-container`]}>
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
              <td className={styles[`col-project-detail`]}>
                <div className={styles[`scrollable-content`]}>
                  <dl>
                    <dt>Member</dt>
                    <dd>{projectMembers}</dd>
                    <dt>Detail</dt>
                    <dd className={styles[`detail-text`]}>
                      {projectData.details ? (
                        projectData.details
                      ) : (
                        <p>No Detail</p>
                      )}
                    </dd>
                    <dt>Attached File</dt>
                    <dd
                      className={classNames(
                        styles["attachmentFile-area"],
                        styles[`dd-last`]
                      )}
                    >
                      {attachmentFiles.length !== 0 ? (
                        attachmentFiles.map((file: any, index) => (
                          <div
                            className={
                              styles["display-attachmentFile-container"]
                            }
                            key={index}
                          >
                            <div className={styles["file-info"]}>
                              <a
                                href={downloadUrls[index] || "#"}
                                onClick={() => handleNullCheck(index)}
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

export default ProjectDetail;
