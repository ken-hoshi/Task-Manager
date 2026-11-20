// タスク画面の「プロジェクト」の表（ProjectList）。画面に出る文字・ボタンとリンクの名前と、DB に送る値で確かめる。
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import ProjectList from "@/app/task/projectList/projectList";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
// 画面ごとに変えられるよう、context の値は変数で持つ
let pageUpdated = false;
let newItem = { id: 0, target: 0 };

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 9 }),
}));
jest.mock("@/app/provider/flashDisplayProvider", () => ({
  useFlashDisplayContext: () => ({ newItem }),
}));
// ポップアップは表の確認に関係しないので空にする
jest.mock("@/app/component/taskPopup/taskPopup", () => () => null);
jest.mock("@/app/component/projectPopup/projectPopup", () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  pageUpdated = false;
  newItem = { id: 0, target: 0 };
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

type Props = React.ComponentProps<typeof ProjectList>;

const renderList = async (overrides: Partial<Props> = {}) => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ProjectList {...baseProps} {...overrides} />);
  });
  return result;
};

const projectItem = (name: string) => {
  const item = screen.getByRole("link", { name }).closest("li");
  if (!item) throw new Error(`「${name}」の行が見つからない`);
  return item as HTMLElement;
};

const openSearchProject = () =>
  fireEvent.click(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを開く" }));

describe("ProjectList", () => {
  it("完了していないプロジェクトを出し、小プロジェクトを合わせたステータスの件数を日本語で出す", async () => {
    await renderList();

    expect(screen.getByRole("link", { name: "検索画面" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "社内ツール" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "終わった案件" })).not.toBeInTheDocument();
    const counts = within(projectItem("検索画面")).getByRole("list", { name: "タスクの件数（合計）" });
    expect(within(counts).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "未着手2",
      "進行中1",
      "完了3",
    ]);
  });

  it("プロジェクト名・小プロジェクト名は、そのプロジェクトの画面へのリンクになる", async () => {
    await renderList();

    expect(screen.getByRole("link", { name: "検索画面" })).toHaveAttribute(
      "href",
      "/project?workspaceId=9&projectId=1"
    );
    openSearchProject();
    expect(screen.getByRole("link", { name: "一覧" })).toHaveAttribute(
      "href",
      "/project?workspaceId=9&projectId=1&smallProjectId=11"
    );
  });

  it("行ごとの編集・削除のボタンと、追加のボタンに名前が付く", async () => {
    await renderList();

    expect(screen.getByRole("button", { name: "「検索画面」を編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「検索画面」を削除" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "プロジェクトを追加" })).toBeInTheDocument();
  });

  it("小プロジェクトを開くと、メンバー・ジャンル・詳細・添付が出る", async () => {
    await renderList();

    openSearchProject();
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

  it("名前の無い小プロジェクトがほかと並ぶときは「（名前なし）」と出し、ボタンの名前にも使う", async () => {
    await renderList({
      smallProjectDataArray: [
        ...baseProps.smallProjectDataArray,
        { id: 13, project_id: 1, small_project_name: null, isFinished: false, details: null },
      ],
    });

    openSearchProject();
    expect(screen.getByRole("link", { name: "（名前なし）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「（名前なし）」の詳細を開く" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "「（名前なし）」を完了にする" })).toBeInTheDocument();
  });

  it("プロジェクトを閉じると、その中の小プロジェクトの詳細も閉じる", async () => {
    await renderList();

    openSearchProject();
    fireEvent.click(screen.getByRole("button", { name: "「一覧」の詳細を開く" }));
    fireEvent.click(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを閉じる" }));
    openSearchProject();

    expect(screen.getByRole("button", { name: "「一覧」の詳細を開く" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("画面が読み直すと、プロジェクトは開いたまま、小プロジェクトの詳細は閉じる", async () => {
    const { rerender } = await renderList();
    openSearchProject();
    fireEvent.click(screen.getByRole("button", { name: "「一覧」の詳細を開く" }));

    // 読み直しが始まり（pageUpdated が true）、同じ中身の新しい配列が届く
    pageUpdated = true;
    await act(async () => {
      rerender(
        <ProjectList
          {...baseProps}
          projectDataArray={[...baseProps.projectDataArray]}
          smallProjectDataArray={[...baseProps.smallProjectDataArray]}
        />
      );
    });

    expect(screen.getByRole("button", { name: "「検索画面」の小プロジェクトを閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "「一覧」の詳細を開く" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("「完了にする」で小プロジェクトの isFinished を反転し、押されているかを伝える", async () => {
    await renderList();
    openSearchProject();

    expect(screen.getByRole("button", { name: "「詳細」を完了にする" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "「一覧」を完了にする" }));
    });

    expect(opsOf("small_projects")).toEqual([
      ["update", [{ isFinished: true }]],
      ["eq", ["id", 11]],
    ]);
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  // 以前は更新を待たずに読み直していたので、読み直しが先に済むと表示が古いまま残った
  it("「完了にする」は、更新が終わるまで画面の読み直しを求めない", async () => {
    let finish: (value: unknown) => void = () => {};
    setResponses(
      "small_projects",
      new Promise((resolve) => (finish = resolve)) as unknown as { data: unknown; error: unknown }
    );
    await renderList();
    openSearchProject();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "「一覧」を完了にする" }));
    });
    expect(setPageUpdated).not.toHaveBeenCalled();

    await act(async () => {
      finish({ data: null, error: null });
    });
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("「完了にする」の更新に失敗したら、日本語の通知を出す", async () => {
    setResponses("small_projects", { data: null, error: { message: "boom" } });
    jest.spyOn(console, "error").mockImplementation(() => {});
    await renderList();
    openSearchProject();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "「一覧」を完了にする" }));
    });

    expect(setNotificationValue).toHaveBeenCalledWith({
      message: "小プロジェクトを更新できませんでした。",
      color: 1,
    });
    jest.restoreAllMocks();
  });

  it("「完了したプロジェクトを表示」で、小プロジェクトがすべて終わったプロジェクトだけを出す", async () => {
    await renderList();

    const toggle = screen.getByRole("button", { name: "完了したプロジェクトを表示" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "終わった案件" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "検索画面" })).not.toBeInTheDocument();
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("追加した直後のプロジェクトの行だけを点滅させる", async () => {
    newItem = { id: 2, target: 0 };
    await renderList();

    expect(projectItem("社内ツール")).toHaveClass("motion-safe:animate-pulse");
    expect(projectItem("検索画面")).not.toHaveClass("motion-safe:animate-pulse");
  });

  it("小プロジェクトが0件のプロジェクトでも落ちない", async () => {
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
