// プロジェクト画面の「Wiki」。画面に出る文字・ボタンの名前と、DB に送る値で確かめる。
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Options } from "react-markdown";
import Wiki, { sanitizeSchema } from "@/app/project/wiki/wiki";
import { insertsOf, opsOf, resetSupabaseMock, setResponses } from "../helpers/mockSupabase";

const setPageUpdated = jest.fn();
const setNotificationValue = jest.fn();
const postMailNotifications = jest.fn(async () => undefined);
let pageUpdatedForTest = false;
// ReactMarkdown に渡された値
let markdownProps: Options;
// ReactMarkdown に渡された、タグごとの描き方
const markdownTag = (tag: string) =>
  (markdownProps.components as Record<string, React.ElementType>)[tag];

// react-markdown と remark-gfm などは ESM だけで配られていて Jest で読めないので差し替える
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: (props: Options & { children: string }) => {
    markdownProps = props;
    return <div data-testid="markdown">{props.children}</div>;
  },
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: function remarkGfm() {} }));
jest.mock("rehype-raw", () => ({ __esModule: true, default: function rehypeRaw() {} }));
jest.mock("rehype-sanitize", () => ({
  __esModule: true,
  default: function rehypeSanitize() {},
  defaultSchema: { attributes: { "*": ["className"] } },
}));
jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
jest.mock("@/app/provider/pageUpdateProvider", () => ({
  usePageUpdateContext: () => ({ pageUpdated: pageUpdatedForTest, setPageUpdated }),
}));
jest.mock("@/app/provider/displayWorkspaceIdProvider", () => ({
  useDisplayWorkspaceIdContext: () => ({ displayWorkspaceId: 1 }),
}));
jest.mock("@/app/lib/postMailNotifications", () => ({
  postMailNotifications: (...args: unknown[]) => postMailNotifications(...(args as [])),
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetSupabaseMock();
  pageUpdatedForTest = false;
});

const page = (id: number, title: string, smallProjectId: number) => ({
  id,
  title,
  content: `${title}の本文`,
  small_project_id: smallProjectId,
});

const wikiDataList = [
  { smallProjectId: 1, wikiDataArray: [page(1, "設計メモ", 1), page(2, "議事録", 1)] },
  { smallProjectId: 2, wikiDataArray: [page(3, "手順書", 2)] },
  { smallProjectId: 3, wikiDataArray: [] },
];

const props = (displaySmallProjectId = 1) => ({
  userId: 5,
  smallProjectIdList: [1, 2, 3],
  displaySmallProjectId,
  wikiDataList,
});

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const titleInput = () => screen.getByRole("textbox", { name: "タイトル" });
const contentInput = () => screen.getByRole("textbox", { name: "本文（Markdown）" });

describe("表示", () => {
  it("ページの一覧と、表示中のページの見出し・本文を出す", () => {
    render(<Wiki {...props()} />);
    const list = screen.getByRole("region", { name: /^ページ/ });
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["設計メモ", "議事録"]);
    expect(within(list).getByRole("button", { name: "設計メモ" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 3, name: "設計メモ" })).toBeInTheDocument();
    expect(screen.getByTestId("markdown")).toHaveTextContent("設計メモの本文");
  });

  it("一覧のページを押すと、そのページに替わる", () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("議事録"));
    expect(button("議事録")).toHaveAttribute("aria-current", "page");
    expect(button("設計メモ")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("markdown")).toHaveTextContent("議事録の本文");
  });

  it("0件のときは空の表示を出し、編集と削除は押せない", () => {
    render(<Wiki {...props(3)} />);
    expect(screen.getByText("Wiki のページはありません")).toBeInTheDocument();
    expect(button("ページを追加")).toBeEnabled();
    expect(button("ページを編集")).toBeDisabled();
    expect(button("ページを削除")).toBeDisabled();
  });

  it("本文は、HTML を通したうえで危ないものを落とす設定で描く（style 属性は残す）", () => {
    render(<Wiki {...props()} />);
    const [raw, [sanitize, schema]] = markdownProps.rehypePlugins as unknown as [
      () => void,
      [() => void, unknown],
    ];
    expect(raw.name).toBe("rehypeRaw");
    expect(sanitize.name).toBe("rehypeSanitize");
    expect(schema).toBe(sanitizeSchema);
    // 差し替えた既定の設定（className だけ）に足したのが style だけであること。ほかを緩めたら落ちる
    expect(sanitizeSchema).toEqual({ attributes: { "*": ["className", "style"] } });
  });

  it.each([
    ["h1", 4],
    ["h2", 5],
    ["h3", 6],
    ["h4", 6],
    ["h5", 6],
    ["h6", 6],
  ])("本文の %s は、ページの見出しの下の h%i で描き、style を残す", (tag, level) => {
    render(<Wiki {...props()} />);
    const Heading = markdownTag(tag);
    render(<Heading style={{ color: "red" }}>本文の見出し</Heading>);
    const heading = screen.getByRole("heading", { level, name: "本文の見出し" });
    expect(heading).toHaveAttribute("style", "color: red;");
  });

  it("リンクは新しいタブで開く", () => {
    render(<Wiki {...props()} />);
    const Link = markdownTag("a");
    render(<Link href="https://example.com">外のページ</Link>);
    const link = screen.getByRole("link", { name: "外のページ" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("広い表はキーボードでもスクロールできる区画に入れ、style を残す", () => {
    render(<Wiki {...props()} />);
    const Table = markdownTag("table");
    render(
      <Table style={{ color: "red" }}>
        <tbody>
          <tr>
            <td>セル</td>
          </tr>
        </tbody>
      </Table>
    );
    const region = screen.getByRole("region", { name: "表（横にスクロールできます）" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).getByRole("table")).toHaveAttribute("style", "color: red;");
  });

  it("コードのかたまりは style を残して描く", () => {
    render(<Wiki {...props()} />);
    const Pre = markdownTag("pre");
    render(<Pre style={{ color: "red" }}>console.log(1)</Pre>);
    expect(screen.getByText("console.log(1)")).toHaveAttribute("style", "color: red;");
  });

  it("チェックリストの欄に、完了・未完了の名前を付ける", () => {
    render(<Wiki {...props()} />);
    const Input = markdownTag("input");
    render(
      <>
        <Input type="checkbox" checked disabled readOnly />
        <Input type="checkbox" checked={false} disabled readOnly />
      </>
    );
    expect(screen.getByRole("checkbox", { name: "完了" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "未完了" })).not.toBeChecked();
  });

  it("Markdown の書き方は、開いたときだけ出す", () => {
    render(<Wiki {...props()} />);
    expect(screen.queryByText("**太字**", { exact: false })).not.toBeInTheDocument();
    fireEvent.click(button("Markdown の書き方"));
    expect(screen.getByText("強調")).toBeInTheDocument();
    expect(screen.getByText("**太字**", { exact: false })).toBeInTheDocument();
  });
});

describe("小プロジェクトの切り替え", () => {
  it("2ページ目を開いたまま、ページの少ない小プロジェクトへ移っても落ちず、先頭のページを出す", () => {
    const { rerender } = render(<Wiki {...props(1)} />);
    fireEvent.click(screen.getByText("議事録"));
    rerender(<Wiki {...props(2)} />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("手順書の本文");
  });

  it("読み直しで一覧が縮み、表示中のページが無くなったら、先頭のページを出す", () => {
    const { rerender } = render(<Wiki {...props(1)} />);
    fireEvent.click(screen.getByText("議事録"));

    pageUpdatedForTest = true;
    rerender(
      <Wiki {...props(1)} wikiDataList={[{ smallProjectId: 1, wikiDataArray: [page(1, "設計メモ", 1)] }]} />
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("設計メモの本文");
    expect(button("「設計メモ」を編集")).toBeEnabled();
  });
});

describe("追加", () => {
  it("タイトルと本文を入れて送ると、wiki に入れ、通知の処理を呼び、フォームを閉じる", async () => {
    setResponses("small_projects", {
      data: {
        small_project_name: "SP",
        projects: { project_name: "P" },
        small_project_users: [{ user_id: 5 }, { user_id: 6 }],
      },
      error: null,
    });
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    expect(titleInput()).toHaveFocus();
    fireEvent.change(titleInput(), { target: { value: "新しいページ" } });
    fireEvent.change(contentInput(), { target: { value: "# 本文" } });
    fireEvent.click(button("追加する"));

    await waitFor(() =>
      expect(insertsOf("wiki")).toEqual([{ title: "新しいページ", content: "# 本文", small_project_id: 1 }])
    );
    await waitFor(() =>
      expect(postMailNotifications).toHaveBeenCalledWith(1, 5, null, "P", "SP", "新しいページ", 0, [5, 6])
    );
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument());
    expect(setPageUpdated).toHaveBeenCalledWith(true);
    expect(button("ページを追加")).toHaveFocus();
  });

  it("追加のあと、通知の処理を待つ間は「追加」が押せず、待ち終えてからフォーカスを戻す", async () => {
    let finish: (value: unknown) => void = () => {};
    setResponses("small_projects", new Promise((resolve) => (finish = resolve)) as never);
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "題" } });
    fireEvent.change(contentInput(), { target: { value: "文" } });
    fireEvent.click(button("追加する"));

    await waitFor(() => expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument());
    expect(button("ページを追加")).toBeDisabled();

    await act(async () => finish({ data: null, error: null }));
    await waitFor(() => expect(button("ページを追加")).toHaveFocus());
  });

  it("保存できたら「追加しました」と出す", async () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "題" } });
    fireEvent.change(contentInput(), { target: { value: "文" } });
    fireEvent.click(button("追加する"));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを追加しました。", color: 0 })
    );
  });

  it("ページが入ったあとに通知の処理が失敗しても、「追加しました」と出してフォームを閉じる", async () => {
    // プロジェクトが読めないと、通知の文を作るところで例外になる
    setResponses("small_projects", {
      data: { small_project_name: "SP", projects: null, small_project_users: [] },
      error: null,
    });
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "題" } });
    fireEvent.change(contentInput(), { target: { value: "文" } });
    fireEvent.click(button("追加する"));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを追加しました。", color: 0 })
    );
    expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument();
  });

  it("保存に失敗したら、フォームと入れた値を残す", async () => {
    setResponses("wiki", { data: null, error: { message: "boom" } });
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "書いた題" } });
    fireEvent.change(contentInput(), { target: { value: "書いた本文" } });
    // フォームを開くとタイトルにフォーカスが入るので、押したボタンへ移してから確かめる
    button("追加する").focus();
    fireEvent.click(button("追加する"));

    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを追加できませんでした。", color: 1 })
    );
    await waitFor(() => expect(button("追加する")).toBeEnabled());
    expect(titleInput()).toHaveValue("書いた題");
    expect(contentInput()).toHaveValue("書いた本文");
    expect(titleInput()).toHaveFocus();
    // DB は変わっていないので読み直さない（読み直しの途中に送り直すと、保存後の読み直しが起きず古い表示が残る）
    expect(setPageUpdated).not.toHaveBeenCalled();
  });

  it("追加のフォームを開いたまま小プロジェクトを切り替えても、書き始めた小プロジェクトに入れる", async () => {
    const { rerender } = render(<Wiki {...props(1)} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "題" } });
    fireEvent.change(contentInput(), { target: { value: "文" } });
    rerender(<Wiki {...props(2)} />);

    fireEvent.click(button("追加する"));
    await waitFor(() =>
      expect(insertsOf("wiki")).toEqual([{ title: "題", content: "文", small_project_id: 1 }])
    );
    await waitFor(() => expect(opsOf("small_projects")).toContainEqual(["eq", ["id", 1]]));
  });

  it("「キャンセル」では、入力がそろっていても何も送らず、開いたボタンへフォーカスを戻す", () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "書きかけ" } });
    fireEvent.change(contentInput(), { target: { value: "本文" } });
    fireEvent.click(button("キャンセル"));

    expect(opsOf("wiki")).toEqual([]);
    expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument();
    expect(button("ページを追加")).toHaveFocus();
  });

  it("保存の返事を待つ間は、キャンセルも送るボタンも押せない", async () => {
    let finish: (value: unknown) => void = () => {};
    setResponses("wiki", new Promise((resolve) => (finish = resolve)) as never);
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    fireEvent.change(titleInput(), { target: { value: "題" } });
    fireEvent.change(contentInput(), { target: { value: "文" } });
    fireEvent.click(button("追加する"));

    await waitFor(() => expect(button("キャンセル")).toBeDisabled());
    expect(button("追加する")).toBeDisabled();
    await act(async () => finish({ data: null, error: null }));
  });
});

