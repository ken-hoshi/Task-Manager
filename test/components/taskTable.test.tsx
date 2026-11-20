// タスク画面の「自分のタスク」「チームの未完了のタスク」の表（TaskTable）。
// 画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskTable from "@/app/task/taskTable/taskTable";
import { postMailNotifications } from "@/app/lib/postMailNotifications";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";
import { statuses, task } from "./taskFixtures";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 1 }),
}));
jest.mock("@/app/provider/flashDisplayProvider", () => ({
  useFlashDisplayContext: () => ({ newItem: { id: 0, target: 0 } }),
}));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: jest.fn(async () => undefined),
}));
// Supabase を呼ぶ子の部品・ポップアップは、表の確認に関係しないので空にする
jest.mock("@/app/component/comment/comment", () => () => null);
jest.mock("@/app/component/taskPopup/taskPopup", () => () => null);
jest.mock("@/app/component/projectPopup/projectPopup", () => () => null);
jest.mock("@/app/lib/api/getTaskGenreData", () => ({
  getTaskGenreData: jest.fn(async () => [require("./taskFixtures").genre]),
}));
jest.mock("@/app/lib/api/fetchAttachedFiles", () => ({
  fetchAttachedFiles: jest.fn(async () => require("./taskFixtures").attachedFiles()),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
});

const renderTable = async (
  variant: "mine" | "team",
  tasks: any[] = [task]
) => {
  await act(async () => {
    render(
      <TaskTable
        variant={variant}
        title={variant === "mine" ? "自分のタスク" : "チームの未完了のタスク"}
        description="説明"
        tasks={tasks}
        userId={5}
        statuses={statuses}
      />
    );
  });
};

const rowOf = (taskName: string) => {
  const row = screen.getByRole("button", { name: taskName }).closest("tr");
  if (!row) throw new Error(`「${taskName}」の行が見つからない`);
  return row as HTMLElement;
};

const taskNames = () =>
  screen
    .getAllByRole("button", { expanded: false })
    .filter((button) => button.hasAttribute("aria-controls"))
    .map((button) => button.textContent);

describe.each(["mine", "team"] as const)("TaskTable（%s）", (variant) => {
  it("行に、名前・日本語のステータス・締切・担当者が出て、期限切れの締切を読み上げでも伝える", async () => {
    await renderTable(variant);

    const row = rowOf("画面");
    expect(within(row).getByRole("button", { name: "「画面」のステータス: 進行中（変更する）" })).toBeInTheDocument();
    expect(within(row).getByText("星")).toBeInTheDocument();
    expect(within(row).getByText("2024/04/03")).toBeInTheDocument();
    expect(within(row).getByText("（期限切れ）")).toBeInTheDocument();
  });

  it("タスク名のボタンで詳細を開け閉めし、開いた詳細にプロジェクト・期間・ジャンル・実績・添付が出る", async () => {
    await renderTable(variant);
    const toggle = screen.getByRole("button", { name: "画面" });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const details = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(within(details).getByText("P")).toBeInTheDocument();
    expect(within(details).getByText("SP")).toBeInTheDocument();
    expect(within(details).getByText("設計")).toBeInTheDocument();
    expect(within(details).getByText("3.0 日")).toBeInTheDocument();
    expect(await within(details).findByRole("link", { name: "spec.pdf" })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeNull();
  });

  it("ステータスを選ぶと、そのタスクの status_id を変えて画面に読み直しを求める", async () => {
    await renderTable(variant);

    fireEvent.keyDown(screen.getByRole("button", { name: "「画面」のステータス: 進行中（変更する）" }), {
      key: "Enter",
    });
    expect(screen.getByRole("menuitemradio", { name: "進行中" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "完了" }));

    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));
  });

  it("終わった小プロジェクトのタスクは出さず、0件なら空の表示を出す", async () => {
    await renderTable(variant, [
      { ...task, small_projects: { ...task.small_projects, isFinished: true } },
    ]);

    expect(screen.getByText("タスクはありません")).toBeInTheDocument();
  });
});

describe("TaskTable の違い", () => {
  // 送る相手は postMailNotifications の側で決まる（変えた人が担当者なら送らない）。表ごとに呼ぶ・呼ばないを分けない
  it.each(["mine", "team"] as const)("%s の表でステータスを変えると、通知の処理を呼ぶ", async (variant) => {
    await renderTable(variant);
    fireEvent.keyDown(screen.getByRole("button", { name: /のステータス: / }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "完了" }));
    await waitFor(() => expect(postMailNotifications).toHaveBeenCalledWith(1, 5, 1, null, null, null, 1, []));
  });

  it("詳細を2つ開いても、実績の入力欄はそれぞれの値を持つ", async () => {
    await renderTable("mine", [task, { ...task, id: 2, task_name: "API" }]);
    fireEvent.click(screen.getByRole("button", { name: "画面" }));
    fireEvent.click(screen.getByRole("button", { name: "API" }));

    const [first, second] = screen.getAllByRole("form", { name: "実績を記録" });
    fireEvent.change(within(first).getByRole("spinbutton", { name: "日数" }), { target: { value: "1.5" } });

    expect(within(first).getByRole("spinbutton", { name: "日数" })).toHaveValue(1.5);
    expect(within(second).getByRole("spinbutton", { name: "日数" })).toHaveValue(null);
  });

  it("自分の表だけに、絞り込み・追加・編集・削除のボタンがある", async () => {
    await renderTable("team");
    expect(screen.queryByRole("button", { name: "未完了だけ表示" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "「画面」を編集" })).not.toBeInTheDocument();
  });

  it("自分の表には、絞り込み・追加・編集・削除のボタンがある", async () => {
    await renderTable("mine");
    expect(screen.getByRole("button", { name: "未完了だけ表示" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "タスクを追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「画面」を編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「画面」を削除" })).toBeInTheDocument();
  });
});

