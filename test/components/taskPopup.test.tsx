// タスクの作成・編集のポップアップ（TaskPopup）。画面に出る文字・欄の名前と、DB に送る値で確かめる。
// ここでは、プロジェクト画面から小プロジェクトを決めて開く「作成」の流れを使う
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskPopup from "@/app/component/taskPopup/taskPopup";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getSmallProjectData } from "@/app/lib/api/getSmallProjectData";
import { getSmallProjectMember } from "@/app/lib/api/getSmallProjectMember";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { insertsOf, opsOf, resetSupabaseMock, setResponses, storageCalls } from "../helpers/mockSupabase";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const addItem = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));
jest.mock("@/app/provider/flashDisplayProvider", () => ({
  useFlashDisplayContext: () => ({ addItem }),
}));
jest.mock("@/app/lib/api/getProjectData", () => ({ getProjectData: jest.fn() }));
jest.mock("@/app/lib/api/getSmallProjectData", () => ({ getSmallProjectData: jest.fn() }));
jest.mock("@/app/lib/api/getSmallProjectMember", () => ({ getSmallProjectMember: jest.fn() }));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: jest.fn(async () => undefined),
}));

const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  (getProjectData as jest.Mock).mockResolvedValue([{ id: 1, project_name: "検索画面" }]);
  (getSmallProjectData as jest.Mock).mockResolvedValue([
    { id: 11, project_id: 1, small_project_name: "一覧", details: "" },
  ]);
  (getSmallProjectMember as jest.Mock).mockResolvedValue([
    { smallProjectId: 11, membersDataArray: [{ id: 5, name: "星" }] },
  ]);
  setResponses(
    "small_projects",
    ok([{ id: 11, project_id: 1, small_project_name: "一覧", details: "", small_project_users: [{ user_id: 5 }] }])
  );
  setResponses(
    "task_genre",
    ok([{ id: 7, task_genre_name: "設計", start_date: "2024-04-01", deadline_date: "2024-04-05" }])
  );
  setResponses("tasks", ok([{ id: 99 }]));
});

const onClose = jest.fn();

const renderPopup = async (taskGenreId: number | null = null) => {
  await act(async () => {
    render(
      <TaskPopup
        workspaceId={3}
        onClose={onClose}
        userId={5}
        taskId={null}
        taskGenreId={taskGenreId}
        projectId={1}
        smallProjectId={11}
      />
    );
  });
  // ジャンルの欄は、一覧を読み終えるまで選べない状態で描かれる。読み終えるまで待つ
  await waitFor(() => expect(screen.getByRole("combobox", { name: /ジャンル/ })).toBeEnabled());
};

// Radix の選ぶ欄は、キーボードの Enter で開く。
// act の中で呼ぶと、開いた状態が描かれる前に選択肢を探してしまうので、act で包まずに呼ぶ
const choose = (fieldName: RegExp, optionName: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: fieldName }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: optionName }));
};

describe("TaskPopup（作成）", () => {
  it("見出しと、決まっているプロジェクト・小プロジェクトが出る", async () => {
    await renderPopup();

    expect(screen.getByRole("dialog", { name: "タスクを追加" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^プロジェクト/ })).toHaveTextContent("検索画面");
    expect(screen.getByRole("combobox", { name: /^小プロジェクト/ })).toHaveTextContent("一覧");
  });

  it("ジャンルを選ぶと、そのジャンルの日数が入る", async () => {
    await renderPopup();

    choose(/ジャンル/, "設計");

    expect(screen.getByRole("spinbutton", { name: /日数/ })).toHaveValue(5);
  });

  it("カレンダーからジャンルを決めて開くと、そのジャンルと期間・日数が入っている", async () => {
    const genre = { id: 7, task_genre_name: "設計", start_date: "2024-04-01", deadline_date: "2024-04-05" };
    // 1回目はジャンル1件の読み込み（.single()）、2回目以降は小プロジェクトのジャンルの一覧
    setResponses("task_genre", ok(genre), ok([genre]));

    await renderPopup(7);

    expect(screen.getByRole("combobox", { name: /ジャンル/ })).toHaveTextContent("設計");
    expect(screen.getByRole("textbox", { name: /期間/ })).toHaveValue("2024/04/01 - 2024/04/05");
    expect(screen.getByRole("spinbutton", { name: /日数/ })).toHaveValue(5);
  });

  it("「追加する」で、入れた値と添付でタスクを作り、通知を送って閉じる", async () => {
    await renderPopup();

    fireEvent.change(screen.getByRole("textbox", { name: /タスク名/ }), { target: { value: "API の設計" } });
    choose(/担当者/, "星");
    choose(/ジャンル/, "設計");
    // 見えない入力欄に、ファイルを選んだときと同じ change を送る
    const file = new File(["x"], "仕様.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole("button", { name: "「仕様.pdf」を外す" })).toBeInTheDocument();

    // 送信のボタンは form の外にあり、form 属性で form を指している
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(insertsOf("tasks")[0]).toMatchObject({
      task_name: "API の設計",
      small_project_id: 11,
      assigned_user_id: 5,
      task_genre_id: 7,
      number_of_days: 5,
    });
    expect(storageCalls).toEqual([
      expect.objectContaining({ bucket: "task_attachments", op: "upload" }),
    ]);
    expect(insertsOf("task_attachments")[0]).toEqual([
      expect.objectContaining({ task_id: 99, file_name: "仕様.pdf" }),
    ]);
    expect(postMailNotifications).toHaveBeenCalledWith(3, 5, 99, null, null, null, 0, []);
    expect(setNotificationValue).toHaveBeenCalledWith({ message: "タスクを追加しました。", color: 0 });
    expect(addItem).toHaveBeenCalledWith({ target: 1, id: 99 });
  });

  // 入力がそろった状態で押す。送信のボタンを兼ねていたら、ここで tasks に送ってしまう
  it("「キャンセル」は、入力がそろっていても送らずに閉じる", async () => {
    await renderPopup();
    fireEvent.change(screen.getByRole("textbox", { name: /タスク名/ }), { target: { value: "途中" } });
    choose(/担当者/, "星");
    choose(/ジャンル/, "設計");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(opsOf("tasks").some(([op]) => op === "insert")).toBe(false);
  });

  it("Escape で、送らずに閉じる", async () => {
    await renderPopup();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
    expect(opsOf("tasks").some(([op]) => op === "insert")).toBe(false);
  });

  it("カレンダーを開いているときの Escape は、カレンダーを閉じるだけでポップアップは残す", async () => {
    await renderPopup();
    const period = screen.getByRole("textbox", { name: /期間/ });
    fireEvent.click(period);

    fireEvent.keyDown(period, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "日付を選ぶ" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("選んでいる値も、選択肢に出る", async () => {
    await renderPopup();

    fireEvent.keyDown(screen.getByRole("combobox", { name: /^小プロジェクト/ }), { key: "Enter" });

    expect(screen.getByRole("option", { name: "一覧", selected: true })).toBeInTheDocument();
  });
});
