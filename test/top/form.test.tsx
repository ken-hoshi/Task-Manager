import Form from "@/app/top/form/form";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { login } from "../../app/hooks/login";

const setNotificationValue = jest.fn();

jest.mock("../../app/hooks/login", () => ({
  login: jest.fn(),
}));
jest.mock("../../app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ setNotificationValue }),
}));

const mockLogin = (result: unknown) => {
  const useLogin = jest.fn(async () => result);
  (login as jest.Mock).mockReturnValue({ useLogin });
  return useLogin;
};

const fillForm = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: password },
  });
};

beforeEach(() => {
  setNotificationValue.mockReset();
});

describe("ログインの欄", () => {
  it("ラベル付きのメールアドレスとパスワードの欄、ログインのボタン、新規登録へのリンクを出す", () => {
    mockLogin(undefined);
    render(<Form />);

    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "ログイン" })).not.toBeDisabled();
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
      "href",
      "/register"
    );
  });

  it("入力した値でログインし、成功したら通知を出さない", async () => {
    const useLogin = mockLogin(undefined);
    render(<Form />);

    fillForm("test@example.com", "password123");
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ログイン" }));
    });

    expect(useLogin).toHaveBeenCalledWith("test@example.com", "password123");
    expect(setNotificationValue).not.toHaveBeenCalled();
  });

  it("送信中はボタンを押せなくし、続けて送っても1回しかログインしない", async () => {
    let finish: (value: unknown) => void = () => {};
    const useLogin = jest.fn(
      () => new Promise((resolve) => (finish = resolve))
    );
    (login as jest.Mock).mockReturnValue({ useLogin });
    render(<Form />);

    fillForm("test@example.com", "password123");
    const form = screen.getByRole("form", { name: "ログイン" });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByRole("button", { name: "ログイン" })).toBeDisabled();
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(useLogin).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish(undefined);
    });
  });

  it("ログインに失敗したら、日本語の通知を出してボタンを押せる状態に戻す", async () => {
    mockLogin(new Error("invalid"));
    render(<Form />);

    fillForm("test@example.com", "wrong-password");
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "ログイン" }));
    });

    expect(setNotificationValue).toHaveBeenCalledWith({
      message: "メールアドレスかパスワードが違います。",
      color: 1,
    });
    expect(screen.getByRole("button", { name: "ログイン" })).not.toBeDisabled();
  });
});
