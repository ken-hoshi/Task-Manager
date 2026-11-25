// ワークスペースの作成と参加の画面。画面に出る文字・欄とボタンの名前・DB の関数に送る値で確かめる。
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SuspenseCreateWorkspace from "@/app/createWorkspace/suspenseCreateWorkspace/suspenseCreateWorkspace";
import SuspenseJoinWorkspace from "@/app/joinWorkspace/suspenseJoinWorkspace/suspenseJoinWorkspace";
import { opsOf, resetSupabaseMock, rpcArgsOf, setResponses } from "../helpers/mockSupabase";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockGetSession = jest.fn();
const mockLogout = jest.fn();
const mockSetNotification = jest.fn();
let mockQuery = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => new URLSearchParams(mockQuery),
}));
jest.mock("@/app/lib/supabase/client", () => ({
  clientSupabase: {
    ...require("../helpers/mockSupabase").mockClient,
    auth: { getSession: () => mockGetSession() },
  },
}));
jest.mock("@/app/lib/api/getUserId", () => ({
  getUserId: async () => 5,
}));
jest.mock("@/app/hooks/logout", () => ({
  Logout: () => ({ useLogout: mockLogout }),
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({
    notificationValue: { message: null, color: null },
    setNotificationValue: mockSetNotification,
  }),
}));

const session = (emailConfirmed = true) => ({
  data: {
    session: {
      user: { id: "auth-1", email_confirmed_at: emailConfirmed ? "2026-01-01T00:00:00Z" : null },
    },
  },
});

const button = (name: string | RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  sessionStorage.clear();
  mockQuery = "";
  mockGetSession.mockResolvedValue(session());
});

const renderCreate = async (query = "atSignUp=false") => {
  mockQuery = query;
  render(<SuspenseCreateWorkspace />);
  await act(async () => {});
};

const renderJoin = async (query = "atSignUp=false") => {
  mockQuery = query;
  render(<SuspenseJoinWorkspace />);
  await act(async () => {});
};

