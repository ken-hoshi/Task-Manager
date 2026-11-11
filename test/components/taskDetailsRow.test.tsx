// taskList・myTasksArea・notYetCompletedTasksArea の3か所に同じ形で書かれている「タスクの行と詳細の行」を、
// 1つの部品にまとめる前に、今の動きを固定する。3つに同じタスクを渡し、同じ動きになることを確かめる。
// 部品の中の作り（state・DOM の細かい構造）ではなく、画面に出る文字と、DB に送る値で確かめる。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import MyTasksArea from "@/app/task/myTasksArea/myTasksArea";
import NotYetCompletedTasksArea from "@/app/task/tasksNotYetCompletedArea/notYetCompletedTasksArea";
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
jest.mock("@/app/lib/api/getTaskGenreData", () => ({
  getTaskGenreData: jest.fn(async () => [require("./taskFixtures").genre]),
}));
jest.mock("@/app/lib/api/fetchAttachedFiles", () => ({
  fetchAttachedFiles: jest.fn(async () => require("./taskFixtures").attachedFiles()),
}));

beforeEach(() => {
  resetSupabaseMock();
});

const renderers: [string, () => void][] = [
  [
    "taskList",
    () =>
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
      ),
  ],
  ["myTasksArea", () => render(<MyTasksArea myTasks={[task]} userId={5} statuses={statuses} />)],
  [
    "notYetCompletedTasksArea",
    () => render(<NotYetCompletedTasksArea notYetCompletedTasks={[task]} userId={5} statuses={statuses} />),
  ],
];

const closest = (el: HTMLElement, selector: string, what: string) => {
  const found = el.closest(selector);
  if (!found) throw new Error(`${what} が見つからない`);
  return found as HTMLElement;
};

// タスクの行は、詳細を開け閉めする矢印のある行
const arrow = () => screen.getByText(/^arrow_(right|drop_down)/);
const taskRow = () => closest(arrow(), "tr", "タスクの行");
const detailsRow = () => closest(screen.getByText("Task Genre"), "tr", "詳細の行");

// 詳細の行の表（ジャンル表）で、1つ目のセルが label の行の、2つ目のセルの文字
const valueOf = (container: HTMLElement, label: string) => {
  const row = within(container)
    .getAllByRole("row")
    .find((r) => within(r).queryAllByRole("cell")[0]?.textContent === label);
  if (!row) throw new Error(`「${label}」の行が見つからない`);
  return within(row).getAllByRole("cell")[1].textContent;
};

// ジャンルのデータが届き、詳細を開いた状態にする
const renderAndOpen = async (renderComponent: () => void) => {
  renderComponent();
  await waitFor(() => expect(within(detailsRow()).getByText("Persons/Days")).toBeInTheDocument());
  fireEvent.click(arrow());
  return detailsRow();
};

describe.each(renderers)("%s のタスクの行と詳細の行", (_, renderComponent) => {
  it("タスクの行に、名前・締切・担当者が出て、期限切れの締切に印が付く", async () => {
    renderComponent();
    await waitFor(() => expect(within(taskRow()).getByText("画面")).toBeInTheDocument());
    const row = taskRow();
    expect(within(row).getByText("星")).toBeInTheDocument();
    // 期限切れは色だけで示しているので、ここだけ CSS のクラスで確かめる
    expect(closest(within(row).getByText("2024/04/03"), "td", "締切のセル")).toHaveClass("pass-deadline");
  });

  it("矢印を押すと詳細が開き、矢印の向きが変わる", async () => {
    renderComponent();
    await waitFor(() => expect(arrow()).toHaveTextContent("arrow_right"));
    fireEvent.click(arrow());
    expect(arrow()).toHaveTextContent("arrow_drop_down");
  });

  it("詳細の行に、ジャンルの期間・日数・人数・人日が出る", async () => {
    const details = await renderAndOpen(renderComponent);
    expect(within(details).getByText("設計")).toBeInTheDocument();
    expect(valueOf(details, "Period")).toBe("2024/04/01 ~2024/04/05");
    expect(valueOf(details, "Days")).toBe("5.0");
    expect(valueOf(details, "Persons")).toBe("2");
    expect(valueOf(details, "Persons/Days")).toBe("10.0");
  });

  it("実績は人ごとに出て、自分の実績にだけ消すボタンが付き、合計が見積もり以下なら緑", async () => {
    const details = await renderAndOpen(renderComponent);
    expect(within(details).getByText("API")).toBeInTheDocument();
    expect(within(details).getByText("3.0 days")).toBeInTheDocument();
    expect(within(details).getAllByText("cancel")).toHaveLength(2);
    // 見積もりとの比較は色だけで示しているので、ここだけ CSS のクラスで確かめる
    expect(within(details).getByText("6.0")).toHaveClass("value-green");
  });

  it("自分の実績の消すボタンを押すと、そのタスクの実績を空にする", async () => {
    const details = await renderAndOpen(renderComponent);
    fireEvent.click(within(details).getAllByText("cancel")[0]);
    await waitFor(() =>
      expect(opsOf("tasks")).toContainEqual([
        "update",
        [{ result_start_date: null, result_deadline_date: null, number_of_result_days: null }],
      ])
    );
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });

  it("添付ファイルは、ファイル名でダウンロードできるリンクになる", async () => {
    const details = await renderAndOpen(renderComponent);
    await waitFor(() => expect(within(details).getByText("download")).toBeInTheDocument());
    const link = closest(within(details).getByText("download"), "a", "ダウンロードのリンク");
    expect(link).toHaveAttribute("download", "spec.pdf");
    expect(link).toHaveAttribute("href", "blob:spec");
  });

  it("ステータスの選択肢は今のもの以外の2つで、選ぶとそのタスクの status_id を変える", async () => {
    renderComponent();
    await waitFor(() => expect(within(taskRow()).getByRole("combobox")).toBeInTheDocument());
    fireEvent.keyDown(within(taskRow()).getByRole("combobox"), { key: "ArrowDown" });
    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(screen.getAllByText("Processing")).toHaveLength(1);
    fireEvent.click(screen.getByText("Completed"));
    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });
});

// myTasksArea と notYetCompletedTasksArea の詳細の行にだけある項目
describe.each(renderers.slice(1))("%s の詳細の行にだけある項目", (_, renderComponent) => {
  it("プロジェクト名・小プロジェクト名と、タスクの期間が出る", async () => {
    const details = await renderAndOpen(renderComponent);
    expect(within(details).getByText("Project Name")).toBeInTheDocument();
    expect(within(details).getByText("P")).toBeInTheDocument();
    expect(within(details).getByText("SP")).toBeInTheDocument();
    expect(within(details).getByText("2024/04/01")).toBeInTheDocument();
    expect(within(details).getByText("2024/04/03")).toBeInTheDocument();
  });
});
