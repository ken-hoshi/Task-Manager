import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---- ① Context をモック ---------------------------------
jest.mock("../../app/provider/formProvider", () => ({
  useFormContext: jest.fn(),
}));
jest.mock("../../app/provider/notificationProvider", () => ({
  useNotificationContext: jest.fn(),
}));

import Top from "@/app/top/top";
import { useFormContext } from "@/app/provider/formProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";

// ---- ② 子コンポーネントをダミー化 ------------------------
jest.mock("../../app/top/form/form", () => (props: any) => (
  <div data-testid="form" className={props.className}>
    FORM
  </div>
));
jest.mock("../../app/top/title/title", () => (props: any) => (
  <button
    data-testid="title"
    className={props.className}
    onClick={props.onClick}
  >
    TITLE
  </button>
));
jest.mock(
  "../../app/component/notificationBanner/notificationBanner",
  () => (props: any) =>
    (
      <div data-testid="banner" data-color={props.color}>
        {props.message}
      </div>
    )
);

describe("Top component", () => {
  beforeAll(() => jest.useFakeTimers()); // タイマーをモック化して、setTimeoutの挙動を制御
  afterAll(() => jest.useRealTimers()); // テスト後にタイマーを元に戻す

  afterEach(() => {
    jest.resetAllMocks(); // モック履歴と実装をリセット
  });

  const mockFormCtx = useFormContext as jest.Mock;
  const mockNotiCtx = useNotificationContext as jest.Mock;

  const setupMocks = (formContext: any, notificationContext: any) => {
    mockFormCtx.mockReturnValue(formContext);
    mockNotiCtx.mockReturnValue(notificationContext);
  };

  it("① 初期表示（backForm=false, 未クリック）時は Title が表示され、Form は表示されない", () => {
    setupMocks(
      { backForm: false },
      { notificationValue: { message: "", color: "" } }
    );

    render(<Top />);

    // getByTestId
    //要素がなければ例外を投げテスト失敗
    expect(screen.getByTestId("title")).toBeInTheDocument();

    // queryByTestId
    //要素がなければnullを返しテストは失敗しない
    expect(screen.queryByTestId("form")).not.toBeInTheDocument();
  });

  it("② クリック直後は TITLE に rotateOutクラス が追加され、Form は表示されない", () => {
    setupMocks(
      { backForm: false },
      { notificationValue: { message: "", color: "" } }
    );

    render(<Top />);
    fireEvent.click(screen.getByTestId("title")); //clickイベントを発火させ、setClicked(true)を呼び出す

    const title = screen.getByTestId("title");
    expect(title).toHaveClass("rotateOut"); // 直後
    expect(screen.queryByTestId("form")).not.toBeInTheDocument();
  });

  it("③ 1 秒後に FORM に rotateInクラス が追加される", () => {
    setupMocks(
      { backForm: false },
      { notificationValue: { message: "", color: "" } }
    );

    render(<Top />);
    fireEvent.click(screen.getByTestId("title"));

    // setTimeout を早送り
    act(() => {
      // 状態が変わる操作（state 更新やレンダリング）が起きたときは act() で囲むのが原則
      jest.advanceTimersByTime(1000);
    });

    const form = screen.getByTestId("form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveClass("rotateIn");
  });

  it("④ backForm=true のとき FORM が初期表示される。", () => {
    setupMocks(
      { backForm: true },
      { notificationValue: { message: "", color: "" } }
    );

    render(<Top />);

    expect(screen.getByTestId("form")).toBeInTheDocument();
    expect(screen.queryByTestId("title")).not.toBeInTheDocument();
  });

  it("⑤ 通知バナーが正しい内容で表示される", () => {
    setupMocks(
      { backForm: false },
      { notificationValue: { message: "OK", color: "green" } }
    );

    render(<Top />);

    const banner = screen.getByTestId("banner");
    expect(banner).toHaveTextContent("OK");
    expect(banner).toHaveAttribute("data-color", "green");
  });

  it("⑥ backForm が undefined の場合、Title が表示される", () => {
    setupMocks(
      { backForm: undefined },
      { notificationValue: { message: "", color: "" } }
    );

    render(<Top />);

    expect(screen.getByTestId("title")).toBeInTheDocument();
    expect(screen.queryByTestId("form")).not.toBeInTheDocument();
  });

  it("⑦ 通知バナーの message が空文字の場合、バナーが表示されない", () => {
    setupMocks(
      { backForm: false },
      { notificationValue: { message: "", color: "green" } }
    );

    render(<Top />);

    const banner = screen.queryByTestId("banner");
    expect(banner).not.toBeInTheDocument();
  });

  it("⑧ notificationValue が null の場合、エラーが発生しない", () => {
    setupMocks({ backForm: false }, { notificationValue: null });

    expect(() => render(<Top />)).not.toThrow();
  });
});
