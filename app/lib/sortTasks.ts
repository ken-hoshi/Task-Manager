export type TaskSortKey =
  | "task_name"
  | "status_id"
  | "start_date"
  | "deadline_date"
  | "number_of_days"
  | "assigned_user_id";

// 押した回数が 0 なら昇順、それ以外なら降順に並べた新しい配列を返す（元の配列は変えない）。
// task_name は日本語の並び順、ほかの列は new Date(値) の数値で比べる。
// shortcut: 数値の列も new Date を通すので小数を切り捨てる（日数の 1.2 と 1.8 が同じ扱い）。直すときは数値の列だけ値をそのまま比べる
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
  return [...tasks].sort((a, b) => {
    const valueA = new Date(a[sortKey]).getTime();
    const valueB = new Date(b[sortKey]).getTime();
    return clickCount === 0 ? valueA - valueB : valueB - valueA;
  });
};
