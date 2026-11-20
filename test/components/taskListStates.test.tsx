// プロジェクト画面の一覧（taskList）の、空のとき・データが見つからないとき・ステータスを変えたときの読み直しの時機。
// 画面に出る文字・ボタンと見出しの名前と、呼んだ処理で確かめる。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskList from "@/app/project/taskList/taskList";
import { opsOf, resetSupabaseMock } from "../helpers/mockSupabase";
import { genre, smallProjectTaskGenreData, statuses, task } from "./taskFixtures";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const push = jest.fn();
const postMailNotifications = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: jest.fn() }),
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
  postMailNotifications: (...args: unknown[]) => postMailNotifications(...args),
}));
// 「タスクを追加」のボタンは本物を使い、押したときに開くポップアップだけ空にする
jest.mock("@/app/component/taskPopup/taskPopup", () => () => null);
jest.mock("@/app/component/projectPopup/projectPopup", () => () => null);
jest.mock("@/app/component/comment/comment", () => () => null);
jest.mock("@/app/component/editButton/editButton", () => () => null);
jest.mock("@/app/component/deleteButton/deleteButton", () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  postMailNotifications.mockResolvedValue(undefined);
});

type Props = React.ComponentProps<typeof TaskList>;

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  userId: 5,
  projectId: 1,
  smallProjectIdList: [1],
  displaySmallProjectId: 1,
  taskData: [{ smallProjectId: 1, taskDataArray: [task] }],
  taskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [{ taskId: 1, taskGenre: genre }] }],
  smallProjectTaskGenreData,
  statusData: statuses,
  taskAttachedFileData: [{ smallProjectId: 1, fileDataList: [] }],
  filterMyTasks: false,
  ...overrides,
});

describe("空のときの表示", () => {
  it("ジャンルもタスクも無いときは、「タスク」の区画に空の表示と「タスクを追加」を出す", () => {
    render(
      <TaskList
        {...baseProps({
          taskData: [{ smallProjectId: 1, taskDataArray: [] }],
          smallProjectTaskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [] }],
        })}
      />
    );
    const region = screen.getByRole("region", { name: "タスク" });
    expect(within(region).getByText("タスクはありません")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "タスクを追加" })).toBeInTheDocument();
  });

  it("タスクが0件のジャンルにも区画を出し、そのジャンルに足すボタンを置く", () => {
    render(<TaskList {...baseProps({ taskData: [{ smallProjectId: 1, taskDataArray: [] }] })} />);
    const region = screen.getByRole("region", { name: /^設計/ });
    expect(within(region).getByText("タスクはありません")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "「設計」にタスクを追加" })).toBeInTheDocument();
  });

  it("「自分のタスクだけ」で0件のときは、絞り込みを外せば出ると伝える", () => {
    render(
      <TaskList {...baseProps({ taskData: [{ smallProjectId: 1, taskDataArray: [] }], filterMyTasks: true })} />
    );
    expect(screen.getByText("自分のタスクはありません")).toBeInTheDocument();
    expect(screen.getByText("「自分のタスクだけ」を外すと、ほかの人のタスクも出ます。")).toBeInTheDocument();
  });

  it("ジャンルの無いタスクは「ジャンルなし」の区画に出て、その表でも並べ替えられる", () => {
    render(
      <TaskList
        {...baseProps({
          taskData: [
            {
              smallProjectId: 1,
              taskDataArray: [
                { ...task, id: 31, task_name: "Y", task_genre_id: null },
                { ...task, id: 32, task_name: "X", task_genre_id: null },
              ],
            },
          ],
        })}
      />
    );
    const region = screen.getByRole("region", { name: /^ジャンルなし/ });
    const names = () => within(region).getAllByRole("button", { name: /^[XY]$/ }).map((el) => el.textContent);
    expect(names()).toEqual(["Y", "X"]);
    fireEvent.click(within(region).getByRole("button", { name: "タスク名" }));
    expect(names()).toEqual(["X", "Y"]);
  });
});

describe("見出しの段", () => {
  it("ジャンルは h3、開いた詳細の欄はその下の h4 になる", () => {
    render(<TaskList {...baseProps()} />);
    expect(screen.getByRole("heading", { level: 3, name: /^設計/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "画面" }));
    expect(screen.getByRole("heading", { level: 4, name: "実績" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "実績" })).not.toBeInTheDocument();
  });
});

describe("データが見つからないとき", () => {
  it("表示中の小プロジェクトのデータが無ければ、落ちずに通知を出してタスク画面へ戻る", () => {
    render(<TaskList {...baseProps({ taskData: [{ smallProjectId: 2, taskDataArray: [] }] })} />);
    expect(setNotificationValue).toHaveBeenCalledWith({
      message: "プロジェクトのデータを読めませんでした。",
      color: 1,
    });
    expect(push).toHaveBeenCalledWith("/task");
  });
});

describe("ステータスを変えたときの読み直し", () => {
  it("通知の処理が終わってから画面を読み直す（以前からの順）", async () => {
    let finish: (value: undefined) => void = () => {};
    postMailNotifications.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<TaskList {...baseProps()} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /のステータス: / }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "完了" }));
    await waitFor(() => expect(postMailNotifications).toHaveBeenCalledWith(1, 5, 1, null, null, null, 1, []));
    expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]);
    expect(setPageUpdated).not.toHaveBeenCalled();

    finish(undefined);
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));
  });
});
