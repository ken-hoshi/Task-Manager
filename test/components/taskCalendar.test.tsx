// プロジェクト画面の「カレンダー」（taskCalender）。画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
// 日付のマスは見るだけ。期間は行の「期間を変更」で開く期間の欄で選ぶ。
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskCalender from "@/app/project/taskCalender/taskCalender";
import { opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";
import { statuses, task } from "./taskFixtures";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const push = jest.fn();
const postMailNotifications = jest.fn(async () => undefined);

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
  usePageUpdateContext: () => ({ pageUpdated: false, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 1 }),
}));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: (...args: unknown[]) => postMailNotifications(...(args as [])),
}));
jest.mock("@/app/component/taskPopup/taskPopup", () => (props: { taskGenreId: number }) => (
  <p>タスクのポップアップ ジャンル:{props.taskGenreId}</p>
));

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
});

// カレンダーは今月から始まるので、データも今月の日付で作る
const now = new Date();
const y = now.getFullYear();
const m = now.getMonth();
const ymd = (day: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const calendarTask = {
  ...task,
  task_genre_id: 7,
  start_date: ymd(2),
  deadline_date: ymd(4),
  result_start_date: ymd(3),
  result_deadline_date: ymd(3),
  number_of_result_days: 1,
};

const genreRow = {
  taskGenreId: 7,
  taskGenreName: "設計",
  numberOfPersons: 2,
  startDate: ymd(1),
  deadlineDate: ymd(10),
  numberOfDays: 5,
};

type Props = React.ComponentProps<typeof TaskCalender>;

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  userId: 5,
  projectId: 1,
  smallProjectIdList: [1],
  displaySmallProjectId: 1,
  taskData: [{ smallProjectId: 1, taskDataArray: [calendarTask] }],
  smallProjectTaskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [genreRow] }],
  filterMyTasks: false,
  statusData: statuses,
  ...overrides,
});

// 表は日付のマスが多く、DOM 全体から名前付きのロールを探すと1回で数秒かかる。
// ボタンは名前（aria-label か文字）で、表の外のものはロールで、範囲を絞って探す
const button = (name: string | RegExp) =>
  screen.queryByLabelText(name, { selector: "button" }) ??
  screen.getByText(name, { selector: "button" });

// 期間の欄を開いて、今月の start 日と end 日を選ぶ
const choosePeriod = (label: string, start: number, end: number) => {
  fireEvent.click(screen.getByLabelText(label));
  const pick = (day: number) =>
    fireEvent.click(
      within(screen.getByLabelText("日付を選ぶ")).getByRole("option", {
        name: new RegExp(`${y}年${m + 1}月${day}日`),
      })
    );
  pick(start);
  pick(end);
};

// 開いているメニュー（ステータスの選択肢）
const openMenu = async () => {
  await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());
  return within(document.querySelector('[role="menu"]') as HTMLElement);
};

