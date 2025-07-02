import { signUp } from "@/app/hooks/signUp";
import Register from "@/app/register/page";
import { render, screen, fireEvent } from "@testing-library/react";
import { sign } from "crypto";
import { useRouter } from "next/navigation";
import { use } from "react";
import { act } from "react-dom/test-utils";

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

describe("Register コンポーネント", () => {
  beforeEach(() => {
    signUpSuccessFlag = false;
  });

  const fillForm = (name: string, email: string, password: string) => {
    const nameInput = screen.getByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: name } });
    expect(nameInput).toHaveValue(name);

    const emailInput = screen.getByPlaceholderText("Email");
    fireEvent.change(emailInput, { target: { value: email } });
    expect(emailInput).toHaveValue(email);

    const passwordInput = screen.getByPlaceholderText("Password");
    fireEvent.change(passwordInput, { target: { value: password } });
    expect(passwordInput).toHaveValue(password);
  };

  it("① Form コンポーネントが正しくレンダリングされる", () => {
    render(<Register />);

    expect(screen.getByText("arrow_back")).toBeInTheDocument();
    expect(screen.getByText("Email Verification")).toBeInTheDocument();
    expect(screen.getByText("Workspace Setup")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.getByText("Enter your Name")).toBeInTheDocument();
    expect(screen.getByText("Enter your Email Address")).toBeInTheDocument();

    const form = screen.getByRole("form");
    expect(form).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Name");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("type", "text");

    const emailInput = screen.getByPlaceholderText("Email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    expect(signUpButton).toBeInTheDocument();
    expect(signUpButton).not.toBeDisabled();
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
      fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    });

    expect(signUpSuccessFlag).toBe(false);
  });

  it("④ 不正なメールアドレスを入力場合、サインアップ処理が失敗する", async () => {
    render(<Register />);

    fillForm("test", "invalid@example.com", "abcd1234");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    });

    // バリデーションエラーメッセージが表示されることを確認
    expect(
      await screen.findByText("このメールアドレスは使用できません。")
    ).toBeInTheDocument();

    expect(signUpSuccessFlag).toBe(false);
  });

  it("⑤ 不正なパスワードを入力場合、サインアップ処理が失敗する", async () => {
    render(<Register />);

    fillForm("test", "email@elincraft.com", "abcd");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    });

    // バリデーションエラーメッセージが表示されることを確認
    expect(
      await screen.findByText(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      )
    ).toBeInTheDocument();

    expect(signUpSuccessFlag).toBe(false);
  });

  it("⑥ サインアップ処理に成功する", async () => {
    const useSignUp = jest.fn(() => {
      signUpSuccessFlag = true;
      return undefined;
    });
    (signUp as jest.Mock).mockReturnValue({ useSignUp });

    render(<Register />);

    fillForm("test", "email@elincraft.com", "abcd1234");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    });

    expect(
      screen.queryByText(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      )
    ).not.toBeInTheDocument();

    expect(useSignUp).toHaveBeenCalledWith(
      "test",
      "email@elincraft.com",
      "abcd1234"
    );
    expect(signUpSuccessFlag).toBe(true);
  });

  it("⑦ 戻るボタンが正しく機能する", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    render(<Register />);

    fireEvent.click(screen.getByText("arrow_back"));

    expect(push).toHaveBeenCalledWith("/");
  });
});
