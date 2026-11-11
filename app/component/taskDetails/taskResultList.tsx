import classNames from "classnames";
import { TaskResultForm } from "@/app/hooks/useTaskResultForm";
import { CssModule, TaskGenreDetail } from "./types";

interface TaskResultListProps {
  taskGenre: TaskGenreDetail | undefined;
  userId: number;
  onReset: TaskResultForm["handleResetResult"];
  styles: CssModule;
}

// 詳細の行の「Task Result」欄のうち、人ごとの実績と、見積もりとの比較
const TaskResultList: React.FC<TaskResultListProps> = ({
  taskGenre,
  userId,
  onReset,
  styles,
}) => {
  if (!taskGenre || taskGenre.assignedUserTaskResultData.length === 0) {
    return null;
  }

  const results = taskGenre.assignedUserTaskResultData;
  const resultTotal = results.reduce(
    (acc, curr) => acc + curr.numberOfResultDays,
    0
  );
  const estimate =
    (taskGenre.numberOfDays ?? 0) * (taskGenre.numberOfPersons ?? 0);

  return (
    <div className={styles["result-area"]}>
      <div className={styles["user-result-area"]}>
        <div>
          {results.map((result, index) => (
            <div className={styles["assigned-user-list-container"]} key={index}>
              <div className={styles["assigned-user-list"]}>
                <div>{result.userName}</div>
                <div className={styles["result-task-name"]}>
                  {result.taskName}
                </div>
                <div>
                  {(result.numberOfResultDays
                    ? result.numberOfResultDays
                    : 0
                  ).toFixed(1)}
                  {" days"}
                </div>
              </div>
              {userId === result.userId && (
                <div className={styles["cancel-icon-container"]}>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles[`cancel-icon`]
                    )}
                    // shortcut: ジャンルの無いタスクの実績は getTaskGenreData が taskId を返さず、消すと失敗する（既知の問題）
                    onClick={(e) => onReset(e, result.taskId as number)}
                  >
                    cancel
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles["sum-result-area-container"]}>
        <div className={styles["sum-result-area"]}>
          <div>Result</div>
          <div className={styles["sum-value"]}>
            <div
              className={
                resultTotal <= estimate || estimate === 0
                  ? styles[`value-green`]
                  : styles[`value-red`]
              }
            >
              {resultTotal.toFixed(1)}
            </div>
            <div>
              {" / "}
              {estimate.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskResultList;
