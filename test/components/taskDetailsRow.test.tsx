// プロジェクト画面の一覧（taskList）の、タスクの行と詳細の行。
// 詳細の中の部品（ジャンル・実績・添付）は、タスク画面の表（TaskTable）と共有している。
// 部品の中の作り（state・DOM の細かい構造）ではなく、画面に出る文字と、DB に送る値で確かめる。
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

const renderTaskList = () =>
  render(
    <TaskList
      userId={5}
      projectId={1}
      smallProjectIdList={[1]}
      displaySmallProjectId={1}
      taskData={[{ smallProjectId: 1, taskDataArray: [task] }]}
      taskGenreData={[{ smallProjectId: 1, taskGenreDataArray: [{ taskId: 1, taskGenre: genre }] }]}
      smallProjectTaskGenreData={smallProjectTaskGenreData}
      statusData={statuses}
      taskAttachedFileData={[{ smallProjectId: 1, fileDataList: attachedFiles() }]}
      filterMyTasks={false}
    />
  );

const closest = (el: HTMLElement, selector: string, what: string) => {
  const found = el.closest(selector);
  if (!found) throw new Error(`${what} が見つからない`);
  return found as HTMLElement;
};

// タスクの行は、詳細を開け閉めする矢印のある行（この画面はまだ作り直していない）
const arrow = () => screen.getByText(/^arrow_(right|drop_down)/);
const taskRow = () => closest(arrow(), "tr", "タスクの行");
const detailsRow = () => closest(screen.getByText("Task Genre"), "tr", "詳細の行");

// ジャンルの表で、見出しが label の行の値
const valueOf = (container: HTMLElement, label: string) =>
  within(container).getByRole("rowheader", { name: label }).nextElementSibling?.textContent;

const renderAndOpen = async () => {
  renderTaskList();
  await waitFor(() => expect(within(detailsRow()).getByText("人日")).toBeInTheDocument());
  fireEvent.click(arrow());
  return detailsRow();
};

describe("taskList のタスクの行と詳細の行", () => {
  it("タスクの行に、名前・締切・担当者が出て、期限切れの締切に印が付く", async () => {
    renderTaskList();
    await waitFor(() => expect(within(taskRow()).getByText("画面")).toBeInTheDocument());
    const row = taskRow();
    expect(within(row).getByText("星")).toBeInTheDocument();
    // 期限切れは色だけで示しているので、ここだけ CSS のクラスで確かめる
    expect(closest(within(row).getByText("2024/04/03"), "td", "締切のセル")).toHaveClass("pass-deadline");
  });

  it("詳細の行に、ジャンルの期間・日数・人数・人日が出る", async () => {
    const details = await renderAndOpen();
    expect(within(details).getByText("設計")).toBeInTheDocument();
    expect(valueOf(details, "期間")).toBe("2024/04/01 〜 2024/04/05");
    expect(valueOf(details, "日数")).toBe("5.0");
    expect(valueOf(details, "人数")).toBe("2");
    expect(valueOf(details, "人日")).toBe("10.0");
  });

  it("実績は人ごとに出て、自分の実績にだけ取り消すボタンが付き、合計が見積もり以下なら緑", async () => {
    const details = await renderAndOpen();
    expect(within(details).getByText("API")).toBeInTheDocument();
    expect(within(details).getByText("3.0 日")).toBeInTheDocument();
    expect(within(details).getAllByRole("button", { name: /の実績を取り消す$/ })).toHaveLength(2);
    // 見積もりとの比較は色だけで示しているので、ここだけ CSS のクラスで確かめる
    expect(within(details).getByText("6.0")).toHaveClass("text-status-done");
  });

  it("自分の実績の取り消すボタンを押すと、そのタスクの実績を空にする", async () => {
    const details = await renderAndOpen();
    fireEvent.click(within(details).getByRole("button", { name: "「画面」の実績を取り消す" }));
    await waitFor(() =>
      expect(opsOf("tasks")).toContainEqual([
        "update",
        [{ result_start_date: null, result_deadline_date: null, number_of_result_days: null }],
      ])
    );
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });

  it("添付ファイルは、ファイル名でダウンロードできるリンクになる", async () => {
    const details = await renderAndOpen();
    const link = await within(details).findByRole("link", { name: "spec.pdf" });
    expect(link).toHaveAttribute("download", "spec.pdf");
    expect(link).toHaveAttribute("href", "blob:spec");
  });

  it("ステータスの選択肢は今のもの以外の2つで、選ぶとそのタスクの status_id を変える", async () => {
    renderTaskList();
    await waitFor(() => expect(within(taskRow()).getByRole("combobox")).toBeInTheDocument());
    fireEvent.keyDown(within(taskRow()).getByRole("combobox"), { key: "ArrowDown" });
    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(screen.getAllByText("Processing")).toHaveLength(1);
    fireEvent.click(screen.getByText("Completed"));
    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });
});
