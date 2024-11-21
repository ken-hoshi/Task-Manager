import { RefObject, useEffect } from "react";
import styles from "./mailNotificationList.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import classNames from "classnames";

type Notification = {
  id: number;
  message: string;
  isRead: boolean;
  timestamp: string;
};

interface MailNotificationListProps {
  notifications: Notification[];
  listRef: RefObject<HTMLDivElement>;
}

const MailNotificationList: React.FC<MailNotificationListProps> = ({
  notifications,
  listRef,
}) => {
  useEffect(() => {
    return () => {
      const updateNotifications = async () => {
        const promiseUpdateNotifications = notifications.map(
          async (notification) => {
            if (!notification.isRead) {
              const { error: isReadUpdateError } = await clientSupabase
                .from("mail_notifications")
                .update({ isRead: true })
                .eq("id", notification.id);

              if (isReadUpdateError) {
                console.error(
                  "Error updating mail notifications ",
                  isReadUpdateError
                );
              }
            }
          }
        );
        await Promise.all(promiseUpdateNotifications);
      };
      updateNotifications();
    };
  }, [notifications]);

  return (
    <div className={styles.container} ref={listRef}>
      <ul className={styles.list}>
        {notifications && notifications.length > 0 ? (
          notifications
            .slice()
            .reverse()
            .map((notification, index) => (
              <li
                key={notification.id}
                className={classNames(
                  notifications.length == index + 1
                    ? styles[`last-list-item`]
                    : styles[`list-item`],
                  !notification.isRead ? styles[`un-read-list`] : ""
                )}
              >
                {!notification.isRead && (
                  <span className={styles[`un-read-dot`]}></span>
                )}
                <p
                  className={
                    !notification.isRead
                      ? styles[`un-read-message`]
                      : styles.message
                  }
                >
                  {notification.message}
                </p>
                <p className={styles.timestamp}>{notification.timestamp}</p>
              </li>
            ))
        ) : (
          <li className={styles[`non-notification`]}>No Notification</li>
        )}
      </ul>
    </div>
  );
};

export default MailNotificationList;
