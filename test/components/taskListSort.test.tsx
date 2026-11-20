// プロジェクト画面の一覧（taskList）の、見出しを押したときの並べ替え。
// 並びは行の名前（開閉のボタン）で、並べ替えの状態は見出しの aria-sort で確かめる。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskList from "@/app/project/taskList/taskList";
import { genre, statuses, task } from "./taskFixtures";

let pageUpdated = false;

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
  usePageUpdateContext: () => ({ pageUpdated, setPageUpdated: jest.fn() }),
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

beforeEach(() => {
  pageUpdated = false;
});

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

const props = () => ({
  userId: 5,
  projectId: 1,
  smallProjectIdList: [1],
  displaySmallProjectId: 1,
  taskData: [{ smallProjectId: 1, taskDataArray: tasks }],
  taskGenreData: [
    { smallProjectId: 1, taskGenreDataArray: tasks.map((t) => ({ taskId: t.id, taskGenre: genre })) },
  ],
  smallProjectTaskGenreData: [
    { smallProjectId: 1, taskGenreDataArray: [genreRow(7, "設計"), genreRow(8, "実装")] },
  ],
  statusData: statuses,
  taskAttachedFileData: [{ smallProjectId: 1, fileDataList: [] }],
  filterMyTasks: false,
});

// ジャンルごとの表（見出しがジャンルの名前の区画）
const genreRegion = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) });

// 表に出ているタスクの名前を、上から順に（行の開閉のボタンの名前）
const taskNames = (name = "設計") =>
  within(genreRegion(name))
    .getAllByRole("button", { name: /^[A-E]$/ })
    .map((el) => el.textContent);

const clickHeader = (label: string, name = "設計") =>
  fireEvent.click(within(genreRegion(name)).getByRole("button", { name: label }));

const sortOf = (label: string, name = "設計") =>
  within(genreRegion(name)).getByRole("columnheader", { name: label }).getAttribute("aria-sort");

describe("taskList の並べ替え", () => {
  it("同じ見出しを押すたびに、昇順 → 降順 → 渡した順 に戻る", async () => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toEqual(["B", "C", "A"]));
    expect(sortOf("タスク名")).toBe("none");

    clickHeader("タスク名");
    expect(taskNames()).toEqual(["A", "B", "C"]);
    expect(sortOf("タスク名")).toBe("ascending");

    clickHeader("タスク名");
    expect(taskNames()).toEqual(["C", "B", "A"]);
    expect(sortOf("タスク名")).toBe("descending");

    clickHeader("タスク名");
    expect(taskNames()).toEqual(["B", "C", "A"]);
    expect(sortOf("タスク名")).toBe("none");
  });

  it.each([
    ["ステータス", ["A", "B", "C"]],
    ["開始", ["C", "A", "B"]],
    ["締切", ["C", "A", "B"]],
    ["日数", ["B", "A", "C"]],
  ])("見出し「%s」を1回押すと昇順になる", async (label, expected) => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    clickHeader(label);
    expect(taskNames()).toEqual(expected);
  });

  it("担当者の見出しは、表示名ではなく assigned_user_id の数値で並べる（今の仕様）", async () => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    clickHeader("担当者");
    expect(taskNames()).toEqual(["C", "B", "A"]);
  });

  it("別の見出しを押すと、前の見出しは並べ替えなしに戻り、次に押したときは昇順から始まる", async () => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toHaveLength(3));

    clickHeader("タスク名");
    clickHeader("締切");
    expect(sortOf("タスク名")).toBe("none");
    expect(sortOf("締切")).toBe("ascending");

    clickHeader("タスク名");
    expect(taskNames()).toEqual(["A", "B", "C"]);
  });

  it("並べ替えはジャンルの表ごとに独立していて、ほかの表の並びと印は変わらない", async () => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames("実装")).toEqual(["E", "D"]));

    clickHeader("タスク名", "設計");
    expect(taskNames("設計")).toEqual(["A", "B", "C"]);
    expect(taskNames("実装")).toEqual(["E", "D"]);
    expect(sortOf("タスク名", "実装")).toBe("none");

    clickHeader("タスク名", "実装");
    expect(taskNames("実装")).toEqual(["D", "E"]);
    expect(sortOf("タスク名", "実装")).toBe("ascending");
    // 先に並べ替えた表は、並びも印もそのまま
    expect(taskNames("設計")).toEqual(["A", "B", "C"]);
    expect(sortOf("タスク名", "設計")).toBe("ascending");
  });

  it("画面を読み直しても、並べた順は残る", async () => {
    const { rerender } = render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    clickHeader("タスク名");
    expect(taskNames()).toEqual(["A", "B", "C"]);

    // 読み直すと、新しい配列が渡ってくる
    pageUpdated = true;
    rerender(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toEqual(["A", "B", "C"]));
    expect(sortOf("タスク名")).toBe("ascending");
  });

  it("並べ替えると、開いていた詳細を閉じる", async () => {
    render(<TaskList {...props()} />);
    await waitFor(() => expect(taskNames()).toHaveLength(3));
    const row = within(genreRegion("設計")).getByRole("button", { name: "A" });
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");

    clickHeader("日数");
    expect(within(genreRegion("設計")).getByRole("button", { name: "A" })).toHaveAttribute("aria-expanded", "false");
  });
});
