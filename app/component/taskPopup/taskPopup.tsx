import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeField } from "@/components/date-range-field";
import { FileDropzone } from "@/components/file-dropzone";
import { FormField, RequiredNote } from "@/components/form-field";
import { keepDialogOpenWhilePopupOpen } from "@/lib/dialog";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useFlashDisplayContext } from "@/app/provider/flashDisplayProvider";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { fetchAttachedFiles } from "@/app/lib/api/fetchAttachedFiles";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getSmallProjectData } from "@/app/lib/api/getSmallProjectData";
import { getSmallProjectMember } from "@/app/lib/api/getSmallProjectMember";

interface TaskPopupProps {
  workspaceId: number;
  onClose: (taskGenreId?: number) => void;
  userId: number;
  taskId: number | null;
  taskGenreId: number | null;
  projectId: number | null;
  smallProjectId: number | null;
}

interface UserProps {
  id: number;
  name: string;
}

interface ProjectProps {
  id: number;
  project_name: string;
}

interface SmallProjectProps {
  id: number;
  small_project_name: string;
  details: string;
  project_id: string;
}

interface TaskGenreDataProps {
  id: number;
  taskGenreName: string;
  selectedStartDate: Date | undefined;
  selectedDeadlineDate: Date | undefined;
}

interface Option {
  value: number;
  label: string;
}

// 選ぶ欄が渡す値（以前の react-select の SingleValue と同じ形）
type SingleValue<T> = T | null;

