import classNames from "classnames";
import styles from "./arrow.module.css";

interface ArrowProps {
  setProjectArrows?: React.Dispatch<React.SetStateAction<boolean[]>>;
  projectArrows?: boolean[];
  setMyTasksArrows?: React.Dispatch<React.SetStateAction<boolean[]>>;
  myTasksArrows?: boolean[];
  setNotYetCompletedTasksArrows?: React.Dispatch<
    React.SetStateAction<boolean[]>
  >;
  notYetCompletedTasksArrows?: boolean[];
  setProjectDetailsArrows?: React.Dispatch<React.SetStateAction<boolean[]>>;
  projectDetailsArrows?: boolean[];
  index: number;
  target: number;
}

enum Target {
  projects,
  myTasks,
  notYetCompletedTasks,
  projectDetails,
}

export const Arrow: React.FC<ArrowProps> = ({
  setProjectArrows,
  projectArrows,
  setMyTasksArrows,
  myTasksArrows,
  setNotYetCompletedTasksArrows,
  notYetCompletedTasksArrows,
  setProjectDetailsArrows,
  projectDetailsArrows,
  index,
  target,
}) => {
  const toggleArrow = (clickedNumber: number, target: number) => {
    switch (target) {
      case Target.projects:
        if (setProjectArrows) {
          setProjectArrows((prevProjectArrows) =>
            prevProjectArrows.map((projectArrow, i) =>
              i === clickedNumber ? !projectArrow : projectArrow
            )
          );
        }
        break;
      case Target.myTasks:
        if (setMyTasksArrows) {
          setMyTasksArrows((prevMyTasksArrows) =>
            prevMyTasksArrows.map((myTasksArrow, i) =>
              i === clickedNumber ? !myTasksArrow : myTasksArrow
            )
          );
        }
        break;
      case Target.notYetCompletedTasks:
        if (setNotYetCompletedTasksArrows) {
          setNotYetCompletedTasksArrows((prevNotYetCompletedTasksArrows) =>
            prevNotYetCompletedTasksArrows.map((notYetCompletedTasksArrow, i) =>
              i === clickedNumber
                ? !notYetCompletedTasksArrow
                : notYetCompletedTasksArrow
            )
          );
        }
        break;
      case Target.projectDetails:
        if (setProjectDetailsArrows) {
          setProjectDetailsArrows((prevProjectDetailsArrows) =>
            prevProjectDetailsArrows.map((projectDetailsArrow, i) =>
              i === clickedNumber ? !projectDetailsArrow : projectDetailsArrow
            )
          );
        }
      default:
        break;
    }
  };

  return (
    <span
      className={classNames("material-symbols-outlined", styles.arrow)}
      onClick={() => toggleArrow(index, target)}
    >
      {projectArrows &&
        (projectArrows[index] ? "arrow_drop_down" : "arrow_right")}{" "}
      {myTasksArrows &&
        (myTasksArrows[index] ? "arrow_drop_down" : "arrow_right")}{" "}
      {notYetCompletedTasksArrows &&
        (notYetCompletedTasksArrows[index]
          ? "arrow_drop_down"
          : "arrow_right")}{" "}
      {projectDetailsArrows &&
        (projectDetailsArrows[index] ? "arrow_drop_down" : "arrow_right")}{" "}
    </span>
  );
};
