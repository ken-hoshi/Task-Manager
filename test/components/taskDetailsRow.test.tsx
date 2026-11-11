// taskList・myTasksArea・notYetCompletedTasksArea の3か所に同じ形で書かれている「タスクの行と詳細の行」を、
// 1つの部品にまとめる前に、今の表示を固定する。3つに同じタスクを渡し、同じ表示になることを確かめる。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import MyTasksArea from "@/app/task/myTasksArea/myTasksArea";
import NotYetCompletedTasksArea from "@/app/task/tasksNotYetCompletedArea/notYetCompletedTasksArea";
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
// Supabase を呼ぶ子の部品は、表示の確認に関係しないので空にする
jest.mock("@/app/component/comment/comment", () => () => null);
jest.mock("@/app/component/editButton/editButton", () => () => null);
jest.mock("@/app/component/deleteButton/deleteButton", () => () => null);
jest.mock("@/app/component/addButton/addButton", () => () => null);
jest.mock("@/app/lib/api/getTaskGenreData", () => ({
  getTaskGenreData: jest.fn(async () => [require("./taskFixtures").genre]),
}));
jest.mock("@/app/lib/api/fetchAttachedFiles", () => ({
  fetchAttachedFiles: jest.fn(async () => [{ id: 1, fileDataArray: [] }]),
}));

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
          smallProjectTaskGenreData={[
            {
              smallProjectId: 1,
              taskGenreDataArray: [
                {
                  taskGenreId: 7,
                  taskGenreName: "設計",
                  numberOfPersons: 2,
                  startDate: "2024-04-01",
                  deadlineDate: "2024-04-05",
                  numberOfDays: 5,
                },
              ],
            },
          ]}
          statusData={statuses}
          taskAttachedFileData={[{ smallProjectId: 1, fileDataList: [] }]}
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

// 詳細の行は、閉じていても DOM にあり、CSS のクラスで隠している
const detailsRow = () => screen.getByText("Task Genre").closest("tr") as HTMLElement;

// ジャンル表の行（td が2つ）の、2つ目の td の文字。同じ文字の見出し（dt など）は除く
const valueOf = (container: HTMLElement, label: string) =>
  within(container)
    .getAllByText(label)
    .find((el) => el.tagName === "TD")!
    .closest("tr")!
    .querySelectorAll("td")[1].textContent;

describe.each(renderers)("%s のタスクの行と詳細の行", (_, renderComponent) => {
  it("タスクの行に、名前・締切・担当者が出て、期限切れの締切に印が付く", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText("Task Genre")).toBeInTheDocument());
    expect(screen.getAllByText("画面").length).toBeGreaterThan(0);
    const deadlineCells = screen.getAllByText("2024/04/03").map((el) => el.closest("td"));
    expect(deadlineCells.some((td) => td?.classList.contains("pass-deadline"))).toBe(true);
    expect(screen.getAllByText("星").length).toBeGreaterThan(0);
  });

  it("詳細の行に、ジャンルの期間・日数・人数・人日が出る", async () => {
    renderComponent();
    await waitFor(() => expect(within(detailsRow()).getByText("Persons/Days")).toBeInTheDocument());
    const details = detailsRow();
    expect(valueOf(details, "Period")).toBe("2024/04/01 ~2024/04/05");
    expect(valueOf(details, "Days")).toBe("5.0");
    expect(valueOf(details, "Persons")).toBe("2");
    expect(valueOf(details, "Persons/Days")).toBe("10.0");
  });

  it("実績は人ごとに出て、自分の実績にだけ消すボタンが付き、合計が見積もり以下なら緑", async () => {
    renderComponent();
    await waitFor(() => expect(within(detailsRow()).getByText("Persons/Days")).toBeInTheDocument());
    const details = detailsRow();
    expect(within(details).getByText("API")).toBeInTheDocument();
    expect(within(details).getByText("3.0 days")).toBeInTheDocument();
    expect(within(details).getAllByText("cancel")).toHaveLength(2);
    expect(within(details).getByText("6.0")).toHaveClass("value-green");
  });

  it("ステータスの選択肢は、今のステータスを除いた2つ", async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText("Task Genre")).toBeInTheDocument());
    fireEvent.keyDown(screen.getAllByRole("combobox")[0], { key: "ArrowDown" });
    expect(await screen.findByText("Not Started")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByText("Processing")).toHaveLength(1);
  });
});
