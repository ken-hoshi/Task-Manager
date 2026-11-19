import { formatDate } from "@/app/lib/formatDateTime";
import { TaskGenreDetail } from "./types";

interface TaskGenreSummaryProps {
  // 実績の欄が使う taskId と assignedUserTaskResultData は要らない（プロジェクトの表からも渡す）
  taskGenre: Omit<TaskGenreDetail, "taskId" | "assignedUserTaskResultData"> | undefined;
}

// 詳細の「ジャンル」欄。ジャンルの期間・日数・人数・人日。
// 表（table）にしないのは、まだ作り直していないプロジェクト画面の一覧の CSS が、中の table 全体に効いてしまうため
const TaskGenreSummary: React.FC<TaskGenreSummaryProps> = ({ taskGenre }) => {
  if (!taskGenre || !taskGenre.taskGenreId) {
    return <p className="m-0 text-muted-foreground">ジャンルはありません</p>;
  }

  const days = taskGenre.numberOfDays ?? 0;
  const persons = taskGenre.numberOfPersons ?? 0;
  const rows: [string, string][] = [
    [
      "期間",
      `${formatDate(taskGenre.startDate!)} 〜 ${formatDate(taskGenre.deadlineDate!)}`,
    ],
    ["日数", days.toFixed(1)],
    ["人数", String(taskGenre.numberOfPersons ?? "")],
    ["人日", (days * persons).toFixed(1)],
  ];

  return (
    <div className="space-y-2">
      <p className="m-0 font-medium">{taskGenre.taskGenreName}</p>
      <dl className="m-0 grid grid-cols-[4rem_1fr] text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="col-span-2 grid grid-cols-subgrid border-b py-1.5 last:border-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default TaskGenreSummary;
