import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskResultForm } from "@/app/hooks/useTaskResultForm";
import { cn } from "@/lib/utils";
import { TaskGenreDetail } from "./types";

interface TaskResultListProps {
  taskGenre: TaskGenreDetail | undefined;
  userId: number;
  onReset: TaskResultForm["handleResetResult"];
}

// 詳細の「実績」欄のうち、人ごとの実績と、見積もり（日数×人数）との比較
const TaskResultList: React.FC<TaskResultListProps> = ({
  taskGenre,
  userId,
  onReset,
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
  const withinEstimate = resultTotal <= estimate || estimate === 0;

  return (
    <div className="space-y-2">
      <ul className="m-0 max-h-40 list-none divide-y overflow-y-auto p-0">
        {results.map((result, index) => (
          <li key={index} className="flex items-center gap-3 py-1.5">
            <span className="w-20 shrink-0 truncate">{result.userName}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {result.taskName}
            </span>
            <span className="tabular-nums">
              {(result.numberOfResultDays || 0).toFixed(1)} 日
            </span>
            {userId === result.userId ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`「${result.taskName}」の実績を取り消す`}
                // shortcut: ジャンルの無いタスクの実績は getTaskGenreData が taskId を返さず、消すと失敗する（既知の問題）
                onClick={(e) => onReset(e, result.taskId as number)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <span className="size-6 shrink-0" aria-hidden />
            )}
          </li>
        ))}
      </ul>
      <p className="m-0 flex items-baseline justify-end gap-1 text-sm">
        <span className="text-muted-foreground">合計 / 見積もり</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            withinEstimate ? "text-status-done" : "text-overdue"
          )}
        >
          {resultTotal.toFixed(1)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          / {estimate.toFixed(1)}
        </span>
      </p>
    </div>
  );
};

export default TaskResultList;
