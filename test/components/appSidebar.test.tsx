import { fireEvent, render, screen } from "@testing-library/react";
import { AppSidebar, type SidebarCurrent } from "@/components/app-sidebar";

const handlers = () => ({
  onSelectWorkspace: jest.fn(),
  onEditWorkspace: jest.fn(),
  onOpenTasks: jest.fn(),
  onOpenProject: jest.fn(),
  onOpenNotifications: jest.fn(),
  onOpenAccount: jest.fn(),
  onLogout: jest.fn(),
});

const renderSidebar = (overrides = {}) => {
  const props = {
    workspaces: [
      { id: 1, workspaceName: "開発チーム" },
      { id: 2, workspaceName: "営業チーム" },
    ],
    currentWorkspaceId: 1 as number | null,
    projects: [
      { id: 10, projectName: "検索画面の改修" },
      { id: 11, projectName: "社内ツール" },
    ],
    current: { kind: "tasks" } as SidebarCurrent,
    unreadCount: 0,
    ...handlers(),
    ...overrides,
  };
  render(<AppSidebar {...props} />);
  return props;
};

// Radix のメニューは、キーボードの Enter で開く
const openWorkspaceMenu = (workspaceName: string) => {
  fireEvent.keyDown(
    screen.getByRole("button", {
      name: `ワークスペースを切り替える: ${workspaceName}`,
    }),
    { key: "Enter" }
  );
};

describe("AppSidebar", () => {
  it("今のワークスペース名とプロジェクトの一覧を出し、タスク画面を今いる画面として示す", () => {
    renderSidebar();

    expect(
      screen.getByRole("button", { name: "ワークスペースを切り替える: 開発チーム" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "検索画面の改修" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "タスク" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("ワークスペースのメニューで今のものに印を付け、別のものを選ぶとその id を渡す", () => {
    const props = renderSidebar();

    openWorkspaceMenu("開発チーム");
    expect(screen.getByRole("menuitemradio", { name: "開発チーム" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "営業チーム" }));

    expect(props.onSelectWorkspace).toHaveBeenCalledWith(2);
  });

  it("メニューの「ワークスペースの設定」で設定を開く", () => {
    const props = renderSidebar();

    openWorkspaceMenu("開発チーム");
    fireEvent.click(screen.getByRole("menuitem", { name: "ワークスペースの設定" }));

    expect(props.onEditWorkspace).toHaveBeenCalled();
  });

  it("今のワークスペースが一覧に無いときは、別の名前を出さない", () => {
    renderSidebar({ currentWorkspaceId: null });

    expect(
      screen.getByRole("button", { name: "ワークスペースを切り替える: ワークスペース" })
    ).toBeInTheDocument();
  });

  it("プロジェクト・通知・アカウント・ログアウトを押すと、それぞれの処理を呼ぶ", () => {
    const props = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "社内ツール" }));
    fireEvent.click(screen.getByRole("button", { name: "通知" }));
    fireEvent.click(screen.getByRole("button", { name: "アカウント" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(props.onOpenProject).toHaveBeenCalledWith(11);
    expect(props.onOpenNotifications).toHaveBeenCalled();
    expect(props.onOpenAccount).toHaveBeenCalled();
    expect(props.onLogout).toHaveBeenCalled();
  });

  it("プロジェクト画面では、そのプロジェクトを今いる画面として示す", () => {
    renderSidebar({ current: { kind: "project", id: 10 } });

    expect(screen.getByRole("button", { name: "検索画面の改修" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "タスク" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("タスクでもプロジェクトでもない画面では、どれも今いる画面として示さない", () => {
    renderSidebar({ current: null });

    expect(screen.getByRole("button", { name: "タスク" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("未読があるときは件数をボタンの名前に含め、プロジェクトが無いときはその旨を出す", () => {
    renderSidebar({ unreadCount: 3, projects: [] });

    expect(screen.getByRole("button", { name: "通知 未読 3 件" })).toBeInTheDocument();
    expect(screen.getByText("プロジェクトはまだありません")).toBeInTheDocument();
  });
});
