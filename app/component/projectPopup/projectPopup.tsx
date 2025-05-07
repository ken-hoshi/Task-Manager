import React, { useEffect, useRef, useState } from "react";
import styles from "./projectPopup.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getUsers } from "@/app/lib/api/getUser";
import Select, { MultiValue } from "react-select";
import { selectBoxStyles } from "./selectBoxStyles";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import classNames from "classnames";
import DatePicker from "react-datepicker";
import { fetchAttachedFiles } from "@/app/lib/api/fetchAttachedFiles";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

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
  smallProjectId: number | null;
  taskGenreName: string;
  selectedStartDate: Date | undefined;
  selectedDeadlineDate: Date | undefined;
}

interface SmallProjectProps {
  id: number | null;
  smallProjectName: string;
  users: UserProps[];
  selectedUsers: UserOption[];
  beforeChangeSelectedUsers: UserOption[];
  taskGenreDataArray: TaskGenreDataProps[];
  beforeChangeTaskGenreDataArray: TaskGenreDataProps[];
  details: string;
  selectedFiles: File[];
  beforeChangeFiles: File[];
}

const ProjectPopup: React.FC<ProjectPopupProps> = ({
  onClose,
  projectId,
  userId,
}) => {
  const [projectName, setProjectName] = useState("");
  const [beforeChangeProjectName, setBeforeChangeProjectName] = useState("");
  const [users, setUsers] = useState<UserProps[]>([]);

  const [displaySmallProjectNameValue, setDisplaySmallProjectNameValue] =
    useState(0);
  const smallProjectArrayDefaultValue = [
    {
      id: null,
      smallProjectName: "Small Project Name 1",
      users: [],
      selectedUsers: [],
      beforeChangeSelectedUsers: [],
      taskGenreDataArray: [],
      beforeChangeTaskGenreDataArray: [],
      details: "",
      selectedFiles: [],
      beforeChangeFiles: [],
    },
  ];
  const [smallProjectArray, setSmallProjectArray] = useState<
    SmallProjectProps[]
  >(smallProjectArrayDefaultValue);
  const [beforeChangeSmallProjectArray, setBeforeChangeSmallProjectArray] =
    useState<SmallProjectProps[]>(smallProjectArrayDefaultValue);
  const [workspaceTaskGenre, setWorkspaceTaskGenre] = useState<
    TaskGenreDataProps[]
  >([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSmallProjectName, setNewSmallProjectName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [getLoading, setGetLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);

  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { addItem } = useFlashDisplayContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA" &&
        !(
          (e.target as HTMLElement).tagName === "INPUT" &&
          (e.target as HTMLInputElement).classList.contains("tab-input")
        )
      ) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const fetchProjectData = async () => {
      try {
        const {
          data: selectWorkspaceTaskGenreData,
          error: selectWorkspaceTaskGenreDataError,
        } = await clientSupabase
          .from("workspace_task_genre")
          .select("id, task_genre_name, sort_id")
          .eq("workspace_id", displayWorkspaceId);

        if (selectWorkspaceTaskGenreDataError) {
          selectWorkspaceTaskGenreDataError;
        }

        const workspaceTaskGenreData =
          selectWorkspaceTaskGenreData &&
          selectWorkspaceTaskGenreData.length > 0
            ? [...selectWorkspaceTaskGenreData]
                .sort((a, b) => a.sort_id - b.sort_id)
                .map((taskGenre) => ({
                  id: null,
                  smallProjectId: null,
                  taskGenreName: taskGenre.task_genre_name,
                  selectedStartDate: undefined,
                  selectedDeadlineDate: undefined,
                }))
            : [];
        if (workspaceTaskGenreData.length > 0) {
          setWorkspaceTaskGenre(workspaceTaskGenreData);
        }

        if (projectId) {
          const projectPromise = clientSupabase
            .from("projects")
            .select(
              "id, project_name, small_projects (id, small_project_name, details, created_at, small_project_users (user_id, users(name)))"
            )
            .eq("id", projectId)
            .order("id", {
              ascending: true,
              foreignTable: "small_projects",
            })
            .single();

          const usersPromise = getUsers(displayWorkspaceId!);

          const [{ data: projectData, error: selectProjectError }, userList] =
            await Promise.all([projectPromise, usersPromise]);

          if (selectProjectError) {
            throw selectProjectError;
          }

          if (selectProjectError || !projectData) {
            throw new Error("Project data couldn't get.");
          }

          const smallProjectData = projectData.small_projects.map(
            (smallProject) => ({
              id: smallProject.id,
              small_project_name: smallProject.small_project_name,
              details: smallProject.details,
              small_project_users: smallProject.small_project_users.map(
                (smallProjectUsers) => ({
                  user_id: smallProjectUsers.user_id,
                  users: Array.isArray(smallProjectUsers.users)
                    ? smallProjectUsers.users
                    : [smallProjectUsers.users],
                })
              ),
            })
          );

          const smallProjectIdArray = smallProjectData.map(
            (smallProject) => smallProject.id
          );

          const { data: taskGenreData, error: selectTaskGenreError } =
            await clientSupabase
              .from("task_genre")
              .select(
                "id, task_genre_name, start_date, deadline_date, small_project_id"
              )
              .in("small_project_id", smallProjectIdArray);

          if (selectTaskGenreError) {
            throw selectTaskGenreError;
          }

          const attachedFilesArray = await fetchAttachedFiles(
            0,
            smallProjectIdArray
          );

          const createdSmallProjectArray: SmallProjectProps[] =
            smallProjectData.map((smallProject) => {
              const selectedUsers = smallProject.small_project_users.map(
                (user) => ({ value: user.user_id, label: user.users[0].name })
              );

              const taskGenreDataArray =
                taskGenreData && taskGenreData.length > 0
                  ? taskGenreData
                      .filter(
                        (taskGenre) =>
                          taskGenre.small_project_id === smallProject.id
                      )
                      .map((taskGenre) => ({
                        id: taskGenre.id,
                        smallProjectId: taskGenre.small_project_id,
                        taskGenreName: taskGenre.task_genre_name,
                        selectedStartDate: taskGenre.start_date,
                        selectedDeadlineDate: taskGenre.deadline_date,
                      }))
                  : [];

              const smallProjectAttachedFilesArray = attachedFilesArray.find(
                (attachedFiles) => attachedFiles.id === smallProject.id
              );

              return {
                id: smallProject.id,
                smallProjectName: smallProject.small_project_name,
                users: userList,
                selectedUsers: selectedUsers,
                beforeChangeSelectedUsers: selectedUsers,
                taskGenreDataArray: taskGenreDataArray,
                beforeChangeTaskGenreDataArray: taskGenreDataArray,
                details: smallProject.details,
                selectedFiles:
                  smallProjectAttachedFilesArray?.fileDataArray.map(
                    (fileData) => fileData.file
                  ) || [],
                beforeChangeFiles:
                  smallProjectAttachedFilesArray?.fileDataArray.map(
                    (fileData) => fileData.file
                  ) || [],
              };
            });

          setProjectName(projectData.project_name);
          setUsers(userList);
          setBeforeChangeProjectName(projectData.project_name);
          setSmallProjectArray(createdSmallProjectArray);
          setBeforeChangeSmallProjectArray(createdSmallProjectArray);
        } else {
          const userList = await getUsers(displayWorkspaceId!);

          setSmallProjectArray((prevSmallProjectArray) =>
            prevSmallProjectArray.map((project) =>
              selectWorkspaceTaskGenreData &&
              selectWorkspaceTaskGenreData.length > 0
                ? {
                    ...project,
                    users: userList,
                    taskGenreDataArray: [...selectWorkspaceTaskGenreData]
                      .sort((a, b) => a.sort_id - b.sort_id)
                      .map((taskGenre) => ({
                        id: null,
                        smallProjectId: null,
                        taskGenreName: taskGenre.task_genre_name,
                        selectedStartDate: undefined,
                        selectedDeadlineDate: undefined,
                      })),
                  }
                : {
                    ...project,
                    users: userList,
                  }
            )
          );
          setUsers(userList);
        }
      } catch (error) {
        console.error("Fetch Project Details", error);
        onClose();
        setNotificationValue({
          message: "Couldn't get the Project Data.",
          color: 1,
        });
      }
      setGetLoading(false);
    };
    fetchProjectData();

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const handleUserChange = (selectedOptions: MultiValue<UserOption>) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? { ...smallProject, selectedUsers: selectedOptions as UserOption[] }
          : smallProject
      )
    );
  };

  const userOptions = smallProjectArray[displaySmallProjectNameValue].users
    .filter(
      (user) =>
        !smallProjectArray[displaySmallProjectNameValue].selectedUsers.some(
          (selectedUser) => selectedUser.value === user.id
        )
    )
    .map((user) => ({
      value: user.id,
      label: user.name,
    }));

  const handleDetailsChange = (value: string) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? { ...smallProject, details: value }
          : smallProject
      )
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              selectedFiles: [...smallProject.selectedFiles, ...files],
            }
          : smallProject
      )
    );
  };

  const deleteAttachedFile = (fileIndex: number) => {
    const remainFiles = smallProjectArray[
      displaySmallProjectNameValue
    ].selectedFiles.filter((_, i) => i !== fileIndex);
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              selectedFiles: remainFiles,
            }
          : smallProject
      )
    );
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              selectedFiles: [...smallProject.selectedFiles, ...files],
            }
          : smallProject
      )
    );
  };

  const addTaskGenreForm = () => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              taskGenreDataArray: [
                ...smallProject.taskGenreDataArray,
                {
                  id: null,
                  smallProjectId: null,
                  taskGenreName: "",
                  selectedStartDate: undefined,
                  selectedDeadlineDate: undefined,
                },
              ],
            }
          : smallProject
      )
    );
  };

  const removeTaskGenreForm = (taskIndex: number) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              taskGenreDataArray: smallProject.taskGenreDataArray.filter(
                (_, i) => i !== taskIndex
              ),
            }
          : smallProject
      )
    );
  };

  const setTaskGenreData = (value: any, taskIndex: number, name: string) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              taskGenreDataArray: smallProject.taskGenreDataArray.map(
                (taskGenre, i) =>
                  i === taskIndex ? { ...taskGenre, [name]: value } : taskGenre
              ),
            }
          : smallProject
      )
    );
  };

  const handleDateRangeChange = (
    dates: [Date | null, Date | null],
    taskIndex: number
  ) => {
    const [start, deadline] = dates;

    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? {
              ...smallProject,
              taskGenreDataArray: smallProject.taskGenreDataArray.map(
                (taskGenre, i) =>
                  i === taskIndex
                    ? {
                        ...taskGenre,
                        selectedStartDate: start ?? undefined,
                        selectedDeadlineDate: deadline ?? undefined,
                      }
                    : taskGenre
              ),
            }
          : smallProject
      )
    );
  };

  const addSmallProjectNameTab = (value: number) => {
    setSmallProjectArray((prevSmallProjectArray) => [
      ...prevSmallProjectArray,
      {
        id: null,
        smallProjectName: "Small Project Name " + value,
        users: users,
        selectedUsers: [],
        beforeChangeSelectedUsers: [],
        taskGenreDataArray:
          workspaceTaskGenre.length > 0 ? workspaceTaskGenre : [],
        beforeChangeTaskGenreDataArray: [],
        details: "",
        selectedFiles: [],
        beforeChangeFiles: [],
      },
    ]);
    setDisplaySmallProjectNameValue(value - 1);
  };

  const removeSmallProjectNameTab = (index: number) => {
    if (displaySmallProjectNameValue === smallProjectArray.length - 1) {
      setDisplaySmallProjectNameValue(
        (prevDisplaySmallProjectNameValue) =>
          prevDisplaySmallProjectNameValue - 1
      );
    }
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.filter((_, i) => i !== index)
    );
  };

  const handleDoubleClick = (index: number) => {
    setEditingIndex(index);
    setNewSmallProjectName(smallProjectArray[index].smallProjectName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSmallProjectName(e.target.value);
  };

  const handleNameSave = () => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === editingIndex
          ? { ...smallProject, smallProjectName: newSmallProjectName }
          : smallProject
      )
    );
    setEditingIndex(null);
  };

  const handleEnterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    }
  };

  const handleBlur = () => {
    handleNameSave();
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (postLoading) return;
    setPostLoading(true);

    const addTime = (date: Date | undefined): Date => {
      const dateWithTime = new Date(date!);
      dateWithTime.setHours(9, 0, 0, 0);
      return dateWithTime;
    };
    try {
      if (projectId) {
        const notAddedSmallProjectIdList = smallProjectArray
          .map((smallProject) => smallProject.id)
          .filter((id): id is number => id !== null);

        if (notAddedSmallProjectIdList.length > 0) {
          const notAddedSmallProjectArray = smallProjectArray.filter(
            (smallProject) =>
              notAddedSmallProjectIdList.includes(smallProject.id!)
          );

          const { error: updateProjectError } = await clientSupabase
            .from("projects")
            .update({ project_name: projectName })
            .eq("id", projectId);

          if (updateProjectError) {
            throw updateProjectError;
          }

          const transactionProjectSmallProject = async (
            smallProjectId: number
          ) => {
            const beforeChangeSmallProjectData =
              beforeChangeSmallProjectArray.find(
                (beforeChangeSmallProject) =>
                  beforeChangeSmallProject.id === smallProjectId
              );
            if (beforeChangeSmallProjectData) {
              await Promise.all([
                clientSupabase
                  .from("projects")
                  .update({ project_name: beforeChangeProjectName })
                  .eq("id", projectId),
                clientSupabase
                  .from("small_projects")
                  .update({
                    small_project_name:
                      beforeChangeSmallProjectData.smallProjectName,
                    details: beforeChangeSmallProjectData.details,
                  })
                  .eq("id", smallProjectId),
              ]);
            }
          };

          await Promise.all(
            notAddedSmallProjectArray.map(async (notAddedSmallProject) => {
              const { error: updateSmallProjectsError } = await clientSupabase
                .from("small_projects")
                .update({
                  small_project_name: notAddedSmallProject.smallProjectName,
                  details: notAddedSmallProject.details,
                })
                .eq("id", notAddedSmallProject.id);

              if (updateSmallProjectsError) {
                if (notAddedSmallProject.id) {
                  transactionProjectSmallProject(notAddedSmallProject.id);
                }
                throw new Error(
                  `Failed to update small project with ID: ${notAddedSmallProject.id}`
                );
              }
            })
          );

          const { error: deleteProjectUsersError } = await clientSupabase
            .from("small_project_users")
            .delete()
            .in("small_project_id", notAddedSmallProjectIdList);

          if (deleteProjectUsersError) {
            throw deleteProjectUsersError;
          }

          const selectedUsersInsertRows = notAddedSmallProjectArray.flatMap(
            ({ id, selectedUsers }) =>
              selectedUsers.map(({ value }) => ({
                small_project_id: id,
                user_id: value,
              }))
          );

          const { error: insertProjectUsersError } = await clientSupabase
            .from("small_project_users")
            .insert(selectedUsersInsertRows);

          const transactionSmallProjectUsers = async () => {
            await clientSupabase
              .from("small_project_users")
              .delete()
              .in("small_project_id", notAddedSmallProjectIdList);

            const selectedUsersInsertRows =
              beforeChangeSmallProjectArray.flatMap(({ id, selectedUsers }) =>
                selectedUsers.map(({ value }) => ({
                  small_project_id: id,
                  user_id: value,
                }))
              );
            await Promise.all([
              await clientSupabase
                .from("small_project_users")
                .insert(selectedUsersInsertRows),
              notAddedSmallProjectArray.map(async (notAddedSmallProject) => {
                if (notAddedSmallProject.id) {
                  transactionProjectSmallProject(notAddedSmallProject.id);
                }
              }),
            ]);
          };

          if (insertProjectUsersError) {
            transactionSmallProjectUsers();
            throw insertProjectUsersError;
          }

          const updatedTaskGenreDataArray = notAddedSmallProjectArray.flatMap(
            ({ taskGenreDataArray, beforeChangeTaskGenreDataArray }) =>
              taskGenreDataArray.filter((after) => {
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
              })
          );

          const transactionTaskGenre = async () => {
            await Promise.all([
              notAddedSmallProjectArray.flatMap(
                ({ beforeChangeTaskGenreDataArray }) => {
                  beforeChangeTaskGenreDataArray.map(
                    async (beforeChangeTaskGenreData) =>
                      await clientSupabase
                        .from("task_genre")
                        .update({
                          task_genre_name:
                            beforeChangeTaskGenreData.taskGenreName,
                          start_date:
                            beforeChangeTaskGenreData.selectedStartDate,
                          deadline_date:
                            beforeChangeTaskGenreData.selectedDeadlineDate,
                        })
                        .eq("id", beforeChangeTaskGenreData.id)
                  );
                }
              ),
              transactionSmallProjectUsers(),
            ]);
          };

          if (updatedTaskGenreDataArray.length > 0) {
            const updateTaskGenres = async (
              updatedTaskGenreDataArray: TaskGenreDataProps[]
            ) => {
              await Promise.all(
                updatedTaskGenreDataArray.map(async (updatedTaskGenreData) => {
                  const { error: updateTaskGenreError } = await clientSupabase
                    .from("task_genre")
                    .update({
                      task_genre_name: updatedTaskGenreData.taskGenreName,
                      start_date: updatedTaskGenreData.selectedStartDate,
                      deadline_date: updatedTaskGenreData.selectedDeadlineDate,
                    })
                    .eq("id", updatedTaskGenreData.id);

                  if (updateTaskGenreError) {
                    transactionTaskGenre();
                    throw new Error(
                      `Failed to update Task Genre with ID: ${updatedTaskGenreData.id}`
                    );
                  }
                })
              );
            };
            updateTaskGenres(updatedTaskGenreDataArray);
          }

          const deletedTaskGenreIdList = notAddedSmallProjectArray.flatMap(
            ({ beforeChangeTaskGenreDataArray, taskGenreDataArray }) =>
              beforeChangeTaskGenreDataArray
                .filter(
                  (beforeTaskGenreDataArray) =>
                    !taskGenreDataArray
                      .map((taskGenreData) => taskGenreData.id)
                      .includes(beforeTaskGenreDataArray.id)
                )
                .map((taskGenreData) => taskGenreData.id)
          );

          const { data: taskData } = await clientSupabase
            .from("tasks")
            .select("id, task_genre_id")
            .in("task_genre_id", deletedTaskGenreIdList);

          const transactionTask = async () => {
            await Promise.all([
              taskData?.map(
                async (task) =>
                  await clientSupabase
                    .from("tasks")
                    .update({ task_genre_id: task.task_genre_id })
                    .eq("id", task.id)
              ),
              transactionTaskGenre(),
            ]);
          };

          if (deletedTaskGenreIdList.length > 0) {
            const { error: updateTaskGenreIdError } = await clientSupabase
              .from("tasks")
              .update({ task_genre_id: null })
              .in("task_genre_id", deletedTaskGenreIdList);

            if (updateTaskGenreIdError) {
              transactionTask();
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

          const addedTaskGenreDataArray = notAddedSmallProjectArray.flatMap(
            ({ id, beforeChangeTaskGenreDataArray, taskGenreDataArray }) =>
              taskGenreDataArray
                .filter(
                  (TaskGenreData) =>
                    !beforeChangeTaskGenreDataArray
                      .map(
                        (beforeChangeTaskGenreData) =>
                          beforeChangeTaskGenreData.id
                      )
                      .includes(TaskGenreData.id)
                )
                .map((taskGenreData) => ({
                  ...taskGenreData,
                  smallProjectId: id,
                }))
          );

          if (addedTaskGenreDataArray.length > 0) {
            const taskGenreInsertRows = addedTaskGenreDataArray.map(
              (taskGenreData) => ({
                task_genre_name: taskGenreData.taskGenreName,
                small_project_id: taskGenreData.smallProjectId,
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

          const removedFiles = notAddedSmallProjectArray.flatMap(
            ({ beforeChangeFiles, selectedFiles }) =>
              beforeChangeFiles.filter((file) => !selectedFiles.includes(file))
          );

          if (removedFiles.length > 0) {
            const removedFileNames = removedFiles.map(
              (removedFile) => removedFile.name
            );

            const {
              data: removedFilePathList,
              error: selectRemovedFilePathListError,
            } = await clientSupabase
              .from("small_project_attachments")
              .select("file_path")
              .in("file_name", removedFileNames);

            if (selectRemovedFilePathListError) {
              throw selectRemovedFilePathListError;
            }

            const removedFilesPaths = removedFilePathList.map(
              (removedFilePath) => removedFilePath.file_path
            );

            const { error: removeError } = await clientSupabase.storage
              .from("small_project_attachments")
              .remove(removedFilesPaths);

            if (removeError) {
              throw removeError;
            }

            const { error: deleteProjectAttachmentsError } =
              await clientSupabase
                .from("small_project_attachments")
                .delete()
                .in("file_path", removedFilesPaths);

            if (deleteProjectAttachmentsError) {
              throw deleteProjectAttachmentsError;
            }
          }

          const addedFiles = notAddedSmallProjectArray.flatMap(
            ({ id, selectedFiles, beforeChangeFiles }) =>
              selectedFiles
                .filter((file) => !beforeChangeFiles.includes(file))
                .map((file) => ({ id, file }))
          );

          if (addedFiles.length > 0) {
            const insertPromises = addedFiles.map(async ({ id, file }) => {
              const cleanFileName = `${file.name.replace(
                /[^a-zA-Z0-9.-]/g,
                "_"
              )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;

              const { data: storageData, error: uploadStorageDataError } =
                await clientSupabase.storage
                  .from("small_project_attachments")
                  .upload(`public/${cleanFileName}`, file);

              if (uploadStorageDataError) {
                throw uploadStorageDataError;
              }

              return {
                small_project_id: id,
                file_name: file.name,
                file_path: storageData?.path,
              };
            });
            const newAttachments = await Promise.all(insertPromises);

            const { error: insertProjectAttachmentsDataError } =
              await clientSupabase
                .from("small_project_attachments")
                .insert(newAttachments);

            if (insertProjectAttachmentsDataError) {
              throw insertProjectAttachmentsDataError;
            }
          }
        }

        const deletedSmallProjectIdList = beforeChangeSmallProjectArray
          .map((beforeChangeSmallProject) => beforeChangeSmallProject.id)
          .filter(
            (beforeChangeSmallProjectId) =>
              !notAddedSmallProjectIdList.includes(beforeChangeSmallProjectId!)
          );

        if (deletedSmallProjectIdList.length > 0) {
          const {
            data: removedSmallProjectFilePathList,
            error: selectRemovedSmallProjectFilePathListError,
          } = await clientSupabase
            .from("small_project_attachments")
            .select("file_path")
            .in("small_project_id", deletedSmallProjectIdList);

          if (selectRemovedSmallProjectFilePathListError) {
            throw selectRemovedSmallProjectFilePathListError;
          }

          const removedSmallProjectFilePath =
            removedSmallProjectFilePathList.map(
              (removedSmallProjectFilePath) =>
                removedSmallProjectFilePath.file_path
            );

          if (
            removedSmallProjectFilePath &&
            removedSmallProjectFilePath.length > 0
          ) {
            const { error: removeError } = await clientSupabase.storage
              .from("small_project_attachments")
              .remove(removedSmallProjectFilePath);

            if (removeError) {
              throw removeError;
            }
          }

          const {
            data: removedTaskFilePathList,
            error: selectRemovedTaskFilePathListError,
          } = await clientSupabase
            .from("tasks")
            .select("task_attachments(file_path)")
            .in("small_project_id", deletedSmallProjectIdList);

          if (selectRemovedTaskFilePathListError) {
            throw selectRemovedTaskFilePathListError;
          }

          const removedTaskFilePath = removedTaskFilePathList.flatMap(
            (removedTaskFilePath) =>
              removedTaskFilePath.task_attachments.map(
                (attachment) => attachment.file_path
              )
          );

          if (removedTaskFilePath && removedTaskFilePath.length > 0) {
            const { error: removeError } = await clientSupabase.storage
              .from("task_attachments")
              .remove(removedTaskFilePath);

            if (removeError) {
              throw removeError;
            }
          }

          const { error: deleteSmallProjectError } = await clientSupabase
            .from("small_projects")
            .delete()
            .in("id", deletedSmallProjectIdList);

          if (deleteSmallProjectError) {
            throw deleteSmallProjectError;
          }
        }

        const addedSmallProjectIdList = smallProjectArray
          .map((smallProject) => smallProject.id)
          .filter((id): id is number => id == null);

        if (addedSmallProjectIdList.length > 0) {
          const addedSmallProjectArray = smallProjectArray.filter(
            (smallProject) => addedSmallProjectIdList.includes(smallProject.id!)
          );

          const smallProjectInsertRows = addedSmallProjectArray.map(
            (smallProject) => ({
              small_project_name: smallProject.smallProjectName,
              details: smallProject.details,
              project_id: projectId,
            })
          );

          const {
            data: insertSmallProjectData,
            error: insertSmallProjectDataError,
          } = await clientSupabase
            .from("small_projects")
            .insert(smallProjectInsertRows)
            .select();

          if (insertSmallProjectDataError) {
            await clientSupabase.from("projects").delete().eq("id", projectId);
            throw insertSmallProjectDataError;
          }

          const smallProjectUsersInsertRows = addedSmallProjectArray.flatMap(
            ({ smallProjectName, selectedUsers }) => {
              const insertedSmallProjectIncludeId = insertSmallProjectData.find(
                (insertSmallProject) =>
                  insertSmallProject.small_project_name === smallProjectName
              );
              return selectedUsers.map((selectedUser: UserOption) => ({
                small_project_id: insertedSmallProjectIncludeId.id,
                user_id: selectedUser.value,
              }));
            }
          );

          const taskGenreInsertRows = addedSmallProjectArray.flatMap(
            ({ smallProjectName, taskGenreDataArray }) => {
              const insertedSmallProjectIncludeId = insertSmallProjectData.find(
                (insertSmallProject) =>
                  insertSmallProject.small_project_name === smallProjectName
              );
              return taskGenreDataArray.map(
                (taskGenreData: TaskGenreDataProps) => ({
                  task_genre_name: taskGenreData.taskGenreName,
                  small_project_id: insertedSmallProjectIncludeId.id,
                  start_date: addTime(taskGenreData.selectedStartDate),
                  deadline_date: addTime(taskGenreData.selectedDeadlineDate),
                })
              );
            }
          );

          const [insertSmallProjectUsersResult, insertTaskGenreResult] =
            await Promise.all([
              clientSupabase
                .from("small_project_users")
                .insert(smallProjectUsersInsertRows),
              clientSupabase.from("task_genre").insert(taskGenreInsertRows),
            ]);

          const insertSmallProjectUsersError =
            insertSmallProjectUsersResult.error;
          const insertTaskGenreError = insertTaskGenreResult.error;

          if (insertSmallProjectUsersError || insertTaskGenreError) {
            await clientSupabase.from("projects").delete().eq("id", projectId);
            throw insertSmallProjectUsersError || insertTaskGenreError;
          }

          const selectedFilesIncludeSmallProjectId =
            addedSmallProjectArray.flatMap(
              ({ smallProjectName, selectedFiles }) => {
                const insertedSmallProjectIncludeId =
                  insertSmallProjectData.find(
                    (insertSmallProject) =>
                      insertSmallProject.small_project_name === smallProjectName
                  );
                return selectedFiles.map((selectedFile: File) => ({
                  small_project_id: insertedSmallProjectIncludeId.id,
                  file: selectedFile,
                }));
              }
            );

          const insertPromises = selectedFilesIncludeSmallProjectId.map(
            async (selectedFile) => {
              const cleanFileName = `${selectedFile.file.name.replace(
                /[^a-zA-Z0-9.-]/g,
                "_"
              )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;

              const { data: storageData, error: uploadStorageDataError } =
                await clientSupabase.storage
                  .from("small_project_attachments")
                  .upload(`public/${cleanFileName}`, selectedFile.file);

              if (uploadStorageDataError) {
                await clientSupabase
                  .from("projects")
                  .delete()
                  .eq("id", projectId);
                throw uploadStorageDataError;
              }

              return {
                small_project_id: selectedFile.small_project_id,
                file_name: selectedFile.file.name,
                file_path: storageData?.path,
              };
            }
          );
          const insertSmallProjectAttachments = await Promise.all(
            insertPromises
          );

          const { error: insertSmallProjectAttachmentsDataError } =
            await clientSupabase
              .from("small_project_attachments")
              .insert(insertSmallProjectAttachments);

          if (insertSmallProjectAttachmentsDataError) {
            await clientSupabase.from("projects").delete().eq("id", projectId);
            throw insertSmallProjectAttachmentsDataError;
          }
        }
        addItem({ target: 0, id: projectId });
        setNotificationValue({
          message: "Project was updated !",
          color: 0,
        });
        setPostLoading(false);
        setPageUpdated(true);
        onClose();
      } else {
        const { data: projectData, error: insertProjectDataError } =
          await clientSupabase
            .from("projects")
            .insert({
              project_name: projectName,
              workspace_id: displayWorkspaceId,
            })
            .select();

        if (insertProjectDataError) {
          throw insertProjectDataError;
        }

        const projectId = projectData[0].id;
        const smallProjectInsertRows = smallProjectArray.map(
          (smallProject) => ({
            small_project_name: smallProject.smallProjectName,
            details: smallProject.details,
            project_id: projectId,
          })
        );

        const {
          data: insertSmallProjectData,
          error: insertSmallProjectDataError,
        } = await clientSupabase
          .from("small_projects")
          .insert(smallProjectInsertRows)
          .select();

        const deleteProject = (projectId: number) => {
          return async () => {
            await clientSupabase.from("projects").delete().eq("id", projectId);
          };
        };

        if (insertSmallProjectDataError) {
          await deleteProject(projectId)();
          throw insertSmallProjectDataError;
        }

        const smallProjectUsersInsertRows = smallProjectArray.flatMap(
          ({ smallProjectName, selectedUsers }) => {
            const insertedSmallProjectIncludeId = insertSmallProjectData.find(
              (insertSmallProject) =>
                insertSmallProject.small_project_name === smallProjectName
            );
            return selectedUsers.map((selectedUser: UserOption) => ({
              small_project_id: insertedSmallProjectIncludeId.id,
              user_id: selectedUser.value,
            }));
          }
        );

        const taskGenreInsertRows = smallProjectArray.flatMap(
          ({ smallProjectName, taskGenreDataArray }) => {
            const insertedSmallProjectIncludeId = insertSmallProjectData.find(
              (insertSmallProject) =>
                insertSmallProject.small_project_name === smallProjectName
            );
            return taskGenreDataArray.map(
              (taskGenreData: TaskGenreDataProps) => ({
                task_genre_name: taskGenreData.taskGenreName,
                small_project_id: insertedSmallProjectIncludeId.id,
                start_date: addTime(taskGenreData.selectedStartDate),
                deadline_date: addTime(taskGenreData.selectedDeadlineDate),
              })
            );
          }
        );

        const [insertSmallProjectUsersResult, insertTaskGenreResult] =
          await Promise.all([
            clientSupabase
              .from("small_project_users")
              .insert(smallProjectUsersInsertRows),
            clientSupabase.from("task_genre").insert(taskGenreInsertRows),
          ]);

        const insertSmallProjectUsersError =
          insertSmallProjectUsersResult.error;
        const insertTaskGenreError = insertTaskGenreResult.error;

        if (insertSmallProjectUsersError || insertTaskGenreError) {
          await deleteProject(projectId)();
          throw insertSmallProjectUsersError || insertTaskGenreError;
        }

        const selectedFilesIncludeSmallProjectId = smallProjectArray.flatMap(
          ({ smallProjectName, selectedFiles }) => {
            const insertedSmallProjectIncludeId = insertSmallProjectData.find(
              (insertSmallProject) =>
                insertSmallProject.small_project_name === smallProjectName
            );
            return selectedFiles.map((selectedFile: File) => ({
              small_project_id: insertedSmallProjectIncludeId.id,
              file: selectedFile,
            }));
          }
        );

        const insertPromises = selectedFilesIncludeSmallProjectId.map(
          async (selectedFile) => {
            const cleanFileName = `${selectedFile.file.name.replace(
              /[^a-zA-Z0-9.-]/g,
              "_"
            )}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;

            const { data: storageData, error: uploadStorageDataError } =
              await clientSupabase.storage
                .from("small_project_attachments")
                .upload(`public/${cleanFileName}`, selectedFile.file);

            if (uploadStorageDataError) {
              await deleteProject(projectId)();
              throw uploadStorageDataError;
            }

            return {
              small_project_id: selectedFile.small_project_id,
              file_name: selectedFile.file.name,
              file_path: storageData?.path,
            };
          }
        );
        const insertSmallProjectAttachments = await Promise.all(insertPromises);

        const { error: insertSmallProjectAttachmentsDataError } =
          await clientSupabase
            .from("small_project_attachments")
            .insert(insertSmallProjectAttachments);

        if (insertSmallProjectAttachmentsDataError) {
          const filePaths = insertSmallProjectAttachments.map(
            (attachment) => attachment.file_path
          );
          await clientSupabase.storage
            .from("small_project_attachments")
            .remove(filePaths);

          await deleteProject(projectId)();
          throw insertSmallProjectAttachmentsDataError;
        }

        Promise.all(
          smallProjectArray.map(async (smallProjectData) => {
            const postEmailNotificationsError = await postMailNotifications(
              displayWorkspaceId,
              userId,
              null,
              projectName,
              smallProjectData.smallProjectName,
              null,
              0,
              smallProjectData.selectedUsers.map((user) => user.value)
            );
            if (postEmailNotificationsError) {
              console.error(
                "Post Mail Notifications",
                postEmailNotificationsError
              );
            }
          })
        );

        addItem({ target: 0, id: projectId });
        setNotificationValue({
          message: "Project was added !",
          color: 0,
        });
        setPostLoading(false);
        setPageUpdated(true);
        onClose();
      }
    } catch (error) {
      console.error(projectId ? "Edit Project" : "Add Project", error);
      setNotificationValue({
        message: projectId
          ? "Project was not edited."
          : "Project was not added.",
        color: 1,
      });
      setPostLoading(false);
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
              <div className={styles[`form-group`]}>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project Name"
                  required
                />
                <p className={styles.instruction}>※Enter Project Name</p>
              </div>

              <div className={styles[`tab-area`]}>
                {smallProjectArray.map((smallProject, index) => (
                  <div key={index}>
                    {smallProjectArray.length > 1 ? (
                      <div className={styles[`tab-minus-container`]}>
                        <span
                          className={classNames(
                            "material-symbols-outlined",
                            styles[`tab-minus`]
                          )}
                          onClick={() => removeSmallProjectNameTab(index)}
                        >
                          remove
                        </span>
                      </div>
                    ) : (
                      <div className={styles[`minus-button-space`]}></div>
                    )}

                    <div
                      className={classNames(
                        styles[`tab-button`],
                        index === displaySmallProjectNameValue && styles.active
                      )}
                      onClick={() => setDisplaySmallProjectNameValue(index)}
                      onDoubleClick={() => handleDoubleClick(index)}
                      key={index}
                    >
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={newSmallProjectName}
                          onChange={handleNameChange}
                          onBlur={handleBlur}
                          onKeyDown={handleEnterKeyDown}
                          className={`${styles[`tab-input`]} tab-input`}
                          autoFocus
                        />
                      ) : (
                        smallProject.smallProjectName
                      )}
                    </div>
                  </div>
                ))}

                {smallProjectArray.length < 4 && (
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles[`tab-plus`]
                    )}
                    onClick={() =>
                      addSmallProjectNameTab(smallProjectArray.length + 1)
                    }
                  >
                    add
                  </span>
                )}
              </div>

              <div className={styles[`small-project-area`]}>
                <div className={styles[`form-group`]}>
                  <Select
                    isMulti
                    options={userOptions}
                    value={
                      smallProjectArray[displaySmallProjectNameValue]
                        .selectedUsers
                    }
                    onChange={handleUserChange}
                    placeholder="-- Members --"
                    required
                    styles={selectBoxStyles}
                  />
                  <p className={styles.instruction}>※Select Project Members</p>
                </div>

                <div className={styles[`flex-container`]}>
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
                        {smallProjectArray[displaySmallProjectNameValue]
                          .taskGenreDataArray &&
                        smallProjectArray[displaySmallProjectNameValue]
                          .taskGenreDataArray.length > 0 ? (
                          smallProjectArray[
                            displaySmallProjectNameValue
                          ].taskGenreDataArray.map((taskGenreData, index) => {
                            const taskGenreNamePlaceholder =
                              "Task Genre Name" + (index + 1);
                            return (
                              <div
                                className={styles[`task-genre-area`]}
                                key={index}
                              >
                                <div className={styles[`task-genre-form-area`]}>
                                  <div
                                    className={
                                      styles[`task-genre-input-container`]
                                    }
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
                                    calendarClassName={
                                      styles[`custom-calendar`]
                                    }
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
                    <p className={styles.instruction}>
                      Enter Estimated Task Genre
                    </p>
                  </div>
                  <div className={styles[`textarea-container`]}>
                    <div className={styles[`form-group`]}>
                      <textarea
                        value={
                          smallProjectArray[displaySmallProjectNameValue]
                            .details
                        }
                        onChange={(e) => handleDetailsChange(e.target.value)}
                        placeholder="Details"
                      ></textarea>
                      <p className={styles.instruction}>
                        Enter Project Details
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className={styles[`attached-file-area`]}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {smallProjectArray[displaySmallProjectNameValue].selectedFiles
                    .length === 0 ? (
                    <div
                      className={styles["none-attached-file-area-container"]}
                    >
                      <div className={styles["none-attached-file-area"]}>
                        <p>Drag & Drop Files</p>
                        <div className={styles["clip-container"]}>
                          <span
                            className={classNames(
                              "material-symbols-outlined",
                              styles.clip
                            )}
                          >
                            attach_file
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles["display-attached-file-area"]}>
                      {smallProjectArray[
                        displaySmallProjectNameValue
                      ].selectedFiles.map((file: any, index) => (
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
              </div>
              <div className={styles[`button-area`]}>
                <button className={styles.cancel} onClick={onClose}>
                  Cancel
                </button>
                <button className={styles.add} type="submit">
                  {postLoading ? (
                    <div className={styles[`button-spinner`]}></div>
                  ) : projectId ? (
                    "Update"
                  ) : (
                    "Add"
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
