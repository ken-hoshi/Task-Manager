// プロジェクト画面の「ボード」（taskBoard）。画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
// jsdom には配置が無く本物のドラッグを動かせないので、落とす操作は DndContext の onDragEnd を直接呼ぶ。
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskBoard, {
  boardCollisionDetection,
  columnCoordinateGetter,
} from "@/app/project/taskBoard/taskBoard";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";
import { attachedFiles, statuses, task } from "./taskFixtures";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const push = jest.fn();
const postMailNotifications = jest.fn(async () => undefined);
let pageUpdated = false;
// 描かれた DndContext に渡っている処理
let dnd: { onDragEnd: (event: unknown) => void; onDragStart: (event: unknown) => void };

jest.mock("@dnd-kit/core", () => {
  const actual = jest.requireActual("@dnd-kit/core");
  return {
    ...actual,
    DndContext: (props: any) => {
      dnd = props;
      return <actual.DndContext {...props} />;
    },
  };
});
jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: jest.fn() }),
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 1 }),
}));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: (...args: unknown[]) => postMailNotifications(...(args as [])),
}));
jest.mock("@/app/component/editButton/editButton", () => () => null);
// 本物の削除のダイアログと同じく、画面では body の下に出るが React の上ではカードの子になる
jest.mock("@/app/component/deleteButton/deleteButton", () => (props: { taskId: number }) =>
  require("react-dom").createPortal(<p>ダイアログの本文 {props.taskId}</p>, document.body)
);

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  pageUpdated = false;
});

const boardTasks = [
  { ...task, id: 1, task_name: "画面", status_id: 1, details: "画面の説明" },
  { ...task, id: 2, task_name: "API", status_id: 2, users: { name: "田中" } },
];

type Props = React.ComponentProps<typeof TaskBoard>;

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  userId: 5,
  smallProjectIdList: [1],
  displaySmallProjectId: 1,
  taskData: [{ smallProjectId: 1, taskDataArray: boardTasks }],
  statusData: statuses,
  taskAttachedFileData: [{ smallProjectId: 1, fileDataList: attachedFiles() }],
  filterMyTasks: false,
  ...overrides,
});

const column = (name: RegExp) => screen.getByRole("region", { name });

// 「完了」の列（status 3）に落とす
const dropOnCompleted = (activatorEvent: Event = new MouseEvent("pointerdown")) =>
  act(async () => {
    dnd.onDragEnd({
      active: { id: "1" },
      over: { id: "status-3" },
      activatorEvent,
    });
  });

describe("表示", () => {
  it("ステータスの列を日本語の名前と件数で出し、カードに期間と担当者を出す", () => {
    render(<TaskBoard {...baseProps()} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "未着手1",
      "進行中1",
      "完了0",
    ]);
    const todo = column(/^未着手/);
    expect(within(todo).getByRole("button", { name: "画面" })).toBeInTheDocument();
    expect(within(todo).getByText("04/01 〜 04/03")).toBeInTheDocument();
    expect(within(todo).getByText("星")).toBeInTheDocument();
    expect(within(column(/^進行中/)).getByText("田中")).toBeInTheDocument();
    expect(within(column(/^完了/)).getByText("タスクはありません")).toBeInTheDocument();
  });

  it("「自分のタスクだけ」で0件の列は、そう伝える", () => {
    render(<TaskBoard {...baseProps({ filterMyTasks: true })} />);
    expect(within(column(/^完了/)).getByText("自分のタスクはありません")).toBeInTheDocument();
  });

  it("カードの名前で詳細と添付を開き、もう一度押すと閉じる", () => {
    render(<TaskBoard {...baseProps()} />);
    const toggle = screen.getByRole("button", { name: "画面" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("画面の説明")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("画面の説明")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "spec.pdf" })).toHaveAttribute("href", "blob:spec");

    fireEvent.click(toggle);
    expect(screen.queryByText("画面の説明")).not.toBeInTheDocument();
  });

  it("表示中の小プロジェクトのデータが無ければ、落ちずに通知を出してタスク画面へ戻る", () => {
    render(<TaskBoard {...baseProps({ taskData: [{ smallProjectId: 2, taskDataArray: [] }] })} />);
    expect(setNotificationValue).toHaveBeenCalledWith({
      message: "プロジェクトのデータを読めませんでした。",
      color: 1,
    });
    expect(push).toHaveBeenCalledWith("/task");
  });
});

