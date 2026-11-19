import { formatDate } from "@/app/lib/formatDateTime";
import { TaskGenreDetail } from "./types";

interface TaskGenreSummaryProps {
  taskGenre: TaskGenreDetail | undefined;
}

// 詳細の「ジャンル」欄。ジャンルの期間・日数・人数・人日
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
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b last:border-0">
              <th
                scope="row"
                className="w-16 py-1.5 pr-3 text-left font-normal text-muted-foreground"
              >
                {label}
              </th>
              <td className="py-1.5 tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskGenreSummary;
