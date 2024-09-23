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
import { fetchAttachmentFiles } from "@/app/lib/fetchAttachmentFiles";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

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
  const [projectMember, setProjectMember] = useState<UserProps[]>([]);
  const [statuses, setStatuses] = useState<StatusProps[]>([]);
  const [selectedUser, setSelectedUser] = useState<Option>();
  const [selectedProject, setSelectedProject] = useState<Option>();
  const [selectedStatus, setSelectedStatus] = useState<Option>();
  const [selectedDeadlineDate, setSelectedDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    undefined
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
          const { data: taskData, error: taskSelectError } =
            await clientSupabase
              .from("tasks")
              .select("*")
              .eq("id", taskId)
              .single();

          if (taskSelectError || !taskData) {
            throw new Error("Task Data is null.");
          }

          setTaskName(taskData.task_name);
          setDetails(taskData.details);
          setSelectedDeadlineDate(taskData.deadline_date);
          setSelectedStartDate(taskData.start_date);

          const projects = await getProjects();
          const selectedProjectName = projects.filter(
            (project) => project.id === taskData.project_id
          );
          setSelectedProject({
            value: taskData.project_id,
            label: selectedProjectName[0].project_name,
          });

          const projectList = await getProjects(taskData.assigned_user_id);
          setProjects(projectList);

          const statuses = await getStatus();
          const selectedStatus = statuses.filter(
            (status) => status.id === taskData.status_id
          );

          setSelectedStatus({
            value: taskData.status_id,
            label: selectedStatus[0].status,
          });

          setStatuses(statuses);

          const { data: userName, error: selectUserNameError } =
            await clientSupabase
              .from("users")
              .select("name")
              .eq("id", taskData.assigned_user_id)
              .single();

          if (selectUserNameError || !userName) {
            throw new Error("User is null.");
          }

          setSelectedUser({
            value: taskData.assigned_user_id,
            label: userName.name,
          });

          const taskAttachmentsData = await fetchAttachmentFiles(1, taskId);
          setSelectedFiles(taskAttachmentsData);
          setBeforeChangeFiles(taskAttachmentsData);

          setGetLoading(false);
        } catch (error) {
          console.error("Error fetch task details:", error);
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

          if (!projectId) {
            const { data: userName, error: selectUserNameError } =
              await clientSupabase
                .from("users")
                .select("name")
                .eq("id", userId)
                .single();

            if (selectUserNameError || !userName) {
              throw new Error("User is null.");
            }

            setSelectedUser({
              value: userId,
              label: userName.name,
            });
          }

          const statusList = await getStatus();
          setStatuses(statusList);

          setGetLoading(false);
        } catch (error) {
          console.error("Error fetch task details:", error);
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
    const fetchProjectMembers = async () => {
      if (selectedProject) {
        const projectMembersList = await getProjectMember(
          selectedProject.value
        );
        setProjectMember(projectMembersList);
      }
    };
    fetchProjectMembers();
  }, [selectedProject]);

  const handleUserChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedUser(selectedOptions as Option);
  };

  const userOptions = projectMember
    .filter((user) => !selectedUser || selectedUser.value !== user.id)
    .map((user) => ({
      value: user.id,
      label: user.name,
    }));

  const handleStatusChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedStatus(selectedOptions as Option);
  };

  const statusOptions = statuses
    .filter((status) => !selectedStatus || selectedStatus.value !== status.id)
    .map((status) => ({
      value: status.id,
      label: status.status,
    }));

  const handleProjectChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedProject(selectedOptions as Option);
  };

  const projectOptions = projects
    .filter(
      (project) => !selectedProject || selectedProject.value !== project.id
    )
    .map((project) => ({
      value: project.id,
      label: project.project_name,
    }));

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, deadline] = dates;
    setSelectedStartDate(start ?? undefined);
    setSelectedDeadlineDate(deadline ?? undefined);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const deleteAttachmentFile = (index: number) => {
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

    const payloadValue = {
      task_name: taskName,
      start_date: selectedStartDate,
      deadline_date: selectedDeadlineDate,
      details,
      status_id: selectedStatus!.value,
      assigned_user_id: selectedUser!.value,
      project_id: selectedProject!.value,
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
          const removedFilesPaths = removedFiles.map((file) => `${file.name}`);
          const { error: removeError } = await clientSupabase.storage
            .from("task_attachments")
            .remove(removedFilesPaths);

          if (removeError) {
            throw removeError;
          }

          const { error: taskAttachmentsDeleteError } = await clientSupabase
            .from("task_attachments")
            .delete()
            .eq("file_path", removedFilesPaths);

          if (taskAttachmentsDeleteError) {
            throw taskAttachmentsDeleteError;
          }
        }

        const addedFiles = selectedFiles.filter(
          (file) => !beforeChangeFiles.includes(file)
        );

        if (addedFiles.length > 0) {
          const insertPromises = addedFiles.map(async (file) => {
            const { data: storageData, error: uploadStorageDataError } =
              await clientSupabase.storage
                .from("task_attachments")
                .upload(`public/${file.name}-timestamp-${Date.now()}`, file);

            if (uploadStorageDataError) {
              await clientSupabase.from("tasks").delete().eq("id", taskId);
              throw uploadStorageDataError;
            }
            return {
              task_id: taskId,
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
          1
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications:",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "Task updated.",
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
          const { data: storageData, error: uploadStorageDataError } =
            await clientSupabase.storage
              .from("task_attachments")
              .upload(`public/${file.name}-timestamp-${Date.now()}`, file);

          if (uploadStorageDataError) {
            await clientSupabase.from("tasks").delete().eq("id", taskId);
            throw uploadStorageDataError;
          }
          return {
            task_id: taskId,
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

        const postEmailNotificationsError = await postMailNotifications(
          userId,
          taskId,
          null,
          0
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications:",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "Task added.",
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
      <div className={styles.popupInner}>
        {getLoading ? (
          <div className={styles["spinner-container"]}>
            <div className={styles.spinner}></div>
            <div className={styles.loading}>Loading...</div>
          </div>
        ) : (
          <div className={styles.popupInnerArea}>
            <h1>{taskId ? "Edit Task" : "Add Task"}</h1>
            <form onSubmit={handleSubmit}>
              <div className={styles["form-container"]}>
                <div>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="Task Name"
                    required
                    className={styles.taskName}
                  />
                  <p className={styles.instruction}>Enter Task Name</p>
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
                  <p className={styles.instruction}>Select Project</p>
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
                  <p className={styles.instruction}>Select Assigned User</p>
                </div>

                <div>
                  <Select
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    placeholder="-- Status --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>Select Status</p>
                </div>
              </div>
              <div
                className={classNames(
                  styles["form-container"],
                  styles["datePicker-container"]
                )}
              >
                <div>
                  <DatePicker
                    selected={selectedStartDate}
                    onChange={handleDateRangeChange}
                    startDate={selectedStartDate}
                    endDate={selectedDeadlineDate}
                    selectsRange
                    dateFormat="yyyy/MM/dd"
                    placeholderText="Period"
                    className={styles.datePicker}
                    calendarClassName={styles.customCalendar}
                    showIcon
                    required
                  />
                  <p className={styles.instruction}>
                    Select Start Day & Deadline Day
                  </p>
                </div>

                <div>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Details"
                  ></textarea>
                  <p className={styles.instruction}>Enter Task Details</p>
                </div>
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
                        styles.clipIcon
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
                              styles.attachedFileIcon
                            )}
                          >
                            upload_file
                          </span>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.cancelIcon
                            )}
                            onClick={() => deleteAttachmentFile(index)}
                          >
                            cancel
                          </span>
                        </div>
                        <p>
                          {file.name.split("/").pop().split("-timestamp-")[0]}
                        </p>
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
              <p className={styles.attention}>※Maximum file size is 3MB</p>

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