describe("Enter の扱い", () => {
  it("タイトルの入力欄の Enter では送らない", () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("ページを追加"));
    // fireEvent は preventDefault されたら false を返す
    expect(fireEvent.keyDown(titleInput(), { key: "Enter" })).toBe(false);
  });

  it("ほかのボタンの Enter は止めない（以前は画面全体で止めていた）", () => {
    render(
      <>
        <button type="button">サイドバーのボタン</button>
        <Wiki {...props()} />
      </>
    );
    expect(fireEvent.keyDown(button("サイドバーのボタン"), { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(button("ページを追加"), { key: "Enter" })).toBe(true);
  });
});

describe("編集", () => {
  it("今のタイトルと本文をフォームに出し、更新するとそのページの id に送る", async () => {
    setResponses("wiki", { data: [{ id: 2 }], error: null });
    render(<Wiki {...props()} />);
    fireEvent.click(button("議事録"));
    fireEvent.click(button("「議事録」を編集"));
    expect(titleInput()).toHaveValue("議事録");
    expect(contentInput()).toHaveValue("議事録の本文");
    // 編集中は、ほかのページへ移れず、追加と削除も押せない
    expect(button("設計メモ")).toBeDisabled();
    expect(button("ページを追加")).toBeDisabled();
    expect(button("「議事録」を削除")).toBeDisabled();

    fireEvent.change(titleInput(), { target: { value: "議事録（改）" } });
    fireEvent.click(button("更新する"));
    await waitFor(() =>
      expect(opsOf("wiki")).toEqual([
        ["update", [{ title: "議事録（改）", content: "議事録の本文" }]],
        ["eq", ["id", 2]],
        ["select", ["id"]],
      ])
    );
    await waitFor(() => expect(button("「議事録」を編集")).toHaveFocus());
  });

  it("編集中に小プロジェクトを切り替えても、編集を開いたページに保存する", async () => {
    setResponses("wiki", { data: [{ id: 2 }], error: null });
    const { rerender } = render(<Wiki {...props(1)} />);
    fireEvent.click(button("議事録"));
    fireEvent.click(button("「議事録」を編集"));
    rerender(<Wiki {...props(2)} />);

    fireEvent.click(button("更新する"));
    await waitFor(() => expect(opsOf("wiki")).toContainEqual(["eq", ["id", 2]]));
    expect(opsOf("wiki")).not.toContainEqual(["eq", ["id", 3]]);
  });

  it("保存できたら「更新しました」と出す", async () => {
    setResponses("wiki", { data: [{ id: 1 }], error: null });
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.click(button("更新する"));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを更新しました。", color: 0 })
    );
  });

  it("ほかの人が先にページを消していたら（0件の更新）、失敗として入力を残す", async () => {
    setResponses("wiki", { data: [], error: null });
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.change(titleInput(), { target: { value: "直した題" } });
    fireEvent.click(button("更新する"));

    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを更新できませんでした。", color: 1 })
    );
    await waitFor(() => expect(button("更新する")).toBeEnabled());
    expect(titleInput()).toHaveValue("直した題");
    // ページが消えたことを一覧に映すため、この失敗だけは読み直す
    expect(setPageUpdated).toHaveBeenCalledWith(true);
  });

  it("編集を保存したあと、ほかの人がページを足しても、読んでいるページのまま", async () => {
    setResponses("wiki", { data: [{ id: 1 }], error: null });
    const { rerender } = render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.click(button("更新する"));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument());

    pageUpdatedForTest = true;
    rerender(
      <Wiki
        {...props()}
        wikiDataList={[
          {
            smallProjectId: 1,
            wikiDataArray: [page(1, "設計メモ", 1), page(2, "議事録", 1), page(9, "ほかの人のページ", 1)],
          },
        ]}
      />
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("設計メモの本文");
  });

  it("保存に失敗したら、フォームと入れた値を残す", async () => {
    setResponses("wiki", { data: null, error: { message: "boom" } });
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.change(titleInput(), { target: { value: "直した題" } });
    fireEvent.click(button("更新する"));

    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを更新できませんでした。", color: 1 })
    );
    await waitFor(() => expect(button("更新する")).toBeEnabled());
    expect(titleInput()).toHaveValue("直した題");
    expect(setPageUpdated).not.toHaveBeenCalled();
  });

  it("「キャンセル」で閉じると、「編集」へフォーカスを戻す", () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.click(button("キャンセル"));
    expect(button("「設計メモ」を編集")).toHaveFocus();
    expect(opsOf("wiki")).toEqual([]);
  });

  it("「編集」をもう一度押して閉じると入力を捨て、次の「追加」のフォームに残さない", () => {
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を編集"));
    fireEvent.click(button("編集を閉じる"));
    expect(screen.queryByRole("textbox", { name: "タイトル" })).not.toBeInTheDocument();
    expect(button("「設計メモ」を編集")).toHaveFocus();

    fireEvent.click(button("ページを追加"));
    expect(titleInput()).toHaveValue("");
    expect(contentInput()).toHaveValue("");
  });
});

