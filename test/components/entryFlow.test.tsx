// 登録のあとの入口の画面（メール確認・完了）。画面に出る文字とボタンの名前で確かめる。
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import SuspenseAuthentication from "@/app/authentication/suspenseAuthentication/suspenseAuthentication";
import SuspenseComplete from "@/app/complete/suspenseComplete/suspenseComplete";

const push = jest.fn();
const getSession = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
jest.mock("@/app/lib/supabase/client", () => ({
  clientSupabase: { auth: { getSession: () => getSession() } },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const sessionWith = (metadata: Record<string, unknown>) => ({
  data: { session: { user: { user_metadata: metadata } } },
});

describe("メール確認", () => {
  it("2段階目を今の段階として出し、ワークスペース登録へ進める", () => {
    render(<SuspenseAuthentication />);

    expect(screen.getByRole("heading", { level: 1, name: "確認メールを送りました" })).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "登録の進み具合" });
    expect(within(steps).getByText("メール確認").closest("li")).toHaveAttribute("aria-current", "step");
    expect(within(steps).getAllByRole("listitem").map((step) => step.textContent)).toEqual([
      "登録（完了）",
      "2メール確認",
      "3ワークスペース",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "ワークスペース登録へ" }));
    expect(push).toHaveBeenCalledWith("/createWorkspace?atSignUp=true");
  });
});

describe("登録の完了", () => {
  it("認証済みなら、登録した名前とメールアドレスを出す", async () => {
    getSession.mockResolvedValue(
      sessionWith({ display_name: "山田", email: "yamada@example.com", email_verified: true })
    );
    render(<SuspenseComplete />);

    expect(await screen.findByRole("heading", { level: 1, name: "メール認証が完了しました" })).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
  });

  it("認証が済んでいなければ、失敗と連絡先を出す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getSession.mockResolvedValue(
      sessionWith({ display_name: "山田", email: "yamada@example.com", email_verified: false })
    );
    render(<SuspenseComplete />);

    expect(await screen.findByRole("heading", { level: 1, name: "メール認証に失敗しました" })).toBeInTheDocument();
    expect(screen.getByText("管理者に連絡してください。")).toBeInTheDocument();
    expect(screen.queryByText("山田")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("セッションが無ければ、失敗を出す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getSession.mockResolvedValue({ data: { session: null } });
    render(<SuspenseComplete />);

    expect(await screen.findByRole("heading", { level: 1, name: "メール認証に失敗しました" })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("確かめている間は、カードの中に読み込み中と出す", async () => {
    let finish: (value: unknown) => void = () => {};
    getSession.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<SuspenseComplete />);

    expect(screen.getByRole("status")).toHaveTextContent("読み込み中");
    expect(screen.getByText("Task Manager")).toBeInTheDocument();

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => finish({ data: { session: null } }));
    consoleError.mockRestore();
  });
});
