import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientSupabase } from "@/app/lib/supabase/client";
import DeleteConfirmModal from "../deleteConfirmModal/deleteConfirmModal";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";

interface ProjectDeleteButtonProps {
  projectId: number | null;
  taskId: number | null;
  userId: number;
  // 読み上げで何を削除するかを伝える名前（例：タスク名）
  targetName?: string;
}

const DeleteButton: React.FC<ProjectDeleteButtonProps> = ({
  projectId,
  taskId,
  userId,
  targetName,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setPageUpdated } = usePageUpdateContext();
  const { setNotificationValue } = useNotificationContext();
  const { displayWorkspaceId } = useDisplayWorkspaceIdContext();

  const handleDelete = async () => {
    try {
      if (projectId && !taskId) {
        const { data: smallProjectData, error: selectTaskIdsDataError } =
          await clientSupabase
            .from("small_projects")
            .select("id,tasks(id)")
            .eq("project_id", projectId);

        if (selectTaskIdsDataError) {
          throw selectTaskIdsDataError;
        }

        if (
          smallProjectData &&
          smallProjectData.length > 0 &&
          smallProjectData.some((taskIds) => taskIds.tasks.length > 0)
        ) {
          const taskIdList = smallProjectData.flatMap((smallProject) =>
            smallProject.tasks.map((task) => task.id)
          );
          const {
            data: deleteTaskFilePathList,
            error: selectDeleteTaskFilePathListError,
          } = await clientSupabase
            .from("task_attachments")
            .select("file_path")
            .in("task_id", taskIdList);

          if (selectDeleteTaskFilePathListError) {
            throw selectDeleteTaskFilePathListError;
          }

          if (deleteTaskFilePathList && deleteTaskFilePathList.length > 0) {
            const deletePaths = deleteTaskFilePathList.map(
              (path) => path.file_path
            );
            const { error: removeError } = await clientSupabase.storage
              .from("task_attachments")
              .remove(deletePaths);

            if (removeError) {
              throw removeError;
            }
          }
        }

        const smallProjectIdList = smallProjectData.map(
          (smallProject) => smallProject.id
        );
        const {
          data: deleteFilePathList,
          error: selectDeleteFilePathDataError,
        } = await clientSupabase
          .from("small_project_attachments")
          .select("file_path")
          .in("small_project_id", smallProjectIdList);

        if (selectDeleteFilePathDataError) {
          throw selectDeleteFilePathDataError;
        }

        if (deleteFilePathList && deleteFilePathList.length > 0) {
          const deletePaths = deleteFilePathList.map((path) => path.file_path);
          const { error: removeError } = await clientSupabase.storage
            .from("small_project_attachments")
            .remove(deletePaths);

          if (removeError) {
            throw removeError;
          }
        }

        const { error: projectDeleteError } = await clientSupabase
          .from("projects")
          .delete()
          .eq("id", projectId);

        if (projectDeleteError) {
          throw projectDeleteError;
        }
      } else if (taskId && !projectId) {
        const {
          data: deleteFilePathList,
          error: selectDeleteFilePathDataError,
        } = await clientSupabase
          .from("task_attachments")
          .select("file_path")
          .eq("task_id", taskId);

        if (selectDeleteFilePathDataError) {
          throw selectDeleteFilePathDataError;
        }

        if (deleteFilePathList && deleteFilePathList.length > 0) {
          const deletePaths = deleteFilePathList.map((path) => path.file_path);
          const { error: removeError } = await clientSupabase.storage
            .from("task_attachments")
            .remove(deletePaths);

          if (removeError) {
            throw removeError;
          }
        }

        const postEmailNotificationsError = await postMailNotifications(
          displayWorkspaceId,
          userId,
          taskId,
          null,
          null,
          null,
          2,
          []
        );

        if (postEmailNotificationsError) {
          console.error(
            "Post Mail Notifications ",
            postEmailNotificationsError
          );
        }

        const { error: taskDeleteError } = await clientSupabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

        if (taskDeleteError) {
          throw taskDeleteError;
        }
      } else {
        throw new Error("Task ID or Project ID couldn't get.");
      }

      setNotificationValue({
        message: projectId ? "Project was deleted !" : "Task was deleted !",
        color: 0,
      });
    } catch (error) {
      console.error(projectId ? "Delete Project" : "Delete Task", error);
      setNotificationValue({
        message: projectId
          ? "Project was not deleted."
          : "Task was not deleted.",
        color: 1,
      });
    }
    setPageUpdated(true);
    setIsModalOpen(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const kind = projectId && !taskId ? "プロジェクト" : "タスク";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        aria-label={targetName ? `「${targetName}」を削除` : `${kind}を削除`}
        onClick={openModal}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      {isModalOpen && (
        <DeleteConfirmModal onConfirm={handleDelete} closeModal={closeModal} />
      )}
    </>
  );
};

export default DeleteButton;
