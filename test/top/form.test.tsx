import Form from "@/app/top/form/form";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { login } from "../../app/hooks/login";

let loginSuccessFlag: boolean = false;

jest.mock("../../app/hooks/login", () => ({
  login: jest.fn(() => ({
    useLogin: jest.fn(async (email, password) => {
      if (email === "test@example.com" && password === "password123") {
        loginSuccessFlag = true;
        return; // ログイン成功
      }
      return "error"; // ログイン失敗
    }),
  })),
}));

describe("Form コンポーネント", () => {
  beforeEach(() => {
    loginSuccessFlag = false;
  });

  // 共通のフォーム入力処理をヘルパー関数として定義
  const fillForm = (email: string, password: string) => {
    const emailInput = screen.getByPlaceholderText("Email");
    fireEvent.change(emailInput, { target: { value: email } });
    expect(emailInput).toHaveValue(email);

    const passwordInput = screen.getByPlaceholderText("Password");
    fireEvent.change(passwordInput, { target: { value: password } });
    expect(passwordInput).toHaveValue(password);
  };

  it("① Form コンポーネントが正しくレンダリングされる", () => {
    render(<Form />);

    // Welcome メッセージが表示されることを確認
    expect(screen.getByText("Welcome!")).toBeInTheDocument();

    // サイトの説明文が表示されることを確認
    expect(
      screen.getByText(
        "This site is only permitted for use by Lincraft employees."
      )
    ).toBeInTheDocument();

    // 背景画像が正しく表示されることを確認
    const image = screen.getByAltText("background-image3");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute(
      "src",
      expect.stringContaining("background-image3.jpeg")
    );

    // フォーム要素が存在することを確認
    expect(screen.getByRole("form")).toBeInTheDocument();

    // Email フィールドが存在することを確認
    const emailInput = screen.getByPlaceholderText("Email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    // Password フィールドが存在することを確認
    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    // ログインボタンが初期状態で有効であることを確認
    const loginButton = screen.getByRole("button", { name: "Login" }); // { name: "Login" } により、ボタンの表示テキストが "Login" であることを指定
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).not.toBeDisabled(); // ボタンが初期状態で無効でないことを確認

    // Sign Up リンクが存在することを確認
    const signUpLink = screen.getByText("Sign Up");
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute("href", "/register");
  });

  it("② 渡された className が正しく適用される", () => {
    const customClass = "custom-class";
    render(<Form className={customClass} />);

    // 渡された className が適用されていることを確認
    const formArea = screen.getByRole("form").closest(".form-area");
    expect(formArea).toHaveClass(customClass);
  });

  it("③ ユーザーがフォームに入力できる", () => {
    render(<Form />);

    // フォームに入力
    fillForm("test@example.com", "password123");
  });

  it("④ フォームに入力がないとログインできない", async () => {
    render(<Form />);

    fillForm("", "");
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Login" }));
    });

    expect(loginSuccessFlag).toBe(false);
  });

  it("⑤ 正しい資格情報でログインが成功する", async () => {
    const useLogin = jest.fn(async (email, password) => {
      if (email === "test@example.com" && password === "password123") {
        loginSuccessFlag = true;
        return;
      }
      return "error";
    });
    (login as jest.Mock).mockReturnValue({ useLogin });
    render(<Form />);

    fillForm("test@example.com", "password123");
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Login" }));
    });

    expect(useLogin).toHaveBeenCalledWith("test@example.com", "password123");
    expect(loginSuccessFlag).toBe(true);
  });

  it("⑥ 間違った資格情報でログインが失敗する", async () => {
    render(<Form />);

    fillForm("test@example.com", "wrong-password");

    const loginButton = screen.getByRole("button", { name: "Login" });
    await act(async () => {
      fireEvent.click(loginButton);
    });

    expect(loginSuccessFlag).toBe(false);
  });
});
