import { act, fireEvent, render, screen } from "@testing-library/react";
import AppShell from "@/app/component/appShell/appShell";
import { getWorkspace } from "@/app/lib/api/getWorkspace";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getMailNotifications } from "@/app/lib/api/getMailNotification";
import { opsOf, resetSupabaseMock } from "../helpers/mockSupabase";

const push = jest.fn();
const setDisplayWorkspaceId = jest.fn();
const setPageUpdated = jest.fn();
const useLogout = jest.fn();
// 画面ごとに変えられるよう、context の値は変数で持つ
let displayWorkspaceId: number | null = 1;
let pageUpdated = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
jest.mock("../../app/lib/api/getWorkspace", () => ({ getWorkspace: jest.fn() }));
jest.mock("../../app/lib/api/getProjectData", () => ({
  getProjectData: jest.fn(),
}));
jest.mock("../../app/lib/api/getMailNotification", () => ({
  getMailNotifications: jest.fn(),
}));
jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("../../app/hooks/logout", () => ({
  Logout: () => ({ useLogout }),
}));
jest.mock("../../app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({
    displayWorkspaceId,
    setDisplayWorkspaceId,
  }),
}));
jest.mock("../../app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated, setPageUpdated }),
}));

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  displayWorkspaceId = 1;
  pageUpdated = false;
  (getWorkspace as jest.Mock).mockResolvedValue([
    { workspace: { id: 1, workspace_name: "開発チーム" } },
    { workspace: [{ id: 2, workspace_name: "営業チーム" }] },
  ]);
  (getProjectData as jest.Mock).mockResolvedValue([
    { id: 10, project_name: "検索画面の改修" },
  ]);
  (getMailNotifications as jest.Mock).mockResolvedValue([
    { id: 100, text: "タスク「1」の期限は本日です！", isRead: false, created_at: daysAgo(0) },
  ]);
});

type Current = React.ComponentProps<typeof AppShell>["current"];

const shell = (current: Current) => (
  <AppShell userId={7} current={current}>
    <p>画面の中身</p>
  </AppShell>
);

const renderShell = async (current: Current = { kind: "tasks" }) => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(shell(current));
  });
  return result;
};

const chooseWorkspace = (from: string, to: string) => {
  fireEvent.keyDown(
    screen.getByRole("button", { name: `ワークスペースを切り替える: ${from}` }),
    { key: "Enter" }
  );
  fireEvent.click(screen.getByRole("menuitemradio", { name: to }));
};

