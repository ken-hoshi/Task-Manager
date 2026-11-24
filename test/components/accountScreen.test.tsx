// アカウント画面。画面に出る文字・欄とボタンの名前・認証と DB に送る値で確かめる。
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SuspenseAccount from "@/app/account/suspenseAccount/suspenseAccount";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";

const mockPush = jest.fn();
const mockSetNotification = jest.fn();
const mockSetDisplayWorkspaceId = jest.fn();
const mockSetPageUpdated = jest.fn();
const mockGetSession = jest.fn();
const mockGetWorkspace = jest.fn();
const mockShellCurrent = jest.fn();
const mockSignIn = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetUser = jest.fn();
const mockDeleteUser = jest.fn();
let mockDisplayWorkspaceId: number | null = 1;
let mockPageUpdated = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/app/lib/supabase/client", () => ({
  clientSupabase: {
    ...require("../helpers/mockSupabase").mockClient,
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getUser: () => mockGetUser(),
      admin: { deleteUser: (...args: unknown[]) => mockDeleteUser(...args) },
    },
  },
}));
jest.mock("@/app/hooks/getSession", () => ({
  getSession: () => mockGetSession(),
}));
jest.mock("@/app/lib/api/getUserId", () => ({
  getUserId: async () => 5,
}));
jest.mock("@/app/lib/api/getWorkspace", () => ({
  getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
}));
jest.mock("@/app/hooks/sessionTimeout", () => ({
  useSessionTimeout: () => {},
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({
    notificationValue: { message: null, color: null },
    setNotificationValue: mockSetNotification,
  }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({
    displayWorkspaceId: mockDisplayWorkspaceId,
    setDisplayWorkspaceId: mockSetDisplayWorkspaceId,
  }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: mockPageUpdated, setPageUpdated: mockSetPageUpdated }),
}));
jest.mock("@/app/component/appShell/appShell", () => ({
  __esModule: true,
  default: ({
    userId,
    current,
    children,
  }: {
    userId: number;
    current: unknown;
    children: React.ReactNode;
  }) => {
    mockShellCurrent(current, userId);
    return <main>{children}</main>;
  },
}));

const PASSWORD_RULE = "パスワードは、英字と数字だけで両方を含む8文字以上にしてください。";
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const field = (label: RegExp) => screen.getByLabelText(label);
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

const renderPage = async () => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<SuspenseAccount />);
  });
  return result;
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(button("更新する"));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  delete process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
  mockDisplayWorkspaceId = 1;
  mockPageUpdated = false;
  mockGetSession.mockResolvedValue({ user: { id: "auth-1" } });
  mockGetWorkspace.mockResolvedValue([{ workspace: { id: 3, workspace_name: "開発" } }]);
  mockSignIn.mockResolvedValue({ error: null });
  mockUpdateUser.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
  mockDeleteUser.mockResolvedValue({ error: { message: "forbidden" } });
  setResponses("users", { data: { name: "山田", email: "yamada@example.com" }, error: null });
});

describe("表示", () => {
  it("サイドバーの枠の中に、名前・メールと3つの入口を出す", async () => {
    await renderPage();

    expect(mockShellCurrent).toHaveBeenLastCalledWith(null, 5);
    expect(screen.getByRole("heading", { level: 1, name: "アカウント" })).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
    expect(button("名前・メールアドレスを編集")).toBeInTheDocument();
    expect(button("パスワードを編集")).toBeInTheDocument();
    expect(button("アカウントを削除")).toBeInTheDocument();
  });

  it("表示中のワークスペースが無ければ、最初のものを選ぶ", async () => {
    mockDisplayWorkspaceId = null;
    await renderPage();

    expect(mockGetWorkspace).toHaveBeenCalledWith(5);
    expect(mockSetDisplayWorkspaceId).toHaveBeenCalledWith(3);
  });

  it("workspace が配列で返っても、最初のものを選ぶ", async () => {
    mockDisplayWorkspaceId = null;
    mockGetWorkspace.mockResolvedValue([{ workspace: [{ id: 4, workspace_name: "営業" }] }]);
    await renderPage();

    expect(mockSetDisplayWorkspaceId).toHaveBeenCalledWith(4);
  });

  it("一覧の返事を待つ間にサイドバーで選んだら、その選択を残す", async () => {
    mockDisplayWorkspaceId = null;
    let finish: (value: unknown) => void = () => {};
    mockGetWorkspace.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { rerender } = await renderPage();

    mockDisplayWorkspaceId = 9;
    await act(async () => {
      rerender(<SuspenseAccount />);
    });
    await act(async () => finish([{ workspace: { id: 3, workspace_name: "開発" } }]));

    expect(mockSetDisplayWorkspaceId).not.toHaveBeenCalled();
  });

  it("所属が無くても、落ちずに表示する", async () => {
    mockDisplayWorkspaceId = null;
    mockGetWorkspace.mockResolvedValue([]);
    await renderPage();

    expect(mockSetDisplayWorkspaceId).not.toHaveBeenCalled();
    expect(screen.getByText("山田")).toBeInTheDocument();
  });

  it("表示中のワークスペースがあれば、変えない", async () => {
    await renderPage();

    expect(mockGetWorkspace).not.toHaveBeenCalled();
    expect(mockSetDisplayWorkspaceId).not.toHaveBeenCalled();
  });

  it("読めなければ、知らせてタスク画面へ移す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("users", { data: null, error: { message: "boom" } });
    await renderPage();

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "アカウントの情報を読めませんでした。", color: 1 });
    expect(mockPush).toHaveBeenCalledWith("/task");
    consoleError.mockRestore();
  });

  it("ログインしていなければ、入口へ戻す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    mockGetSession.mockResolvedValue(null);
    await renderPage();

    expect(alertSpy).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
    alertSpy.mockRestore();
    consoleError.mockRestore();
  });
});

