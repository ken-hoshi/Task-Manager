// ワークスペースの設定画面。画面に出る文字・欄とボタンの名前・DB に送る値で確かめる。
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import SuspenseEditWorkspace from "@/app/editWorkspace/suspenseEditWorkspace/suspenseEditWorkspace";
import { opsOf, insertsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";

const mockPush = jest.fn();
const mockLogout = jest.fn();
const mockSetNotification = jest.fn();
const mockSetDisplayWorkspaceId = jest.fn();
const mockSetPageUpdated = jest.fn();
const mockGetSession = jest.fn();
const mockShellCurrent = jest.fn();
let mockQuery = "workspaceId=1";
let mockPageUpdated = false;
let mockOnDragEnd: ((event: DragEndEvent) => Promise<void>) | undefined;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockQuery),
}));
jest.mock("@/app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/hooks/getSession", () => ({
  getSession: () => mockGetSession(),
}));
jest.mock("@/app/lib/api/getUserId", () => ({
  getUserId: async () => 5,
}));
jest.mock("@/app/hooks/logout", () => ({
  Logout: () => ({ useLogout: mockLogout }),
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
    displayWorkspaceId: 1,
    setDisplayWorkspaceId: mockSetDisplayWorkspaceId,
  }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: mockPageUpdated, setPageUpdated: mockSetPageUpdated }),
}));
// サイドバーは appShell のテストで確かめるので、中身だけ描く
jest.mock("@/app/component/appShell/appShell", () => ({
  __esModule: true,
  default: ({ current, children }: { current: unknown; children: React.ReactNode }) => {
    mockShellCurrent(current);
    return <main>{children}</main>;
  },
}));
// jsdom には配置が無くドラッグできないので、置いたときの処理を受け取って直接呼ぶ
jest.mock("@dnd-kit/core", () => {
  const actual = jest.requireActual("@dnd-kit/core");
  return {
    ...actual,
    DndContext: (props: { onDragEnd: (event: DragEndEvent) => Promise<void> }) => {
      mockOnDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

const workspaceRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  workspace_name: "開発チーム",
  space_id: "space-abc",
  workspace_task_genre: [
    { id: 11, task_genre_name: "設計", sort_id: 2 },
    { id: 10, task_genre_name: "調査", sort_id: 1 },
    { id: 12, task_genre_name: "実装", sort_id: 3 },
  ],
  workspace_users: [
    { users: { id: 5, name: "自分の名前" } },
    { users: { id: 6, name: "佐藤" } },
  ],
  ...overrides,
});

const ok = (data: unknown = null) => ({ data, error: null });
const failed = { data: null, error: { message: "boom" } };
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const genreNames = () =>
  within(screen.getByRole("list", { name: "ジャンルの一覧" }))
    .getAllByRole("listitem")
    .map((row) => row.textContent);

const renderPage = async () => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<SuspenseEditWorkspace />);
  });
  return result;
};

// 削除のボタンを押し、確認で「削除する」を押す
const deleteGenre = async (name: string) => {
  fireEvent.click(screen.getByRole("button", { name: `「${name}」を削除` }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
  });
};

const openMemberTab = () => {
  fireEvent.mouseDown(screen.getByRole("tab", { name: "メンバー" }), { button: 0 });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  mockQuery = "workspaceId=1";
  mockPageUpdated = false;
  mockOnDragEnd = undefined;
  mockGetSession.mockResolvedValue({ user: { id: "auth-1" } });
  setResponses("workspace", ok(workspaceRow()));
});

