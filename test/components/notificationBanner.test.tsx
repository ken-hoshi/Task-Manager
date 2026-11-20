// 操作の結果のお知らせ。成功と失敗で、見出しと読み上げ方を変える
import { render, screen } from "@testing-library/react";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";

const setShow = jest.fn();
const setNotificationValue = jest.fn();

jest.mock("@/app/provider/notificationProvider", () => ({
  useNotificationContext: () => ({ show: true, setShow, setNotificationValue }),
}));

afterEach(() => jest.useRealTimers());

describe("通知の帯", () => {
  it("成功は「完了」として、読み上げ中の文のあとに読む（status）", () => {
    render(<NotificationBanner message="タスクを追加しました。" color={0} />);

    expect(screen.getByRole("status")).toHaveTextContent("完了タスクを追加しました。");
  });

  it("4秒出したら隠し、その3秒後に中身を消す（以前と同じ）", () => {
    jest.useFakeTimers();
    render(<NotificationBanner message="タスクを追加しました。" color={0} />);
    expect(setShow).toHaveBeenLastCalledWith(true);

    jest.advanceTimersByTime(4000);
    expect(setShow).toHaveBeenLastCalledWith(false);
    expect(setNotificationValue).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);
    expect(setNotificationValue).toHaveBeenCalledWith({ message: null, color: null });
  });

  it("失敗は「エラー」として、すぐに読む（alert）", () => {
    render(<NotificationBanner message="タスクを追加できませんでした。" color={1} />);

    expect(screen.getByRole("alert")).toHaveTextContent("エラータスクを追加できませんでした。");
  });
});
