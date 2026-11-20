// AI チャット（RobotButton と AiChatArea）。開く・送る・答えの表を横スクロールの箱に入れる、を確かめる
import { act, fireEvent, render, screen } from "@testing-library/react";
import RobotButton from "@/app/component/robotButton/robotButton";

const setNotificationValue = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));
jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));
// react-markdown と remark-gfm は ESM だけで配られていて Jest で読めない。
// 表を含む答えなら、AiChatArea が渡した components.table で表を描く、という最小の差し替えにする
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => undefined }));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components: { table: React.FC<{ node?: unknown; children: React.ReactNode }> };
  }) => {
    if (children.startsWith("http")) {
      const A = (components as unknown as { a: React.FC<{ href: string; children: React.ReactNode }> }).a;
      return <A href={children}>{children}</A>;
    }
    if (!children.includes("|")) return <p>{children}</p>;
    const Table = components.table;
    return (
      <Table>
        <tbody>
          <tr>
            <td>{children}</td>
          </tr>
        </tbody>
      </Table>
    );
  },
}));

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
});

const openChat = () => {
  render(<RobotButton />);
  fireEvent.click(screen.getByRole("button", { name: "AI に質問する" }));
};

const ask = async (question: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "AI への質問" }), { target: { value: question } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "送る" }));
  });
};

describe("AI チャット", () => {
  it("ロボットのボタンで右からチャットが開き、閉じるボタンで閉じる", () => {
    openChat();

    expect(screen.getByRole("dialog", { name: "AI に質問" })).toHaveAccessibleDescription(
      "質問は保存されず、前のやり取りも覚えていません。"
    );
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("送ると、ログイン中の鍵を付けて問い合わせ、質問と答えを並べる", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: "見積もりは3日です。" }) });
    openChat();

    await ask("見積もりは？");

    expect(fetchMock).toHaveBeenCalledWith("/api/sendGeminiMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ message: "見積もりは？" }),
    });
    expect(screen.getByText("見積もりは？")).toBeInTheDocument();
    expect(screen.getByText("見積もりは3日です。")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "AI への質問" })).toHaveValue("");
  });

  it("送っている間は「送る」を押せず、終わると入力欄へフォーカスを戻す", async () => {
    let reply: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (reply = resolve)));
    openChat();

    await ask("見積もりは？");

    expect(screen.getByRole("button", { name: "送っています" })).toBeDisabled();
    await act(async () => {
      reply({ ok: true, json: async () => ({ content: "3日です。" }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("button", { name: "送る" })).not.toBeDisabled();
    expect(screen.getByRole("textbox", { name: "AI への質問" })).toHaveFocus();
  });

  it("答えのリンクは、新しいタブで開き、開いた先にこの画面を触らせない", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: "https://example.com" }) });
    openChat();

    await ask("参考は？");

    const link = screen.getByRole("link", { name: "https://example.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("答えの表は、横にスクロールする箱に入れる（吹き出しからはみ出さない）", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: "| 項目 | 日数 |" }) });
    openChat();

    await ask("表で");

    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });
});