describe("カードを別の列へ移す", () => {
  it("落とすと、列のステータスの id を読んで tasks に送り、通知の処理を呼ぶ", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted();

    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("task_status")).toContainEqual(["eq", ["status", "Completed"]]);
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
    await waitFor(() => expect(postMailNotifications).toHaveBeenCalledWith(1, 5, 1, null, null, null, 1, []));
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("列の外に落としたら、何も送らない", async () => {
    render(<TaskBoard {...baseProps()} />);
    await act(async () => {
      dnd.onDragEnd({ active: { id: "1" }, over: null, activatorEvent: new MouseEvent("pointerdown") });
    });
    expect(opsOf("tasks")).toEqual([]);
    expect(opsOf("task_status")).toEqual([]);
  });

  it("保存に失敗したら「ステータスを変更できませんでした。」と出す", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    setResponses("tasks", { data: null, error: { message: "boom" } });
    render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted();
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "ステータスを変更できませんでした。", color: 1 })
    );
  });

  it("保存の返事が来てから画面を読み直す（以前からの順）", async () => {
    let finish: (value: unknown) => void = () => {};
    setResponses("task_status", { data: { id: 3 }, error: null });
    setResponses("tasks", new Promise((resolve) => (finish = resolve)) as never);
    render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted();
    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(setPageUpdated).not.toHaveBeenCalled();

    await act(async () => finish({ data: null, error: null }));
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));
  });
});

describe("置いたあとのフォーカス", () => {
  const moved = () =>
    baseProps({
      taskData: [{ smallProjectId: 1, taskDataArray: [{ ...boardTasks[0], status_id: 3 }, boardTasks[1]] }],
    });
  const keyboard = () => new KeyboardEvent("keydown", { code: "Enter" });
  const handle = () => screen.getByRole("button", { name: "「画面」を移動" });

  it("キーボードで置いたら、読み直しの途中では動かさず、移した先の列に出てから「移動」へ戻す", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    const { rerender } = render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted(keyboard());
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));

    // 読み直しの途中は、古い列のカードが一度描かれる
    pageUpdated = true;
    rerender(<TaskBoard {...baseProps()} />);
    expect(within(column(/^未着手/)).getByRole("button", { name: "「画面」を移動" })).not.toHaveFocus();

    pageUpdated = false;
    rerender(<TaskBoard {...moved()} />);
    const inCompleted = within(column(/^完了/)).getByRole("button", { name: "「画面」を移動" });
    await waitFor(() => expect(inCompleted).toHaveFocus());
  });

  it("読み直しを待つ間に別の欄へ移っていたら、フォーカスを奪わない", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    const { rerender } = render(
      <>
        <input aria-label="別の欄" />
        <TaskBoard {...baseProps()} />
      </>
    );
    await dropOnCompleted(keyboard());
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));
    screen.getByLabelText("別の欄").focus();

    pageUpdated = true;
    rerender(
      <>
        <input aria-label="別の欄" />
        <TaskBoard {...moved()} />
      </>
    );
    await act(async () => {});
    expect(screen.getByLabelText("別の欄")).toHaveFocus();
  });

  it("保存に失敗したら、あとでカードが描き直されてもフォーカスを動かさない", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    setResponses("tasks", { data: null, error: { message: "boom" } });
    const { rerender } = render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted(keyboard());
    await waitFor(() => expect(setNotificationValue).toHaveBeenCalled());

    pageUpdated = true;
    rerender(<TaskBoard {...moved()} />);
    await act(async () => {});
    expect(handle()).not.toHaveFocus();
  });

  it("マウスで置いたときは、フォーカスを動かさない", async () => {
    setResponses("task_status", { data: { id: 3 }, error: null });
    const { rerender } = render(<TaskBoard {...baseProps()} />);
    await dropOnCompleted();
    await waitFor(() => expect(setPageUpdated).toHaveBeenCalledWith(true));

    pageUpdated = true;
    rerender(<TaskBoard {...moved()} />);
    await act(async () => {});
    expect(handle()).not.toHaveFocus();
  });
});

describe("キーボードで掴む", () => {
  const handle = () => screen.getByRole("button", { name: "「画面」を移動" });
  const tick = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  const grab = async () => {
    handle().focus();
    fireEvent.keyDown(handle(), { code: "Enter", key: "Enter" });
    await tick();
  };

  it("「移動」は本物のボタンで、Enter で掴むと押された状態になる", async () => {
    render(<TaskBoard {...baseProps()} />);
    expect(handle()).not.toHaveAttribute("role");
    expect(handle()).not.toHaveAttribute("tabindex");
    await grab();
    expect(handle()).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    await tick();
  });

  it("Tab は置かずにやめて、何も送らない", async () => {
    render(<TaskBoard {...baseProps()} />);
    await grab();
    fireEvent.keyDown(document, { code: "Tab", key: "Tab" });
    await tick();
    expect(handle()).not.toHaveAttribute("aria-pressed", "true");
    expect(opsOf("tasks")).toEqual([]);
    expect(opsOf("task_status")).toEqual([]);
  });

  it("Enter の長押し（キーの繰り返し）では、掴んだカードを置かない", async () => {
    render(<TaskBoard {...baseProps()} />);
    await grab();
    fireEvent.keyDown(handle(), { code: "Enter", key: "Enter", repeat: true });
    await tick();
    expect(handle()).toHaveAttribute("aria-pressed", "true");
    expect(opsOf("task_status")).toEqual([]);
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    await tick();
  });
});

