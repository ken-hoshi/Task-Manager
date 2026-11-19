// プロジェクトの作成・編集のポップアップ（ProjectPopup）。画面に出る文字・欄の名前と、DB に送る値で確かめる
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProjectPopup from "@/app/component/projectPopup/projectPopup";
import { getUsers } from "@/app/lib/api/getUser";
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
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 3 }),
}));
jest.mock("@/app/lib/api/getUser", () => ({ getUsers: jest.fn() }));
jest.mock("@/app/lib/api/fetchAttachedFiles", () => ({ fetchAttachedFiles: jest.fn(async () => []) }));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: jest.fn(async () => undefined),
}));

const ok = (data: unknown) => ({ data, error: null });
const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  (getUsers as jest.Mock).mockResolvedValue([
    { id: 5, name: "星" },
    { id: 6, name: "田中" },
  ]);
  setResponses("workspace_task_genre", ok([{ id: 1, task_genre_name: "設計", sort_id: 1 }]));
});

const renderPopup = async (projectId: number | null = null) => {
  await act(async () => {
    render(<ProjectPopup onClose={onClose} projectId={projectId} userId={5} />);
  });
  await screen.findByRole("textbox", { name: /^プロジェクト名/ });
};

// メンバーの欄は react-select。下の矢印のキーで候補を開いて選ぶ
const chooseMember = (name: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: /メンバー/ }), { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name }));
};

// 期間の欄を開き、カレンダーの日を2つ（開始日と終了日）押す。
// jsdom ではこのあとカレンダーが開き直ることがあるので、Escape を確かめるテストでは使わない
const choosePeriod = (fieldName: RegExp) => {
  fireEvent.click(screen.getByRole("textbox", { name: fieldName }));
  const days = within(screen.getByRole("dialog", { name: "日付を選ぶ" })).getAllByRole("option");
  fireEvent.click(days[10]);
  fireEvent.click(days[11]);
};

// 名前・メンバー・ジャンルの期間を、送れる状態までそろえる
const fillRequired = () => {
  fireEvent.change(screen.getByRole("textbox", { name: /^プロジェクト名/ }), { target: { value: "検索画面" } });
  fireEvent.change(screen.getByRole("textbox", { name: /^小プロジェクト名/ }), { target: { value: "一覧" } });
  chooseMember("星");
  choosePeriod(/ジャンル 1の期間/);
};

