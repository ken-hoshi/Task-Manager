import React, { useState } from "react";
import styles from "./addButton.module.css";
import classNames from "classnames";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";

interface AddButtonProps {
  target: number;
  userId: number;
  projectId?: number;
  smallProjectId?: number|null;
  taskGenreId?:number;
}

const AddButton: React.FC<AddButtonProps> = ({
  target,
  userId,
  projectId,
  smallProjectId,
  taskGenreId,
}) => {
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

  const toggleProjectPopup = () => {
    setShowProjectPopup(!showProjectPopup);
  };

  const toggleTaskPopup = () => {
    setShowTaskPopup(!showTaskPopup);
  };

  return (
    <div>
      <span
        className={classNames("material-symbols-outlined", styles.add)}
        onClick={{ 0: toggleProjectPopup, 1: toggleTaskPopup }[target]}
      >
        {" "}
        add{" "}
      </span>
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
          projectId={projectId || null}
          smallProjectId={smallProjectId || null}
          taskId={null}
          taskGenreId={taskGenreId||null}
        />
      )}
    </div>
  );
};

export default AddButton;
