import Image from "next/image";
import DatePicker from "react-datepicker";
import Comment from "@/app/component/comment/comment";
import { TaskResultForm } from "@/app/hooks/useTaskResultForm";
import { formatDate } from "@/app/lib/formatDateTime";
import AttachedFileList from "./attachedFileList";
import TaskGenreSummary from "./taskGenreSummary";
import TaskResultList from "./taskResultList";
import { AttachedFileData, CssModule, TaskGenreDetail } from "./types";

interface TaskDetailsProps {
  task: {
    id: number;
    assigned_user_id: number;
    start_date: string;
    deadline_date: string;
    details: string | null;
    small_projects: {
      small_project_name: string;
      projects: { project_name: string };
    };
  };
  taskGenre: TaskGenreDetail | undefined;
  attachedFiles: AttachedFileData[] | undefined;
  userId: number;
  isOpen: boolean;
  colSpan: number;
  resultForm: TaskResultForm;
  styles: CssModule;
}

// タスク画面（自分のタスク・未完了のタスク）の、タスクを開いたときの詳細の行
const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  taskGenre,
  attachedFiles,
  userId,
  isOpen,
  colSpan,
  resultForm,
  styles,
}) => (
  <tr className={isOpen ? styles[`details-open`] : styles[`details-hidden`]}>
    <td colSpan={colSpan}>
      <Image
        src="/img/background-image2.jpeg"
        alt="background-image2"
        className={styles[`background-image2`]}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={true}
      />
      <div className={styles[`scrollable-content`]}>
        <dl>
          <div className={styles[`scrollable-content-container`]}>
            <div className={styles[`flex-area`]}>
              <div className={styles.flex}>
                <dt>Project Name</dt>
                <dd className={styles[`project-name`]}>
                  <div className={styles[`project-name-container`]}>
                    <div className={styles[`project-element`]}>Project :</div>
                    <div className={styles[`white-text-container`]}>
                      <div className={styles[`white-text`]}>
                        {task.small_projects.projects.project_name}
                      </div>
                    </div>
                  </div>
                  <div className={styles[`small-project-name-container`]}>
                    <div className={styles[`small-project-element`]}>
                      Small Project :
                    </div>
                    <div className={styles[`white-text-container`]}>
                      <div className={styles[`white-text`]}>
                        {task.small_projects.small_project_name}
                      </div>
                    </div>
                  </div>
                </dd>
              </div>
              <div className={styles.flex}>
                <dt>Period</dt>
                <dd>
                  <div>
                    <div className={styles[`white-text`]}>
                      {formatDate(task.start_date)}
                    </div>
                    〜
                    <div className={styles[`white-text`]}>
                      {formatDate(task.deadline_date)}
                    </div>
                  </div>
                </dd>
              </div>
            </div>

            <div className={styles[`flex-area`]}>
              <div className={styles.flex}>
                <dt>Task Genre</dt>
                <dd>
                  <TaskGenreSummary taskGenre={taskGenre} styles={styles} />
                </dd>
              </div>
              <div className={styles.flex}>
                <dt>Task Result</dt>
                <dd>
                  <TaskResultList
                    taskGenre={taskGenre}
                    userId={userId}
                    onReset={resultForm.handleResetResult}
                    styles={styles}
                  />
                  {userId === task.assigned_user_id && (
                    <form
                      onSubmit={(e) => resultForm.handleSubmit(e, task.id)}
                      className={styles[`task-result-form`]}
                    >
                      <DatePicker
                        selected={resultForm.selectedResultStartDate}
                        onChange={resultForm.handleResultDateRangeChange}
                        startDate={resultForm.selectedResultStartDate}
                        endDate={resultForm.selectedResultDeadlineDate}
                        selectsRange
                        dateFormat="yyyy/MM/dd"
                        className={styles[`date-picker`]}
                        calendarClassName={styles[`custom-calendar`]}
                        showIcon
                        required
                      />

                      <div className={styles["form-container"]}>
                        <div>
                          <input
                            type="number"
                            name="numberOfResultDays"
                            step="0.1"
                            min="0"
                            className={styles[`number-of-result-days-form`]}
                            value={
                              resultForm.numberOfResultDays !== undefined
                                ? resultForm.numberOfResultDays
                                : ""
                            }
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              resultForm.setNumberOfResultDays(
                                inputValue ? Number(inputValue) : undefined
                              );
                            }}
                            required
                          />
                          {" days"}
                        </div>
                        <div className={styles[`button-container`]}>
                          <button className={styles.confirm} type="submit">
                            {resultForm.postLoading ? (
                              <div className={styles[`button-spinner`]}></div>
                            ) : (
                              "confirm"
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </dd>
              </div>
            </div>
          </div>

          <dt>Details</dt>
          <dd className={styles[`details-area`]}>
            {task.details ? (
              <div className={styles[`details-text`]}>{task.details}</div>
            ) : (
              "No Details"
            )}
          </dd>
          <dt>Attached File</dt>
          <dd className={styles["attachedFile-area"]}>
            <AttachedFileList fileDataArray={attachedFiles} styles={styles} />
          </dd>

          <Comment userId={userId} taskId={task.id} />
        </dl>
      </div>
    </td>
  </tr>
);

export default TaskDetails;
