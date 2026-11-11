import { formatDate } from "@/app/lib/formatDateTime";
import { CssModule, TaskGenreDetail } from "./types";

interface TaskGenreSummaryProps {
  taskGenre: TaskGenreDetail | undefined;
  styles: CssModule;
}

// 詳細の行の「Task Genre」欄。ジャンルの期間・日数・人数・人日の表
const TaskGenreSummary: React.FC<TaskGenreSummaryProps> = ({
  taskGenre,
  styles,
}) => {
  if (!taskGenre || !taskGenre.taskGenreId) {
    return <div className={styles[`non-task-genre`]}>No Task Genre</div>;
  }

  return (
    <div className={styles[`task-genre-area`]}>
      <div className={styles[`task-genre-block`]}>
        <div className={styles[`task-genre-name`]}>
          {taskGenre.taskGenreName}
        </div>

        <div className={styles[`task-genre-table-container`]}>
          <table>
            <tbody>
              <tr>
                <td>Period</td>
                <td>
                  {formatDate(taskGenre.startDate!)} ~
                  {formatDate(taskGenre.deadlineDate!)}
                </td>
              </tr>
              <tr>
                <td>Days</td>
                <td>{(taskGenre.numberOfDays ?? 0).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Persons</td>
                <td>{taskGenre.numberOfPersons}</td>
              </tr>
              <tr>
                <td>Persons/Days</td>
                <td>
                  {(
                    (taskGenre.numberOfDays ?? 0) *
                    (taskGenre.numberOfPersons ?? 0)
                  ).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaskGenreSummary;