describe("マウスで掴む範囲", () => {
  // jsdom の PointerEvent の代わりに、dnd-kit が読む項目を足したイベントを送る
  const pointer = (
    element: Element,
    type: "pointerDown" | "pointerMove",
    x: number,
    y: number,
    pointerType = "mouse"
  ) => {
    const event = createEvent[type](element);
    Object.defineProperties(event, {
      button: { value: 0 },
      pointerType: { value: pointerType },
      isPrimary: { value: true },
      clientX: { value: x },
      clientY: { value: y },
    });
    fireEvent(element, event);
  };
  // 掴んでいる間は、カードの「移動」のボタンが押された状態（aria-pressed）になる
  const startDragFrom = async (element: Element, pointerType = "mouse") => {
    pointer(element, "pointerDown", 10, 10, pointerType);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    pointer(document as unknown as Element, "pointerMove", 40, 40);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const started =
      screen.getByRole("button", { name: "「画面」を移動" }).getAttribute("aria-pressed") === "true";
    // 始まっていたら、次のテストへ持ち越さないようにやめる
    await act(async () => {
      fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    });
    return started;
  };

  it("カードの本文を掴むとドラッグが始まる", async () => {
    render(<TaskBoard {...baseProps()} />);
    const body = within(column(/^未着手/)).getByText("04/01 〜 04/03");
    expect(await startDragFrom(body)).toBe(true);
  });

  it("「移動」のボタンを掴んでもドラッグが始まる", async () => {
    render(<TaskBoard {...baseProps()} />);
    expect(await startDragFrom(screen.getByRole("button", { name: "「画面」を移動" }))).toBe(true);
  });

  it("指で触れても、ドラッグは始まらない", async () => {
    render(<TaskBoard {...baseProps()} />);
    const body = within(column(/^未着手/)).getByText("04/01 〜 04/03");
    expect(await startDragFrom(body, "touch")).toBe(false);
  });

  it("開いた詳細の欄（文字を選べる）を押しても、ドラッグは始まらない", async () => {
    render(<TaskBoard {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "画面" }));
    expect(await startDragFrom(screen.getByText("画面の説明"))).toBe(false);
  });

  it("カードの中の開閉のボタンを押しても、ドラッグは始まらない", async () => {
    render(<TaskBoard {...baseProps()} />);
    expect(await startDragFrom(screen.getByRole("button", { name: "画面" }))).toBe(false);
  });

  it("カードの子のダイアログ（body の下に出る）の中を押しても、ドラッグは始まらない", async () => {
    render(<TaskBoard {...baseProps()} />);
    expect(await startDragFrom(screen.getByText("ダイアログの本文 1"))).toBe(false);
  });
});

describe("置く列の判定", () => {
  const rect = (left: number, width: number) => ({
    left,
    width,
    right: left + width,
    top: 0,
    bottom: 400,
    height: 400,
  });
  const args = (pointerCoordinates: { x: number; y: number } | null) =>
    ({
      active: { id: "1" },
      // カードは列 a に大きく重なり、列 b に少しだけ重なる
      collisionRect: rect(120, 100),
      droppableRects: new Map([
        ["a", rect(0, 200)],
        ["b", rect(210, 200)],
      ]),
      droppableContainers: [{ id: "a" }, { id: "b" }],
      pointerCoordinates,
    }) as any;
  const ids = (a: any) => boardCollisionDetection(a).map((collision) => collision.id);

  it("マウスは、重なりが大きい列ではなくポインタのある列に置く", () => {
    expect(ids(args({ x: 300, y: 100 }))).toEqual(["b"]);
  });

  it("マウスのポインタが列の外なら、カードが重なっていても置かない", () => {
    expect(ids(args({ x: 205, y: 100 }))).toEqual([]);
  });

  it("キーボード（ポインタが無い）は、カードの重なりが大きい列に置く", () => {
    expect(ids(args(null))[0]).toBe("a");
  });
});

describe("キーボードで列を移す座標", () => {
  // 中心が 100・400・700 の3列。掴んだカードの中心は 400
  const context = {
    collisionRect: { left: 350, width: 100 },
    droppableRects: new Map([
      ["a", { left: 0, width: 200 }],
      ["b", { left: 300, width: 200 }],
      ["c", { left: 600, width: 200 }],
    ]),
    droppableContainers: { getEnabled: () => [{ id: "c" }, { id: "a" }, { id: "b" }] },
  } as any;
  const move = (code: string, collisionLeft = 350) => {
    const event = new KeyboardEvent("keydown", { code });
    return columnCoordinateGetter(event, {
      active: "1",
      currentCoordinates: { x: 10, y: 20 },
      context: { ...context, collisionRect: { left: collisionLeft, width: 100 } },
    });
  };

  it("右の矢印で右の列の中心へ、左の矢印で左の列の中心へ動かす（縦は変えない）", () => {
    expect(move("ArrowRight")).toEqual({ x: 310, y: 20 });
    expect(move("ArrowLeft")).toEqual({ x: -290, y: 20 });
  });

  it("端の列では動かさず、左右の矢印以外も動かさない", () => {
    expect(move("ArrowRight", 650)).toBeUndefined();
    expect(move("ArrowLeft", 50)).toBeUndefined();
    expect(move("ArrowDown")).toBeUndefined();
  });
});