const TaskPopup: React.FC<TaskPopupProps> = ({
  workspaceId,
  onClose,
  userId,
  taskId,
  taskGenreId,
  projectId,
  smallProjectId,
}) => {
  const [taskName, setTaskName] = useState("");
  const [details, setDetails] = useState("");
  const [projects, setProjects] = useState<ProjectProps[]>([]);
  const [smallProjects, setSmallProjects] = useState<SmallProjectProps[]>([]);
  const [taskGenreDataArray, setTaskGenreDataArray] = useState<
    TaskGenreDataProps[]
  >([]);
  const [smallProjectMember, setSmallProjectMember] = useState<UserProps[]>([]);
  const [selectedUser, setSelectedUser] = useState<Option | null>();
  const [selectedProject, setSelectedProject] = useState<Option>();
  const [selectedSmallProject, setSelectedSmallProject] =
    useState<Option | null>();
  const [selectedTaskGenre, setSelectedTaskGenre] = useState<Option | null>();
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

  const [getLoading, setGetLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);

  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { addItem } = useFlashDisplayContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力欄で Enter を押して送信してしまうのを防ぐ。ボタンや選ぶ欄は Enter で操作できるよう止めない
      if (
        e.key === "Enter" &&
        (e.target as HTMLElement).tagName === "INPUT"
      ) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    if (taskId) {
      (async () => {
        try {
          const [
            { data: taskData, error: selectTaskError },
            projects,
            smallProjects,
            { data: taskGenreData, error: selectTaskGenreDataError },
            taskAttachmentsData,
          ] = await Promise.all([
            clientSupabase
              .from("tasks")
              .select("*, small_projects (project_id)")
              .eq("id", taskId)
              .single(),
            getProjectData(null, workspaceId),
            getSmallProjectData(null, workspaceId),
            clientSupabase.from("task_genre").select("*"),
            fetchAttachedFiles(1, [taskId]),
          ]);

          if (selectTaskError) {
            throw selectTaskError;
          }

          if (!taskData || taskData.length === 0)
            throw new Error("Task Data couldn't get.");

          if (selectTaskGenreDataError) {
            throw selectTaskGenreDataError;
          }

          setTaskName(taskData.task_name);
          setSelectedDeadlineDate(taskData.deadline_date);
          setSelectedStartDate(taskData.start_date);
          setNumberOfDays(taskData.number_of_days);
          setDetails(taskData.details);

          const selectedProject = projects.find(
            (project) => project.id === taskData.small_projects.project_id
          );

          if (selectedProject) {
            setSelectedProject({
              value: selectedProject.id,
              label: selectedProject.project_name,
            });
          }

          setProjects(
            await getProjectData(taskData.assigned_user_id, workspaceId)
          );

          const selectedSmallProject = smallProjects.find(
            (smallProject) => smallProject.id === taskData.small_project_id
          );
          if (selectedSmallProject) {
            setSelectedSmallProject({
              value: taskData.small_project_id,
              label: selectedSmallProject.small_project_name,
            });
          }

          const smallProjectList = await getSmallProjectData(
            taskData.assigned_user_id,
            workspaceId
          );

          const filteredSmallProjects = smallProjectList.filter(
            (smallProject) =>
              smallProject.project_id === taskData.small_projects.project_id
          );

          setSmallProjects(
            filteredSmallProjects.map((smallProject) => ({
              id: smallProject.id,
              small_project_name: smallProject.small_project_name,
              details: smallProject.details,
              project_id: smallProject.project_id,
            }))
          );

          const { data: userName, error: selectUserNameError } =
            await clientSupabase
              .from("users")
              .select("name")
              .eq("id", taskData.assigned_user_id)
              .single();

          if (selectUserNameError) throw selectUserNameError;

          if (!userName) throw new Error("User couldn't get.");

          setSelectedUser({
            value: taskData.assigned_user_id,
            label: userName.name,
          });

          if (taskGenreData && taskGenreData.length > 0) {
            const selectedTaskGenre = taskGenreData.find(
              (taskGenre) => taskGenre.id === taskData.task_genre_id
            );

            if (selectedTaskGenre) {
              setSelectedTaskGenre({
                value: taskData.task_genre_id,
                label: selectedTaskGenre.task_genre_name,
              });
            }
          }

          const fileData = taskAttachmentsData[0].fileDataArray.map(
            (fileData) => fileData.file
          );
          setSelectedFiles(fileData);
          setBeforeChangeFiles(fileData);

          setGetLoading(false);
        } catch (error) {
          console.error("Fetch Task Details", error);
          onClose();
          setNotificationValue({
            message: "タスクのデータを読めませんでした。",
            color: 1,
          });
        }
      })();
    } else {
      (async () => {
        try {
          let projectList;
          let smallProjectList;

          if (!projectId && !smallProjectId) {
            const [userNameResult, projects, smallProjects] = await Promise.all(
              [
                clientSupabase
                  .from("users")
                  .select("name")
                  .eq("id", userId)
                  .single(),
                getProjectData(userId, workspaceId),
                getSmallProjectData(userId, workspaceId),
              ]
            );

            const { data: userName, error: selectUserNameError } =
              userNameResult;
            if (selectUserNameError || !userName) {
              throw new Error("User data couldn't get.");
            }

            setSelectedUser({
              value: userId,
              label: userName.name,
            });

            projectList = projects;
            smallProjectList = smallProjects;
          } else {
            const [projects, smallProjects] = await Promise.all([
              getProjectData(null, workspaceId),
              getSmallProjectData(null, workspaceId),
            ]);

            projectList = projects.filter(
              (project) => project.id === projectId
            );
            const selectedProject = projectList.find(
              (project) => project.id === projectId
            );
            if (!selectedProject) throw new Error("Project not found.");

            setSelectedProject({
              value: projectId!,
              label: selectedProject.project_name,
            });

            smallProjectList = smallProjects.filter(
              (smallProject) => smallProject.project_id === projectId
            );
            const selectedSmallProject = smallProjectList.find(
              (smallProject) => smallProject.id === smallProjectId
            );

            if (!selectedSmallProject)
              throw new Error("Small Project couldn't get.");

            setSelectedSmallProject({
              value: smallProjectId!,
              label: selectedSmallProject.small_project_name,
            });

            if (taskGenreId) {
              const { data: taskGenreData, error: selectTaskGenreDataError } =
                await clientSupabase
                  .from("task_genre")
                  .select("*")
                  .eq("id", taskGenreId)
                  .single();

              if (selectTaskGenreDataError || !taskGenreData) {
                throw new Error("Task Genre data couldn't get.");
              }

              setSelectedTaskGenre({
                value: taskGenreId!,
                label: taskGenreData.task_genre_name,
              });
              setSelectedDeadlineDate(taskGenreData.deadline_date);
              setSelectedStartDate(taskGenreData.start_date);
              setNumberOfDays(
                Math.ceil(
                  (new Date(taskGenreData.deadline_date).getTime() -
                    new Date(taskGenreData.start_date).getTime()) /
                    (1000 * 60 * 60 * 24) +
                    1
                )
              );
            }
          }
          setProjects(projectList);
          setSmallProjects(
            smallProjectList.map((smallProject) => ({
              id: smallProject.id,
              small_project_name: smallProject.small_project_name,
              details: smallProject.details,
              project_id: smallProject.project_id,
            }))
          );

          setGetLoading(false);
        } catch (error) {
          console.error("Fetch Task Details", error);
          onClose();
          setNotificationValue({
            message: "タスクのデータを読めませんでした。",
            color: 1,
          });
        }
      })();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (selectedProject) {
      (async () => {
        try {
          const { data: smallProjectList, error: selectSmallProjectListError } =
            await clientSupabase
              .from("small_projects")
              .select("*, small_project_users(user_id)")
              .eq("project_id", selectedProject!.value);

          if (selectSmallProjectListError) {
            throw selectSmallProjectListError;
          }

          if (!smallProjectList || smallProjectList.length === 0) {
            throw new Error("Small Project Data couldn't get.");
          }

          setSmallProjects(
            smallProjectList
              .filter((smallProject) =>
                selectedUser
                  ? selectedUser.value === 0
                    ? true
                    : smallProject.small_project_users.some(
                        (user: any) => user.user_id === selectedUser.value
                      )
                  : true
              )
              .map((smallProject) => ({
                id: smallProject.id,
                small_project_name: smallProject.small_project_name,
                details: smallProject.details,
                project_id: smallProject.project_id,
              }))
          );
        } catch (error) {
          console.error("Fetch Task Details", error);
          onClose();
          setNotificationValue({
            message: "タスクのデータを読めませんでした。",
            color: 1,
          });
        }
      })();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedSmallProject) {
      (async () => {
        try {
          const smallProjectMembersList = await getSmallProjectMember([
            selectedSmallProject!.value,
          ]);

          if (
            selectedUser &&
            !smallProjectMembersList[0].membersDataArray.some(
              (membersData) => membersData.id === selectedUser.value
            )
          ) {
            setSelectedUser(null);
          }

          setSmallProjectMember([
            { id: 0, name: "未定" },
            ...smallProjectMembersList[0].membersDataArray.map(
              (membersData) => ({
                id: membersData.id,
                name: membersData.name,
              })
            ),
          ]);

          const { data: taskGenreData, error: selectTaskGenreError } =
            await clientSupabase
              .from("task_genre")
              .select("id, task_genre_name, start_date, deadline_date")
              .eq("small_project_id", selectedSmallProject!.value);

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
        } catch (error) {
          console.error("Fetch Task Details", error);
          onClose();
          setNotificationValue({
            message: "タスクのデータを読めませんでした。",
            color: 1,
          });
        }
      })();
    }
  }, [selectedSmallProject]);

  const handleProjectChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedProject(selectedOptions as Option);
    setSelectedSmallProject(null);
    setSelectedTaskGenre(null);
    setSelectedStartDate(undefined);
    setSelectedDeadlineDate(undefined);
    setNumberOfDays("");
  };

  const projectOptions = projects
    .map((project) => ({
      value: project.id,
      label: project.project_name,
    }));

  const handleSmallProjectChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedSmallProject(selectedOptions as Option);
    setSelectedTaskGenre(null);
    setSelectedStartDate(undefined);
    setSelectedDeadlineDate(undefined);
    setNumberOfDays("");
  };

  const smallProjectOptions = smallProjects
    .map((smallProject) => ({
      value: smallProject.id,
      label: smallProject.small_project_name,
    }));

  const handleUserChange = (selectedOptions: SingleValue<Option>) => {
    setSelectedUser(selectedOptions as Option);
  };

  const userOptions = smallProjectMember
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

  const deleteAttachedFile = (index: number) => {
    const remainFiles = selectedFiles.filter((file, i) => i !== index);
    setSelectedFiles(remainFiles);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (postLoading) return;
    setPostLoading(true);

    const startDateWithTime = new Date(selectedStartDate!);
    startDateWithTime.setHours(9, 0, 0, 0);

    const deadlineDateWithTime = new Date(selectedDeadlineDate!);
    deadlineDateWithTime.setHours(9, 0, 0, 0);

    const payloadValue = {
      task_name: taskName,
      small_project_id: selectedSmallProject!.value,
      assigned_user_id: selectedUser!.value,
      task_genre_id: selectedTaskGenre?.value,
      start_date: startDateWithTime,
      deadline_date: deadlineDateWithTime,
      number_of_days: numberOfDays,
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
          workspaceId,
          userId,
          taskId,
          null,
          null,
          null,
          1,
          []
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications ",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "タスクを更新しました。",
          color: 0,
        });
        setPostLoading(false);
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
          workspaceId,
          userId,
          taskId,
          null,
          null,
          null,
          0,
          []
        );
        if (postEmailNotificationsError) {
          console.error(
            "Error post mail notifications ",
            postEmailNotificationsError
          );
        }

        addItem({ target: 1, id: taskId });
        setNotificationValue({
          message: "タスクを追加しました。",
          color: 0,
        });
        setPostLoading(false);
        setPageUpdated(true);
        onClose();
      }
    } catch (error) {
      console.error(taskId ? "Error Update Task " : "Error Add Task", error);
      setNotificationValue({
        message: taskId ? "タスクを更新できませんでした。" : "タスクを追加できませんでした。",
        color: 1,
      });
      setPostLoading(false);
      setPageUpdated(true);
    }
  };

  const formId = "task-popup-form";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !postLoading) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl"
        // 外を押しても閉じない（入力を誤って捨てないため。以前と同じ）。Escape と右上の × では閉じる
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={keepDialogOpenWhilePopupOpen}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{taskId ? "タスクを編集" : "タスクを追加"}</DialogTitle>
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
            className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2"
          >
            <FormField label="タスク名" htmlFor="task-name" required className="sm:col-span-2">
              <Input
                id="task-name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="プロジェクト" htmlFor="task-project" required>
              <OptionSelect
                id="task-project"
                options={projectOptions}
                value={selectedProject}
                onChange={handleProjectChange}
                placeholder="プロジェクトを選ぶ"
                required
              />
            </FormField>
            <FormField label="小プロジェクト" htmlFor="task-small-project" required>
              <OptionSelect
                id="task-small-project"
                options={smallProjectOptions}
                value={selectedSmallProject}
                onChange={handleSmallProjectChange}
                placeholder="小プロジェクトを選ぶ"
                required
              />
            </FormField>

            <FormField label="担当者" htmlFor="task-user" required>
              <OptionSelect
                id="task-user"
                options={userOptions}
                value={selectedUser}
                onChange={handleUserChange}
                placeholder="担当者を選ぶ"
                required
              />
            </FormField>
            <FormField label="ジャンル" htmlFor="task-genre">
              <OptionSelect
                id="task-genre"
                options={taskGenreOptions}
                value={selectedTaskGenre}
                onChange={handleTaskGenreChange}
                placeholder={taskGenreOptions.length > 0 ? "ジャンルを選ぶ" : "ジャンルはありません"}
                disabled={taskGenreOptions.length === 0}
              />
            </FormField>

            <FormField label="期間" htmlFor="task-period" required>
              <DateRangeField
                id="task-period"
                start={selectedStartDate}
                end={selectedDeadlineDate}
                onChange={handleDateRangeChange}
                required
              />
            </FormField>
            <FormField label="日数" htmlFor="task-days" required>
              <Input
                id="task-days"
                type="number"
                name="numberOfDays"
                step="0.1"
                min="0"
                value={numberOfDays !== undefined ? numberOfDays : ""}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setNumberOfDays(inputValue ? Number(inputValue) : undefined);
                }}
                required
              />
            </FormField>

            <FormField label="詳細" htmlFor="task-details" className="sm:col-span-2">
              <Textarea id="task-details" value={details} onChange={(e) => setDetails(e.target.value)} />
            </FormField>

            <div className="sm:col-span-2">
              <FileDropzone
                files={selectedFiles}
                onAdd={(files) => setSelectedFiles((prevFiles) => [...prevFiles, ...files])}
                onRemove={deleteAttachedFile}
                note="1ファイル 3MB まで"
              />
            </div>
          </form>
        )}

        <DialogFooter className="mx-0 mb-0 px-6">
          <Button type="button" variant="outline" onClick={() => onClose()} disabled={postLoading}>
            キャンセル
          </Button>
          <Button type="submit" form={formId} disabled={getLoading || postLoading}>
            {postLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {taskId ? "更新する" : "追加する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 1つだけ選ぶ欄。選んだ値は { value, label } で受け渡す（以前の react-select と同じ形）
const OptionSelect: React.FC<{
  id: string;
  options: Option[];
  value: Option | null | undefined;
  onChange: (option: Option | null) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}> = ({ id, options, value, onChange, placeholder, required, disabled }) => {
  // 選んでいる値が選択肢に無いとき（例：作成で開いた直後の担当者は自分だが、選択肢は小プロジェクトを選ぶまで空）も、
  // 欄に名前が出るように選択肢に足す
  const items =
    value && !options.some((option) => option.value === value.value)
      ? [value, ...options]
      : options;

  return (
    <Select
      value={value ? String(value.value) : ""}
      onValueChange={(next) =>
        onChange(items.find((option) => String(option.value) === next) ?? null)
      }
      required={required}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TaskPopup;