describe("表示", () => {
  it("設定の枠の中に、名前・合言葉・並び順どおりのジャンルを出す", async () => {
    await renderPage();

    expect(mockShellCurrent).toHaveBeenCalledWith({ kind: "workspaceSettings" });
    expect(mockSetDisplayWorkspaceId).toHaveBeenCalledWith(1);
    expect(screen.getByRole("heading", { level: 1, name: "ワークスペースの設定" })).toBeInTheDocument();
    expect(screen.getByText("開発チーム")).toBeInTheDocument();
    expect(screen.getByText("space-abc")).toBeInTheDocument();
    expect(genreNames()).toEqual(["調査", "設計", "実装"]);
  });

  it("ジャンルが0件なら空の表示を出す", async () => {
    setResponses("workspace", ok(workspaceRow({ workspace_task_genre: [] })));
    await renderPage();

    expect(screen.getByText("ジャンルはまだありません")).toBeInTheDocument();
    fireEvent.click(button("ジャンルを追加"));
    expect(screen.queryByText("ジャンルはまだありません")).not.toBeInTheDocument();
  });

  it("読めなければ、知らせてタスク画面へ移す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace", failed);
    await renderPage();

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペースを読めませんでした。", color: 1 });
    expect(mockPush).toHaveBeenCalledWith("/task");
    // 読めないワークスペースを表示中に残さない（タスク画面が空になる）
    expect(mockSetDisplayWorkspaceId).toHaveBeenCalledWith(null);
    expect(mockSetDisplayWorkspaceId).not.toHaveBeenCalledWith(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
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

  it("URL のワークスペースが変わると読み直し、遅れて届いた前の返事で上書きしない", async () => {
    let finishFirst: (value: unknown) => void = () => {};
    setResponses(
      "workspace",
      new Promise((resolve) => (finishFirst = resolve)) as never,
      ok(workspaceRow({ id: 2, workspace_name: "営業チーム", space_id: "space-2" }))
    );
    const { rerender } = await renderPage();

    mockQuery = "workspaceId=2";
    await act(async () => {
      rerender(<SuspenseEditWorkspace />);
    });
    await waitFor(() => expect(screen.getByText("営業チーム")).toBeInTheDocument());

    await act(async () => finishFirst(ok(workspaceRow())));
    expect(screen.getByText("営業チーム")).toBeInTheDocument();
    expect(screen.queryByText("開発チーム")).not.toBeInTheDocument();
  });

  it("保存の返事を待つ間に切り替えても、前のワークスペースの名前が新しい画面に入らない", async () => {
    let finishSave: (value: unknown) => void = () => {};
    setResponses(
      "workspace",
      ok(workspaceRow()),
      new Promise((resolve) => (finishSave = resolve)) as never,
      ok(workspaceRow({ id: 2, workspace_name: "営業チーム", space_id: "space-2" }))
    );
    const { rerender } = await renderPage();

    fireEvent.click(button("ワークスペース名を編集"));
    fireEvent.change(screen.getByLabelText("ワークスペース名"), { target: { value: "前の名前" } });
    await act(async () => {
      fireEvent.click(button("ワークスペース名を保存"));
    });
    mockQuery = "workspaceId=2";
    await act(async () => {
      rerender(<SuspenseEditWorkspace />);
    });
    await waitFor(() => expect(screen.getByText("営業チーム")).toBeInTheDocument());

    await act(async () => finishSave(ok()));

    expect(screen.getByText("営業チーム")).toBeInTheDocument();
    expect(screen.queryByText("前の名前")).not.toBeInTheDocument();
  });

  it("名前を変えたあとの読み直しの合図は、すぐ戻す", async () => {
    mockPageUpdated = true;
    await renderPage();
    expect(mockSetPageUpdated).toHaveBeenCalledWith(false);
  });

  it("作成と参加の画面へ、今のワークスペースを持って移る", async () => {
    await renderPage();

    fireEvent.click(button("ワークスペースを作成する"));
    expect(mockPush).toHaveBeenCalledWith("/createWorkspace?atSignUp=false&workspaceId=1");
    fireEvent.click(button("他のワークスペースに参加する"));
    expect(mockPush).toHaveBeenCalledWith("/joinWorkspace?atSignUp=false&workspaceId=1");
  });
});

describe("基本情報", () => {
  const openNameForm = () => fireEvent.click(button("ワークスペース名を編集"));
  const nameInput = () => screen.getByLabelText("ワークスペース名");

  it("名前を保存すると DB へ送り、表示とサイドバーを更新して、編集のボタンへフォーカスを戻す", async () => {
    setResponses("workspace", ok(workspaceRow()), ok());
    await renderPage();

    openNameForm();
    expect(nameInput()).toHaveValue("開発チーム");
    fireEvent.change(nameInput(), { target: { value: "新しい名前" } });
    await act(async () => {
      fireEvent.click(button("ワークスペース名を保存"));
    });

    const ops = opsOf("workspace");
    const updateIndex = ops.findIndex(([op]) => op === "update");
    expect(ops.slice(updateIndex)).toEqual([
      ["update", [{ workspace_name: "新しい名前" }]],
      ["eq", ["id", 1]],
    ]);
    expect(screen.getByText("新しい名前")).toBeInTheDocument();
    expect(mockSetPageUpdated).toHaveBeenCalledWith(true);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペース名を更新しました。", color: 0 });
    expect(button("ワークスペース名を編集")).toHaveFocus();
  });

  it("保存に失敗したら知らせ、元の名前のまま", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace", ok(workspaceRow()), failed);
    await renderPage();

    openNameForm();
    fireEvent.change(nameInput(), { target: { value: "新しい名前" } });
    await act(async () => {
      fireEvent.click(button("ワークスペース名を保存"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ワークスペース名を更新できませんでした。", color: 1 });
    expect(screen.getByText("開発チーム")).toBeInTheDocument();
    expect(mockSetPageUpdated).not.toHaveBeenCalledWith(true);
    consoleError.mockRestore();
  });

  it("やめると保存せず、開き直すと今の名前に戻る", async () => {
    await renderPage();

    openNameForm();
    fireEvent.change(nameInput(), { target: { value: "書きかけ" } });
    fireEvent.click(button("編集をやめる"));

    expect(opsOf("workspace").filter(([op]) => op === "update")).toEqual([]);
    expect(button("ワークスペース名を編集")).toHaveFocus();
    openNameForm();
    expect(nameInput()).toHaveValue("開発チーム");
  });

  it("合言葉をコピーして、コピーしたと知らせる", async () => {
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    await renderPage();

    fireEvent.click(button("合言葉をコピー"));

    expect(writeText).toHaveBeenCalledWith("space-abc");
    // ドラッグの部品も読み上げ用の status を持つので、文字から探す
    expect(await screen.findByText("コピーしました")).toHaveAttribute("role", "status");
  });

  it("コピーできなければ、コピーしたと出さずに知らせる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockRejectedValue(new Error("denied")) } });
    await renderPage();

    await act(async () => {
      fireEvent.click(button("合言葉をコピー"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "合言葉をコピーできませんでした。", color: 1 });
    expect(screen.queryByText("コピーしました")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});

describe("ジャンル", () => {
  it("追加すると、最後の順番の次で DB に入れ、一覧に足す", async () => {
    setResponses("workspace_task_genre", ok({ id: 13, task_genre_name: "試験", sort_id: 4 }));
    await renderPage();

    fireEvent.click(button("ジャンルを追加"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "試験" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });

    expect(insertsOf("workspace_task_genre")).toEqual([
      { task_genre_name: "試験", workspace_id: 1, sort_id: 4 },
    ]);
    expect(genreNames()).toEqual(["調査", "設計", "実装", "試験"]);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを追加しました。", color: 0 });
    expect(button("ジャンルを追加")).toHaveFocus();
  });

  it("追加に失敗したら知らせて、フォームを閉じる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_task_genre", failed);
    await renderPage();

    fireEvent.click(button("ジャンルを追加"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "試験" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを追加できませんでした。", color: 1 });
    expect(screen.queryByRole("textbox", { name: "ジャンル名" })).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("編集すると、その行の id に名前を送り、一覧を更新する", async () => {
    setResponses("workspace_task_genre", ok());
    await renderPage();

    fireEvent.click(button("「設計」を編集"));
    const input = screen.getByRole("textbox", { name: "ジャンル名" });
    expect(input).toHaveValue("設計");
    fireEvent.change(input, { target: { value: "基本設計" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });

    expect(opsOf("workspace_task_genre")).toEqual([
      ["update", [{ task_genre_name: "基本設計" }]],
      ["eq", ["id", 11]],
    ]);
    expect(genreNames()).toEqual(["調査", "基本設計", "実装"]);
    expect(button("「基本設計」を編集")).toHaveFocus();
  });

  it("編集に失敗したら知らせて、元の名前のまま", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_task_genre", failed);
    await renderPage();

    fireEvent.click(button("「設計」を編集"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "基本設計" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを更新できませんでした。", color: 1 });
    expect(genreNames()).toEqual(["調査", "設計", "実装"]);
    consoleError.mockRestore();
  });

  it("削除は確認を挟み、キャンセルなら何も送らない", async () => {
    await renderPage();

    button("「設計」を削除").focus();
    fireEvent.click(button("「設計」を削除"));
    expect(screen.getByRole("dialog", { name: "「設計」を削除しますか？" })).toBeInTheDocument();
    expect(opsOf("workspace_task_genre")).toEqual([]);

    await act(async () => {
      fireEvent.click(button("キャンセル"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opsOf("workspace_task_genre")).toEqual([]);
    expect(genreNames()).toEqual(["調査", "設計", "実装"]);
    // 確認を閉じたら、押した削除のボタンへフォーカスを戻す。Radix は閉じたあとのフォーカスを
    // setTimeout(0) で動かすので、すぐに確かめると戻る前に当たり、ときどき落ちる
    await waitFor(() => expect(button("「設計」を削除")).toHaveFocus());
  });

  it("削除すると行を消し、後ろの行の順番を1つ詰める", async () => {
    setResponses("workspace_task_genre", ok());
    await renderPage();

    await deleteGenre("設計");

    expect(opsOf("workspace_task_genre")).toEqual([
      ["delete", []],
      ["eq", ["id", 11]],
      ["update", [{ sort_id: 2 }]],
      ["eq", ["id", 12]],
    ]);
    expect(genreNames()).toEqual(["調査", "実装"]);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを削除しました。", color: 0 });
    await waitFor(() => expect(button("ジャンルを追加")).toHaveFocus());
  });

  it("削除に失敗したら知らせて、行を残す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_task_genre", failed);
    await renderPage();

    await deleteGenre("設計");

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを削除できませんでした。", color: 1 });
    expect(genreNames()).toEqual(["調査", "設計", "実装"]);
    consoleError.mockRestore();
  });

  it("削除のあとの詰め直しに失敗したら、行は消したまま、並び順を保存できなかったと知らせる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_task_genre", ok(), failed, ok());
    await renderPage();

    await deleteGenre("設計");

    const updates = opsOf("workspace_task_genre").filter(([op]) => op === "update");
    expect(updates).toEqual([
      // 詰め直しの1件目（失敗）のあと、全行へ元の順番を送る
      ["update", [{ sort_id: 2 }]],
      ["update", [{ sort_id: 1 }]],
      ["update", [{ sort_id: 2 }]],
      ["update", [{ sort_id: 3 }]],
    ]);
    // DB からは消えているので、行も消し、削除に失敗したとは言わない
    expect(genreNames()).toEqual(["調査", "実装"]);
    expect(mockSetNotification).toHaveBeenCalledWith({
      message: "ジャンルを削除しましたが、並び順を保存できませんでした。",
      color: 1,
    });
    expect(mockSetNotification).not.toHaveBeenCalledWith({ message: "ジャンルを削除できませんでした。", color: 1 });
    consoleError.mockRestore();
  });

  it("削除の返事を待つ間は、確認の「削除する」を押せず、2回送らない", async () => {
    setResponses("workspace_task_genre", new Promise(() => {}) as never);
    await renderPage();

    fireEvent.click(button("「設計」を削除"));
    await act(async () => {
      fireEvent.click(button("削除する"));
    });
    await act(async () => {
      fireEvent.click(button("削除中"));
    });

    expect(opsOf("workspace_task_genre").filter(([op]) => op === "delete")).toHaveLength(1);
  });

  it("並べ替えのあとにジャンルを足すと、DB の順番の続きの値で入れる", async () => {
    setResponses("workspace_task_genre", ok(), ok(), ok(), ok({ id: 13, task_genre_name: "試験", sort_id: 4 }));
    await renderPage();

    await act(async () => {
      await mockOnDragEnd!({ active: { id: "12" }, over: { id: "10" } } as unknown as DragEndEvent);
    });
    fireEvent.click(button("ジャンルを追加"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "試験" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });

    // DB の順番は1から3なので、足す行は4。以前は画面の値（0から2）を使い、3が重なった
    expect(insertsOf("workspace_task_genre")).toEqual([
      { task_genre_name: "試験", workspace_id: 1, sort_id: 4 },
    ]);
    expect(genreNames()).toEqual(["実装", "調査", "設計", "試験"]);
  });

  it("並べ替えの保存に失敗しても、例外を投げずに元の並びへ戻して知らせる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_task_genre", failed, ok());
    await renderPage();

    await act(async () => {
      await expect(
        mockOnDragEnd!({ active: { id: "12" }, over: { id: "10" } } as unknown as DragEndEvent)
      ).resolves.toBeUndefined();
    });

    expect(genreNames()).toEqual(["調査", "設計", "実装"]);
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "ジャンルを並べ替えられませんでした。", color: 1 });
    consoleError.mockRestore();
  });

  it("名前の保存の返事を待つ間は押せず、2回送らない", async () => {
    setResponses("workspace", ok(workspaceRow()), new Promise(() => {}) as never);
    await renderPage();

    fireEvent.click(button("ワークスペース名を編集"));
    await act(async () => {
      fireEvent.click(button("ワークスペース名を保存"));
    });
    expect(button("ワークスペース名を保存")).toBeDisabled();
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ワークスペース名の編集" }));
    });

    expect(opsOf("workspace").filter(([op]) => op === "update")).toHaveLength(1);
  });

  it("ジャンルの追加と編集の返事を待つ間は押せず、2回送らない", async () => {
    setResponses("workspace_task_genre", new Promise(() => {}) as never);
    await renderPage();

    fireEvent.click(button("ジャンルを追加"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "試験" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });
    expect(button("ジャンルを保存")).toBeDisabled();
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ジャンルの追加" }));
    });
    expect(insertsOf("workspace_task_genre")).toHaveLength(1);
  });

  it("ジャンルの編集の返事を待つ間は押せず、2回送らない", async () => {
    setResponses("workspace_task_genre", new Promise(() => {}) as never);
    await renderPage();

    fireEvent.click(button("「設計」を編集"));
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });
    expect(button("ジャンルを保存")).toBeDisabled();
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "「設計」の編集" }));
    });
    expect(opsOf("workspace_task_genre").filter(([op]) => op === "update")).toHaveLength(1);
  });

  it("追加の返事を待つ間に別のフォームを開いても、そのフォームを閉じない", async () => {
    let finishAdd: (value: unknown) => void = () => {};
    setResponses("workspace_task_genre", new Promise((resolve) => (finishAdd = resolve)) as never);
    await renderPage();

    fireEvent.click(button("ジャンルを追加"));
    fireEvent.change(screen.getByRole("textbox", { name: "ジャンル名" }), { target: { value: "試験" } });
    await act(async () => {
      fireEvent.click(button("ジャンルを保存"));
    });
    fireEvent.click(button("ワークスペース名を編集"));
    fireEvent.change(screen.getByLabelText("ワークスペース名"), { target: { value: "入力中" } });

    await act(async () => finishAdd(ok({ id: 13, task_genre_name: "試験", sort_id: 4 })));

    expect(screen.getByLabelText("ワークスペース名")).toHaveValue("入力中");
  });

  it("名前の編集中にジャンルを消しても、名前の編集の欄は残る", async () => {
    setResponses("workspace_task_genre", ok());
    await renderPage();

    fireEvent.click(button("ワークスペース名を編集"));
    fireEvent.change(screen.getByLabelText("ワークスペース名"), { target: { value: "入力中" } });
    await deleteGenre("設計");

    expect(screen.getByLabelText("ワークスペース名")).toHaveValue("入力中");
  });

  it("並べ替えは Enter で掴み、長押しの繰り返しでは置かず、Tab でやめると何も送らない", async () => {
    await renderPage();
    const handle = () => button("「実装」を並べ替え");
    // キーボードの操作は次の tick で受け付けられる
    const tick = () =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    handle().focus();

    fireEvent.keyDown(handle(), { code: "Enter", key: "Enter" });
    await tick();
    expect(handle()).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(handle(), { code: "Enter", key: "Enter", repeat: true });
    await tick();
    expect(handle()).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(document, { code: "Tab", key: "Tab" });
    await tick();
    expect(handle()).not.toHaveAttribute("aria-pressed", "true");
    expect(opsOf("workspace_task_genre")).toEqual([]);
  });

  it("並べ替えのボタンに名前があり、置くと全行の順番を1から送る", async () => {
    setResponses("workspace_task_genre", ok());
    await renderPage();
    expect(button("「実装」を並べ替え")).toBeInTheDocument();

    await act(async () => {
      await mockOnDragEnd!({ active: { id: "12" }, over: { id: "10" } } as unknown as DragEndEvent);
    });

    expect(genreNames()).toEqual(["実装", "調査", "設計"]);
    expect(opsOf("workspace_task_genre")).toEqual([
      ["update", [{ sort_id: 1 }]],
      ["eq", ["id", 12]],
      ["update", [{ sort_id: 2 }]],
      ["eq", ["id", 10]],
      ["update", [{ sort_id: 3 }]],
      ["eq", ["id", 11]],
    ]);
  });

  it("同じ位置や一覧の外に置いたら、何も送らない", async () => {
    await renderPage();

    await act(async () => {
      await mockOnDragEnd!({ active: { id: "12" }, over: { id: "12" } } as unknown as DragEndEvent);
      await mockOnDragEnd!({ active: { id: "12" }, over: null } as unknown as DragEndEvent);
    });

    expect(opsOf("workspace_task_genre")).toEqual([]);
  });

  it("開けるフォームは1つだけで、別のフォームを開くと閉じる", async () => {
    await renderPage();

    fireEvent.click(button("ジャンルを追加"));
    expect(screen.getByRole("form", { name: "ジャンルの追加" })).toBeInTheDocument();

    fireEvent.click(button("「設計」を編集"));
    expect(screen.queryByRole("form", { name: "ジャンルの追加" })).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "「設計」の編集" })).toBeInTheDocument();

    fireEvent.click(button("ワークスペース名を編集"));
    expect(screen.queryByRole("form", { name: "「設計」の編集" })).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "ワークスペース名の編集" })).toBeInTheDocument();
  });

  it("タブを切り替えると、開いていたフォームを閉じる", async () => {
    await renderPage();

    fireEvent.click(button("ワークスペース名を編集"));
    openMemberTab();

    expect(screen.queryByRole("form", { name: "ワークスペース名の編集" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "メンバーの一覧" })).toBeInTheDocument();
  });
});

