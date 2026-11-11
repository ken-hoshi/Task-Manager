// taskList の見出しを押したときの並べ替えを、部品を分ける前に固定する
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskList from "@/app/project/taskList/taskList";
import { genre, statuses, task } from "./taskFixtures";

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
jest.mock("@/app/component/comment/comment", () => () => null);
jest.mock("@/app/component/editButton/editButton", () => () => null);
jest.mock("@/app/component/deleteButton/deleteButton", () => () => null);
jest.mock("@/app/component/addButton/addButton", () => () => null);

// ジャンル「設計」に B・C・A を、この順で渡す。列ごとに並びが変わるよう値をずらしてある
//   status_id: A 1 / B 2 / C 3、開始日: C → A → B、日数: B 1 / A 2 / C 3、締切: C → A → B
//   担当者の id: C 5 / B 6 / A 7。表示名の順（あ・い・う）は B・A・C で、id の順とは違う
const designTasks = [
  { ...task, id: 11, task_name: "B", status_id: 2, task_status: { status: "Processing" }, start_date: "2024-04-03", number_of_days: 1, deadline_date: "2024-04-20", assigned_user_id: 6, users: { name: "あ" } },
  { ...task, id: 12, task_name: "C", status_id: 3, task_status: { status: "Completed" }, start_date: "2024-04-01", number_of_days: 3, deadline_date: "2024-04-10", assigned_user_id: 5, users: { name: "う" } },
  { ...task, id: 13, task_name: "A", status_id: 1, task_status: { status: "Not Started" }, start_date: "2024-04-02", number_of_days: 2, deadline_date: "2024-04-15", assigned_user_id: 7, users: { name: "い" } },
];
// ジャンル「実装」には E・D を渡す（並べ替えがジャンルごとに独立していることを見るため）
const buildTasks = [
  { ...task, id: 21, task_name: "E", task_genre_id: 8 },
  { ...task, id: 22, task_name: "D", task_genre_id: 8 },
];
const tasks = [...designTasks, ...buildTasks];

const genreRow = (taskGenreId: number, taskGenreName: string) => ({
  taskGenreId,
  taskGenreName,
  numberOfPersons: 2,
  startDate: "2024-04-01",
  deadlineDate: "2024-04-05",
  numberOfDays: 5,
});

const renderTaskList = () =>
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
      smallProjectTaskGenreData={[
        { smallProjectId: 1, taskGenreDataArray: [genreRow(7, "設計"), genreRow(8, "実装")] },
      ]}
      statusData={statuses}
      taskAttachedFileData={[{ smallProjectId: 1, fileDataList: [] }]}
      filterMyTasks={false}
    />
  );

// ジャンルごとの表（見出しに「Task Name」がある表）。0 が「設計」、1 が「実装」
const genreTable = (index: number) => {
  const table = screen.getAllByText("Task Name")[index].closest("table");
  if (!table) throw new Error("ジャンルの表が見つからない");
  return table as HTMLElement;
};

// 表に出ているタスクの名前を、上から順に
const taskNames = (index = 0) =>
  within(genreTable(index))
    .getAllByText(/^[A-E]$/)
    .map((el) => el.textContent);

// 見出しの文字を押す（見出しの中にボタンを置いても、文字を押せば同じように届く）
const clickHeader = (label: string, index = 0) => {
  const header = within(genreTable(index))
    .getAllByText(label)
    .find((el) => el.closest("thead"));
  if (!header) throw new Error(`見出し「${label}」が見つからない`);
  fireEvent.click(header);
};

const headerText = (label: string, index = 0) =>
  within(genreTable(index))
    .getAllByText(label)
    .find((el) => el.closest("thead"))!
    .closest("th")!.textContent;

describe("taskList の並べ替え", () => {
  it("同じ見出しを押すたびに、昇順 → 降順 → 渡した順 に戻る", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toEqual(["B", "C", "A"]));

    clickHeader("Task Name");
    expect(taskNames()).toEqual(["A", "B", "C"]);
    expect(headerText("Task Name")).toContain("keyboard_double_arrow_down");

    clickHeader("Task Name");
    expect(taskNames()).toEqual(["C", "B", "A"]);

    clickHeader("Task Name");
    expect(taskNames()).toEqual(["B", "C", "A"]);
    expect(headerText("Task Name")).toContain("swap_vert");
  });

  it.each([
    ["Status", ["A", "B", "C"]],
    ["Start Date", ["C", "A", "B"]],
    ["Deadline Date", ["C", "A", "B"]],
    ["Days", ["B", "A", "C"]],
  ])("見出し「%s」を1回押すと昇順になる", async (label, expected) => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    clickHeader(label);
    expect(taskNames()).toEqual(expected);
  });

  it("担当者の見出しは、表示名ではなく assigned_user_id の数値で並べる（今の仕様）", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    clickHeader("Assigned");
    expect(taskNames()).toEqual(["C", "B", "A"]);
  });

  it("別の見出しを押すと、前の見出しの回数は 0 に戻り、次に押したときは昇順から始まる", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toHaveLength(3));

    clickHeader("Task Name");
    clickHeader("Deadline Date");
    expect(headerText("Task Name")).toContain("swap_vert");

    clickHeader("Task Name");
    expect(taskNames()).toEqual(["A", "B", "C"]);
  });

  it("並べ替えはジャンルの表ごとに独立している", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames(1)).toEqual(["E", "D"]));

    clickHeader("Task Name", 0);
    expect(taskNames(0)).toEqual(["A", "B", "C"]);
    expect(taskNames(1)).toEqual(["E", "D"]);
    expect(headerText("Task Name", 1)).toContain("swap_vert");

    clickHeader("Task Name", 1);
    expect(taskNames(1)).toEqual(["D", "E"]);
    expect(taskNames(0)).toEqual(["A", "B", "C"]);
  });
});
