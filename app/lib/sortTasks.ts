export type TaskSortKey =
  | "task_name"
  | "status_id"
  | "start_date"
  | "deadline_date"
  | "number_of_days"
  | "assigned_user_id";

// 日付の列。ほかの数値の列（日数・ステータス・担当者）は値をそのまま比べる（new Date を通すと日数の小数を切り捨てる）
const DATE_KEYS: TaskSortKey[] = ["start_date", "deadline_date"];

// 押した回数が 0 なら昇順、それ以外なら降順に並べた新しい配列を返す（元の配列は変えない）。
// task_name は日本語の並び順、日付の列は日時の数値、ほかの列は値そのもので比べる
export const sortTasks = <T extends Record<TaskSortKey, any>>(
  tasks: T[],
  sortKey: TaskSortKey,
  clickCount: number
): T[] => {
  if (sortKey === "task_name") {
    return [...tasks].sort((a, b) => {
      const comparison = a.task_name.localeCompare(b.task_name, "ja");
      return clickCount === 0 ? comparison : -comparison;
    });
  }
  const toNumber = (value: unknown) =>
    DATE_KEYS.includes(sortKey) ? new Date(value as string).getTime() : Number(value);
  return [...tasks].sort((a, b) => {
    const valueA = toNumber(a[sortKey]);
    const valueB = toNumber(b[sortKey]);
    return clickCount === 0 ? valueA - valueB : valueB - valueA;
  });
};
