// プロジェクト画面の一覧（taskList）の、タスクの行と詳細の行。
// 詳細の中の部品（ジャンル・実績・添付）は、タスク画面の表（TaskTable）と共有している。
// 部品の中の作り（state・DOM の細かい構造）ではなく、画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskList from "@/app/project/taskList/taskList";
import { opsOf, resetSupabaseMock } from "../helpers/mockSupabase";
import { attachedFiles, genre, smallProjectTaskGenreData, statuses, task } from "./taskFixtures";

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue: jest.fn() }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated: jest.fn() }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 1 }),
}));
jest.mock("@/app/provider/flashDisplayProvider", () => ({
  useFlashDisplayContext: () => ({ newItem: { id: 0, target: 0 } }),
}));
// Supabase を呼ぶ子の部品は、表示の確認に関係しないので空にする
jest.mock("@/app/component/comment/comment", () => () => null);
jest.mock("@/app/component/editButton/editButton", () => () => null);
jest.mock("@/app/component/deleteButton/deleteButton", () => () => null);
jest.mock("@/app/component/addButton/addButton", () => () => null);

beforeEach(() => {
  resetSupabaseMock();
});

const renderTaskList = (tasks: any[] = [task]) =>
  render(
    <TaskList
      userId={5}
      projectId={1}
      smallProjectIdList={[1]}
      displaySmallProjectId={1}
      taskData={[{ smallProjectId: 1, taskDataArray: tasks }]}
      taskGenreData={[
        { smallProjectId: 1, taskGenreDataArray: tasks.map((t) => ({ taskId: t.id, taskGenre: genre })) },
      ]}
      smallProjectTaskGenreData={smallProjectTaskGenreData}
      statusData={statuses}
      taskAttachedFileData={[{ smallProjectId: 1, fileDataList: attachedFiles() }]}
      filterMyTasks={false}
    />
  );

// タスクの行（開閉のボタンがある行）
const taskRow = (name = "画面") => {
  const row = screen.getByRole("button", { name }).closest("tr");
  if (!row) throw new Error("タスクの行が見つからない");
  return row as HTMLElement;
};

// ジャンルの欄で、見出し（dt）が label の値（dd）
const valueOf = (container: HTMLElement, label: string) =>
  within(container).getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

// 行の名前を押して詳細を開き、詳細の行を返す
const open = (name = "画面") => {
  const toggle = screen.getByRole("button", { name });
  fireEvent.click(toggle);
  const details = document.getElementById(toggle.getAttribute("aria-controls")!);
  if (!details) throw new Error("詳細の行が見つからない");
  return details;
};

describe("taskList のタスクの行と詳細の行", () => {
  it("タスクの行に、名前・開始・締切・日数・担当者が出て、期限切れの締切を読み上げでも伝える", () => {
    renderTaskList();
    const row = taskRow();
    expect(within(row).getByText("2024/04/01")).toBeInTheDocument();
    expect(within(row).getByText("2024/04/03")).toBeInTheDocument();
    expect(within(row).getByText("3.0")).toBeInTheDocument();
    expect(within(row).getByText("星")).toBeInTheDocument();
    expect(within(row).getByText("（期限切れ）")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^設計/ })).toBeInTheDocument();
  });

  it("詳細は名前を押すと開き、もう一度押すと閉じる", () => {
    renderTaskList();
    const toggle = screen.getByRole("button", { name: "画面" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    open();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("人日")).not.toBeInTheDocument();
  });

  it("詳細に、ジャンルの期間・日数・人数・人日が出て、プロジェクトの欄は出さない", () => {
    renderTaskList();
    const details = open();
    expect(within(details).getByText("設計", { selector: "p" })).toBeInTheDocument();
    expect(valueOf(details, "期間")).toBe("2024/04/01 〜 2024/04/05");
    expect(valueOf(details, "日数")).toBe("5.0");
    expect(valueOf(details, "人数")).toBe("2");
    expect(valueOf(details, "人日")).toBe("10.0");
    expect(within(details).queryByRole("heading", { name: "プロジェクト" })).not.toBeInTheDocument();
  });

  it("実績は人ごとに出て、自分の実績にだけ取り消すボタンが付き、合計が見積もり以下なら緑", () => {
    renderTaskList();
    const details = open();
    expect(within(details).getByText("API")).toBeInTheDocument();
    expect(within(details).getByText("3.0 日")).toBeInTheDocument();
    expect(within(details).getAllByRole("button", { name: /の実績を取り消す$/ })).toHaveLength(2);
    // 見積もりとの比較は色だけで示しているので、ここだけ CSS のクラスで確かめる
    expect(within(details).getByText("6.0")).toHaveClass("text-status-done");
  });

  it("自分の実績の取り消すボタンを押すと、そのタスクの実績を空にする", async () => {
    renderTaskList();
    const details = open();
    fireEvent.click(within(details).getByRole("button", { name: "「画面」の実績を取り消す" }));
    await waitFor(() =>
      expect(opsOf("tasks")).toContainEqual([
        "update",
        [{ result_start_date: null, result_deadline_date: null, number_of_result_days: null }],
      ])
    );
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });

  it("添付ファイルは、ファイル名でダウンロードできるリンクになる", () => {
    renderTaskList();
    const details = open();
    const link = within(details).getByRole("link", { name: "spec.pdf" });
    expect(link).toHaveAttribute("download", "spec.pdf");
    expect(link).toHaveAttribute("href", "blob:spec");
  });

  it("詳細を2つ開いても、実績の入力欄はそれぞれの値を持つ", () => {
    renderTaskList([task, { ...task, id: 2, task_name: "API" }]);
    open("画面");
    open("API");

    const [first, second] = screen.getAllByRole("form", { name: "実績を記録" });
    fireEvent.change(within(first).getByRole("spinbutton", { name: "日数" }), { target: { value: "1.5" } });

    expect(within(first).getByRole("spinbutton", { name: "日数" })).toHaveValue(1.5);
    expect(within(second).getByRole("spinbutton", { name: "日数" })).toHaveValue(null);
  });

  it("ステータスは日本語の名前で出て、選択肢の3つから選ぶとそのタスクの status_id を変える", async () => {
    renderTaskList();
    const trigger = within(taskRow()).getByRole("button", { name: "「画面」のステータス: 進行中（変更する）" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual(["未着手", "進行中", "完了"]);
    expect(screen.getByRole("menuitemradio", { name: "進行中" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "完了" }));
    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });

  it("今のステータスを選び直しても、何も送らない", async () => {
    renderTaskList();
    fireEvent.keyDown(within(taskRow()).getByRole("button", { name: /のステータス: / }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "進行中" }));
    expect(opsOf("tasks")).toEqual([]);
  });
});