describe("表示", () => {
  it("年月の見出し・凡例と、ジャンル・タスク・実績の行を日本語で出す", () => {
    render(<TaskCalender {...baseProps()} />);
    expect(screen.getByText(`${y}年${m + 1}月`, { selector: "h3" })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("凡例")).getAllByRole("listitem").map((li) => li.textContent)
    ).toEqual(["ジャンルの期間", "予定の期間", "実績の期間"]);

    expect(screen.getByText(/^設計/, { selector: "th, th *" })).toBeInTheDocument();
    expect(button("「画面」のステータス: 進行中（変更する）")).toBeInTheDocument();
    // 実績の行の見出しは、読み上げでは「実績：担当者」と読む
    expect(screen.getByText("実績：").closest("th")).toHaveTextContent("実績：星");
    expect(button("「設計」の期間を変更")).toBeInTheDocument();
    expect(button("「画面」の予定の期間を変更")).toBeInTheDocument();
    expect(button("「画面」の実績の期間を変更")).toBeInTheDocument();
  });

  // 日付の列の見出し（数字）を並べる
  const dayHeaders = () =>
    [...document.querySelectorAll("thead th[scope=col] span.rounded-full")].map((el) => el.textContent);

  it("前の月・次の月で、年月の見出しと日付の列が変わる", () => {
    render(<TaskCalender {...baseProps()} />);
    expect(dayHeaders()).toHaveLength(new Date(y, m + 1, 0).getDate());

    fireEvent.click(button("次の月"));
    const next = new Date(y, m + 1, 1);
    expect(
      screen.getByText(`${next.getFullYear()}年${next.getMonth() + 1}月`, { selector: "h3" })
    ).toBeInTheDocument();
    // 次の月の日数だけ列が並ぶ
    const nextDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    expect(dayHeaders()).toHaveLength(nextDays);
    expect(dayHeaders()[nextDays - 1]).toBe(String(nextDays));

    fireEvent.click(button("前の月"));
    fireEvent.click(button("前の月"));
    const prev = new Date(y, m - 1, 1);
    expect(
      screen.getByText(`${prev.getFullYear()}年${prev.getMonth() + 1}月`, { selector: "h3" })
    ).toBeInTheDocument();
  });

  it("ジャンルの無いタスクは「ジャンルなし」の下に出る", () => {
    render(
      <TaskCalender
        {...baseProps({
          taskData: [{ smallProjectId: 1, taskDataArray: [{ ...calendarTask, task_genre_id: null }] }],
          smallProjectTaskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [] }],
        })}
      />
    );
    expect(screen.getByText("ジャンルなし", { selector: "th, th *" })).toBeInTheDocument();
    expect(button("「画面」の予定の期間を変更")).toBeInTheDocument();
  });

  it("ジャンルもタスクも無いときは、空の表示を出す", () => {
    render(
      <TaskCalender
        {...baseProps({
          taskData: [{ smallProjectId: 1, taskDataArray: [] }],
          smallProjectTaskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [] }],
        })}
      />
    );
    expect(screen.getByText("ジャンルもタスクもありません")).toBeInTheDocument();
    expect(document.querySelector("table")).not.toBeInTheDocument();
  });

  it("ジャンルの行の「＋」で、そのジャンルを決めたタスクのポップアップを開く", () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「設計」にタスクを追加"));
    expect(screen.getByText("タスクのポップアップ ジャンル:7")).toBeInTheDocument();
  });

  it("表示中の小プロジェクトのデータが無ければ、落ちずに通知を出してタスク画面へ戻る", () => {
    render(<TaskCalender {...baseProps({ taskData: [{ smallProjectId: 2, taskDataArray: [] }] })} />);
    expect(setNotificationValue).toHaveBeenCalledWith({
      message: "プロジェクトのデータを読めませんでした。",
      color: 1,
    });
    expect(push).toHaveBeenCalledWith("/task");
  });
});

describe("期間の変更", () => {
  it("「期間を変更」で編集の行を出し、ほかの行のボタンを押せなくする。「やめる」で閉じて何も送らない", () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「画面」の予定の期間を変更"));

    expect(screen.getByLabelText("「画面」の予定の期間")).toBeInTheDocument();
    expect(button("保存")).toBeDisabled();
    expect(button("「設計」の期間を変更")).toBeDisabled();
    expect(button("「画面」の実績の期間を変更")).toBeDisabled();
    expect(button("「画面」の予定の期間を変更")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button("やめる"));
    expect(screen.queryByLabelText("「画面」の予定の期間")).not.toBeInTheDocument();
    expect(button("「設計」の期間を変更")).toBeEnabled();
    expect(opsOf("tasks")).toEqual([]);
    // 閉じたら、開いた行の「期間を変更」にフォーカスを戻す
    expect(button("「画面」の予定の期間を変更")).toHaveFocus();
  });

  it("保存できたら「期間を更新しました。」、失敗したら「期間を更新できませんでした。」と出す", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「画面」の予定の期間を変更"));
    choosePeriod("「画面」の予定の期間", 3, 5);
    fireEvent.click(button("保存"));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "期間を更新しました。", color: 0 })
    );

    setResponses("tasks", { data: null, error: { message: "boom" } });
    fireEvent.click(button("「画面」の予定の期間を変更"));
    choosePeriod("「画面」の予定の期間", 3, 5);
    fireEvent.click(button("保存"));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "期間を更新できませんでした。", color: 1 })
    );
  });

  // 送る値は今の作りのまま（選んだ日の翌日を送る）。この日付のずれは fix の PR で直し、ここの値も書き換える
  it("予定の期間を選んで「保存」すると、tasks の開始・締切・日数を送り、通知の処理を呼ぶ", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「画面」の予定の期間を変更"));
    choosePeriod("「画面」の予定の期間", 3, 5);
    fireEvent.click(button("保存"));

    await waitFor(() =>
      expect(opsOf("tasks")).toContainEqual([
        "update",
        [{ start_date: new Date(y, m, 4), deadline_date: new Date(y, m, 6), number_of_days: 3 }],
      ])
    );
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
    await waitFor(() => expect(postMailNotifications).toHaveBeenCalledWith(1, 5, 1, null, null, null, 1, []));
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("実績の期間を選んで「保存」すると、tasks の実績の開始・終了・日数を送る", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「画面」の実績の期間を変更"));
    choosePeriod("「画面」の実績の期間", 6, 7);
    fireEvent.click(button("保存"));

    await waitFor(() =>
      expect(opsOf("tasks")).toContainEqual([
        "update",
        [{ result_start_date: new Date(y, m, 7), result_deadline_date: new Date(y, m, 8), number_of_result_days: 2 }],
      ])
    );
  });

  it("ジャンルの期間を選んで「保存」すると、task_genre の開始・締切を送る（日数は送らない）", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.click(button("「設計」の期間を変更"));
    choosePeriod("「設計」の期間", 8, 9);
    fireEvent.click(button("保存"));

    await waitFor(() =>
      expect(opsOf("task_genre")).toEqual([
        ["update", [{ start_date: new Date(y, m, 9), deadline_date: new Date(y, m, 10) }]],
        ["eq", ["id", 7]],
      ])
    );
    expect(postMailNotifications).not.toHaveBeenCalled();
  });
});

