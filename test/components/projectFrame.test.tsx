// プロジェクト画面の枠（タブ・「自分のタスクだけ」）と、小プロジェクトの帯（ProjectDetails）。
// タブの中身の部品は別に確かめるので、ここでは受け取った値を文字で出すだけの部品に差し替える。
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SuspenseProject from "@/app/project/suspenseProject/suspenseProject";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const fetchProjectDetailsData = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams("workspaceId=1&projectId=2"),
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({
    notificationValue: { message: "", color: 0 },
    setNotificationValue,
  }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ setDisplayWorkspaceId: jest.fn() }),
}));
jest.mock("@/app/provider/formProvider", () => ({
  useFormContext: () => ({ setBackForm: jest.fn() }),
}));
jest.mock("@/app/hooks/sessionTimeout", () => ({ useSessionTimeout: jest.fn() }));
jest.mock("@/app/hooks/getDataUpdate", () => ({ getDataUpdate: jest.fn() }));
jest.mock("@/app/hooks/getSession", () => ({
  getSession: async () => ({ user: { id: "auth-user" } }),
}));
jest.mock("@/app/lib/api/getUserId", () => ({ getUserId: async () => 5 }));
jest.mock("@/app/lib/api/fetchProjectDetailsData", () => ({
  fetchProjectDetailsData: (...args: unknown[]) => fetchProjectDetailsData(...args),
}));
jest.mock("@/app/lib/api/getTaskGenreData", () => ({ getTaskGenreData: async () => [] }));
jest.mock("@/app/lib/api/getStatus", () => ({
  getStatus: async () => [
    { id: 1, status: "Not Started" },
    { id: 2, status: "Processing" },
    { id: 3, status: "Completed" },
  ],
}));
// サイドバー・通知の帯・AI チャット・ポップアップは、この確認に関係しないので外す
jest.mock("@/app/component/appShell/appShell", () => ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));
jest.mock("@/app/component/notificationBanner/notificationBanner", () => () => null);
jest.mock("@/app/component/robotButton/robotButton", () => () => null);
jest.mock("@/app/component/projectPopup/projectPopup", () => () => null);
jest.mock("@/app/project/taskList/taskList", () => (props: { filterMyTasks: boolean; displaySmallProjectId: number }) => (
  <p>一覧の中身 自分だけ:{String(props.filterMyTasks)} 小プロジェクト:{props.displaySmallProjectId}</p>
));
jest.mock("@/app/project/taskCalender/taskCalender", () => () => <p>カレンダーの中身</p>);
jest.mock("@/app/project/taskBoard/taskBoard", () => () => <p>ボードの中身</p>);
jest.mock("@/app/project/wiki/wiki", () => () => <p>Wiki の中身</p>);

const projectDetails = {
  projectData: { id: 2, project_name: "検索画面" },
  smallProjectIdList: [11, 12],
  smallProjectData: [
    { id: 11, small_project_name: "一覧", isFinished: false, details: "一覧の改修" },
    { id: 12, small_project_name: "詳細", isFinished: true, details: null },
  ],
  smallProjectMembersData: [
    { smallProjectId: 11, membersDataArray: [{ id: 5, name: "星" }, { id: 6, name: "田中" }] },
    { smallProjectId: 12, membersDataArray: [] },
  ],
  smallProjectStatusData: [
    { smallProjectId: 11, projectId: 2, notStarted: 2, processing: 1, completed: 0 },
    { smallProjectId: 12, projectId: 2, notStarted: 0, processing: 0, completed: 4 },
  ],
  smallProjectTaskGenreData: [
    {
      smallProjectId: 11,
      taskGenreDataArray: [
        { taskGenreId: 7, taskGenreName: "設計", numberOfPersons: 2, startDate: "2024-04-01", deadlineDate: "2024-04-05", numberOfDays: 5 },
      ],
    },
    { smallProjectId: 12, taskGenreDataArray: [] },
  ],
  tasksDividedBySmallProjectId: [
    { smallProjectId: 11, taskDataArray: [] },
    { smallProjectId: 12, taskDataArray: [] },
  ],
  smallProjectAttachedFileData: [
    { id: 11, fileDataArray: [{ file: new File(["x"], "spec.pdf"), url: "blob:spec" }] },
    { id: 12, fileDataArray: [] },
  ],
  taskAttachedFileData: [
    { smallProjectId: 11, fileDataList: [] },
    { smallProjectId: 12, fileDataList: [] },
  ],
  smallProjectWikiData: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  fetchProjectDetailsData.mockResolvedValue(projectDetails);
});

// 読み込みが終わり、最初の小プロジェクトの帯が出るまで待つ
const renderPage = async () => {
  render(<SuspenseProject />);
  await screen.findByRole("heading", { level: 2, name: "一覧" });
};

