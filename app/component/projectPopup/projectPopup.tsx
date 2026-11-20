import React, { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRangeField } from "@/components/date-range-field";
import { FileDropzone } from "@/components/file-dropzone";
import { FormField, RequiredNote } from "@/components/form-field";
import { MultiSelect } from "@/components/multi-select";
import { keepDialogOpenWhilePopupOpen } from "@/lib/dialog";
import { cn } from "@/lib/utils";
import { clientSupabase } from "@/app/lib/supabase/client";
import { getUsers } from "@/app/lib/api/getUser";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
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
      smallProjectName: "",
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
  const [tabNumber, setTabNumber] = useState<number[]>([1]);
  const formId = "project-popup-form";
  // 外すボタンは押すと消えるので、外したあとはフォーカスを足すボタンへ移す
  const addSmallProjectButtonRef = useRef<HTMLButtonElement>(null);
  const addTaskGenreButtonRef = useRef<HTMLButtonElement>(null);

  const [getLoading, setGetLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);

  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { addItem } = useFlashDisplayContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力欄で Enter を押して送信してしまうのを防ぐ。
      // ボタンと、メンバーの欄（react-select の入力欄。role="combobox"）は Enter で操作できるよう止めない
      const target = e.target as HTMLElement;
      if (
        e.key === "Enter" &&
        target.tagName === "INPUT" &&
        target.getAttribute("role") !== "combobox"
      ) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    (async () => {
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
          setTabNumber(createdSmallProjectArray.map((_, index) => index + 1));
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
          message: "プロジェクトのデータを読めませんでした。",
          color: 1,
        });
      }
      setGetLoading(false);
    })();

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const handleSmallProjectChange = (value: string) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? { ...smallProject, smallProjectName: value }
          : smallProject
      )
    );
  };

  const handleUserChange = (selectedOptions: UserOption[]) => {
    setSmallProjectArray((prevSmallProjectArray) =>
      prevSmallProjectArray.map((smallProject, index) =>
        index === displaySmallProjectNameValue
          ? { ...smallProject, selectedUsers: selectedOptions }
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

  const addFiles = (files: File[]) => {
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

  const setTaskGenreData = (value: string, taskIndex: number, name: string) => {
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
        smallProjectName: "",
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
    setTabNumber((prevTabName) => [
      ...prevTabName,
      tabNumber[smallProjectArray.length - 1] + 1,
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
    setTabNumber((prevTabName) => prevTabName.filter((_, i) => i !== index));
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

    // 小プロジェクトを1件ずつ作り、入力と同じ順に id を返す。
    // 以前はまとめて作ってから名前で探していたので、同じ名前（空どうしを含む）の小プロジェクトを取り違えた。
    // insertedIds は、失敗したときに消すための「作れた分」の id
    const insertSmallProjects = async (
      rows: { small_project_name: string; details: string; project_id: number }[]
    ) => {
      const results = await Promise.all(
        rows.map((row) =>
          clientSupabase.from("small_projects").insert(row).select().single()
        )
      );
      const insertedIds: number[] = results
        .filter((result) => !result.error && result.data)
        .map((result) => result.data.id);
      const failed = results.find((result) => result.error || !result.data);
      if (failed) {
        return {
          ids: null,
          insertedIds,
          error: failed.error ?? new Error("Small Project couldn't insert."),
        };
      }
      return {
        ids: results.map((result) => result.data.id as number),
        insertedIds,
        error: null,
      };
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
            (async (updatedTaskGenreDataArray: TaskGenreDataProps[]) => {
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
            })(updatedTaskGenreDataArray);
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

          // 外した添付を、小プロジェクトごとに集める（ファイル名だけで探すと、別の小プロジェクトの同じ名前のファイルも消える）
          const removedFilesBySmallProject = notAddedSmallProjectArray
            .map(({ id, beforeChangeFiles, selectedFiles }) => ({
              smallProjectId: id!,
              fileNames: beforeChangeFiles
                .filter((file) => !selectedFiles.includes(file))
                .map((file) => file.name),
            }))
            .filter(({ fileNames }) => fileNames.length > 0);

          if (removedFilesBySmallProject.length > 0) {
            const removedFilePathResults = await Promise.all(
              removedFilesBySmallProject.map(({ smallProjectId, fileNames }) =>
                clientSupabase
                  .from("small_project_attachments")
                  .select("id, file_path")
                  .eq("small_project_id", smallProjectId)
                  .in("file_name", fileNames)
              )
            );

            const selectRemovedFilePathListError = removedFilePathResults.find(
              (result) => result.error
            )?.error;
            if (selectRemovedFilePathListError) {
              throw selectRemovedFilePathListError;
            }

            const removedFilesPaths = removedFilePathResults.flatMap((result) =>
              (result.data ?? []).map(
                (removedFilePath) => removedFilePath.file_path
              )
            );

            const { error: removeError } = await clientSupabase.storage
              .from("small_project_attachments")
              .remove(removedFilesPaths);

            if (removeError) {
              throw removeError;
            }

            // 探した行を id で消す（探した行と消す行を確実に一致させる）
            const removedAttachmentIds = removedFilePathResults.flatMap(
              (result) =>
                (result.data ?? []).map((removedFilePath) => removedFilePath.id)
            );
            const { error: deleteProjectAttachmentsError } =
              await clientSupabase
                .from("small_project_attachments")
                .delete()
                .in("id", removedAttachmentIds);

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

          const {
            ids: addedSmallProjectIds,
            insertedIds,
            error: insertSmallProjectDataError,
          } = await insertSmallProjects(
            addedSmallProjectArray.map((smallProject) => ({
              small_project_name: smallProject.smallProjectName,
              details: smallProject.details,
              project_id: projectId,
            }))
          );

          // 失敗したら、この保存で作った小プロジェクトだけを消す。既存のプロジェクトは消さない
          // （以前は作成のときの巻き戻しを写していて、既存のプロジェクトごと消していた）
          const deleteAddedSmallProjects = async () => {
            if (insertedIds.length > 0) {
              await clientSupabase
                .from("small_projects")
                .delete()
                .in("id", insertedIds);
            }
          };

          if (insertSmallProjectDataError || !addedSmallProjectIds) {
            await deleteAddedSmallProjects();
            throw insertSmallProjectDataError;
          }

          const smallProjectUsersInsertRows = addedSmallProjectArray.flatMap(
            ({ selectedUsers }, index) =>
              selectedUsers.map((selectedUser: UserOption) => ({
                small_project_id: addedSmallProjectIds[index],
                user_id: selectedUser.value,
              }))
          );

          const taskGenreInsertRows = addedSmallProjectArray.flatMap(
            ({ taskGenreDataArray }, index) =>
              taskGenreDataArray.map((taskGenreData: TaskGenreDataProps) => ({
                task_genre_name: taskGenreData.taskGenreName,
                small_project_id: addedSmallProjectIds[index],
                start_date: addTime(taskGenreData.selectedStartDate),
                deadline_date: addTime(taskGenreData.selectedDeadlineDate),
              }))
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
            await deleteAddedSmallProjects();
            throw insertSmallProjectUsersError || insertTaskGenreError;
          }

          const selectedFilesIncludeSmallProjectId =
            addedSmallProjectArray.flatMap(({ selectedFiles }, index) =>
              selectedFiles.map((selectedFile: File) => ({
                small_project_id: addedSmallProjectIds[index],
                file: selectedFile,
              }))
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
                throw uploadStorageDataError;
              }

              return {
                small_project_id: selectedFile.small_project_id,
                file_name: selectedFile.file.name,
                file_path: storageData?.path,
              };
            }
          );

          let insertSmallProjectAttachments;
          try {
            insertSmallProjectAttachments = await Promise.all(insertPromises);
          } catch (uploadStorageDataError) {
            await deleteAddedSmallProjects();
            throw uploadStorageDataError;
          }

          const { error: insertSmallProjectAttachmentsDataError } =
            await clientSupabase
              .from("small_project_attachments")
              .insert(insertSmallProjectAttachments);

          if (insertSmallProjectAttachmentsDataError) {
            await deleteAddedSmallProjects();
            throw insertSmallProjectAttachmentsDataError;
          }
        }
        addItem({ target: 0, id: projectId });
        setNotificationValue({
          message: "プロジェクトを更新しました。",
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

        const { ids: insertedSmallProjectIds, error: insertSmallProjectDataError } =
          await insertSmallProjects(smallProjectInsertRows);

        // 作ったばかりのプロジェクトなので、失敗したらプロジェクトごと消す（小プロジェクトなども一緒に消える）
        const deleteProject = (projectId: number) => {
          return async () => {
            await clientSupabase.from("projects").delete().eq("id", projectId);
          };
        };

        if (insertSmallProjectDataError || !insertedSmallProjectIds) {
          await deleteProject(projectId)();
          throw insertSmallProjectDataError;
        }

        const smallProjectUsersInsertRows = smallProjectArray.flatMap(
          ({ selectedUsers }, index) =>
            selectedUsers.map((selectedUser: UserOption) => ({
              small_project_id: insertedSmallProjectIds[index],
              user_id: selectedUser.value,
            }))
        );

        const taskGenreInsertRows = smallProjectArray.flatMap(
          ({ taskGenreDataArray }, index) =>
            taskGenreDataArray.map((taskGenreData: TaskGenreDataProps) => ({
              task_genre_name: taskGenreData.taskGenreName,
              small_project_id: insertedSmallProjectIds[index],
              start_date: addTime(taskGenreData.selectedStartDate),
              deadline_date: addTime(taskGenreData.selectedDeadlineDate),
            }))
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
          ({ selectedFiles }, index) =>
            selectedFiles.map((selectedFile: File) => ({
              small_project_id: insertedSmallProjectIds[index],
              file: selectedFile,
            }))
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
          message: "プロジェクトを追加しました。",
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
          ? "プロジェクトを更新できませんでした。"
          : "プロジェクトを追加できませんでした。",
        color: 1,
      });
      setPostLoading(false);
      setPageUpdated(true);
    }
  };

  const current = smallProjectArray[displaySmallProjectNameValue];
  // タブの名前。名前が入っていればその名前、無ければ番号
  const tabLabel = (index: number) =>
    smallProjectArray[index].smallProjectName.trim() || `小プロジェクト ${tabNumber[index]}`;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !postLoading) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl"
        // 外を押しても閉じない（入力を誤って捨てないため。以前と同じ）。Escape と右上の × では閉じる
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={keepDialogOpenWhilePopupOpen}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{projectId ? "プロジェクトを編集" : "プロジェクトを追加"}</DialogTitle>
          <DialogDescription>
            <RequiredNote />
          </DialogDescription>
        </DialogHeader>

        {getLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            読み込み中
          </div>
        ) : (
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
          >
            <FormField label="プロジェクト名" htmlFor="project-name" required>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </FormField>

            <section aria-labelledby="small-project-heading" className="space-y-3">
              <h3 id="small-project-heading" className="m-0 text-sm font-medium">
                小プロジェクト
              </h3>
              <div
                role="group"
                aria-labelledby="small-project-heading"
                className="flex flex-wrap items-center gap-1.5"
              >
                {smallProjectArray.map((_, index) => {
                  const active = index === displaySmallProjectNameValue;
                  const label = tabLabel(index);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center rounded-lg border",
                        active && "border-primary bg-primary/5 text-primary"
                      )}
                    >
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => setDisplaySmallProjectNameValue(index)}
                        className="max-w-40 truncate rounded-lg px-2.5 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {label}
                      </button>
                      {smallProjectArray.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="mr-0.5"
                          aria-label={`「${label}」を外す`}
                          onClick={() => {
                            removeSmallProjectNameTab(index);
                            // 10個のときは足すボタンが外したあとに描かれるので、描き終えてから移す
                            setTimeout(() => addSmallProjectButtonRef.current?.focus());
                          }}
                        >
                          <X className="size-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {smallProjectArray.length < 10 && (
                  <Button
                    ref={addSmallProjectButtonRef}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSmallProjectNameTab(smallProjectArray.length + 1)}
                  >
                    <Plus className="size-4" aria-hidden />
                    小プロジェクトを足す
                  </Button>
                )}
              </div>

              <div
                role="group"
                aria-label={`${tabLabel(displaySmallProjectNameValue)}の内容`}
                className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"
              >
                <FormField label="小プロジェクト名" htmlFor="small-project-name">
                  <Input
                    id="small-project-name"
                    value={current.smallProjectName}
                    onChange={(e) => handleSmallProjectChange(e.target.value)}
                  />
                </FormField>
                <FormField label="メンバー" htmlFor="small-project-members" required>
                  <MultiSelect
                    id="small-project-members"
                    options={userOptions}
                    value={current.selectedUsers}
                    onChange={handleUserChange}
                    placeholder="メンバーを選ぶ"
                    noOptionsMessage="選べるメンバーはいません"
                    required
                  />
                </FormField>

                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">ジャンル</span>
                    <Button
                      ref={addTaskGenreButtonRef}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTaskGenreForm()}
                    >
                      <Plus className="size-4" aria-hidden />
                      ジャンルを足す
                    </Button>
                  </div>
                  {current.taskGenreDataArray.length > 0 ? (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {current.taskGenreDataArray.map((taskGenreData, index) => {
                        const genreLabel = `ジャンル ${index + 1}`;
                        return (
                          <li
                            key={index}
                            className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <div>
                              <Label htmlFor={`genre-name-${index}`} className="sr-only">
                                {genreLabel}の名前（必須）
                              </Label>
                              <Input
                                id={`genre-name-${index}`}
                                name="taskGenreName"
                                value={taskGenreData.taskGenreName}
                                onChange={(e) => setTaskGenreData(e.target.value, index, e.target.name)}
                                placeholder={`${genreLabel}の名前`}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor={`genre-period-${index}`} className="sr-only">
                                {genreLabel}の期間（必須）
                              </Label>
                              <DateRangeField
                                id={`genre-period-${index}`}
                                start={taskGenreData.selectedStartDate}
                                end={taskGenreData.selectedDeadlineDate}
                                onChange={(dates) => handleDateRangeChange(dates, index)}
                                required
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`「${taskGenreData.taskGenreName.trim() || genreLabel}」を外す`}
                              onClick={() => {
                                removeTaskGenreForm(index);
                                addTaskGenreButtonRef.current?.focus();
                              }}
                            >
                              <X className="size-4" aria-hidden />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="m-0 rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      ジャンルはありません
                    </p>
                  )}
                </div>

                <FormField label="詳細" htmlFor="small-project-details" className="sm:col-span-2">
                  <Textarea
                    id="small-project-details"
                    value={current.details}
                    onChange={(e) => handleDetailsChange(e.target.value)}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FileDropzone
                    files={current.selectedFiles}
                    onAdd={addFiles}
                    onRemove={deleteAttachedFile}
                    note="1ファイル 3MB まで"
                  />
                </div>
              </div>
            </section>
          </form>
        )}

        <DialogFooter className="mx-0 mb-0 px-6">
          <Button type="button" variant="outline" onClick={() => onClose()} disabled={postLoading}>
            キャンセル
          </Button>
          <Button type="submit" form={formId} disabled={getLoading || postLoading}>
            {postLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {projectId ? "更新する" : "追加する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPopup;
