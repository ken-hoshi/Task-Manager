import { useId } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Loader2 } from "lucide-react";
import Comment from "@/app/component/comment/comment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskResultForm } from "@/app/hooks/useTaskResultForm";
import { formatDate } from "@/app/lib/formatDateTime";
import AttachedFileList from "./attachedFileList";
import TaskGenreSummary from "./taskGenreSummary";
import TaskResultList from "./taskResultList";
import { AttachedFileData, TaskGenreDetail } from "./types";

// 詳細に出すタスクの項目（fetchTasksData が返す行の一部）
export interface DetailTask {
  id: number;
  assigned_user_id: number;
  start_date: string;
  deadline_date: string;
  details: string | null;
  small_projects: {
    small_project_name: string;
    projects: { project_name: string };
  };
}

interface TaskDetailsProps {
  task: DetailTask;
  taskGenre: TaskGenreDetail | undefined;
  attachedFiles: AttachedFileData[] | undefined;
  userId: number;
}

// 詳細の欄の見出しと中身
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="space-y-1.5">
    <h3 className="m-0 text-xs font-medium text-muted-foreground">{title}</h3>
    <div className="text-sm">{children}</div>
  </section>
);

// タスク画面（自分のタスク・未完了のタスク）で、タスクを開いたときの詳細。表の行の中に置く
const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  taskGenre,
  attachedFiles,
  userId,
}) => {
  // 同じタスクを2つの表で同時に開いても、ラベルの付く先が重ならないようにする
  const fieldId = useId();
  // 実績の入力欄の値は、詳細ごとに持つ（詳細を2つ開いても、それぞれの値になる）
  const resultForm = useTaskResultForm();

  return (
    <div className="space-y-5 bg-muted/40 px-6 py-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Section title="プロジェクト">
          <p className="m-0">{task.small_projects.projects.project_name}</p>
          <p className="m-0 text-muted-foreground">
            {task.small_projects.small_project_name}
          </p>
        </Section>
        <Section title="期間">
          <p className="m-0 tabular-nums">
            <span>{formatDate(task.start_date)}</span>
            {" 〜 "}
            <span>{formatDate(task.deadline_date)}</span>
          </p>
        </Section>

        <Section title="ジャンル">
          <TaskGenreSummary taskGenre={taskGenre} />
        </Section>
        <Section title="実績">
          <div className="space-y-3">
            <TaskResultList
              taskGenre={taskGenre}
              userId={userId}
              onReset={resultForm.handleResetResult}
            />
            {userId === task.assigned_user_id && (
              <form
                aria-label="実績を記録"
                onSubmit={(e) => resultForm.handleSubmit(e, task.id)}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="space-y-1">
                  <Label htmlFor={`${fieldId}-period`}>作業した期間</Label>
                  <DatePicker
                    id={`${fieldId}-period`}
                    selected={resultForm.selectedResultStartDate}
                    onChange={resultForm.handleResultDateRangeChange}
                    startDate={resultForm.selectedResultStartDate}
                    endDate={resultForm.selectedResultDeadlineDate}
                    selectsRange
                    dateFormat="yyyy/MM/dd"
                    className="h-8 w-56 rounded-md border bg-background px-2.5 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${fieldId}-days`}>日数</Label>
                  <Input
                    id={`${fieldId}-days`}
                    type="number"
                    name="numberOfResultDays"
                    step="0.1"
                    min="0"
                    className="w-24"
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
                </div>
                <Button type="submit" disabled={resultForm.postLoading}>
                  {resultForm.postLoading && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  記録
                </Button>
              </form>
            )}
          </div>
        </Section>

        <Section title="詳細">
          {task.details ? (
            <p className="m-0 whitespace-pre-wrap">{task.details}</p>
          ) : (
            <p className="m-0 text-muted-foreground">詳細はありません</p>
          )}
        </Section>
        <Section title="添付ファイル">
          <AttachedFileList fileDataArray={attachedFiles} />
        </Section>
      </div>

      <Section title="コメント">
        <Comment userId={userId} taskId={task.id} />
      </Section>
    </div>
  );
};

export default TaskDetails;