describe("タブと「自分のタスクだけ」", () => {
  test("最初は「一覧」のタブが開いていて、押したタブの中身に替わる", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "検索画面" })).toBeInTheDocument();
    const tabs = within(screen.getByRole("tablist", { name: "タスクの見せ方" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["一覧", "カレンダー", "ボード", "Wiki"]);
    expect(screen.getByRole("tab", { name: "一覧" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/一覧の中身/)).toBeInTheDocument();

    // Radix の Tabs は mousedown で切り替わる（ブラウザの click は mousedown を含む）
    fireEvent.mouseDown(screen.getByRole("tab", { name: "ボード" }));
    expect(screen.getByText("ボードの中身")).toBeInTheDocument();
    expect(screen.queryByText(/一覧の中身/)).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "カレンダー" }));
    expect(screen.getByText("カレンダーの中身")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Wiki" }));
    expect(screen.getByText("Wiki の中身")).toBeInTheDocument();
  });

  test("タブは矢印キーで移ると、移った先の中身に替わる", async () => {
    await renderPage();
    const listTab = screen.getByRole("tab", { name: "一覧" });
    listTab.focus();
    fireEvent.keyDown(listTab, { key: "ArrowRight" });
    // Radix はフォーカスを setTimeout の中で移し、フォーカスが来たタブを開く
    await waitFor(() => expect(screen.getByRole("tab", { name: "カレンダー" })).toHaveFocus());
    expect(screen.getByText("カレンダーの中身")).toBeInTheDocument();
  });

  test("「自分のタスクだけ」を入れると、中身の部品に絞り込みを渡し、画面を読み直す", async () => {
    await renderPage();
    const toggle = screen.getByRole("switch", { name: "自分のタスクだけ" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/自分だけ:false/)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/自分だけ:true/)).toBeInTheDocument();
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });
});

describe("小プロジェクトの帯", () => {
  test("名前と、ステータスごとの件数を日本語で出す", async () => {
    await renderPage();
    const counts = screen.getByRole("list", { name: "タスクの件数" });
    expect(within(counts).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "未着手2",
      "進行中1",
      "完了0",
    ]);
  });

  test("「詳細」で、メンバー・ジャンル・詳細・添付を開き、もう一度押すと閉じる", async () => {
    await renderPage();
    const toggle = screen.getByRole("button", { name: "詳細" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("田中")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("田中")).toBeInTheDocument();
    expect(screen.getByText("設計")).toBeInTheDocument();
    expect(screen.getByText("一覧の改修")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "spec.pdf" })).toHaveAttribute("href", "blob:spec");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("田中")).not.toBeInTheDocument();
  });

  test("切り替えで別の小プロジェクトを選ぶと、その名前と件数になり、中身の部品にも渡す", async () => {
    await renderPage();
    fireEvent.keyDown(screen.getByRole("button", { name: "小プロジェクトを切り替える" }), { key: "Enter" });
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual(["一覧", "詳細"]);
    expect(screen.getByRole("menuitemradio", { name: "一覧" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "詳細" }));
    expect(await screen.findByRole("heading", { level: 2, name: "詳細" })).toBeInTheDocument();
    expect(screen.getByText(/小プロジェクト:12/)).toBeInTheDocument();
    const counts = screen.getByRole("list", { name: "タスクの件数" });
    expect(within(counts).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "未着手0",
      "進行中0",
      "完了4",
    ]);
  });

  test("小プロジェクトが1件だけなら、切り替えを出さない", async () => {
    fetchProjectDetailsData.mockResolvedValue({
      ...projectDetails,
      smallProjectIdList: [11],
      smallProjectData: [projectDetails.smallProjectData[0]],
    });
    await renderPage();
    expect(screen.queryByRole("button", { name: "小プロジェクトを切り替える" })).not.toBeInTheDocument();
  });

  test("「完了にする」で、small_projects の isFinished を反対の値で送り、画面を読み直す", async () => {
    await renderPage();
    const button = screen.getByRole("button", { name: "「一覧」を完了にする" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    await waitFor(() =>
      expect(opsOf("small_projects")).toEqual([
        ["update", [{ isFinished: true }]],
        ["eq", ["id", 11]],
      ])
    );
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  test("「完了にする」は、保存の返事が来てから画面を読み直す", async () => {
    let finish: (value: unknown) => void = () => {};
    setResponses("small_projects", new Promise((resolve) => (finish = resolve)) as never);
    await renderPage();
    setPageUpdated.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "「一覧」を完了にする" }));
    await waitFor(() => expect(opsOf("small_projects")).toContainEqual(["update", [{ isFinished: true }]]));
    expect(setPageUpdated).not.toHaveBeenCalled();

    await act(async () => finish({ data: null, error: null }));
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));
  });

  test("完了済みの小プロジェクトで押すと、isFinished を false で送る", async () => {
    await renderPage();
    fireEvent.keyDown(screen.getByRole("button", { name: "小プロジェクトを切り替える" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "詳細" }));
    const button = await screen.findByRole("button", { name: "「詳細」を完了にする" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    await waitFor(() =>
      expect(opsOf("small_projects")).toEqual([
        ["update", [{ isFinished: false }]],
        ["eq", ["id", 12]],
      ])
    );
  });
});
