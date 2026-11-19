import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";
import { useNotificationContext } from "@/app/provider/notificationProvider";

interface EditButtonProps {
  workspaceId?: number;
  projectId: number | null;
  taskId: number | null;
  userId: number;
  // 読み上げで何を編集するかを伝える名前（例：タスク名）
  targetName?: string;
}

const EditButton: React.FC<EditButtonProps> = ({
  userId,
  workspaceId,
  projectId,
  taskId,
  targetName,
}) => {
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

  const { setNotificationValue } = useNotificationContext();

  const togglePopup = () => {
    if (projectId && !taskId) {
      setShowProjectPopup(!showProjectPopup);
    } else if (taskId && !projectId) {
      setShowTaskPopup(!showTaskPopup);
    } else {
      console.error(
        "Error get Task ID Project ID: Task ID or Project ID couldn't get."
      );
      setNotificationValue({
        message: "Couldn't get the Data.",
        color: 1,
      });
    }
  };

  const kind = projectId && !taskId ? "プロジェクト" : "タスク";

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={targetName ? `「${targetName}」を編集` : `${kind}を編集`}
        onClick={togglePopup}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
      {showProjectPopup && (
        <ProjectPopup
          onClose={togglePopup}
          projectId={projectId}
          userId={userId}
        />
      )}
      {showTaskPopup && (
        <TaskPopup
          onClose={togglePopup}
          workspaceId={workspaceId!}
          userId={userId}
          projectId={projectId}
          smallProjectId={null}
          taskId={taskId}
          taskGenreId={null}
        />
      )}
    </>
  );
};

export default EditButton;