describe("ワークスペースの作成", () => {
  const nameInput = () => screen.getByLabelText(/^ワークスペース名/);

  it("ログイン後でワークスペースが無いとき、戻るの代わりにログアウトを出す", async () => {
    await renderCreate();

    expect(screen.getByRole("heading", { level: 1, name: "ワークスペースを作成する" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "登録の進み具合" })).not.toBeInTheDocument();
    fireEvent.click(button("ログアウト"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("設定から開いたときは、そのワークスペースの設定へ戻る", async () => {
    await renderCreate("atSignUp=false&workspaceId=7");

    fireEvent.click(button("ワークスペースの設定へ戻る"));
    expect(mockPush).toHaveBeenCalledWith("/editWorkspace?workspaceId=7");
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("登録の途中は、3段階目を今の段階として出し、戻るを出さない", async () => {
    await renderCreate("atSignUp=true");

    const steps = screen.getByRole("list", { name: "登録の進み具合" });
    expect(within(steps).getByText("ワークスペース").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
  });

  it("メールが未確認なら案内を出し、確認し直すと作成の欄に替わる", async () => {
    mockGetSession.mockResolvedValue(session(false));
    await renderCreate("atSignUp=true");

    expect(screen.getByRole("heading", { level: 1, name: "メール認証が完了していません" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^ワークスペース名/)).not.toBeInTheDocument();

    mockGetSession.mockResolvedValue(session(true));
    await act(async () => {
      fireEvent.click(button("確認し直す"));
    });
    await waitFor(() => expect(nameInput()).toBeInTheDocument());
    await waitFor(() => expect(nameInput()).toHaveFocus());
  });

  it("確認し直してもまだ未確認なら、その結果を知らせる", async () => {
    mockGetSession.mockResolvedValue(session(false));
    await renderCreate("atSignUp=true");
    expect(screen.getByRole("status")).toHaveTextContent("");

    await act(async () => {
      fireEvent.click(button("確認し直す"));
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("まだメール認証を確認できません。")
    );
  });

  it("ログインしていなければ、知らせてタスク画面へ移す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await renderCreate();

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ログインしていません。", color: 1 });
    expect(mockPush).toHaveBeenCalledWith("/task");
    consoleError.mockRestore();
  });

  it("メールが未確認のとき、ログインの画面へ移れる", async () => {
    mockGetSession.mockResolvedValue(session(false));
    await renderCreate("atSignUp=true");

    fireEvent.click(button("ログイン"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("作成すると、名前を DB の関数に送り、合言葉を持って参加の画面へ移る", async () => {
    setResponses("rpc:create_workspace", { data: "space-1", error: null });
    await renderCreate();

    fireEvent.change(nameInput(), { target: { value: "開発チーム" } });
    await act(async () => {
      fireEvent.click(button("作成する"));
    });

    expect(rpcArgsOf("create_workspace")).toEqual([{ p_workspace_name: "開発チーム" }]);
    expect(sessionStorage.getItem("spaceId")).toBe("space-1");
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースを作成しました。", color: 0 });
    expect(mockPush).toHaveBeenCalledWith("/joinWorkspace?atSignUp=false");
  });

  it("同じ名前があれば、欄にエラーを結び付けてフォーカスを移す", async () => {
    setResponses("rpc:create_workspace", { data: null, error: { code: "23505" } });
    await renderCreate();

    fireEvent.change(nameInput(), { target: { value: "開発チーム" } });
    await act(async () => {
      fireEvent.click(button("作成する"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("既に同名のワークスペースがあります。");
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(nameInput()).toHaveAccessibleDescription("既に同名のワークスペースがあります。");
    expect(nameInput()).toHaveFocus();
    expect(button("作成する")).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();

    // 直し始めたら、エラーの表示を消す
    fireEvent.change(nameInput(), { target: { value: "開発チーム2" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(nameInput()).not.toHaveAttribute("aria-invalid");
  });

  it("作成に失敗したら通知を出し、入力を残して移動しない", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("rpc:create_workspace", { data: null, error: { code: "500" } });
    await renderCreate();

    fireEvent.change(nameInput(), { target: { value: "開発チーム" } });
    await act(async () => {
      fireEvent.click(button("作成する"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースを作成できませんでした。", color: 1 });
    expect(nameInput()).toHaveValue("開発チーム");
    expect(nameInput()).toHaveFocus();
    expect(button("作成する")).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("設定から開いて作成したら、参加の画面へ今のワークスペースも引き継ぐ", async () => {
    setResponses("rpc:create_workspace", { data: "space-1", error: null });
    await renderCreate("atSignUp=false&workspaceId=7");

    fireEvent.change(nameInput(), { target: { value: "開発チーム" } });
    await act(async () => {
      fireEvent.click(button("作成する"));
    });

    // 引き継がないと、参加の画面の戻るが設定ではなくログアウトになる
    expect(mockPush).toHaveBeenCalledWith("/joinWorkspace?atSignUp=false&workspaceId=7");
  });

  it("作成の返事を待つ間は押せず、2回送らない", async () => {
    setResponses("rpc:create_workspace", new Promise(() => {}) as never);
    await renderCreate();

    fireEvent.change(nameInput(), { target: { value: "開発チーム" } });
    await act(async () => {
      fireEvent.click(button("作成する"));
    });
    expect(button("作成する")).toBeDisabled();

    // Enter でも送れるので、ボタンを通さずフォームを送って確かめる
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ワークスペースの作成" }));
    });
    expect(rpcArgsOf("create_workspace")).toHaveLength(1);
  });

  it("参加の画面へ、今の条件を持って移る", async () => {
    await renderCreate("atSignUp=false&workspaceId=7");

    fireEvent.click(button("作成せずに既存のワークスペースに参加する"));
    expect(mockPush).toHaveBeenCalledWith("/joinWorkspace?atSignUp=false&workspaceId=7");
  });
});

describe("ワークスペースへの参加", () => {
  const spaceInput = () => screen.getByLabelText("合言葉");
  const selected = () => screen.getByRole("list", { name: "参加するワークスペース" });

  const search = async (spaceId: string) => {
    fireEvent.change(spaceInput(), { target: { value: spaceId } });
    await act(async () => {
      fireEvent.click(button("検索"));
    });
  };

  it("検索すると一覧に足し、欄を空にする", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    await renderJoin();

    await search("space-3");

    expect(rpcArgsOf("find_workspace_by_space_id")).toEqual([{ p_space_id: "space-3" }]);
    expect(opsOf("rpc:find_workspace_by_space_id")).toContainEqual(["single", []]);
    expect(within(selected()).getByText("営業")).toBeInTheDocument();
    expect(spaceInput()).toHaveValue("");
  });

  it("参加するワークスペースを選ぶまで、「参加する」は押せない", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    await renderJoin();
    expect(button("参加する")).toBeDisabled();

    await search("space-3");
    expect(button("参加する")).toBeEnabled();

    fireEvent.click(button("「営業」を外す"));
    expect(button("参加する")).toBeDisabled();
  });

  it("1つ選んだあとに次の合言葉で Enter を押しても、参加の送信を止めて検索する", async () => {
    setResponses(
      "rpc:find_workspace_by_space_id",
      { data: { id: 3, workspace_name: "営業" }, error: null },
      { data: { id: 4, workspace_name: "開発" }, error: null }
    );
    await renderJoin();
    await search("space-3");

    fireEvent.change(spaceInput(), { target: { value: "space-4" } });
    let notPrevented = true;
    await act(async () => {
      notPrevented = fireEvent.keyDown(spaceInput(), { key: "Enter", code: "Enter" });
    });

    // false は Enter の既定の動き（フォームの送信）を止めたこと
    expect(notPrevented).toBe(false);
    expect(rpcArgsOf("join_workspaces")).toEqual([]);
    expect(within(selected()).getByText("開発")).toBeInTheDocument();
  });

  it("合言葉の欄で Enter を押すと、参加ではなく検索する", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    await renderJoin();

    fireEvent.change(spaceInput(), { target: { value: "space-3" } });
    await act(async () => {
      fireEvent.keyDown(spaceInput(), { key: "Enter", code: "Enter" });
    });

    expect(rpcArgsOf("find_workspace_by_space_id")).toEqual([{ p_space_id: "space-3" }]);
    expect(rpcArgsOf("join_workspaces")).toEqual([]);
    expect(within(selected()).getByText("営業")).toBeInTheDocument();
  });

  it("検索の返事を待つ間にもう一度押しても、2回検索しない", async () => {
    setResponses("rpc:find_workspace_by_space_id", new Promise(() => {}) as never);
    await renderJoin();

    await search("space-3");
    await act(async () => {
      fireEvent.click(button("検索"));
    });

    expect(rpcArgsOf("find_workspace_by_space_id")).toHaveLength(1);
  });

  it("保存された合言葉を読めなければ、知らせて前の画面へ戻る", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem("spaceId", "space-9");
    setResponses("rpc:find_workspace_by_space_id", { data: null, error: { code: "500" } });
    await renderJoin();

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースを読めませんでした。", color: 1 });
    expect(mockBack).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("見つからなければ、欄にエラーを結び付ける", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: null, error: { code: "PGRST116" } });
    await renderJoin();

    await search("nothing");

    expect(screen.getByRole("alert")).toHaveTextContent("ワークスペースが見つかりません。再度検索してください。");
    // 見つからないときは、id の無い条件で所属を問い合わせない
    expect(opsOf("workspace_users")).toEqual([]);
    expect(spaceInput()).toHaveAttribute("aria-invalid", "true");
    expect(spaceInput()).toHaveAccessibleDescription("ワークスペースが見つかりません。再度検索してください。");

    // 直し始めたら、エラーの表示を消す
    fireEvent.change(spaceInput(), { target: { value: "other" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(spaceInput()).not.toHaveAttribute("aria-invalid");
  });

  it("同じワークスペースは2回足せない", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    await renderJoin();

    await search("space-3");
    await search("space-3");

    expect(screen.getByRole("alert")).toHaveTextContent("ワークスペースは既に選択されています。");
    expect(within(selected()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("すでに入っているワークスペースは足せない", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    setResponses("workspace_users", { data: { id: 11 }, error: null });
    await renderJoin();

    await search("space-3");

    expect(screen.getByRole("alert")).toHaveTextContent("検索したワークスペースに既に登録されています。");
    expect(screen.queryByRole("list", { name: "参加するワークスペース" })).not.toBeInTheDocument();
  });

  it("外すボタンで一覧から消し、フォーカスを合言葉の欄へ移す", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    await renderJoin();
    await search("space-3");

    fireEvent.click(button("「営業」を外す"));

    expect(screen.queryByRole("list", { name: "参加するワークスペース" })).not.toBeInTheDocument();
    expect(spaceInput()).toHaveFocus();
  });

  it("作成の画面から来たら、作ったワークスペースを最初から一覧に出す", async () => {
    sessionStorage.setItem("spaceId", "space-9");
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 9, workspace_name: "新チーム" }, error: null });
    await renderJoin();

    expect(await screen.findByText("新チーム")).toBeInTheDocument();
    expect(rpcArgsOf("find_workspace_by_space_id")).toEqual([{ p_space_id: "space-9" }]);
  });

  it("参加すると、選んだ合言葉を DB の関数に送り、タスク画面へ移る", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    setResponses("rpc:join_workspaces", { data: null, error: null });
    await renderJoin();
    await search("space-3");

    await act(async () => {
      fireEvent.click(button("参加する"));
    });

    expect(rpcArgsOf("join_workspaces")).toEqual([{ p_space_ids: ["space-3"] }]);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースに参加しました。", color: 0 });
    expect(mockPush).toHaveBeenCalledWith("/task");
  });

  it("参加の返事を待つ間は押せず、2回送らない", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    setResponses("rpc:join_workspaces", new Promise(() => {}) as never);
    await renderJoin();
    await search("space-3");

    await act(async () => {
      fireEvent.click(button("参加する"));
    });
    expect(button("参加する")).toBeDisabled();

    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ワークスペースへの参加" }));
    });
    expect(rpcArgsOf("join_workspaces")).toHaveLength(1);
  });

  it("参加の時点で合言葉が合わなければ、欄にエラーを出して移動しない", async () => {
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    setResponses("rpc:join_workspaces", { data: null, error: { code: "P0002" } });
    await renderJoin();
    await search("space-3");

    await act(async () => {
      fireEvent.click(button("参加する"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("ワークスペースが見つかりません。");
    expect(button("参加する")).toBeEnabled();
    expect(spaceInput()).toHaveFocus();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("参加に失敗したら通知を出し、選んだ一覧を残す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("rpc:find_workspace_by_space_id", { data: { id: 3, workspace_name: "営業" }, error: null });
    setResponses("rpc:join_workspaces", { data: null, error: { code: "500" } });
    await renderJoin();
    await search("space-3");

    await act(async () => {
      fireEvent.click(button("参加する"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースに参加できませんでした。", color: 1 });
    expect(within(selected()).getByText("営業")).toBeInTheDocument();
    expect(button("参加する")).toBeEnabled();
    expect(spaceInput()).toHaveFocus();
    consoleError.mockRestore();
  });

  it("ログインしていなければ、知らせて前の画面へ戻る", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await renderJoin();

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ログインしていません。", color: 1 });
    expect(mockBack).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("登録の途中は3段階目を出し、ログアウトを出さない", async () => {
    await renderJoin("atSignUp=true");
    expect(within(screen.getByRole("list", { name: "登録の進み具合" })).getByText("ワークスペース").closest("li")).toHaveAttribute(
      "aria-current",
      "step"
    );
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
  });

  it("設定から開いたときは設定へ戻り、作成の画面へ条件を持って移る", async () => {
    await renderJoin("atSignUp=false&workspaceId=7");

    fireEvent.click(button("ワークスペースの設定へ戻る"));
    expect(mockPush).toHaveBeenCalledWith("/editWorkspace?workspaceId=7");

    fireEvent.click(button("ワークスペースを作成する"));
    expect(mockPush).toHaveBeenCalledWith("/createWorkspace?atSignUp=false&workspaceId=7");
  });

  it("ワークスペースが無いときの戻るはログアウトする", async () => {
    await renderJoin();

    fireEvent.click(button("ログアウト"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
