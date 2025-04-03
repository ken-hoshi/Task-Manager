"use client";

import { useNotificationContext } from "@/app/provider/notificationProvider";
import classNames from "classnames";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import styles from "./projectDetails.module.css";
import { formatDate } from "@/app/lib/formatDateTime";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useRouter } from "next/navigation";
import { clientSupabase } from "@/app/lib/supabase/client";

interface SmallProjectStatusProps {
  smallProjectId: number;
  projectId: number;
  notStarted: number;
  processing: number;
  completed: number;
}

interface SmallProjectMembersProps {
  smallProjectId: number;
  membersDataArray: {
    id: number;
    name: string;
  }[];
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

interface SmallProjectAttachedFileProps {
  id: number;
  fileDataArray: {
    file: File;
    url: string;
  }[];
}
interface ProjectDetailsProps {
  userId: number;
  smallProjectData: any[];
  smallProjectStatusData: SmallProjectStatusProps[];
  smallProjectMemberData: SmallProjectMembersProps[];
  smallProjectTaskGenreData: SmallProjectTaskGenreProps[];
  smallProjectAttachedFileData: SmallProjectAttachedFileProps[];
  smallProjectIdList: number[];
  displaySmallProjectId: number | null;
  setDisplaySmallProjectId: Dispatch<SetStateAction<number | null>>;
}

interface ProjectDetailsArrowProps {
  projectMember: boolean;
  taskGenre: boolean;
  details: boolean;
  attachedFiles: boolean;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  smallProjectData,
  smallProjectStatusData,
  smallProjectMemberData,
  smallProjectTaskGenreData,
  smallProjectAttachedFileData,
  smallProjectIdList,
  displaySmallProjectId,
  setDisplaySmallProjectId,
}) => {
  const [displaySmallProject, setDisplaySmallProject] = useState<any>({});
  const [smallProjectStatus, setSmallProjectStatus] =
    useState<SmallProjectStatusProps>({
      smallProjectId: 0,
      projectId: 0,
      notStarted: 0,
      processing: 0,
      completed: 0,
    });
  const [smallProjectMemberListData, setSmallProjectMemberListData] =
    useState<SmallProjectMembersProps>({
      smallProjectId: 0,
      membersDataArray: [],
    });
  const [smallProjectTaskGenreListData, setSmallProjectTaskGenreListData] =
    useState<SmallProjectTaskGenreProps>({
      smallProjectId: 0,
      taskGenreDataArray: [],
    });
  const [
    smallProjectAttachedFileListData,
    setSmallProjectAttachedFileListData,
  ] = useState<SmallProjectAttachedFileProps>({
    id: 0,
    fileDataArray: [],
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [pullDownSmallProjectData, setPullDownSmallProjectData] = useState<
    any[] | undefined
  >(undefined);
  const [projectDetailArrow, setProjectDetailsArrow] =
    useState<ProjectDetailsArrowProps>({
      projectMember: false,
      taskGenre: false,
      details: false,
      attachedFiles: false,
    });

  const { setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const router = useRouter();
  const pullDownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    const changedDisplaySmallProjectId =
      displaySmallProjectId &&
      smallProjectIdList.includes(displaySmallProjectId)
        ? displaySmallProjectId!
        : smallProjectIdList[0];

    const displaySmallProjectData = smallProjectData.find(
      (smallProject) => smallProject.id === changedDisplaySmallProjectId
    );

    const smallProjectStatus = smallProjectStatusData.find(
      (smallProjectStatus) =>
        smallProjectStatus.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectMemberListData = smallProjectMemberData.find(
      (smallProjectMemberListData) =>
        smallProjectMemberListData.smallProjectId ===
        changedDisplaySmallProjectId
    );

    const smallProjectTaskGenreListData = smallProjectTaskGenreData.find(
      (projectTaskGenre) =>
        projectTaskGenre.smallProjectId === changedDisplaySmallProjectId
    );

    const smallProjectAttachedFileListData = smallProjectAttachedFileData.find(
      (smallProjectAttachedFileListData) =>
        smallProjectAttachedFileListData.id === changedDisplaySmallProjectId
    );

    if (
      !displaySmallProjectData ||
      !smallProjectStatus ||
      !smallProjectMemberListData ||
      !smallProjectTaskGenreListData ||
      !smallProjectAttachedFileListData
    ) {
      console.error("Data associated with displaySmallProjectId not found.");
      setNotificationValue({
        message: "Couldn't get Project Data.",
        color: 1,
      });
      router.push("/task");
    }
    setDisplaySmallProject(displaySmallProjectData);
    setSmallProjectStatus(smallProjectStatus!);
    setSmallProjectMemberListData(smallProjectMemberListData!);
    setSmallProjectTaskGenreListData(smallProjectTaskGenreListData!);
    setSmallProjectAttachedFileListData(smallProjectAttachedFileListData!);
    setPullDownSmallProjectData(
      smallProjectData.filter(
        (smallProject: any) => smallProject.id !== changedDisplaySmallProjectId
      )
    );
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pageUpdated, displaySmallProjectId]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      pullDownMenuRef.current &&
      !pullDownMenuRef.current.contains(event.target as Node)
    ) {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleSelectSmallProject = (smallProjectId: number) => {
    setDisplaySmallProjectId(smallProjectId);
    setIsDropdownOpen(false);
  };

  const toggleProjectDetailsArrow = (target: string) => {
    setProjectDetailsArrow((prevData) => ({
      ...prevData,
      [target]: !prevData[target as keyof ProjectDetailsArrowProps],
    }));
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
        console.error("Update Small Projects", updateSmallProjectError);
        setNotificationValue({
          message: "Couldn't update the Small Project Data.",
          color: 1,
        });
      }
    };
    updateSmallProjectFinishedValue();
    setPageUpdated(true);
  };

  return (
    <>
      <div className={styles[`small-project-area`]}>
        <table>
          <thead>
            <tr>
              <th>
                {smallProjectData.length > 1 && (
                  <div className={styles[`pull-down-container`]}>
                    <span
                      className={classNames(
                        "material-symbols-outlined",
                        styles[`pull-down`]
                      )}
                      onClick={toggleDropdown}
                    >
                      arrow_right
                    </span>
                    {isDropdownOpen && (
                      <div
                        className={styles[`dropdown-menu`]}
                        ref={pullDownMenuRef}
                      >
                        {pullDownSmallProjectData ? (
                          pullDownSmallProjectData.map((smallProject: any) => (
                            <div
                              key={smallProject.id}
                              className={styles[`dropdown-item`]}
                              onClick={() =>
                                handleSelectSmallProject(smallProject.id)
                              }
                            >
                              {smallProject.small_project_name}
                            </div>
                          ))
                        ) : (
                          <div className={styles[`dropdown-item`]}>
                            No Small Project
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className={styles[`small-project-name`]}>
                  {displaySmallProject!.small_project_name}
                </p>
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
                  <div className={styles.value}>
                    {smallProjectStatus.notStarted}
                  </div>
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
                  <div className={styles.value}>
                    {smallProjectStatus.processing}
                  </div>
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
                  <div className={styles.value}>
                    {smallProjectStatus.completed}
                  </div>
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
                          {projectDetailArrow.projectMember
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Member</p>
                      </dt>

                      <dd
                        className={
                          projectDetailArrow.projectMember
                            ? classNames(
                                styles[`details-open`],
                                styles["member-area"]
                              )
                            : styles[`details-hidden`]
                        }
                      >
                        {smallProjectMemberListData.membersDataArray.map(
                          (projectMember, index) => (
                            <div className={styles.member} key={index}>
                              {projectMember.name}
                            </div>
                          )
                        )}
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
                          {projectDetailArrow.taskGenre
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Task Genre</p>
                      </dt>

                      <dd
                        className={
                          projectDetailArrow.taskGenre
                            ? styles[`details-open`]
                            : styles[`details-hidden`]
                        }
                      >
                        {smallProjectTaskGenreListData &&
                        smallProjectTaskGenreListData.taskGenreDataArray
                          .length > 0 ? (
                          <div className={styles[`task-genre-area`]}>
                            {smallProjectTaskGenreListData.taskGenreDataArray.map(
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
                          {projectDetailArrow.details
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Details</p>
                      </dt>
                      <dd
                        className={
                          projectDetailArrow.details
                            ? styles[`details-open`]
                            : styles[`details-hidden`]
                        }
                      >
                        {displaySmallProject.details ? (
                          <p className={styles[`details-text`]}>
                            {displaySmallProject.details}
                          </p>
                        ) : (
                          <p className={styles[`non-details-text`]}>
                            No Details
                          </p>
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
                          {projectDetailArrow.attachedFiles
                            ? "arrow_drop_down"
                            : "arrow_right"}{" "}
                        </span>
                        <p>Attached File</p>
                      </dt>

                      <dd
                        className={
                          projectDetailArrow.attachedFiles
                            ? classNames(
                                styles[`details-open`],
                                styles["attachedFile-area"]
                              )
                            : styles[`details-hidden`]
                        }
                      >
                        {smallProjectAttachedFileListData &&
                        smallProjectAttachedFileListData.fileDataArray
                          .length !== 0 ? (
                          smallProjectAttachedFileListData.fileDataArray.map(
                            (fileData, index) => (
                              <div
                                className={
                                  styles["display-attachedFile-container"]
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
                                        styles.downloadIcon
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
                        ) : (
                          <p> No Attached File</p>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <dl>
                    <dt
                      className={styles[`col-finished-button`]}
                      onClick={() =>
                        handleFinishedSmallProject(
                          displaySmallProject.id,
                          displaySmallProject.isFinished
                        )
                      }
                    >
                      <div
                        className={classNames(
                          styles[`finished-button-area`],
                          displaySmallProject.isFinished
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
                    </dt>
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
