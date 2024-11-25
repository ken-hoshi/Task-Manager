import React, { useEffect, useRef, useState } from "react";
import styles from "./projectPopup.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getUsers } from "@/app/lib/getUser";
import Select, { MultiValue } from "react-select";
import { selectBoxStyles } from "./selectBoxStyles";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import classNames from "classnames";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import DatePicker from "react-datepicker";
import { fetchAttachedFiles } from "@/app/lib/fetchAttachedFiles";

interface ProjectPopupProps {
  onClose: () => void;
  projectId: number | null;
  userId: number;
}

interface UserProps {
  id: number;
  name: string;
}

interface UserOption {
  value: number;
  label: string;
}

interface TaskGenreDataProps {
  id: number | null;
  taskGenreName: string;
  selectedStartDate: Date | undefined;
  selectedDeadlineDate: Date | undefined;
}

const ProjectPopup: React.FC<ProjectPopupProps> = ({
  onClose,
  projectId,
  userId,
}) => {
  const [projectName, setProjectName] = useState("");
  const [details, setDetails] = useState("");
  const [users, setUsers] = useState<UserProps[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [copiedSelectedUsers, setCopiedSelectedUsers] = useState<UserOption[]>(
    []
  );

  const [taskGenreDataArray, setTaskGenreDataArray] = useState<
    TaskGenreDataProps[]
  >([]);

  const [beforeChangeTaskGenreDataArray, setBeforeChangeTaskGenreDataArray] =
    useState<TaskGenreDataProps[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [beforeChangeFiles, setBeforeChangeFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [getLoading, setGetLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(true);

  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { addItem } = useFlashDisplayContext();

  useEffect(() => {
    if (projectId) {
      const fetchUpdateProjectData = async () => {
        try {
          const projectPromise = clientSupabase
            .from("projects")
            .select("id, project_name, details, project_users (user_id)")
            .eq("id", projectId)
            .single();

          const usersPromise = getUsers();

          const taskGenrePromise = clientSupabase
            .from("task_genre")
            .select("id, task_genre_name, start_date, deadline_date")
            .eq("project_id", projectId);

          const attachmentsPromise = fetchAttachedFiles(0, [projectId]);

          const [
            { data: projectData, error: selectProjectError },
            userList,
            { data: taskGenreData, error: selectTaskGenreError },
            projectAttachmentsData,
          ] = await Promise.all([
            projectPromise,
            usersPromise,
            taskGenrePromise,
            attachmentsPromise,
          ]);

          if (selectProjectError || !projectData) {
            throw new Error("Project data is null.");
          }
          if (selectTaskGenreError) {
            throw selectTaskGenreError;
          }

          setProjectName(projectData.project_name);
          setDetails(projectData.details);

          const selectedUserIds = projectData.project_users.map(
            (user: { user_id: number }) => user.user_id
          );
          const { data: selectedUsersData, error: usersError } =
            await clientSupabase
              .from("users")
              .select("id, name")
              .in("id", selectedUserIds);

          if (usersError) {
            throw usersError;
          }

          if (!selectedUsersData || selectedUsersData.length === 0) {
            throw new Error("User data is null.");
          }

          const selectedUserOptions = selectedUsersData.map(
            (user: { id: number; name: string }) => ({
              value: user.id,
              label: user.name,
            })
          );
          setSelectedUsers(selectedUserOptions);
          setCopiedSelectedUsers(selectedUserOptions);

          setUsers(userList);

          if (taskGenreData && taskGenreData.length > 0) {
            const taskGenreArray = taskGenreData.map((taskGenre) => ({
              id: taskGenre.id,
              taskGenreName: taskGenre.task_genre_name,
              selectedStartDate: taskGenre.start_date,
              selectedDeadlineDate: taskGenre.deadline_date,
            }));
            setTaskGenreDataArray(taskGenreArray);
            setBeforeChangeTaskGenreDataArray(taskGenreArray);
          }

          setSelectedFiles(projectAttachmentsData[0]);
          setBeforeChangeFiles(projectAttachmentsData[0]);

          setGetLoading(false);
        } catch (error) {
          console.error("Error Fetch Project Details ", error);
          onClose();
          setNotificationValue({
            message: "Couldn't get the Project data.",
            color: 1,
          });
        }
      };
      fetchUpdateProjectData();
    } else {
      const fetchUsers = async () => {
        const userList = await getUsers();
        setUsers(userList);
      };
      fetchUsers();
      setGetLoading(false);
    }
  }, []);

  const handleUserChange = (selectedOptions: MultiValue<UserOption>) => {
    setSelectedUsers(selectedOptions as UserOption[]);
  };

  const userOptions = users
    .filter(
      (user) =>
        !selectedUsers.some((selectedUser) => selectedUser.value === user.id)
    )
    .map((user) => ({
      value: user.id,
      label: user.name,
    }));

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const deleteAttachedFile = (index: number) => {
    const remainFiles = selectedFiles.filter((file, i) => i !== index);
    setSelectedFiles(remainFiles);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const addTaskGenreForm = () => {
    setTaskGenreDataArray((prevTaskGenreData) => [
      ...prevTaskGenreData,
      {
        id: null,
        taskGenreName: "",
        selectedStartDate: undefined,
        selectedDeadlineDate: undefined,
      },
    ]);
  };

  const removeTaskGenreForm = (index: number) => {
    setTaskGenreDataArray((prevTaskGenreData) =>
      prevTaskGenreData.filter((_, i) => i !== index)
    );
  };

  const setTaskGenreData = (value: any, index: number, name: string) => {
    setTaskGenreDataArray((prevTaskGenreDataArray) =>
      prevTaskGenreDataArray.map((taskGenre, i) =>
        i === index ? { ...taskGenre, [name]: value } : taskGenre
      )
    );
  };

  const handleDateRangeChange = (
    dates: [Date | null, Date | null],
    index: number
  ) => {
    const [start, deadline] = dates;
    setTaskGenreDataArray((prevTaskGenreDataArray) =>
      prevTaskGenreDataArray.map((taskGenre, i) =>
        i === index
          ? {
              ...taskGenre,
              selectedStartDate: start ?? undefined,
              selectedDeadlineDate: deadline ?? undefined,
            }
          : taskGenre
      )
    );
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (!postLoading) return;
    setPostLoading(false);

    const addTime = (date: Date | undefined): Date => {
      const dateWithTime = new Date(date!);
      dateWithTime.setHours(9, 0, 0, 0);
      return dateWithTime;
    };

    try {
      if (projectId) {
        const [projectUpdateResult, projectUsersDeleteResult] =
          await Promise.all([
            clientSupabase
              .from("projects")
              .update({ project_name: projectName, details: details })
              .eq("id", projectId),

            clientSupabase
              .from("project_users")
              .delete()
              .eq("project_id", projectId),
          ]);
        const { error: updateProjectError } = projectUpdateResult;
        const { error: deleteProjectUsersError } = projectUsersDeleteResult;

        if (updateProjectError) {
          throw updateProjectError;
        }

        if (deleteProjectUsersError) {
          throw deleteProjectUsersError;
        }

        const selectedUsersInsertRows = selectedUsers.map((selectedUser) => ({
          project_id: projectId,
          user_id: selectedUser.value,
        }));

        const { error: insertProjectUsersError } = await clientSupabase
          .from("project_users")
          .insert(selectedUsersInsertRows);

        if (insertProjectUsersError) {
          throw insertProjectUsersError;
        }

        const updatedTaskGenreDataArray = taskGenreDataArray.filter((after) => {
          const before = beforeChangeTaskGenreDataArray.find(
            (beforeChangeTaskGenreData) =>
              beforeChangeTaskGenreData.id === after.id
          );
          if (!before) return false;

          const beforeStartTime = before.selectedStartDate
            ? new Date(before.selectedStartDate).getTime()
            : null;

          const afterStartTime = after.selectedStartDate
            ? new Date(after.selectedStartDate).getTime()
            : null;

          const beforeDeadlineTime = before.selectedDeadlineDate
            ? new Date(before.selectedDeadlineDate).getTime()
            : null;

          const afterDeadlineTime = after.selectedDeadlineDate
            ? new Date(after.selectedDeadlineDate).getTime()
            : null;

          return (
            before.taskGenreName !== after.taskGenreName ||
            beforeStartTime !== afterStartTime ||
            beforeDeadlineTime !== afterDeadlineTime
          );
        });

        if (updatedTaskGenreDataArray.length > 0) {
          const updateTaskGenres = async (
            updatedTaskGenreDataArray: TaskGenreDataProps[]
          ) => {
            const updates = updatedTaskGenreDataArray.map(
              async (updatedTaskGenreData) => {
                return clientSupabase
                  .from("task_genre")
                  .update({
                    task_genre_name: updatedTaskGenreData.taskGenreName,
                    start_date: updatedTaskGenreData.selectedStartDate,
                    deadline_date: updatedTaskGenreData.selectedDeadlineDate,
                  })
                  .eq("id", updatedTaskGenreData.id);
              }
            );
            const results = await Promise.all(updates);

            const errors = results.filter(({ error }) => error);
            if (errors.length > 0) {
              throw errors[0];
            }
          };
          updateTaskGenres(updatedTaskGenreDataArray);
        }

        const deletedTaskGenreIdList = beforeChangeTaskGenreDataArray
          .map((beforeChangeTaskGenreData) => beforeChangeTaskGenreData.id)
          .filter(
            (taskGenreId) =>
              !taskGenreDataArray
                .map((taskGenreData) => taskGenreData.id)
                .includes(taskGenreId)
          );

        if (deletedTaskGenreIdList.length > 0) {
          const { error: updateTaskGenreIdError } = await clientSupabase
            .from("tasks")
            .update({ task_genre_id: null })
            .in("task_genre_id", deletedTaskGenreIdList);

          if (updateTaskGenreIdError) {
            throw updateTaskGenreIdError;
          }

          const { error: deleteTaskGenreError } = await clientSupabase
            .from("task_genre")
            .delete()
            .in("id", deletedTaskGenreIdList);

          if (deleteTaskGenreError) {
            throw deleteTaskGenreError;
          }
        }

        const addedTaskGenreDataArray = taskGenreDataArray.filter(
          (taskGenre) =>
            !beforeChangeTaskGenreDataArray
              .map((beforeChangeTaskGenreData) => beforeChangeTaskGenreData.id)
              .includes(taskGenre.id)
        );

        if (addedTaskGenreDataArray.length > 0) {
          const taskGenreInsertRows = addedTaskGenreDataArray.map(
            (taskGenreData) => ({
              task_genre_name: taskGenreData.taskGenreName,
              project_id: projectId,
              start_date: addTime(taskGenreData.selectedStartDate),
              deadline_date: addTime(taskGenreData.selectedDeadlineDate),
            })
          );

          const { error: insertTaskGenreError } = await clientSupabase
            .from("task_genre")
            .insert(taskGenreInsertRows);

          if (insertTaskGenreError) {
            throw insertTaskGenreError;
          }
        }

        const removedFiles = beforeChangeFiles.filter(
          (file) => !selectedFiles.includes(file)
        );

        if (removedFiles.length > 0) {
          const removedFileNames = removedFiles.map(
            (removedFile) => removedFile.name
          );

          const {
            data: removedFilePathList,
            error: selectRemovedFilePathListError,
          } = await clientSupabase
            .from("project_attachments")
            .select("file_path")
            .in("file_name", removedFileNames);

          if (selectRemovedFilePathListError) {
            throw selectRemovedFilePathListError;
          }

          const removedFilesPaths = removedFilePathList.map(
            (removedFilePath) => removedFilePath.file_path
          );

          const { error: removeError } = await clientSupabase.storage
            .from("project_attachments")
            .remove(removedFilesPaths);

          if (removeError) {
            throw removeError;
          }

          const { error: deleteProjectAttachmentsError } = await clientSupabase
            .from("project_attachments")
            .delete()
            .in("file_path", removedFilesPaths);

          if (deleteProjectAttachmentsError) {
            throw deleteProjectAttachmentsError;
          }
        }

        const addedFiles = selectedFiles.filter(
          (file) => !beforeChangeFiles.includes(file)
        );

        if (addedFiles.length > 0) {
          const insertPromises = addedFiles.map(async (file) => {
            const cleanFileName = `${file.name.replace(
              /[^a-zA-Z0-9.-]/g,
              "_"
            )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
            const { data: storageData, error: uploadStorageDataError } =
              await clientSupabase.storage
                .from("project_attachments")
                .upload(`public/${cleanFileName}`, file);

            if (uploadStorageDataError) {
              await clientSupabase
                .from("projects")
                .delete()
                .eq("id", projectId);
              throw uploadStorageDataError;
            }
            return {
              project_id: projectId,
              file_name: file.name,
              file_path: storageData?.path,
            };
          });

          const newAttachments = await Promise.all(insertPromises);

          const { error: insertProjectAttachmentsDataError } =
            await clientSupabase
              .from("project_attachments")
              .insert(newAttachments);

          if (insertProjectAttachmentsDataError) {
            throw insertProjectAttachmentsDataError;
          }
        }

        const addedProjectMembersIdList = selectedUsers
          .filter((selectedUser) => !copiedSelectedUsers.includes(selectedUser))
          .map((selectedUser) => selectedUser.value);

        if (addedProjectMembersIdList && addedProjectMembersIdList.length > 0) {
          const postEmailNotificationsError = await postMailNotifications(
            userId,
            null,
            projectId,
            0,
            addedProjectMembersIdList
          );
          if (postEmailNotificationsError) {
            console.error(
              "Error post mail notifications ",
              postEmailNotificationsError
            );
          }
        }

        const deletedProjectMembersIdList = copiedSelectedUsers
          .filter(
            (copiedSelectedUser) => !selectedUsers.includes(copiedSelectedUser)
          )
          .map((selectedUser) => selectedUser.value);

        if (
          deletedProjectMembersIdList &&
          deletedProjectMembersIdList.length > 0
        ) {
          const postEmailNotificationsError = await postMailNotifications(
            userId,
            null,
            projectId,
            1,
            deletedProjectMembersIdList
          );
          if (postEmailNotificationsError) {
            console.error(
              "Error post mail notifications ",
              postEmailNotificationsError
            );
          }
        }

        addItem({ target: 0, id: projectId });
        setNotificationValue({
          message: "Project was updated.",
          color: 0,
        });
        setPostLoading(true);
        setPageUpdated(true);
        onClose();
      } else {
        const { data: projectData, error: insertProjectDataError } =
          await clientSupabase
            .from("projects")
            .insert({ project_name: projectName, details: details })
            .select();

        if (insertProjectDataError) {
          throw insertProjectDataError;
        }

        const projectId = projectData[0].id;
        const projectUsersInsertRows = selectedUsers.map((user) => ({
          project_id: projectId,
          user_id: user.value,
        }));

        const { error: insertProjectUsersError } = await clientSupabase
          .from("project_users")
          .insert(projectUsersInsertRows);

        if (insertProjectUsersError) {
          await clientSupabase.from("projects").delete().eq("id", projectId);
          throw insertProjectUsersError;
        }

        const taskGenreInsertRows = taskGenreDataArray.map((taskGenreData) => ({
          task_genre_name: taskGenreData.taskGenreName,
          project_id: projectId,
          start_date: addTime(taskGenreData.selectedStartDate),
          deadline_date: addTime(taskGenreData.selectedDeadlineDate),
        }));

        const { error: insertTaskGenreError } = await clientSupabase
          .from("task_genre")
          .insert(taskGenreInsertRows);

        if (insertTaskGenreError) {
          await clientSupabase.from("projects").delete().eq("id", projectId);
          throw insertTaskGenreError;
        }

        const insertPromises = selectedFiles.map(async (file) => {
          const cleanFileName = `${file.name.replace(
            /[^a-zA-Z0-9.-]/g,
            "_"
          )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
          const { data: storageData, error: uploadStorageDataError } =
            await clientSupabase.storage
              .from("project_attachments")
              .upload(`public/${cleanFileName}`, file);

          if (uploadStorageDataError) {
            await clientSupabase.from("projects").delete().eq("id", projectId);

            throw uploadStorageDataError;
          }
          return {
            project_id: projectId,
            file_name: file.name,
            file_path: storageData?.path,
          };
        });
        const insertProjectAttachments = await Promise.all(insertPromises);

        const { error: insertProjectAttachmentsDataError } =
          await clientSupabase
            .from("project_attachments")
            .insert(insertProjectAttachments);

        if (insertProjectAttachmentsDataError) {
          await clientSupabase.from("projects").delete().eq("id", projectId);
          throw insertProjectAttachmentsDataError;
        }

        const postEmailNotificationsError = await postMailNotifications(
          userId,
          null,
          projectId,
          0,
          []
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications ",
            postEmailNotificationsError
          );
        }

        addItem({ target: 0, id: projectId });
        setNotificationValue({
          message: "Project was added.",
          color: 0,
        });
        setPostLoading(true);
        setPageUpdated(true);
        onClose();
      }
    } catch (error) {
      console.error(
        projectId ? "Error edit project " : "Error add project ",
        error
      );
      setNotificationValue({
        message: projectId
          ? "Project was not edited."
          : "Project was not added.",
        color: 1,
      });
      setPostLoading(true);
      setPageUpdated(true);
    }
  };

  return (
    <div className={styles.popup}>
      <div className={styles[`popup-inner`]}>
        {getLoading ? (
          <div className={styles["spinner-container"]}>
            <div className={styles.spinner}></div>
            <div className={styles.loading}>Loading...</div>
          </div>
        ) : (
          <div className={styles[`popup-inner-area`]}>
            <div className={styles[`title-area`]}>
              <h1>{projectId ? "Edit Project" : "Add Project"}</h1>
              <div className={styles["required-form"]}>※ → Required Form</div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles[`project-name-members-area`]}>
                <div
                  className={classNames(
                    styles[`form-group`],
                    styles[`exist-margin-right`]
                  )}
                >
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name"
                    required
                  />
                  <p className={styles.instruction}>※Enter Project Name</p>
                </div>

                <div
                  className={classNames(
                    styles[`form-group`],
                    styles[`exist-margin-left`]
                  )}
                >
                  <Select
                    isMulti
                    options={userOptions}
                    value={selectedUsers}
                    onChange={handleUserChange}
                    placeholder="-- Members --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>※Select Project Members</p>
                </div>
              </div>

              <div className={styles[`form-group`]}>
                <div className={styles[`production-costs-area`]}>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.plus
                    )}
                    onClick={() => addTaskGenreForm()}
                  >
                    add
                  </span>

                  <div className={styles[`form-area`]}>
                    {taskGenreDataArray && taskGenreDataArray.length > 0 ? (
                      taskGenreDataArray.map((taskGenreData, index) => {
                        const taskGenreNamePlaceholder =
                          "Task Genre Name" + (index + 1);
                        return (
                          <div
                            className={styles[`task-genre-area`]}
                            key={index}
                          >
                            <div className={styles[`task-genre-form-area`]}>
                              <div
                                className={styles[`task-genre-input-container`]}
                              >
                                <input
                                  type="text"
                                  name="taskGenreName"
                                  value={taskGenreData.taskGenreName}
                                  onChange={(e) =>
                                    setTaskGenreData(
                                      e.target.value,
                                      index,
                                      e.target.name
                                    )
                                  }
                                  placeholder={taskGenreNamePlaceholder}
                                  required
                                />
                              </div>
                              <DatePicker
                                selected={taskGenreData.selectedStartDate}
                                onChange={(dates) =>
                                  handleDateRangeChange(dates, index)
                                }
                                startDate={taskGenreData.selectedStartDate}
                                endDate={taskGenreData.selectedDeadlineDate}
                                selectsRange
                                dateFormat="yyyy/MM/dd"
                                placeholderText="Period"
                                className={styles[`date-picker`]}
                                calendarClassName={styles[`custom-calendar`]}
                                showIcon
                                required
                              />
                            </div>
                            <div className={styles["minus-button-area"]}>
                              <span
                                className={classNames(
                                  "material-symbols-outlined",
                                  styles.minus
                                )}
                                onClick={() => removeTaskGenreForm(index)}
                              >
                                remove
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles[`non-task-genre`]}>
                        No Task Genre
                      </div>
                    )}
                  </div>
                </div>
                <p className={styles.instruction}>Enter Estimated Task Genre</p>
              </div>

              <div className={styles[`form-group`]}>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Details"
                ></textarea>
                <p className={styles.instruction}>Enter Project Details</p>
              </div>

              <div
                className={styles[`attached-file-area`]}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {selectedFiles.length === 0 ? (
                  <div className={styles["none-attached-file-area"]}>
                    <p>Drag & Drop Files</p>
                    <span
                      className={classNames(
                        "material-symbols-outlined",
                        styles.clip
                      )}
                    >
                      attach_file
                    </span>
                  </div>
                ) : (
                  <div className={styles["display-attached-file-area"]}>
                    {selectedFiles.map((file: any, index) => (
                      <div
                        className={styles["display-attached-file-container"]}
                        key={index}
                      >
                        <div className={styles["file-info"]}>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles[`attached-file-icon`]
                            )}
                          >
                            upload_file
                          </span>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles[`cancel-icon`]
                            )}
                            onClick={() => deleteAttachedFile(index)}
                          >
                            cancel
                          </span>
                        </div>
                        <p>{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles[`button-container`]}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>
              </div>
              <p className={styles.attention}>Maximum file size is 3MB</p>

              <div className={styles[`button-area`]}>
                <button className={styles.cancel} onClick={onClose}>
                  Cancel
                </button>
                <button className={styles.add} type="submit">
                  {postLoading ? (
                    projectId ? (
                      "Update"
                    ) : (
                      "Add"
                    )
                  ) : (
                    <div className={styles[`button-spinner`]}></div>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPopup;