describe("ステータス", () => {
  it("選択肢の3つから選ぶと、そのタスクの status_id を変える", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.keyDown(button(/のステータス: /), { key: "Enter" });
    const menu = await openMenu();
    expect(menu.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual(["未着手", "進行中", "完了"]);

    fireEvent.click(menu.getByRole("menuitemradio", { name: "完了" }));
    await waitFor(() => expect(opsOf("tasks")).toContainEqual(["update", [{ status_id: 3 }]]));
    expect(opsOf("tasks")).toContainEqual(["eq", ["id", 1]]);
  });

  it("今のステータスを選び直しても、何も送らない", async () => {
    render(<TaskCalender {...baseProps()} />);
    fireEvent.keyDown(button(/のステータス: /), { key: "Enter" });
    fireEvent.click((await openMenu()).getByRole("menuitemradio", { name: "進行中" }));
    expect(opsOf("tasks")).toEqual([]);
  });

  it("変更に失敗したら「ステータスを変更できませんでした。」と出す", async () => {
    setResponses("tasks", { data: null, error: { message: "boom" } });
    render(<TaskCalender {...baseProps()} />);
    fireEvent.keyDown(button(/のステータス: /), { key: "Enter" });
    fireEvent.click((await openMenu()).getByRole("menuitemradio", { name: "完了" }));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "ステータスを変更できませんでした。", color: 1 })
    );
  });
});

describe("並びと絞り込み", () => {
  // 担当者の違う2件。開始日は「後」のほうが早い
  const twoTasks = [
    { ...calendarTask, id: 1, task_name: "前", start_date: ymd(5), assigned_user_id: 5 },
    { ...calendarTask, id: 2, task_name: "後", start_date: ymd(1), assigned_user_id: 6, users: { name: "田中" } },
  ];
  const rowNames = () =>
    [...document.querySelectorAll("tbody th[scope=row]")]
      .map((th) => th.textContent)
      .filter((text) => text === "前" || text === "後");

  it("タスクは開始日の早い順に並び、行の見出しはタスク名だけを読む", () => {
    render(<TaskCalender {...baseProps({ taskData: [{ smallProjectId: 1, taskDataArray: twoTasks }] })} />);
    expect(rowNames()).toEqual(["後", "前"]);
  });

  it("「自分のタスクだけ」では、自分が担当のタスクだけを出す", () => {
    render(
      <TaskCalender
        {...baseProps({ taskData: [{ smallProjectId: 1, taskDataArray: twoTasks }], filterMyTasks: true })}
      />
    );
    expect(rowNames()).toEqual(["前"]);
  });

  it("「自分のタスクだけ」で、ジャンルもタスクも出ないときは、絞り込みを外せば出ると伝える", () => {
    render(
      <TaskCalender
        {...baseProps({
          taskData: [{ smallProjectId: 1, taskDataArray: [twoTasks[1]] }],
          smallProjectTaskGenreData: [{ smallProjectId: 1, taskGenreDataArray: [] }],
          filterMyTasks: true,
        })}
      />
    );
    expect(screen.getByText("自分のタスクはありません")).toBeInTheDocument();
    expect(screen.getByText("「自分のタスクだけ」を外すと、ほかの人のタスクも出ます。")).toBeInTheDocument();
  });
});
