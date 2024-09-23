import React, { useState } from "react";
import styles from "./addButton.module.css";
import classNames from "classnames";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";

interface AddButtonProps {
  target: number;
  userId: number;
  projectId?: number;
}

const AddButton: React.FC<AddButtonProps> = ({ target, userId, projectId }) => {
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
          projectId={projectId || null}
          userId={userId}
        />
      )}
      {showTaskPopup && (
        <TaskPopup
          onClose={toggleTaskPopup}
          userId={userId}
          projectId={projectId || null}
          taskId={null}
        />
      )}
    </div>
  );
};

export default AddButton;
