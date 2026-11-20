import React, { useEffect } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationContext } from "@/app/provider/notificationProvider";

enum Color {
  green,
  red,
}

interface NotificationBannerProps {
  message: string;
  color: Color | null;
}

// 操作の結果のお知らせ。画面の右上に4秒出して隠す
const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  color,
}) => {
  const { show, setShow, setNotificationValue } = useNotificationContext();

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(
        () =>
          setNotificationValue({
            message: null,
            color: null,
          }),
        3000
      );
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const success = color == Color.green;
  const Icon = success ? CircleCheck : CircleX;

  return (
    <div
      // 失敗はすぐに読み上げ、成功は読み上げ中の文が終わってから読む
      role={success ? "status" : "alert"}
      className={cn(
        "fixed top-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg transition-all duration-500",
        show ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
      )}
    >
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", success ? "text-status-done" : "text-destructive")}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="m-0 font-medium">{success ? "完了" : "エラー"}</p>
        <p className="m-0 mt-0.5 text-muted-foreground [overflow-wrap:anywhere]">{message}</p>
      </div>
    </div>
  );
};

export default NotificationBanner;
