import React, { useEffect, useRef, useState } from "react";
import styles from "./taskPopup.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import Select, { SingleValue } from "react-select";
import { selectBoxStyles } from "./selectBoxStyles";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { getProjects } from "@/app/lib/getProject";
import { getStatus } from "@/app/lib/getStatus";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getProjectMember } from "@/app/lib/getProjectMember";
import classNames from "classnames";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { fetchAttachedFiles } from "@/app/lib/fetchAttachedFiles";

interface TaskPopupProps {
  onClose: () => void;
  userId: number;
  taskId: number | null;
  projectId: number | null;
}

interface UserProps {
  id: number;
  name: string;
}

interface ProjectProps {
  id: number;
  project_name: string;
  details: string;
}

interface TaskGenreDataProps {
  id: number;
  taskGenreName: string;
  selectedStartDate: Date | undefined;
  selectedDeadlineDate: Date | undefined;
}

interface StatusProps {
  id: number;
  status: string;
}

interface Option {
  value: number;
  label: string;
}

const TaskPopup: React.FC<TaskPopupProps> = ({
  onClose,
  userId,
  taskId,
  projectId,
}) => {
  const [taskName, setTaskName] = useState("");
  const [details, setDetails] = useState("");
  const [projects, setProjects] = useState<ProjectProps[]>([]);
  const [taskGenreDataArray, setTaskGenreDataArray] = useState<
    TaskGenreDataProps[]
  >([]);
  const [projectMember, setProjectMember] = useState<UserProps[]>([]);
  const [statuses, setStatuses] = useState<StatusProps[]>([]);
  const [selectedUser, setSelectedUser] = useState<Option>();
  const [selectedProject, setSelectedProject] = useState<Option>();
  const [selectedTaskGenre, setSelectedTaskGenre] = useState<Option | null>();
  const [selectedStatus, setSelectedStatus] = useState<Option>({
    value: 1,
    label: "Not Status",
  });
  const [selectedDeadlineDate, setSelectedDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    undefined
  );
  const [numberOfDays, setNumberOfDays] = useState<number | string | undefined>(
    ""
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [beforeChangeFiles, setBeforeChangeFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [getLoading, setGetLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(true);

  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { addItem } = useFlashDisplayContext();

  useEffect(() => {
    if (taskId) {
      const fetchUpdateTaskData = async () => {
        try {
          const [
            { data: taskData, error: selectTaskError },
            projects,
            statuses,
            { data: taskGenreData, error: selectTaskGenreDataError },
            taskAttachmentsData,
          ] = await Promise.all([
            clientSupabase.from("tasks").select("*").eq("id", taskId).single(),
            getProjects(),
            getStatus(),
            clientSupabase.from("task_genre").select("*"),
            fetchAttachedFiles(1, [taskId]),
          ]);

          if (selectTaskError) {
            throw selectTaskError;
          }

          if (!taskData || taskData.length === 0)
            throw new Error("Task Data is null.");

          if (selectTaskGenreDataError) {
            throw selectTaskGenreDataError;
          }

          setTaskName(taskData.task_name);
          setSelectedDeadlineDate(taskData.deadline_date);
          setSelectedStartDate(taskData.start_date);
          setNumberOfDays(taskData.number_of_days);
          setDetails(taskData.details);

          const selectedProjectName = projects.find(
            (project) => project.id === taskData.project_id
          );
          if (selectedProjectName) {
            setSelectedProject({
              value: taskData.project_id,
              label: selectedProjectName.project_name,
            });
          }
          setProjects(await getProjects(taskData.assigned_user_id));

          const { data: userName, error: selectUserNameError } =
            await clientSupabase
              .from("users")
              .select("name")
              .eq("id", taskData.assigned_user_id)
              .single();

          if (selectUserNameError) throw selectUserNameError;

          if (!userName) throw new Error("User is null.");

          setSelectedUser({
            value: taskData.assigned_user_id,
            label: userName.name,
          });

          if (taskGenreData && taskGenreData.length > 0) {
            const selectedTaskGenre = taskGenreData.find(
              (taskGenre) => taskGenre.id === taskData.task_genre_id
            );

            if(selectedTaskGenre){
              setSelectedTaskGenre({
                value: taskData.task_genre_id,
                label: selectedTaskGenre.task_genre_name,
              });
            }
          }
          setProjects(await getProjects(taskData.assigned_user_id));

          const selectedStatus = statuses.find(
            (status) => status.id === taskData.status_id
          );
          if (selectedStatus) {
            setSelectedStatus({
              value: taskData.status_id,
              label: selectedStatus.status,
            });
          }
          setStatuses(statuses);

          setSelectedFiles(taskAttachmentsData[0]);
          setBeforeChangeFiles(taskAttachmentsData[0]);

          setGetLoading(false);
        } catch (error) {
          console.error("Error Fetch Task Details:", error);
          onClose();
          setNotificationValue({
            message: "Couldn't get the Task data.",
            color: 1,
          });
        }
      };
      fetchUpdateTaskData();
    } else {
      const fetchData = async () => {
        try {
          let projectList;

          if (!projectId) {
            const { data: userName, error: selectUserNameError } =
              await clientSupabase
                .from("users")
                .select("name")
                .eq("id", userId)
                .single();

            if (selectUserNameError) {
              throw selectUserNameError;
            }

            if (!userName) {
              throw new Error("User is null.");
            }

            setSelectedUser({
              value: userId,
              label: userName.name,
            });
            projectList = await getProjects(userId);
          } else {
            projectList = (await getProjects()).filter(
              (project) => project.id == projectId
            );
            setSelectedProject({
              value: projectId,
              label: projectList[0].project_name,
            });
          }
          setProjects(projectList);

          const statusList = await getStatus();
          setStatuses(statusList);

          setGetLoading(false);
        } catch (error) {
          console.error("Error Fetch Task Details:", error);
          onClose();
          setNotificationValue({
            message: "Couldn't get the Task data.",
            color: 1,
          });
        }
      };
      fetchData();
    }
  }, []);

  useEffect(() => {
    const fetchProjectMembersAndTaskGenre = async () => {
      if (selectedProject) {
        const projectMembersList = await getProjectMember(
          selectedProject.value
        );
        setProjectMember(projectMembersList);

        const { data: taskGenreData, error: selectTaskGenreError } =
          await clientSupabase
            .from("task_genre")
            .select("id,task_genre_name, start_date, deadline_date")
            .eq("project_id", selectedProject.value);

        if (selectTaskGenreError) {
          throw selectTaskGenreError;
        }

        const taskGenreArray = taskGenreData.map((taskGenre) => ({
          id: taskGenre.id,
          taskGenreName: taskGenre.task_genre_name,
          selectedStartDate: taskGenre.start_date,
          selectedDeadlineDate: taskGenre.deadline_date,
        }));
        setTaskGenreDataArray(taskGenreArray);
      }
    };
    fetchProjectMembersAndTaskGenre();
  }, [selectedProject]);

  const handleProjectChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedProject(selectedOptions as Option);
    setSelectedTaskGenre(null);
    setSelectedStartDate(undefined);
    setSelectedDeadlineDate(undefined);
    setNumberOfDays("");
  };

  const projectOptions = projects
    .filter(
      (project) => !selectedProject || selectedProject.value !== project.id
    )
    .map((project) => ({
      value: project.id,
      label: project.project_name,
    }));

  const handleUserChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedUser(selectedOptions as Option);
  };

  const userOptions = projectMember
    .filter((user) => !selectedUser || selectedUser.value !== user.id)
    .map((user) => ({
      value: user.id,
      label: user.name,
    }));

  const handleTaskGenreChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedTaskGenre(selectedOptions as Option);

    const selectedTaskGenre = taskGenreDataArray.find(
      (taskGenreData) => taskGenreData.id === selectedOptions?.value
    );

    setSelectedStartDate(selectedTaskGenre?.selectedStartDate);
    setSelectedDeadlineDate(selectedTaskGenre?.selectedDeadlineDate);

    if (
      selectedTaskGenre?.selectedStartDate &&
      selectedTaskGenre?.selectedDeadlineDate
    ) {
      const numberOfDays = Math.ceil(
        (new Date(selectedTaskGenre.selectedDeadlineDate).getTime() -
          new Date(selectedTaskGenre.selectedStartDate).getTime()) /
          (1000 * 60 * 60 * 24) +
          1
      );
      setNumberOfDays(numberOfDays);
    }
  };

  const taskGenreOptions = taskGenreDataArray
    .filter(
      (taskGenre) =>
        !selectedTaskGenre || selectedTaskGenre.value !== taskGenre.id
    )
    .map((taskGenre) => ({
      value: taskGenre.id,
      label: taskGenre.taskGenreName,
    }));

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, deadline] = dates;
    setSelectedStartDate(start ?? undefined);
    setSelectedDeadlineDate(deadline ?? undefined);

    if (start && deadline) {
      const numberOfDays = Math.ceil(
        (deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1
      );
      setNumberOfDays(numberOfDays);
    }
  };

  const handleStatusChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedStatus(selectedOptions as Option);
  };

  const statusOptions = statuses
    .filter((status) => !selectedStatus || selectedStatus.value !== status.id)
    .map((status) => ({
      value: status.id,
      label: status.status,
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

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (!postLoading) return;
    setPostLoading(false);

    const startDateWithTime = new Date(selectedStartDate!);
    startDateWithTime.setHours(9, 0, 0, 0);

    const deadlineDateWithTime = new Date(selectedDeadlineDate!);
    deadlineDateWithTime.setHours(9, 0, 0, 0);

    const payloadValue = {
      task_name: taskName,
      project_id: selectedProject!.value,
      assigned_user_id: selectedUser!.value,
      task_genre_id: selectedTaskGenre?.value,
      start_date: startDateWithTime,
      deadline_date: deadlineDateWithTime,
      number_of_days: numberOfDays,
      status_id: selectedStatus!.value,
      details: details,
    };

    try {
      if (taskId) {
        const { error: taskUpdateError } = await clientSupabase
          .from("tasks")
          .update(payloadValue)
          .eq("id", taskId);

        if (taskUpdateError) {
          throw taskUpdateError;
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
            .from("task_attachments")
            .select("file_path")
            .in("file_name", removedFileNames);

          if (selectRemovedFilePathListError) {
            throw selectRemovedFilePathListError;
          }

          const removedFilesPaths = removedFilePathList.map(
            (removedFilePath) => removedFilePath.file_path
          );
          const { error: removeError } = await clientSupabase.storage
            .from("task_attachments")
            .remove(removedFilesPaths);

          if (removeError) {
            throw removeError;
          }

          const { error: taskAttachmentsDeleteError } = await clientSupabase
            .from("task_attachments")
            .delete()
            .in("file_path", removedFilesPaths);

          if (taskAttachmentsDeleteError) {
            throw taskAttachmentsDeleteError;
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
                .from("task_attachments")
                .upload(`public/${cleanFileName}`, file);

            if (uploadStorageDataError) {
              throw uploadStorageDataError;
            }
            return {
              task_id: taskId,
              file_name: file.name,
              file_path: storageData?.path,
            };
          });
          const insertTaskAttachments = await Promise.all(insertPromises);

          const { error: insertTaskAttachmentsDataError } = await clientSupabase
            .from("task_attachments")
            .insert(insertTaskAttachments);

          if (insertTaskAttachmentsDataError) {
            throw insertTaskAttachmentsDataError;
          }
        }

        const postEmailNotificationsError = await postMailNotifications(
          userId,
          taskId,
          null,
          1,
          []
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications:",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "Task was updated.",
          color: 0,
        });
        setPostLoading(true);
        setPageUpdated(true);
        onClose();
      } else {
        const { data: taskInsertData, error: taskInsertError } =
          await clientSupabase.from("tasks").insert(payloadValue).select();

        if (taskInsertError) {
          throw taskInsertError;
        }

        const taskId = taskInsertData![0].id;
        const insertPromises = selectedFiles.map(async (file) => {
          const cleanFileName = `${file.name.replace(
            /[^a-zA-Z0-9.-]/g,
            "_"
          )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
          const { data: storageData, error: uploadStorageDataError } =
            await clientSupabase.storage
              .from("task_attachments")
              .upload(`public/${cleanFileName}`, file);

          if (uploadStorageDataError) {
            await clientSupabase.from("tasks").delete().eq("id", taskId);
            throw uploadStorageDataError;
          }
          return {
            task_id: taskId,
            file_name: file.name,
            file_path: storageData?.path,
          };
        });
        const insertTaskAttachments = await Promise.all(insertPromises);

        const { error: insertTaskAttachmentsDataError } = await clientSupabase
          .from("task_attachments")
          .insert(insertTaskAttachments);

        if (insertTaskAttachmentsDataError) {
          await clientSupabase.from("tasks").delete().eq("id", taskId);
          throw insertTaskAttachmentsDataError;
        }

        const postEmailNotificationsError = await postMailNotifications(
          userId,
          taskId,
          null,
          0,
          []
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications:",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "Task was added.",
          color: 0,
        });
        setPostLoading(true);
        setPageUpdated(true);
        onClose();
      }
    } catch (error) {
      console.error(taskId ? "Error edit task:" : "Error add task:", error);
      setNotificationValue({
        message: taskId ? "Task was not edited." : "Task was not added.",
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
              <h1>{taskId ? "Edit Task" : "Add Task"}</h1>
              <div className={styles["required-form"]}>※ → Required Form</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles["form-container"]}>
                <div>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Task Name"
                    required
                    className={styles[`task-name`]}
                  />
                  <p className={styles.instruction}>※Enter Task Name</p>
                </div>

                <div>
                  <Select
                    options={projectOptions}
                    value={selectedProject}
                    onChange={handleProjectChange}
                    placeholder="-- Project --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>※Select Project</p>
                </div>
              </div>

              <div className={styles["form-container"]}>
                <div>
                  <Select
                    options={userOptions}
                    value={selectedUser}
                    onChange={handleUserChange}
                    placeholder="-- User --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>※Select Assigned User</p>
                </div>

                <div>
                  <Select
                    options={taskGenreOptions}
                    value={selectedTaskGenre}
                    onChange={handleTaskGenreChange}
                    placeholder="-- Task Genre --"
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>Select Task Genre</p>
                </div>
              </div>
              <div className={styles["form-container"]}>
                <div>
                  <DatePicker
                    selected={selectedStartDate}
                    onChange={handleDateRangeChange}
                    startDate={selectedStartDate}
                    endDate={selectedDeadlineDate}
                    selectsRange
                    dateFormat="yyyy/MM/dd"
                    placeholderText="Period"
                    className={styles[`date-picker`]}
                    calendarClassName={styles[`custom-calendar`]}
                    showIcon
                    required
                  />
                  <p className={styles.instruction}>
                    ※Select Start Date & Deadline Date
                  </p>
                </div>
                <div>
                  <input
                    type="number"
                    name="numberOfDays"
                    step="0.1"
                    min="0"
                    placeholder="Number of Days"
                    className={styles[`number-of-days-form`]}
                    value={numberOfDays !== undefined ? numberOfDays : ""}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setNumberOfDays(
                        inputValue ? Number(inputValue) : undefined
                      );
                    }}
                    required
                  />
                  <p className={styles.instruction}>※Enter Number of Days</p>
                </div>
              </div>

              <div className={styles["form-container"]}>
                <div>
                  <Select
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    placeholder="-- Status --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>※Select Status</p>
                </div>
              </div>

              <div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Details"
                ></textarea>
                <p className={styles.instruction}>Enter Task Details</p>
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
                        styles[`clip-icon`]
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
                    taskId ? (
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

export default TaskPopup;