describe("メンバー", () => {
  it("自分に印を付けて一覧を出す", async () => {
    await renderPage();
    openMemberTab();

    const rows = within(screen.getByRole("list", { name: "メンバーの一覧" })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["自分の名前（自分）", "佐藤"]);
  });

  it("確認で「外す」を押すと、そのメンバーを外す", async () => {
    setResponses("workspace_users", ok());
    await renderPage();
    openMemberTab();

    // ブラウザでは押したボタンにフォーカスが移る
    button("「佐藤」をメンバーから外す").focus();
    fireEvent.click(button("「佐藤」をメンバーから外す"));
    expect(screen.getByRole("dialog", { name: "「佐藤」を外しますか？" })).toBeInTheDocument();
    expect(opsOf("workspace_users")).toEqual([]);

    await act(async () => {
      fireEvent.click(button("外す"));
    });

    expect(opsOf("workspace_users")).toEqual([
      ["delete", []],
      ["eq", ["workspace_id", 1]],
      ["eq", ["user_id", 6]],
    ]);
    expect(screen.queryByText("佐藤")).not.toBeInTheDocument();
    expect(mockSetNotification).toHaveBeenCalledWith({ message: "メンバーを外しました。", color: 0 });
    expect(mockLogout).not.toHaveBeenCalled();
    // 外した行のボタンは消えるので、残っている行のボタンへフォーカスを移す
    await waitFor(() => expect(button("「自分の名前」をメンバーから外す")).toHaveFocus());
  });

  it("自分を外すときは確認で伝え、外したらログアウトする", async () => {
    setResponses("workspace_users", ok());
    await renderPage();
    openMemberTab();

    fireEvent.click(button("「自分の名前」をメンバーから外す"));
    expect(screen.getByText("自分を外すと、このワークスペースから抜けてログアウトします。")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(button("外す"));
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("外せなかったら知らせて、確認と一覧を残す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    setResponses("workspace_users", failed);
    await renderPage();
    openMemberTab();

    fireEvent.click(button("「佐藤」をメンバーから外す"));
    await act(async () => {
      fireEvent.click(button("外す"));
    });

    expect(mockSetNotification).toHaveBeenCalledWith({ message: "メンバーを外せませんでした。", color: 1 });
    expect(screen.getByRole("dialog", { name: "「佐藤」を外しますか？" })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("確認でキャンセルすると、何も送らない", async () => {
    await renderPage();
    openMemberTab();

    fireEvent.click(button("「佐藤」をメンバーから外す"));
    fireEvent.click(button("キャンセル"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opsOf("workspace_users")).toEqual([]);
  });
});
