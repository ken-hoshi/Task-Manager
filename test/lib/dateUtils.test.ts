import { formatDate, formatDateTime } from "@/app/lib/formatDateTime";
import { isDeadlineNear } from "@/app/lib/isDeadlineNear";

// 日付の文字列は時刻つき（ローカル時刻）で渡し、テストを動かす場所のタイムゾーンに左右されないようにする
describe("isDeadlineNear", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 3, 10, 15, 0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("完了（status_id 3）なら、期限を過ぎていても 0", () => {
    expect(isDeadlineNear("2024-04-01T00:00:00", 3)).toBe(0);
  });

  it("期限を過ぎていれば 2", () => {
    expect(isDeadlineNear("2024-04-09T00:00:00", 1)).toBe(2);
  });

  it("今日から2日後までなら 1", () => {
    expect(isDeadlineNear("2024-04-10T00:00:00", 1)).toBe(1);
    expect(isDeadlineNear("2024-04-12T23:00:00", 2)).toBe(1);
  });

  it("3日後より先なら 0", () => {
    expect(isDeadlineNear("2024-04-13T00:00:00", 1)).toBe(0);
  });
});

describe("formatDateTime / formatDate", () => {
  it("年/月/日 時:分 の形で、月日と時分は2桁にそろえる", () => {
    expect(formatDateTime("2024-04-05T09:07:00")).toBe("2024/04/05 09:07");
  });

  it("日付だけの形", () => {
    expect(formatDate("2024-12-31T23:59:00")).toBe("2024/12/31");
  });
});