describe("ProjectPopup（作成）", () => {
  it("見出しが出て、ワークスペースのジャンルが最初から並ぶ", async () => {
    await renderPopup();

    expect(screen.getByRole("dialog", { name: "プロジェクトを追加" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /ジャンル 1の名前/ })).toHaveValue("設計");
    expect(screen.getByRole("button", { name: "小プロジェクト 1", current: true })).toBeInTheDocument();
  });

  it("「追加する」で、入れた値でプロジェクト・小プロジェクト・メンバー・ジャンルを作って閉じる", async () => {
    setResponses("projects", ok([{ id: 40 }]));
    setResponses("small_projects", ok([{ id: 41, small_project_name: "一覧" }]));
    await renderPopup();
    fillRequired();
    // 見えない入力欄に、ファイルを選んだときと同じ change を送る
    const file = new File(["x"], "仕様.pdf", { type: "application/pdf" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole("button", { name: "「仕様.pdf」を外す" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(insertsOf("projects")[0]).toEqual({ project_name: "検索画面", workspace_id: 3 });
    expect(insertsOf("small_projects")[0]).toEqual([
      { small_project_name: "一覧", details: "", project_id: 40 },
    ]);
    expect(insertsOf("small_project_users")[0]).toEqual([{ small_project_id: 41, user_id: 5 }]);
    expect(insertsOf("task_genre")[0]).toEqual([
      {
        task_genre_name: "設計",
        small_project_id: 41,
        start_date: expect.any(Date),
        deadline_date: expect.any(Date),
      },
    ]);
    // 押した2日（続きの日）が、どちらも 9:00 に合わせて入る
    const [{ start_date, deadline_date }] = insertsOf("task_genre")[0] as { start_date: Date; deadline_date: Date }[];
    expect(start_date.getHours()).toBe(9);
    expect(deadline_date.getTime() - start_date.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(storageCalls).toEqual([expect.objectContaining({ bucket: "small_project_attachments", op: "upload" })]);
    expect(insertsOf("small_project_attachments")[0]).toEqual([
      expect.objectContaining({ small_project_id: 41, file_name: "仕様.pdf" }),
    ]);
    expect(setNotificationValue).toHaveBeenCalledWith({ message: "プロジェクトを追加しました。", color: 0 });
    expect(addItem).toHaveBeenCalledWith({ target: 0, id: 40 });
  });

  it("小プロジェクトを足すと空の欄に切り替わり、外すと前の小プロジェクトに戻る", async () => {
    await renderPopup();
    fireEvent.change(screen.getByRole("textbox", { name: /^小プロジェクト名/ }), { target: { value: "一覧" } });

    fireEvent.click(screen.getByRole("button", { name: "小プロジェクトを足す" }));

    expect(screen.getByRole("button", { name: "小プロジェクト 2", current: true })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^小プロジェクト名/ })).toHaveValue("");
    // 足した小プロジェクトにも、ワークスペースのジャンルが並ぶ
    expect(screen.getByRole("textbox", { name: /ジャンル 1の名前/ })).toHaveValue("設計");

    fireEvent.click(screen.getByRole("button", { name: "「小プロジェクト 2」を外す" }));

    expect(screen.getByRole("button", { name: "一覧", current: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /小プロジェクト 2/ })).not.toBeInTheDocument();
  });

  it("ジャンルを足す・外すができる", async () => {
    await renderPopup();

    fireEvent.click(screen.getByRole("button", { name: "ジャンルを足す" }));
    expect(screen.getByRole("textbox", { name: /ジャンル 2の名前/ })).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "「設計」を外す" }));
    fireEvent.click(screen.getByRole("button", { name: "「ジャンル 1」を外す" }));
    expect(screen.getByText("ジャンルはありません")).toBeInTheDocument();
  });

  it("メンバーの欄は、文字を打って Enter で選べる", async () => {
    await renderPopup();
    const members = screen.getByRole("combobox", { name: /メンバー/ });

    fireEvent.change(members, { target: { value: "田" } });
    fireEvent.keyDown(members, { key: "Enter" });

    expect(screen.getByRole("button", { name: "「田中」を外す" })).toBeInTheDocument();
  });

  // 入力がそろった状態で押す。送信のボタンを兼ねていたら、ここで projects に送ってしまう
  it("「キャンセル」は、入力がそろっていても送らずに閉じる", async () => {
    await renderPopup();
    fillRequired();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(opsOf("projects").some(([op]) => op === "insert")).toBe(false);
  });

  it("メンバーを選ばずに「追加する」を押しても送らない", async () => {
    await renderPopup();
    fireEvent.change(screen.getByRole("textbox", { name: /^プロジェクト名/ }), { target: { value: "検索画面" } });
    choosePeriod(/ジャンル 1の期間/);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    });

    expect(opsOf("projects").some(([op]) => op === "insert")).toBe(false);
  });

  // fireEvent はブラウザの「入力欄で Enter を押すと送信する」動きを再現しないので、Enter を止めたかで確かめる
  it("入力欄と、候補を開いていないメンバーの欄では、Enter で送信しない", async () => {
    await renderPopup();

    for (const field of [
      screen.getByRole("textbox", { name: /^プロジェクト名/ }),
      screen.getByRole("combobox", { name: /メンバー/ }),
    ]) {
      const enter = createEvent.keyDown(field, { key: "Enter" });
      fireEvent(field, enter);
      expect(enter.defaultPrevented).toBe(true);
    }
  });

  it("候補の一覧やカレンダーを開いているときの Escape は、それを閉じるだけでポップアップは残す", async () => {
    await renderPopup();
    const members = screen.getByRole("combobox", { name: /メンバー/ });
    fireEvent.keyDown(members, { key: "ArrowDown" });

    fireEvent.keyDown(members, { key: "Escape" });

    expect(members).toHaveAttribute("aria-expanded", "false");
    const period = screen.getByRole("textbox", { name: /ジャンル 1の期間/ });
    fireEvent.click(period);
    fireEvent.keyDown(period, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "日付を選ぶ" })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("保存している間は、Escape でも閉じない", async () => {
    // 返事が来ない insert にして、保存中のままにする。ジャンルの無いワークスペースにして、カレンダーを開かずに送る
    setResponses("projects", new Promise(() => {}) as unknown as { data: unknown; error: unknown });
    setResponses("workspace_task_genre", ok([]));
    await renderPopup();
    fireEvent.change(screen.getByRole("textbox", { name: /^プロジェクト名/ }), { target: { value: "検索画面" } });
    chooseMember("星");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "追加する" }));
    });
    expect(screen.getByRole("button", { name: "追加する" })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "プロジェクトを追加" }), { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape で、送らずに閉じる", async () => {
    await renderPopup();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
    expect(opsOf("projects").some(([op]) => op === "insert")).toBe(false);
  });
});

describe("ProjectPopup（編集）", () => {
  it("今の名前・メンバー・ジャンル・詳細が入っている", async () => {
    setResponses("workspace_task_genre", ok([]));
    setResponses(
      "projects",
      ok({
        id: 4,
        project_name: "検索画面",
        small_projects: [
          {
            id: 11,
            small_project_name: "一覧",
            details: "メモ",
            created_at: "2024-04-01",
            small_project_users: [{ user_id: 5, users: { name: "星" } }],
          },
        ],
      })
    );
    setResponses(
      "task_genre",
      ok([
        { id: 7, task_genre_name: "設計", start_date: "2024-04-01", deadline_date: "2024-04-05", small_project_id: 11 },
      ])
    );

    await renderPopup(4);

    expect(screen.getByRole("dialog", { name: "プロジェクトを編集" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^プロジェクト名/ })).toHaveValue("検索画面");
    expect(screen.getByRole("button", { name: "一覧", current: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「星」を外す" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /ジャンル 1の名前/ })).toHaveValue("設計");
    expect(screen.getByRole("textbox", { name: /ジャンル 1の期間/ })).toHaveValue("2024/04/01 - 2024/04/05");
    expect(screen.getByRole("textbox", { name: /^詳細/ })).toHaveValue("メモ");
    expect(screen.getByRole("button", { name: "更新する" })).toBeInTheDocument();
  });
});
