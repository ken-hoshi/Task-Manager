import { sortTasks } from "@/app/lib/sortTasks";

const tasks = [
  { id: 1, task_name: "い", status_id: 2, start_date: "2024-04-03", deadline_date: "2024-04-10", number_of_days: 1.8, assigned_user_id: 6 },
  { id: 2, task_name: "あ", status_id: 1, start_date: "2024-04-01", deadline_date: "2024-04-05", number_of_days: 1.2, assigned_user_id: 5 },
  { id: 3, task_name: "う", status_id: 3, start_date: "2024-04-02", deadline_date: "2024-04-08", number_of_days: 1.5, assigned_user_id: 7 },
];
const ids = (list: { id: number }[]) => list.map((t) => t.id);

describe("sortTasks", () => {
  // 以前は数値の列も new Date を通していたので、1.2 と 1.8 が同じ 1 として比べられ、元の順のまま残っていた
  it("日数は小数のまま比べる", () => {
    expect(ids(sortTasks(tasks, "number_of_days", 0))).toEqual([2, 3, 1]);
    expect(ids(sortTasks(tasks, "number_of_days", 1))).toEqual([1, 3, 2]);
  });

  it("日付の列は日付として比べる", () => {
    expect(ids(sortTasks(tasks, "start_date", 0))).toEqual([2, 3, 1]);
    expect(ids(sortTasks(tasks, "deadline_date", 1))).toEqual([1, 3, 2]);
  });

  it("ステータスと担当者は数値として比べ、名前は日本語の並び順で比べる", () => {
    expect(ids(sortTasks(tasks, "status_id", 0))).toEqual([2, 1, 3]);
    expect(ids(sortTasks(tasks, "assigned_user_id", 1))).toEqual([3, 1, 2]);
    expect(ids(sortTasks(tasks, "task_name", 0))).toEqual([2, 1, 3]);
  });

  it("元の配列は変えない", () => {
    const before = ids(tasks);
    sortTasks(tasks, "number_of_days", 1);
    expect(ids(tasks)).toEqual(before);
  });
});
