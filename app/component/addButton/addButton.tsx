import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";

interface AddButtonProps {
  // 0: プロジェクトを追加、1: タスクを追加
  target: number;
  userId: number;
  workspaceId?: number;
  projectId?: number;
  smallProjectId?: number;
  taskGenreId?: number;
  // 文字を出すときの見出し。省くとアイコンだけのボタンになる
  label?: string;
  // 同じ文字のボタンが並ぶときに、読み上げで区別するための名前（見出しの文字を含めて書く）
  accessibleName?: string;
}

const AddButton: React.FC<AddButtonProps> = ({
  target,
  userId,
  workspaceId,
  projectId,
  smallProjectId,
  taskGenreId,
  label,
  accessibleName,
}) => {
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

  const toggleProjectPopup = () => {
    setShowProjectPopup(!showProjectPopup);
  };

  const toggleTaskPopup = () => {
    setShowTaskPopup(!showTaskPopup);
  };

  const name = target === 0 ? "プロジェクトを追加" : "タスクを追加";

  return (
    <>
      <Button
        variant={label ? "outline" : "ghost"}
        size={label ? "sm" : "icon-sm"}
        aria-label={accessibleName ?? (label ? undefined : name)}
        onClick={target === 0 ? toggleProjectPopup : toggleTaskPopup}
      >
        <Plus className="size-4" aria-hidden />
        {label}
      </Button>
      {showProjectPopup && (
        <ProjectPopup
          onClose={toggleProjectPopup}
          userId={userId}
          projectId={null}
        />
      )}
      {showTaskPopup && (
        <TaskPopup
          onClose={toggleTaskPopup}
          userId={userId}
          workspaceId={workspaceId!}
          projectId={projectId || null}
          smallProjectId={smallProjectId || null}
          taskId={null}
          taskGenreId={taskGenreId || null}
        />
      )}
    </>
  );
};

export default AddButton;
