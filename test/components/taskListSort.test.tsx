// taskList の見出しを押したときの並べ替えを、部品を分ける前に固定する
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// 渡した順は B・C・A。締切は C が一番早く、B が一番遅い
const tasks = [
  { ...task, id: 11, task_name: "B", deadline_date: "2024-04-20" },
  { ...task, id: 12, task_name: "C", deadline_date: "2024-04-10" },
  { ...task, id: 13, task_name: "A", deadline_date: "2024-04-15" },
];

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
  );

const taskNames = () =>
  Array.from(document.querySelectorAll("p.task-name")).map((p) => p.textContent);

const header = (label: string) => screen.getByText(label).closest("th")!;

describe("taskList の並べ替え", () => {
  it("同じ見出しを押すたびに、昇順 → 降順 → 渡した順 に戻る", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toEqual(["B", "C", "A"]));

    fireEvent.click(header("Task Name"));
    expect(taskNames()).toEqual(["A", "B", "C"]);
    expect(header("Task Name")).toHaveTextContent("keyboard_double_arrow_down");

    fireEvent.click(header("Task Name"));
    expect(taskNames()).toEqual(["C", "B", "A"]);

    fireEvent.click(header("Task Name"));
    expect(taskNames()).toEqual(["B", "C", "A"]);
    expect(header("Task Name")).toHaveTextContent("swap_vert");
  });

  it("締切の見出しは日付の昇順で並べる", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toHaveLength(3));

    fireEvent.click(header("Deadline Date"));
    expect(taskNames()).toEqual(["C", "A", "B"]);
  });

  it("別の見出しを押すと、前の見出しの回数は 0 に戻り、次に押したときは昇順から始まる", async () => {
    renderTaskList();
    await waitFor(() => expect(taskNames()).toHaveLength(3));

    fireEvent.click(header("Task Name"));
    fireEvent.click(header("Deadline Date"));
    expect(header("Task Name")).toHaveTextContent("swap_vert");

    fireEvent.click(header("Task Name"));
    expect(taskNames()).toEqual(["A", "B", "C"]);
  });
});
