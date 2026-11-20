// タスクのコメント欄。一覧・送る・メニューからの編集と削除を、画面の文字と DB に送る値で確かめる
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Comment from "@/app/component/comment/comment";
import { fetchCommentData } from "@/app/lib/api/fetchCommentData";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { insertsOf, opsOf, resetSupabaseMock } from "../helpers/mockSupabase";

const setNotificationValue = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 3 }),
}));
jest.mock("@/app/lib/api/fetchCommentData", () => ({ fetchCommentData: jest.fn() }));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: jest.fn(async () => undefined),
}));

const rows = [
  { id: 1, user_id: 6, comment_text: "確認お願いします", created_at: "2026-11-18T01:00:00Z", isDeleted: false, users: { name: "田中" } },
  { id: 2, user_id: 5, comment_text: "見ます", created_at: "2026-11-18T02:00:00Z", isDeleted: false, users: { name: "星" } },
  { id: 3, user_id: 5, comment_text: "コメントは削除されました。", created_at: "2026-11-18T03:00:00Z", isDeleted: true, users: { name: "星" } },
];

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  (fetchCommentData as jest.Mock).mockResolvedValue(rows);
});

const renderComment = async () => {
  await act(async () => {
    render(<Comment userId={5} taskId={9} />);
  });
  await screen.findByText("確認お願いします");
};

// Radix のメニューは、ボタンの上で Enter を押すと開く
const openMenu = () => {
  fireEvent.keyDown(screen.getByRole("button", { name: "コメントの操作" }), { key: "Enter" });
};

describe("コメント欄", () => {
  it("書いた人と本文を並べ、操作のメニューは自分の削除されていないコメントにだけ出す", async () => {
    await renderComment();

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("田中");
    expect(within(items[0]).queryByRole("button", { name: "コメントの操作" })).not.toBeInTheDocument();
    expect(within(items[1]).getByRole("button", { name: "コメントの操作" })).toBeInTheDocument();
    expect(within(items[2]).queryByRole("button", { name: "コメントの操作" })).not.toBeInTheDocument();
  });

  it("0件なら「コメントはありません」と出す", async () => {
    (fetchCommentData as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<Comment userId={5} taskId={9} />);
    });

    expect(screen.getByText("コメントはありません")).toBeInTheDocument();
  });

  it("「送る」で comments に入れ、通知を送って欄を空にする", async () => {
    await renderComment();
    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), { target: { value: "了解です" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "送る" }));
    });

    expect(insertsOf("comments")[0]).toMatchObject({ task_id: 9, user_id: 5, comment_text: "了解です" });
    expect(postMailNotifications).toHaveBeenCalledWith(3, 5, 9, null, null, null, 3, []);
    expect(screen.getByRole("textbox", { name: "コメント" })).toHaveValue("");
  });

  it("メニューの「編集」で欄が開き、離れると直した本文で更新する", async () => {
    await renderComment();
    openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "編集" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const editor = screen.getByRole("textbox", { name: "コメントを編集" });
    expect(editor).toHaveValue("見ます");
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: "明日見ます" } });
    await act(async () => {
      fireEvent.blur(editor);
    });

    expect(opsOf("comments")).toContainEqual(["update", [{ comment_text: "明日見ます" }]]);
    expect(opsOf("comments")).toContainEqual(["eq", ["id", 2]]);
  });

  it("メニューの「削除」で、本文を「コメントは削除されました。」に書き換える", async () => {
    await renderComment();
    openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    });

    await waitFor(() =>
      expect(opsOf("comments")).toContainEqual([
        "update",
        [{ comment_text: "コメントは削除されました。", isDeleted: true }],
      ])
    );
    expect(opsOf("comments")).toContainEqual(["eq", ["id", 2]]);
  });
});
