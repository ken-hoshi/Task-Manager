import { render, screen } from "@testing-library/react";
import Top from "@/app/top/top";
import { useNotificationContext } from "@/app/provider/notificationProvider";

jest.mock("../../app/provider/notificationProvider", () => ({
  useNotificationContext: jest.fn(),
}));
jest.mock("../../app/top/form/form", () => () => (
  <div data-testid="form">FORM</div>
));
jest.mock(
  "../../app/component/notificationBanner/notificationBanner",
  () => (props: { message: string; color: number }) => (
    <div data-testid="banner" data-color={props.color}>
      {props.message}
    </div>
  )
);

const mockNotification = useNotificationContext as jest.Mock;

describe("入口", () => {
  it("最初からログインの欄を出す", () => {
    mockNotification.mockReturnValue({ notificationValue: null });
    render(<Top />);

    expect(screen.getByTestId("form")).toBeInTheDocument();
    expect(screen.queryByTestId("banner")).not.toBeInTheDocument();
  });

  it("通知があるときだけ、通知の帯を出す", () => {
    mockNotification.mockReturnValue({
      notificationValue: { message: "OK", color: 0 },
    });
    render(<Top />);

    expect(screen.getByTestId("banner")).toHaveTextContent("OK");
  });

  it("通知の文が空なら、帯を出さない", () => {
    mockNotification.mockReturnValue({
      notificationValue: { message: "", color: 0 },
    });
    render(<Top />);

    expect(screen.queryByTestId("banner")).not.toBeInTheDocument();
  });
});