describe("削除", () => {
  it("確認にページの名前を出し、「削除する」を押すと、そのページの id を消す", async () => {
    setResponses("wiki", { data: [{ id: 1 }], error: null });
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を削除"));
    expect(screen.getByText("「設計メモ」を削除します。元に戻せません。")).toBeInTheDocument();
    expect(opsOf("wiki")).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() =>
      expect(opsOf("wiki")).toEqual([
        ["delete", []],
        ["eq", ["id", 1]],
        ["select", ["id"]],
      ])
    );
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({ message: "Wiki のページを削除しました。", color: 0 })
    );
  });

  it("ほかの人が先に消していたら（0件の削除）、失敗と出す", async () => {
    setResponses("wiki", { data: [], error: null });
    render(<Wiki {...props()} />);
    fireEvent.click(button("「設計メモ」を削除"));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({
        message: "Wiki のページを削除できませんでした。",
        color: 1,
      })
    );
  });

  it("最後のページの削除に失敗しても、表示中のページのまま", async () => {
    setResponses("wiki", { data: null, error: { message: "boom" } });
    render(<Wiki {...props()} />);
    fireEvent.click(button("議事録"));
    fireEvent.click(button("「議事録」を削除"));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    // 確認は返事を待たずに閉じるので、失敗の通知が出るまで待つ
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({
        message: "Wiki のページを削除できませんでした。",
        color: 1,
      })
    );
    expect(screen.getByTestId("markdown")).toHaveTextContent("議事録の本文");
  });

  it("確認を開いたあとに一覧の並びが変わっても、確認を開いたページを消す", async () => {
    setResponses("wiki", { data: [{ id: 2 }], error: null });
    const { rerender } = render(<Wiki {...props()} />);
    fireEvent.click(button("議事録"));
    fireEvent.click(button("「議事録」を削除"));

    // 定期の読み直しで、2番目に別のページが入る
    pageUpdatedForTest = true;
    rerender(
      <Wiki
        {...props()}
        wikiDataList={[
          {
            smallProjectId: 1,
            wikiDataArray: [page(1, "設計メモ", 1), page(9, "別のページ", 1), page(2, "議事録", 1)],
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(opsOf("wiki")).toContainEqual(["eq", ["id", 2]]));
    expect(opsOf("wiki")).not.toContainEqual(["eq", ["id", 9]]);
  });

  it("最後のページを消して「削除」が押せなくなったら、フォーカスを「追加」へ移す", async () => {
    setResponses("wiki", { data: [{ id: 1 }], error: null });
    const onePage = [{ smallProjectId: 1, wikiDataArray: [page(1, "設計メモ", 1)] }];
    const { rerender } = render(<Wiki {...props()} wikiDataList={onePage} />);
    fireEvent.click(button("「設計メモ」を削除"));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "削除する" })).not.toBeInTheDocument());

    // 読み直しは、まず古い一覧のまま走り、終わると0件が届く
    pageUpdatedForTest = true;
    rerender(<Wiki {...props()} wikiDataList={onePage} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    pageUpdatedForTest = false;
    rerender(<Wiki {...props()} wikiDataList={[{ smallProjectId: 1, wikiDataArray: [] }]} />);
    await waitFor(() => expect(button("ページを追加")).toHaveFocus());
  });

  it("削除に失敗したら、あとで一覧が読み直されてもフォーカスを動かさない", async () => {
    setResponses("wiki", { data: null, error: { message: "boom" } });
    const { rerender } = render(
      <>
        <input aria-label="別の欄" />
        <Wiki {...props()} />
      </>
    );
    fireEvent.click(button("「設計メモ」を削除"));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() =>
      expect(setNotificationValue).toHaveBeenCalledWith({
        message: "Wiki のページを削除できませんでした。",
        color: 1,
      })
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "削除する" })).not.toBeInTheDocument());
    (document.activeElement as HTMLElement | null)?.blur();

    pageUpdatedForTest = true;
    rerender(
      <>
        <input aria-label="別の欄" />
        <Wiki {...props()} />
      </>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(button("ページを追加")).not.toHaveFocus();
  });
});
