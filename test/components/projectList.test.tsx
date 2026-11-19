// タスク画面の「プロジェクト」の表（ProjectList）。画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import ProjectList from "@/app/task/projectList/projectList";
import { opsOf, resetSupabaseMock } from "../helpers/mockSupabase";

const push = jest.fn();
const setPageUpdated = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue: jest.fn() }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 9 }),
}));
jest.mock("@/app/provider/flashDisplayProvider", () => ({
  useFlashDisplayContext: () => ({ newItem: { id: 0, target: 0 } }),
}));
// ポップアップは表の確認に関係しないので空にする
jest.mock("@/app/component/taskPopup/taskPopup", () => () => null);
jest.mock("@/app/component/projectPopup/projectPopup", () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
});

const baseProps = {
  projectDataArray: [
    { id: 1, project_name: "検索画面" },
    { id: 2, project_name: "社内ツール" },
    { id: 3, project_name: "終わった案件" },
  ],
  smallProjectDataArray: [
    { id: 11, project_id: 1, small_project_name: "一覧", isFinished: false, details: "一覧の改修" },
    { id: 12, project_id: 1, small_project_name: "詳細", isFinished: true, details: null },
    // 名前の無い小プロジェクトが1件だけのプロジェクト
    { id: 21, project_id: 2, small_project_name: null, isFinished: false, details: "ツールの詳細" },
    { id: 31, project_id: 3, small_project_name: "まとめ", isFinished: true, details: null },
  ],
  smallProjectMemberDataArray: [
    { smallProjectId: 11, membersDataArray: [{ id: 5, name: "星" }, { id: 6, name: "田中" }] },
  ],
  smallProjectStatusDataArray: [
    { smallProjectId: 11, projectId: 1, notStarted: 2, processing: 1, completed: 0 },
    { smallProjectId: 12, projectId: 1, notStarted: 0, processing: 0, completed: 3 },
    { smallProjectId: 21, projectId: 2, notStarted: 1, processing: 0, completed: 0 },
  ],
  smallProjectTaskGenreArray: [
    {
      smallProjectId: 11,
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
  ],
  attachedFileDataArray: [
    { id: 11, fileDataArray: [{ file: new File(["x"], "spec.pdf"), url: "blob:spec" }] },
  ],
  userId: 5,
};

const renderList = async (overrides = {}) => {
  await act(async () => {
    render(<ProjectList {...baseProps} {...overrides} />);
  });
};

const projectItem = (name: string) => {
  const item = screen.getByRole("button", { name }).closest("li");
  if (!item) throw new Error(`「${name}」の行が見つからない`);
  return item as HTMLElement;
};

describe("ProjectList", () => {
  it("完了していないプロジェクトを出し、小プロジェクトを合わせたステータスの件数を日本語で出す", async () => {
    await renderList();

    expect(screen.getByRole("button", { name: "検索画面" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "社内ツール" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "終わった案件" })).not.toBeInTheDocument();
    const counts = within(projectItem("検索画面")).getAllByRole("listitem");
    expect(counts.map((li) => li.textContent)).toEqual(["未着手2", "進行中1", "完了3"]);
  });

  it("プロジェクト名・小プロジェクト名を押すと、そのプロジェクトの画面に移る", async () => {
    await renderList();

    fireEvent.click(screen.getByRole("button", { name: "検索画面" }));
    expect(push).toHaveBeenCalledWith("/project?workspaceId=9&projectId=1");

    fireEvent.click(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを開く" }));
    fireEvent.click(screen.getByRole("button", { name: "一覧" }));
    expect(push).toHaveBeenCalledWith("/project?workspaceId=9&projectId=1&smallProjectId=11");
  });

  it("小プロジェクトを開くと、メンバー・ジャンル・詳細・添付が出る", async () => {
    await renderList();

    fireEvent.click(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを開く" }));
    const toggle = screen.getByRole("button", { name: "「一覧」の詳細を開く" });
    fireEvent.click(toggle);

    const details = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(within(details).getByText("星")).toBeInTheDocument();
    expect(within(details).getByText("田中")).toBeInTheDocument();
    expect(within(details).getByText("設計")).toBeInTheDocument();
    expect(within(details).getByText("一覧の改修")).toBeInTheDocument();
    expect(within(details).getByRole("link", { name: "spec.pdf" })).toHaveAttribute("href", "blob:spec");
  });

  it("名前の無い小プロジェクトが1件だけなら、小プロジェクトの行を出さずに詳細を出す", async () => {
    await renderList();

    fireEvent.click(screen.getByRole("button", { name: "「社内ツール」の詳細を開く" }));

    expect(screen.getByText("ツールの詳細")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /を完了にする$/ })).not.toBeInTheDocument();
  });

  it("プロジェクトを閉じると、その中の小プロジェクトの詳細も閉じる", async () => {
    await renderList();
    const projectToggle = screen.getByRole("button", { name: "「検索画面」の小プロジェクトを開く" });

    fireEvent.click(projectToggle);
    fireEvent.click(screen.getByRole("button", { name: "「一覧」の詳細を開く" }));
    fireEvent.click(projectToggle);
    fireEvent.click(projectToggle);

    expect(screen.getByRole("button", { name: "「一覧」の詳細を開く" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("「完了にする」で小プロジェクトの isFinished を反転し、押されているかを伝える", async () => {
    await renderList();
    fireEvent.click(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを開く" }));

    const finished = screen.getByRole("button", { name: "「詳細」を完了にする" });
    expect(finished).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "「一覧」を完了にする" }));

    await act(async () => {});
    expect(opsOf("small_projects")).toEqual([
      ["update", [{ isFinished: true }]],
      ["eq", ["id", 11]],
    ]);
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("「完了したプロジェクトを表示」で、小プロジェクトがすべて終わったプロジェクトだけを出す", async () => {
    await renderList();

    const toggle = screen.getByRole("button", { name: "完了したプロジェクトを表示" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "終わった案件" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "検索画面" })).not.toBeInTheDocument();
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("プロジェクトが0件なら空の表示を出す。小プロジェクトが0件のプロジェクトでも落ちない", async () => {
    await renderList({
      projectDataArray: [{ id: 4, project_name: "空のプロジェクト" }],
      smallProjectDataArray: [],
      smallProjectStatusDataArray: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "「空のプロジェクト」の小プロジェクトを開く" }));
    expect(screen.getByText("小プロジェクトはありません")).toBeInTheDocument();
  });

  it("表示するプロジェクトが無いときは、空の表示を出す", async () => {
    await renderList({ projectDataArray: [] });

    expect(screen.getByText("プロジェクトはありません")).toBeInTheDocument();
  });
});
