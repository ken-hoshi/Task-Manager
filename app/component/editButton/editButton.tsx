import React, { useEffect, useState } from "react";
import styles from "./editButton.module.css";
import classNames from "classnames";
import ProjectPopup from "../projectPopup/projectPopup";
import TaskPopup from "../taskPopup/taskPopup";
import { useNotificationContext } from "@/app/provider/notificationProvider";

interface EditButtonProps {
  projectId: number | null;
  taskId: number | null;
  userId: number;
}

const EditButton: React.FC<EditButtonProps> = ({
  projectId,
  taskId,
  userId,
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
        "Error get Task ID Project ID: Task ID or Project ID is null."
      );
      setNotificationValue({
        message: "Couldn't get the data.",
        color: 1,
      });
    }
  };

  return (
    <div>
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
          taskId={taskId}
          projectId={projectId}
          userId={userId}
        />
      )}
    </div>
  );
};

export default EditButton;
