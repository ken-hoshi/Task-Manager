import React, { useEffect, useRef, useState } from "react";
import styles from "./projectPopup.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getUsers } from "@/app/lib/getUser";
import Select, { MultiValue } from "react-select";
import { selectBoxStyles } from "./selectBoxStyles";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { fetchAttachmentFiles } from "@/app/lib/fetchAttachmentFiles";
import classNames from "classnames";
import { postMailNotifications } from "@/app/lib/postMailNotifications";

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
          const { data: projectData, error: projectSelectError } =
            await clientSupabase
              .from("projects")
              .select("id, project_name, details, project_users (user_id)")
              .eq("id", projectId)
              .single();

          if (projectSelectError || !projectData) {
            throw new Error("Project Data is null.");
          }

          setProjectName(projectData.project_name);
          setDetails(projectData.details);

          const selectedUserIds = projectData.project_users.map(
            (user: { user_id: number }) => user.user_id
          );
          const { data: selectedUsersData, error: selectUsersError } =
            await clientSupabase
              .from("users")
              .select("id, name")
              .in("id", selectedUserIds);

          if (selectUsersError || !selectedUsersData) {
            throw new Error("User is null.");
          }

          const selectedUserOptions = selectedUsersData.map(
            (user: { id: number; name: string }) => ({
              value: user.id,
              label: user.name,
            })
          );
          setSelectedUsers(selectedUserOptions);
          setCopiedSelectedUsers(selectedUserOptions);

          const userList = await getUsers();
          setUsers(userList);

          const projectAttachmentsData = await fetchAttachmentFiles(
            0,
            projectId
          );
          setSelectedFiles(projectAttachmentsData);
          setBeforeChangeFiles(projectAttachmentsData);

          setGetLoading(false);
        } catch (error) {
          console.error("Error fetch project details:", error);
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
        const { error: projectUpdateError } = projectUpdateResult;
        const { error: projectUsersDeleteError } = projectUsersDeleteResult;

        if (projectUpdateError) {
          throw projectUpdateError;
        }

        if (projectUsersDeleteError) {
          throw projectUsersDeleteError;
        }

        await Promise.all(
          selectedUsers.map(async (user) => {
            const { data, error: projectUsersError } = await clientSupabase
              .from("project_users")
              .insert([{ project_id: projectId, user_id: user.value }]);

            if (projectUsersError) {
              throw projectUsersError;
            }
            return data;
          })
        );

        const removedFiles = beforeChangeFiles.filter(
          (file) => !selectedFiles.includes(file)
        );

        if (removedFiles.length > 0) {
          const removedFilesPaths = removedFiles.map(
            (file) => `public/${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
          );

          const { error: removeError } = await clientSupabase.storage
            .from("project_attachments")
            .remove(removedFilesPaths);

          if (removeError) {
            throw removeError;
          }

          const { error: projectAttachmentsDeleteError } = await clientSupabase
            .from("project_attachments")
            .delete()
            .in("file_path", removedFilesPaths);

          if (projectAttachmentsDeleteError) {
            throw projectAttachmentsDeleteError;
          }
        }

        const addedFiles = selectedFiles.filter(
          (file) => !beforeChangeFiles.includes(file)
        );

        if (addedFiles.length > 0) {
          const insertPromises = addedFiles.map(async (file) => {
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
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
              "Error post mail notifications:",
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
              "Error post mail notifications:",
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
        const { data: projectInsertData, error: projectInsertError } =
          await clientSupabase
            .from("projects")
            .insert({ project_name: projectName, details: details })
            .select();

        if (projectInsertError) {
          throw projectInsertError;
        }

        const projectId = projectInsertData[0].id;
        await Promise.all(
          selectedUsers.map(async (user) => {
            const { data, error: projectUsersError } = await clientSupabase
              .from("project_users")
              .insert([{ project_id: projectId, user_id: user.value }]);

            if (projectUsersError) {
              throw projectUsersError;
            }
            return data;
          })
        );

        const insertPromises = selectedFiles.map(async (file) => {
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const { data: storageData, error: uploadStorageDataError } =
            await clientSupabase.storage
              .from("project_attachments")
              .upload(`public/${cleanFileName}`, file);

          if (uploadStorageDataError) {
            await clientSupabase.from("projects").delete().eq("id", projectId);
            await clientSupabase
              .from("project_users")
              .delete()
              .eq("project_id", projectId);
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
            "Error post mail notifications:",
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
        projectId ? "Error edit project:" : "Error add project:",
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
      <div className={styles.popupInner}>
        {getLoading ? (
          <div className={styles["spinner-container"]}>
            <div className={styles.spinner}></div>
            <div className={styles.loading}>Loading...</div>
          </div>
        ) : (
          <div className={styles.popupInnerArea}>
            <h1>{projectId ? "Edit Project" : "Add Project"}</h1>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                  required
                />
                <p className={styles.instruction}>Enter Project Name</p>
              </div>

              <div className={styles.formGroup}>
                <Select
                  isMulti
                  options={userOptions}
                  value={selectedUsers}
                  onChange={handleUserChange}
                  placeholder="-- Members --"
                  required
                  styles={selectBoxStyles}
                />
                <p className={styles.instruction}>Select Project Members</p>
              </div>

              <div className={styles.formGroup}>
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
              <p className={styles.attention}>※Maximum file size is 3MB</p>

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
