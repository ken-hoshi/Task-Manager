import { clientSupabase } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import styles from "./header.module.css";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import MailNotificationList from "../mailNotificationList/mailNotificationList";
import { getMailNotifications } from "@/app/lib/getMailNotification";
import { formatDateTime } from "@/app/lib/formatDateTime";
import { Logout } from "@/app/hooks/logout";

interface HeaderProps {
  isBackButton?: boolean;
  userId: number;
}

type Notification = {
  id: number;
  message: string;
  isRead: boolean;
  timestamp: string;
};

const Header: React.FC<HeaderProps> = ({ isBackButton, userId }) => {
  const router = useRouter();
  const { useLogout } = Logout();

  const [isOpen, setIsOpen] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [showMailNotificationList, setShowMailNotificationList] =
    useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const mailRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutsideList);

    const getNotifications = async () => {
      const mailNotifications = await getMailNotifications(userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (mailNotifications && mailNotifications.length > 0) {
        const mailNotificationList: Notification[] = [];
        await Promise.all(
          mailNotifications.map(async (mailNotification) => {
            const specifiedDate = new Date(mailNotification.created_at);
            const dateWithSevenDaysAdded = new Date(specifiedDate);
            dateWithSevenDaysAdded.setDate(specifiedDate.getDate() + 7);

            if (dateWithSevenDaysAdded > today || !mailNotification.isRead) {
              mailNotificationList.push({
                id: mailNotification.id,
                message: mailNotification.text,
                isRead: mailNotification.isRead,
                timestamp: formatDateTime(mailNotification.created_at),
              });
            } else {
              const { error: mailNotificationsDeleteError } =
                await clientSupabase
                  .from("mail_notifications")
                  .delete()
                  .eq("id", mailNotification.id);

              if (mailNotificationsDeleteError) {
                throw mailNotificationsDeleteError;
              }
            }
          })
        );
        setNotifications(mailNotificationList);
        setUnreadCount(
          mailNotificationList.filter((notification) => !notification.isRead)
            .length
        );
      }
    };
    getNotifications();
  }, [isOpen, showMailNotificationList]);

  const handleClickOutsideList = (event: MouseEvent) => {
    if (
      listRef.current &&
      !listRef.current.contains(event.target as Node) &&
      mailRef.current &&
      !mailRef.current.contains(event.target as Node)
    ) {
      setShowMailNotificationList(false);
    }
  };

  const toggleMenu = () => {
    if (showMailNotificationList) {
      setShowMailNotificationList(false);
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => setShowButtons(true), 50);
      setTimeout(() => setShowCancelButton(true), 50);
    } else {
      setShowCancelButton(false);
      setShowButtons(false);
    }
  };

  const handleBack = () => {
    if (isBackButton) router.push("/task");
  };

  const logout = async () => {
    await useLogout();
  };

  const handleTransitionAccount = () => {
    router.push(`/account?userId=${userId}`);
  };

  return (
    <>
      <div
        className={isBackButton ? styles[`none-back-header`] : styles.header}
      >
        {isBackButton && (
          <span
            className={classNames("material-symbols-outlined", styles.back)}
            onClick={handleBack}
          >
            arrow_back
          </span>
        )}

        <div className={styles.container}>
          {isOpen && (
            <div className={styles.menu}>
              <span
                onClick={handleTransitionAccount}
                className={classNames(
                  "material-symbols-outlined",
                  styles.account,
                  { [styles.fadeIn1]: showButtons }
                )}
              >
                account_circle
              </span>

              <span
                className={classNames(
                  "material-symbols-outlined",
                  styles.mail,
                  {
                    [styles.fadeIn2]: showButtons,
                  }
                )}
                onClick={() =>
                  setShowMailNotificationList(!showMailNotificationList)
                }
                ref={mailRef}
              >
                mail
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount}</span>
                )}
              </span>

              <button
                onClick={logout}
                className={classNames(styles[`logout-button`], {
                  [styles.fadeIn3]: showButtons,
                })}
              >
                Logout
              </button>
            </div>
          )}
          <div
            className={classNames(styles.hamburger, {
              [styles[`none-hamburger`]]: showButtons,
            })}
            onClick={toggleMenu}
          >
            <div
              className={classNames(styles.line, {
                [styles.fadeOut1]: showButtons,
              })}
            ></div>
            <div
              className={classNames(styles.line, {
                [styles.fadeOut2]: showButtons,
              })}
            ></div>
            <div
              className={classNames(styles.line, {
                [styles.fadeOut3]: showButtons,
              })}
            ></div>
            {unreadCount > 0 && !isOpen && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </div>

          <span
            className={classNames("material-symbols-outlined", styles.cancel, {
              [styles.fadeIn4]: showCancelButton,
            })}
            onClick={toggleMenu}
          >
            close_small
          </span>
        </div>
      </div>
      {showMailNotificationList && (
        <MailNotificationList notifications={notifications} listRef={listRef} />
      )}
    </>
  );
};

export default Header;
