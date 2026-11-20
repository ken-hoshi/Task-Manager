// 通知の一覧。新しい順に並べ、未読を示し、閉じたときに未読だけ既読にする
import { act, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import MailNotificationList, { Notification } from "@/app/component/mailNotificationList/mailNotificationList";
import { opsOf, resetSupabaseMock } from "../helpers/mockSupabase";

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));

beforeEach(() => resetSupabaseMock());

const notifications: Notification[] = [
  { id: 1, message: "タスク「設計」が追加されました。", isRead: true, timestamp: "2026/11/18 10:00" },
  { id: 2, message: "コメントが届きました。", isRead: false, timestamp: "2026/11/19 09:00" },
];

const renderList = (items: Notification[]) =>
  render(<MailNotificationList id="notifications" notifications={items} listRef={createRef()} />);

describe("通知の一覧", () => {
  it("新しい通知を上に並べ、未読には「未読」と読み上げる印を付ける", () => {
    renderList(notifications);

    const items = within(screen.getByRole("region", { name: "通知" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("未読: コメントが届きました。");
    expect(items[1]).toHaveTextContent("タスク「設計」が追加されました。");
    expect(items[1]).not.toHaveTextContent("未読");
  });

  it("0件なら「通知はありません」と出す", () => {
    renderList([]);

    expect(screen.getByText("通知はありません")).toBeInTheDocument();
  });

  it("閉じると、未読の通知だけを既読にする", async () => {
    const { unmount } = renderList(notifications);

    await act(async () => {
      unmount();
    });

    expect(opsOf("mail_notifications")).toEqual([
      ["update", [{ isRead: true }]],
      ["eq", ["id", 2]],
    ]);
  });
});