describe("自分のタスクの並べ替えと絞り込み", () => {
  const tasks = [
    { ...task, id: 1, task_name: "B", status_id: 2, task_status: { status: "Processing" }, deadline_date: "2024-04-03" },
    { ...task, id: 2, task_name: "A", status_id: 3, task_status: { status: "Completed" }, deadline_date: "2024-04-01" },
    { ...task, id: 3, task_name: "C", status_id: 1, task_status: { status: "Not Started" }, deadline_date: "2024-04-02" },
  ];

  it("見出しを押すたびに 昇順 → 降順 → 元の順 と回り、見出しに並びを示す", async () => {
    await renderTable("mine", tasks);
    const header = screen.getByRole("button", { name: "タスク名" });

    expect(taskNames()).toEqual(["B", "A", "C"]);
    fireEvent.click(header);
    expect(taskNames()).toEqual(["A", "B", "C"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(header);
    expect(taskNames()).toEqual(["C", "B", "A"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "descending");
    fireEvent.click(header);
    expect(taskNames()).toEqual(["B", "A", "C"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "none");
  });

  it("並べ替えてもステータスの表示はそのタスクのもののまま", async () => {
    await renderTable("mine", tasks);

    fireEvent.click(screen.getByRole("button", { name: "締切" }));

    expect(taskNames()).toEqual(["A", "C", "B"]);
    expect(within(rowOf("A")).getByRole("button", { name: /のステータス: 完了/ })).toBeInTheDocument();
    expect(within(rowOf("B")).getByRole("button", { name: /のステータス: 進行中/ })).toBeInTheDocument();
  });

  it("「未完了だけ表示」で完了のタスクを隠し、もう一度押すと戻して画面に読み直しを求める", async () => {
    await renderTable("mine", tasks);
    const filter = screen.getByRole("button", { name: "未完了だけ表示" });

    fireEvent.click(filter);
    expect(filter).toHaveAttribute("aria-pressed", "true");
    expect(taskNames()).toEqual(["B", "C"]);
    expect(setPageUpdated).not.toHaveBeenCalled();

    fireEvent.click(filter);
    expect(taskNames()).toEqual(["B", "A", "C"]);
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("別の列を押すと、その列の昇順から始まる", async () => {
    await renderTable("mine", tasks);
    const name = screen.getByRole("button", { name: "タスク名" });
    const deadline = screen.getByRole("button", { name: "締切" });

    fireEvent.click(name);
    fireEvent.click(name);
    fireEvent.click(deadline);

    expect(taskNames()).toEqual(["A", "C", "B"]);
    expect(deadline.closest("th")).toHaveAttribute("aria-sort", "ascending");
    expect(name.closest("th")).toHaveAttribute("aria-sort", "none");
  });

  it("開いた詳細は、画面が読み直しても開いたまま。並べ替えると閉じる", async () => {
    const props = {
      variant: "mine" as const,
      title: "自分のタスク",
      description: "説明",
      userId: 5,
      statuses,
    };
    let rerender!: ReturnType<typeof render>["rerender"];
    await act(async () => {
      ({ rerender } = render(<TaskTable {...props} tasks={tasks} />));
    });
    fireEvent.click(screen.getByRole("button", { name: "B" }));

    await act(async () => {
      rerender(<TaskTable {...props} tasks={tasks.map((t) => ({ ...t }))} />);
    });
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "タスク名" }));
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ステータスの変更の分岐", () => {
  it("今のステータスを選び直しても、DB に送らない", async () => {
    await renderTable("mine");

    fireEvent.keyDown(screen.getByRole("button", { name: /のステータス: / }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "進行中" }));

    expect(opsOf("tasks").some(([op]) => op === "update")).toBe(false);
  });

  it("DB の更新に失敗したら日本語の通知を出し、それでも画面に読み直しを求める", async () => {
    setResponses("tasks", { data: null, error: { message: "boom" } });
    await renderTable("mine");

    fireEvent.keyDown(screen.getByRole("button", { name: /のステータス: / }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "完了" }));

    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({
        message: "ステータスを変更できませんでした。",
        color: 1,
      })
    );
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });
});