describe("AppShell", () => {
  it("ワークスペースとプロジェクトの一覧を読み、中身と未読の件数を出す", async () => {
    await renderShell();

    expect(getWorkspace).toHaveBeenCalledWith(7);
    expect(getProjectData).toHaveBeenCalledWith(null, 1);
    expect(screen.getByText("画面の中身")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ワークスペースを切り替える: 開発チーム" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通知 未読 1 件" })).toBeInTheDocument();
  });

  it("表示中のワークスペースが無いとき、設定の入口は作成の画面を開く", async () => {
    displayWorkspaceId = null;
    (getWorkspace as jest.Mock).mockResolvedValue([]);
    await renderShell(null);

    fireEvent.keyDown(screen.getByRole("button", { name: /^ワークスペースを切り替える/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "ワークスペースの設定" }));

    expect(push).toHaveBeenCalledWith("/createWorkspace?atSignUp=false");
  });

  it("表示中が無くても所属があれば、設定の入口は最初のワークスペースの設定を開く", async () => {
    displayWorkspaceId = null;
    await renderShell(null);

    fireEvent.keyDown(screen.getByRole("button", { name: /^ワークスペースを切り替える/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "ワークスペースの設定" }));

    expect(push).toHaveBeenCalledWith("/editWorkspace?workspaceId=1");
  });

  it("一覧を読んでいる間は、設定の入口を押しても作成へ移さない", async () => {
    displayWorkspaceId = null;
    (getWorkspace as jest.Mock).mockReturnValue(new Promise(() => {}));
    await renderShell(null);

    fireEvent.keyDown(screen.getByRole("button", { name: /^ワークスペースを切り替える/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: "ワークスペースの設定" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("アカウント画面でワークスペースを切り替えても、画面を読み直さない", async () => {
    await renderShell(null);

    chooseWorkspace("開発チーム", "営業チーム");

    expect(setDisplayWorkspaceId).toHaveBeenCalledWith(2);
    expect(setPageUpdated).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("設定の画面でワークスペースを切り替えると、切り替え先の設定を開く", async () => {
    await renderShell({ kind: "workspaceSettings" });

    chooseWorkspace("開発チーム", "営業チーム");

    expect(setDisplayWorkspaceId).toHaveBeenCalledWith(2);
    expect(push).toHaveBeenCalledWith("/editWorkspace?workspaceId=2");
    expect(setPageUpdated).not.toHaveBeenCalled();
  });

  it("設定の画面では、読み直しの合図でワークスペースの一覧も読み直す", async () => {
    const { rerender } = await renderShell({ kind: "workspaceSettings" });
    expect(getWorkspace).toHaveBeenCalledTimes(1);

    pageUpdated = true;
    await act(async () => {
      rerender(shell({ kind: "workspaceSettings" }));
    });

    expect(getWorkspace).toHaveBeenCalledTimes(2);
  });

  it("タスク画面では、読み直しの合図でワークスペースの一覧を読み直さない", async () => {
    const { rerender } = await renderShell({ kind: "tasks" });

    pageUpdated = true;
    await act(async () => {
      rerender(shell({ kind: "tasks" }));
    });

    expect(getWorkspace).toHaveBeenCalledTimes(1);
  });

  it("ページの読み込み中（userId が 0）は何も読まない", async () => {
    await act(async () => {
      render(
        <AppShell userId={0} current={{ kind: "tasks" }}>
          <p>読み込み中</p>
        </AppShell>
      );
    });

    expect(getWorkspace).not.toHaveBeenCalled();
    expect(getMailNotifications).not.toHaveBeenCalled();
    expect(screen.getByText("読み込み中")).toBeInTheDocument();
  });

  it("プロジェクトを押すと、今のワークスペースのそのプロジェクトの画面に移る", async () => {
    await renderShell();

    fireEvent.click(screen.getByRole("button", { name: "検索画面の改修" }));

    expect(push).toHaveBeenCalledWith("/project?workspaceId=1&projectId=10");
  });

  it("タスク画面でワークスペースを切り替えると、切り替えて画面に読み直しを求める", async () => {
    await renderShell();

    chooseWorkspace("開発チーム", "営業チーム");

    expect(setDisplayWorkspaceId).toHaveBeenCalledWith(2);
    expect(setPageUpdated).toHaveBeenCalledWith(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("プロジェクト画面でワークスペースを切り替えると、切り替えてタスク画面に戻る", async () => {
    await renderShell({ kind: "project", id: 10 });

    chooseWorkspace("開発チーム", "営業チーム");

    expect(setDisplayWorkspaceId).toHaveBeenCalledWith(2);
    expect(push).toHaveBeenCalledWith("/task");
    expect(setPageUpdated).not.toHaveBeenCalled();
  });

  it("今のワークスペースを選び直しても何もしない", async () => {
    await renderShell({ kind: "project", id: 10 });

    chooseWorkspace("開発チーム", "開発チーム");

    expect(setDisplayWorkspaceId).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("ワークスペースを切り替えたあと、前のワークスペースの遅れた応答でプロジェクト一覧を上書きしない", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    (getProjectData as jest.Mock).mockImplementation((_: null, workspaceId: number) =>
      workspaceId === 1
        ? new Promise((resolve) => (resolveOld = resolve))
        : Promise.resolve([{ id: 20, project_name: "営業の資料" }])
    );
    const { rerender } = await renderShell();

    displayWorkspaceId = 2;
    await act(async () => {
      rerender(shell({ kind: "tasks" }));
    });
    await act(async () => {
      resolveOld([{ id: 10, project_name: "検索画面の改修" }]);
    });

    expect(screen.getByRole("button", { name: "営業の資料" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "検索画面の改修" })).not.toBeInTheDocument();
  });

  it("7日を過ぎた既読の通知だけを消し、未読と新しい通知は残す", async () => {
    (getMailNotifications as jest.Mock).mockResolvedValue([
      { id: 1, text: "古い既読", isRead: true, created_at: daysAgo(10) },
      { id: 2, text: "古い未読", isRead: false, created_at: daysAgo(10) },
      { id: 3, text: "新しい既読", isRead: true, created_at: daysAgo(1) },
    ]);
    await renderShell();

    const deletes = opsOf("mail_notifications").filter(([op]) => op === "delete");
    const eqs = opsOf("mail_notifications").filter(([op]) => op === "eq");
    expect(deletes).toHaveLength(1);
    expect(eqs).toEqual([["eq", ["id", 1]]]);
    expect(screen.getByRole("button", { name: "通知 未読 1 件" })).toBeInTheDocument();
  });

  it("通知を押すと一覧を開いて開閉を伝え、外を押すと閉じて未読を既読にする", async () => {
    await renderShell();
    const button = screen.getByRole("button", { name: "通知 未読 1 件" });

    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole("region", { name: "通知" })).toHaveTextContent(
      "タスク「1」の期限は本日です！"
    );
    expect(button).toHaveAttribute("aria-expanded", "true");

    await act(async () => {
      fireEvent.mouseDown(screen.getByText("画面の中身"));
    });
    expect(screen.queryByRole("region", { name: "通知" })).not.toBeInTheDocument();
    expect(opsOf("mail_notifications").some(([op]) => op === "update")).toBe(true);
  });

  it("通知の一覧は Escape でも閉じる", async () => {
    await renderShell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "通知 未読 1 件" }));
    });
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByRole("region", { name: "通知" })).not.toBeInTheDocument();
  });

  it("ログアウトを押すとログアウトする", async () => {
    await renderShell();

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(useLogout).toHaveBeenCalled();
  });
});