describe("名前とメールアドレスの編集", () => {
  const open = async () => {
    await renderPage();
    fireEvent.click(button("名前・メールアドレスを編集"));
  };

  it("今の値をラベル付きの欄に出し、戻るとボタンへフォーカスを戻す", async () => {
    await open();

    expect(field(/^名前\*/)).toHaveValue("山田");
    expect(field(/^メールアドレス/)).toHaveValue("yamada@example.com");
    expect(field(/^パスワード/)).toHaveAccessibleDescription("本人確認のために、今のパスワードを入力します。");

    fireEvent.click(button("戻る"));
    expect(button("名前・メールアドレスを編集")).toHaveFocus();
  });

  it("保存すると、認証と users 表の両方へ送る", async () => {
    await open();
    change(field(/^名前\*/), "山田太郎");
    change(field(/^パスワード/), "abcd1234");
    await submit();

    expect(mockSignIn).toHaveBeenCalledWith({ email: "yamada@example.com", password: "abcd1234" });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      email: "yamada@example.com",
      data: { display_name: "山田太郎" },
    });
    const ops = opsOf("users");
    const updateIndex = ops.findIndex(([op]) => op === "update");
    expect(ops.slice(updateIndex, updateIndex + 2)).toEqual([
      ["update", [{ email: "yamada@example.com", name: "山田太郎" }]],
      ["eq", ["id", 5]],
    ]);
    expect(mockSetPageUpdated).toHaveBeenCalledWith(true);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "名前とメールアドレスを更新しました。", color: 0 });
    expect(button("名前・メールアドレスを編集")).toHaveFocus();

    // 送ったパスワードを、次に開いたフォームへ残さない
    fireEvent.click(button("名前・メールアドレスを編集"));
    expect(field(/^パスワード/)).toHaveValue("");
  });

  it("保存を待つ間に別の場所へ移っていたら、終わってもフォーカスを奪わない", async () => {
    let finish: (value: unknown) => void = () => {};
    mockUpdateUser.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await open();
    change(field(/^パスワード/), "abcd1234");
    await submit();

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await act(async () => finish({ error: null }));

    expect(button("名前・メールアドレスを編集")).toBeInTheDocument();
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("パスワードが違えば、欄にエラーを結び付けて保存せず、直すとエラーを消す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockSignIn.mockResolvedValue({ error: { message: "invalid" } });
    await open();
    change(field(/^パスワード/), "wrong1234");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("パスワードが違います。");
    expect(field(/^パスワード/)).toHaveAttribute("aria-invalid", "true");
    expect(field(/^パスワード/)).toHaveFocus();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(button("更新する")).toBeEnabled();

    change(field(/^パスワード/), "abcd1234");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("使えないメールなら、欄にエラーを出して保存しない", async () => {
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN = "example.com";
    await open();
    change(field(/^メールアドレス/), "yamada@other.test");
    change(field(/^パスワード/), "abcd1234");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("このメールアドレスは使用できません。");
    expect(field(/^メールアドレス/)).toHaveFocus();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("パスワードが規則に合わなければ、保存しない", async () => {
    await open();
    change(field(/^パスワード/), "abc");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(PASSWORD_RULE);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("users 表の更新に失敗したら、認証の側を元の値へ戻す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses(
      "users",
      { data: { name: "山田", email: "yamada@example.com" }, error: null },
      { data: null, error: { message: "boom" } },
      { data: { name: "山田", email: "yamada@example.com" }, error: null }
    );
    await open();
    change(field(/^名前\*/), "山田太郎");
    change(field(/^パスワード/), "abcd1234");
    await submit();

    expect(mockUpdateUser).toHaveBeenLastCalledWith({
      email: "yamada@example.com",
      data: { display_name: "山田" },
    });
    consoleError.mockRestore();
  });

  it("保存の返事を待つ間は押せず、2回送らない", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));
    await open();
    change(field(/^パスワード/), "abcd1234");
    await submit();
    expect(button("更新する")).toBeDisabled();

    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "名前とメールアドレスの編集" }));
    });
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it("編集中に読み直しが走っても、書きかけの入力を消さない", async () => {
    const { rerender } = await renderPage();
    fireEvent.click(button("名前・メールアドレスを編集"));
    change(field(/^名前\*/), "書きかけ");

    mockPageUpdated = true;
    await act(async () => {
      rerender(<SuspenseAccount />);
    });

    await waitFor(() => expect(mockSetPageUpdated).toHaveBeenCalledWith(false));
    expect(field(/^名前\*/)).toHaveValue("書きかけ");
  });
});

