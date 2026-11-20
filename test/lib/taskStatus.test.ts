import { isUnfinished, taskStatusLabel } from "@/app/lib/taskStatus";

describe("isUnfinished", () => {
  it("status_id が 3（完了）以外なら未完了", () => {
    expect(isUnfinished({ status_id: 1 })).toBe(true);
    expect(isUnfinished({ status_id: 2 })).toBe(true);
    expect(isUnfinished({ status_id: 3 })).toBe(false);
  });
});

describe("taskStatusLabel", () => {
  it("id に対応する日本語名を返し、知らない id なら DB の名前を返す", () => {
    expect(taskStatusLabel(3, "Completed")).toBe("完了");
    expect(taskStatusLabel(9, "Blocked")).toBe("Blocked");
  });
});
