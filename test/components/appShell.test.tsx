import { act, fireEvent, render, screen } from "@testing-library/react";
import AppShell from "@/app/component/appShell/appShell";
import { getWorkspace } from "@/app/lib/api/getWorkspace";
import { getProjectData } from "@/app/lib/api/getProjectData";
import { getMailNotifications } from "@/app/lib/api/getMailNotification";

const push = jest.fn();
const setDisplayWorkspaceId = jest.fn();
const setPageUpdated = jest.fn();
const useLogout = jest.fn();

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
    displayWorkspaceId: 1,
    setDisplayWorkspaceId,
  }),
}));
jest.mock("../../app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getWorkspace as jest.Mock).mockResolvedValue([
    { workspace: { id: 1, workspace_name: "開発チーム" } },
    { workspace: [{ id: 2, workspace_name: "営業チーム" }] },
  ]);
  (getProjectData as jest.Mock).mockResolvedValue([
    { id: 10, project_name: "検索画面の改修" },
  ]);
  (getMailNotifications as jest.Mock).mockResolvedValue([
    {
      id: 100,
      text: "タスク「1」の期限は本日です！",
      isRead: false,
      created_at: new Date().toISOString(),
    },
  ]);
});

const renderShell = async (
  current: React.ComponentProps<typeof AppShell>["current"] = { kind: "tasks" }
) => {
  await act(async () => {
    render(
      <AppShell userId={7} current={current}>
        <p>画面の中身</p>
      </AppShell>
    );
  });
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

  it("プロジェクトを押すと、今のワークスペースのそのプロジェクトの画面に移る", async () => {
    await renderShell();

    fireEvent.click(screen.getByRole("button", { name: "検索画面の改修" }));

    expect(push).toHaveBeenCalledWith("/project?workspaceId=1&projectId=10");
  });

  it("プロジェクト画面でワークスペースを切り替えると、切り替えてタスク画面に戻る", async () => {
    await renderShell({ kind: "project", id: 10 });

    fireEvent.keyDown(
      screen.getByRole("button", { name: "ワークスペースを切り替える: 開発チーム" }),
      { key: "Enter" }
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "営業チーム" }));

    expect(setDisplayWorkspaceId).toHaveBeenCalledWith(2);
    expect(setPageUpdated).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith("/task");
  });

  it("通知を押すと一覧を開き、ログアウトを押すとログアウトする", async () => {
    await renderShell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "通知 未読 1 件" }));
    });
    expect(screen.getByText("タスク「1」の期限は本日です！")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(useLogout).toHaveBeenCalled();
  });
});
