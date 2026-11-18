import { fireEvent, render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";

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
    currentWorkspaceId: 1,
    projects: [
      { id: 10, projectName: "検索画面の改修" },
      { id: 11, projectName: "社内ツール" },
    ],
    currentProjectId: null,
    unreadCount: 0,
    ...handlers(),
    ...overrides,
  };
  render(<AppSidebar {...props} />);
  return props;
};

describe("AppSidebar", () => {
  it("今のワークスペース名とプロジェクトの一覧を出し、タスク画面を今いる画面として示す", () => {
    renderSidebar();

    expect(
      screen.getByRole("button", { name: "ワークスペースを切り替える" })
    ).toHaveTextContent("開発チーム");
    expect(screen.getByRole("button", { name: "検索画面の改修" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "タスク" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("プロジェクト・通知・アカウント・ログアウトを押すと、それぞれの処理を呼ぶ", () => {
    const props = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "社内ツール" }));
    fireEvent.click(screen.getByRole("button", { name: /通知/ }));
    fireEvent.click(screen.getByRole("button", { name: "アカウント" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(props.onOpenProject).toHaveBeenCalledWith(11);
    expect(props.onOpenNotifications).toHaveBeenCalled();
    expect(props.onOpenAccount).toHaveBeenCalled();
    expect(props.onLogout).toHaveBeenCalled();
  });

  it("プロジェクト画面では、そのプロジェクトを今いる画面として示す", () => {
    renderSidebar({ currentProjectId: 10 });

    expect(screen.getByRole("button", { name: "検索画面の改修" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "タスク" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("未読があるときだけ件数を出し、プロジェクトが無いときはその旨を出す", () => {
    renderSidebar({ unreadCount: 3, projects: [] });

    expect(screen.getByLabelText("未読 3 件")).toHaveTextContent("3");
    expect(screen.getByText("プロジェクトはまだありません")).toBeInTheDocument();
  });
});
