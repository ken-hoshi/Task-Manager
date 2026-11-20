import { RefObject, useEffect } from "react";
import { cn } from "@/lib/utils";
import { clientSupabase } from "@/app/lib/supabase/client";

export type Notification = {
  id: number;
  message: string;
  isRead: boolean;
  timestamp: string;
};

interface MailNotificationListProps {
  // サイドバーの通知のボタンが aria-controls で指す id
  id: string;
  notifications: Notification[];
  listRef: RefObject<HTMLDivElement | null>;
}

// 通知の一覧。サイドバー（幅 16rem）のすぐ右に、下寄せで開く。閉じたときに未読を既読にする
const MailNotificationList: React.FC<MailNotificationListProps> = ({
  id,
  notifications,
  listRef,
}) => {
  useEffect(() => {
    return () => {
      (async () => {
        const promiseUpdateNotifications = notifications.map(
          async (notification) => {
            if (!notification.isRead) {
              const { error: isReadUpdateError } = await clientSupabase
                .from("mail_notifications")
                .update({ isRead: true })
                .eq("id", notification.id);

              if (isReadUpdateError) {
                console.error("Update Mail Notifications ", isReadUpdateError);
              }
            }
          }
        );
        await Promise.all(promiseUpdateNotifications);
      })();
    };
  }, [notifications]);

  return (
    <div
      id={id}
      role="region"
      aria-label="通知"
      ref={listRef}
      className="fixed bottom-4 left-[16.5rem] z-50 max-h-[60vh] w-80 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
    >
      {notifications && notifications.length > 0 ? (
        <ul className="m-0 list-none divide-y p-0">
          {notifications
            .slice()
            .reverse()
            .map((notification) => (
              <li
                key={notification.id}
                className={cn("flex gap-2 px-3 py-2.5", !notification.isRead && "bg-primary/5")}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notification.isRead ? "bg-transparent" : "bg-primary"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  {!notification.isRead && <span className="sr-only">未読: </span>}
                  <p
                    className={cn(
                      "m-0 text-sm [overflow-wrap:anywhere]",
                      !notification.isRead && "font-medium"
                    )}
                  >
                    {notification.message}
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-muted-foreground">{notification.timestamp}</p>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <p className="m-0 px-3 py-6 text-center text-sm text-muted-foreground">通知はありません</p>
      )}
    </div>
  );
};

export default MailNotificationList;
