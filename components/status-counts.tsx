import { cn } from "@/lib/utils";
import { TASK_STATUS_DOT_CLASSES, TASK_STATUS_LABELS } from "@/app/lib/taskStatus";

export interface StatusCountsValue {
  notStarted: number;
  processing: number;
  completed: number;
}

interface StatusCountsProps {
  counts: StatusCountsValue;
  // 読み上げで、何の件数かを伝える名前
  label: string;
}

// ステータスごとのタスクの件数。色の点・日本語の名前・数を並べる
export function StatusCounts({ counts, label }: StatusCountsProps) {
  return (
    <ul
      aria-label={label}
      className="m-0 flex list-none items-center gap-3 p-0 text-xs text-muted-foreground"
    >
      {(
        [
          [1, counts.notStarted],
          [2, counts.processing],
          [3, counts.completed],
        ] as const
      ).map(([statusId, count]) => (
        <li key={statusId} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", TASK_STATUS_DOT_CLASSES[statusId])} aria-hidden />
          {TASK_STATUS_LABELS[statusId]}
          <span className="font-medium tabular-nums text-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}
