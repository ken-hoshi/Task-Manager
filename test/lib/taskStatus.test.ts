import { isUnfinished, taskStatusLabel } from "@/app/lib/taskStatus";

describe("isUnfinished", () => {
  it("status_id が 3（完了）以外なら未完了", () => {
    expect(isUnfinished({ status_id: 1 })).toBe(true);
    expect(isUnfinished({ status_id: 2 })).toBe(true);
    expect(isUnfinished({ status_id: 3 })).toBe(false);
  });

  // 以前はチームのタスクだけ表示名で判定していたので、DB の名前が変わると完了のタスクも未完了に出た
  it("表示名に関わらず、id で決める", () => {
    expect(isUnfinished({ status_id: 3, task_status: { status: "完了" } } as { status_id: number })).toBe(false);
  });
});

describe("taskStatusLabel", () => {
  it("id に対応する日本語名を返し、知らない id なら DB の名前を返す", () => {
    expect(taskStatusLabel(3, "Completed")).toBe("完了");
    expect(taskStatusLabel(9, "Blocked")).toBe("Blocked");
  });
});