describe("パスワードの編集", () => {
  const open = async () => {
    await renderPage();
    fireEvent.click(button("パスワードを編集"));
  };
  const fill = (next: string, confirm: string, current: string) => {
    change(field(/^新しいパスワード\*/), next);
    change(field(/^新しいパスワード（確認）/), confirm);
    change(field(/^今のパスワード/), current);
  };

  it("保存すると、今のパスワードで確かめてから新しいパスワードを送る", async () => {
    await open();
    expect(field(/^新しいパスワード\*/)).toHaveAccessibleDescription("英字と数字だけで、両方を含む8文字以上");
    fill("newpass123", "newpass123", "abcd1234");
    await submit();

    expect(mockSignIn).toHaveBeenCalledWith({ email: "yamada@example.com", password: "abcd1234" });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpass123" });
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "パスワードを更新しました。", color: 0 });
    expect(button("パスワードを編集")).toHaveFocus();
  });

  it("新しいパスワードが規則に合わなければ、その欄へフォーカスを移す", async () => {
    await open();
    fill("abc", "abc", "abcd1234");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(PASSWORD_RULE);
    expect(field(/^新しいパスワード\*/)).toHaveFocus();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("確認が違えば、その欄へフォーカスを移す", async () => {
    await open();
    fill("newpass123", "newpass124", "abcd1234");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("確認用のパスワードが、新しいパスワードと違います。");
    expect(field(/^新しいパスワード（確認）/)).toHaveFocus();
    expect(mockUpdateUser).not.toHaveBeenCalled();

    // 新しいパスワードの側を直しても、不一致のエラーを消す
    change(field(/^新しいパスワード\*/), "newpass124");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(field(/^新しいパスワード（確認）/)).not.toHaveAttribute("aria-invalid");
  });

  it("今のパスワードが違えば、その欄へフォーカスを移し、直すとエラーを消す", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "invalid" } });
    await open();
    fill("newpass123", "newpass123", "wrong1234");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("今のパスワードが違います。");
    expect(field(/^今のパスワード/)).toHaveFocus();
    expect(mockUpdateUser).not.toHaveBeenCalled();

    change(field(/^今のパスワード/), "abcd1234");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("戻ると保存せず、ボタンへフォーカスを戻す", async () => {
    await open();
    fireEvent.click(button("戻る"));

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(button("パスワードを編集")).toHaveFocus();
  });
});

describe("アカウントの削除", () => {
  it("確認でキャンセルすると、何も送らない", async () => {
    await renderPage();
    fireEvent.click(button("アカウントを削除"));
    expect(screen.getByRole("dialog", { name: "アカウントを削除しますか？" })).toBeInTheDocument();

    fireEvent.click(button("キャンセル"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("削除に失敗したら、日本語で知らせる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    await renderPage();
    fireEvent.click(button("アカウントを削除"));
    await act(async () => {
      fireEvent.click(button("削除する"));
    });

    expect(mockDeleteUser).toHaveBeenCalledWith("auth-1");
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "アカウントを削除できませんでした。", color: 1 });
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
    consoleError.mockRestore();
  });
});
