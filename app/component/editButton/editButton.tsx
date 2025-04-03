import React, { useEffect, useState } from "react";
import styles from "./editButton.module.css";
import classNames from "classnames";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";
import { useNotificationContext } from "@/app/provider/notificationProvider";

interface EditButtonProps {
  workspaceId?: number;
  projectId: number | null;
  taskId: number | null;
  userId: number;
}

const EditButton: React.FC<EditButtonProps> = ({
  userId,
  workspaceId,
  projectId,
  taskId,
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

  return (
    <div className={styles[`edit-button-container`]}>
      <span
        className={classNames("material-symbols-outlined", styles.edit)}
        onClick={() => togglePopup()}
      >
        {" "}
        edit{" "}
      </span>
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
    </div>
  );
};

export default EditButton;
