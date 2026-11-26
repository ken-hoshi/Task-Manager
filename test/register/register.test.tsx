import { signUp } from "@/app/hooks/signUp";
import Register from "@/app/register/page";
import { NotificationProvider } from "@/app/provider/notificationProvider";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { useRouter } from "next/navigation";

process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN = "example.com";

let signUpSuccessFlag: boolean = false;

jest.mock("../../app/hooks/signUp", () => ({
  signUp: jest.fn(() => ({
    useSignUp: jest.fn(() => {
      signUpSuccessFlag = true;
      return undefined;
    }),
  })),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

const submitButton = () => screen.getByRole("button", { name: "登録する" });
const nameInput = () => screen.getByLabelText(/^名前/);
const emailInput = () => screen.getByLabelText(/^メールアドレス/);
const passwordInput = () => screen.getByLabelText(/^パスワード/);
const PASSWORD_ERROR = "パスワードは、英字と数字を両方含む8文字以上にしてください。空白と全角の文字は使えません。";

describe("Register コンポーネント", () => {
  beforeEach(() => {
    signUpSuccessFlag = false;
  });

  const fillForm = (name: string, email: string, password: string) => {
    fireEvent.change(nameInput(), { target: { value: name } });
    expect(nameInput()).toHaveValue(name);

    fireEvent.change(emailInput(), { target: { value: email } });
    expect(emailInput()).toHaveValue(email);

    fireEvent.change(passwordInput(), { target: { value: password } });
    expect(passwordInput()).toHaveValue(password);
  };

  it("① 見出し・進み具合・ラベル付きの欄・ボタンを出す", () => {
    render(<Register />);

    expect(screen.getByRole("heading", { level: 1, name: "新規登録" })).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "登録の進み具合" });
    expect(within(steps).getAllByRole("listitem").map((step) => step.textContent)).toEqual([
      "1登録",
      "2メール確認",
      "3ワークスペース",
    ]);
    expect(within(steps).getByText("登録").closest("li")).toHaveAttribute("aria-current", "step");

    expect(screen.getByRole("form", { name: "新規登録" })).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("type", "text");
    expect(emailInput()).toHaveAttribute("type", "email");
    expect(passwordInput()).toHaveAttribute("type", "password");
    expect(passwordInput()).toHaveAccessibleDescription("英字と数字を両方含む8文字以上（記号も使えます）");
    expect(submitButton()).toBeEnabled();
  });

  it("② ユーザーがフォームに入力できる", () => {
    render(<Register />);

    // フォームに入力
    fillForm("test", "test@example.com", "password123");
  });

  it("③ フォームに入力がないとサインアップできない", async () => {
    render(<Register />);

    fillForm("", "", "");
    act(() => {
      fireEvent.click(submitButton());
    });

    expect(signUpSuccessFlag).toBe(false);
  });

  it("③-2 名前だけが空なら、ほかの欄が正しくてもサインアップしない", async () => {
    const useSignUp = jest.fn();
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(<Register />);

    fillForm("", "email@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(useSignUp).not.toHaveBeenCalled();
  });

  it("④ 不正なメールアドレスを入力場合、サインアップ処理が失敗する", async () => {
    render(<Register />);

    fillForm("test", "invalid@example.org", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    // バリデーションエラーメッセージが読み上げられ、欄と結び付き、直す欄へフォーカスが移ることを確認
    expect(await screen.findByRole("alert")).toHaveTextContent("このメールアドレスは使用できません。");
    expect(emailInput()).toHaveAttribute("aria-invalid", "true");
    expect(emailInput()).toHaveAccessibleDescription("このメールアドレスは使用できません。");
    expect(emailInput()).toHaveFocus();

    expect(signUpSuccessFlag).toBe(false);
  });

  it("⑤ 不正なパスワードを入力場合、サインアップ処理が失敗する", async () => {
    render(<Register />);

    fillForm("test", "email@example.com", "abcd");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    // バリデーションエラーメッセージが読み上げられ、欄と結び付き、直す欄へフォーカスが移ることを確認
    expect(await screen.findByRole("alert")).toHaveTextContent(PASSWORD_ERROR);
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput()).toHaveAccessibleDescription(PASSWORD_ERROR);
    expect(passwordInput()).toHaveFocus();

    expect(signUpSuccessFlag).toBe(false);
  });

  it("⑥ サインアップ処理に成功する", async () => {
    const useSignUp = jest.fn(() => {
      signUpSuccessFlag = true;
      return undefined;
    });
    (signUp as jest.Mock).mockReturnValue({ useSignUp });

    render(<Register />);

    fillForm("test", "email@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(
      screen.queryByText("このメールアドレスは使用できません。")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(PASSWORD_ERROR)).not.toBeInTheDocument();

    expect(useSignUp).toHaveBeenCalledWith(
      "test",
      "email@example.com",
      "abcd1234"
    );
    expect(signUpSuccessFlag).toBe(true);
  });

  it("⑥-3 記号を含むパスワードでも登録へ進む", async () => {
    const useSignUp = jest.fn();
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(<Register />);

    fillForm("test", "email@example.com", "abcd1234!#$");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(useSignUp).toHaveBeenCalledWith("test", "email@example.com", "abcd1234!#$");
  });

  it.each([
    ["空白を含む", "abcd 1234"],
    ["全角を含む", "abcd1234あ"],
    ["数字が無い", "abcdefg!"],
    ["英字が無い", "1234567!"],
    ["7文字の", "abc12!#"],
    ["タブを含む", "abcd\t1234"],
    ["全角の英数字を含む", "ａｂｃｄ1234"],
  ])("⑤-2 %sパスワードは通さない", async (_, password) => {
    const useSignUp = jest.fn();
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(<Register />);

    fillForm("test", "email@example.com", password);
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(passwordInput()).toHaveAttribute("aria-invalid", "true");
    expect(useSignUp).not.toHaveBeenCalled();
  });

  it("⑥-5 ちょうど8文字なら記号を含んでも登録へ進む", async () => {
    const useSignUp = jest.fn();
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(<Register />);

    fillForm("test", "email@example.com", "abc123!#");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(useSignUp).toHaveBeenCalledWith("test", "email@example.com", "abc123!#");
  });

  it("⑥-4 パスワードの欄は、ブラウザが新しいパスワードを提案できる", () => {
    render(<Register />);

    expect(passwordInput()).toHaveAttribute("autocomplete", "new-password");
  });

  it("⑧-2 サーバーがメールのドメインで断ったら、メールの欄に出してフォーカスを移す", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    // 登録前フック（supabase/schema.sql）が返す文が、そのまま error.message に入る
    const useSignUp = jest.fn(async () =>
      Object.assign(new Error("このメールアドレスは使用できません。"), { status: 403 })
    );
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(
      <NotificationProvider>
        <Register />
      </NotificationProvider>
    );

    fillForm("test", "email@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(emailInput()).toHaveAttribute("aria-invalid", "true");
    expect(emailInput()).toHaveAccessibleDescription("このメールアドレスは使用できません。");
    expect(emailInput()).toHaveFocus();
    expect(screen.queryByText("登録できませんでした。")).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
    consoleError.mockRestore();
  });

  it("⑦ 戻るボタンが正しく機能する", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    render(<Register />);

    fireEvent.click(screen.getByRole("button", { name: "ログインへ戻る" }));

    expect(push).toHaveBeenCalledWith("/");
  });

  it("⑥-2 送信中はボタンを押せず、2回送らない", async () => {
    const useSignUp = jest.fn(() => new Promise(() => {}));
    (signUp as jest.Mock).mockReturnValue({ useSignUp });
    render(<Register />);

    fillForm("test", "email@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(submitButton()).toBeDisabled();

    await act(async () => {
      fireEvent.click(submitButton());
    });
    expect(useSignUp).toHaveBeenCalledTimes(1);
  });

  it("⑧ 登録に失敗したら日本語で知らせ、もう一度押せる", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const useSignUp = jest.fn(async () => new Error("boom"));
    (signUp as jest.Mock).mockReturnValue({ useSignUp });

    render(
      <NotificationProvider>
        <Register />
      </NotificationProvider>
    );

    fillForm("test", "email@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(submitButton());
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("登録できませんでした。");
    expect(submitButton()).toBeEnabled();
    consoleError.mockRestore();
  });
});
