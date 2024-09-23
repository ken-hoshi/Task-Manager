import React, { useEffect, useState } from "react";
import styles from "./notificationBanner.module.css";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import classNames from "classnames";

enum Color {
  green,
  red,
}

interface NotificationBannerProps {
  message: string;
  color: Color | null;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  color,
}) => {
  const [show, setShow] = useState(false);
  const { setNotificationValue } = useNotificationContext();

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
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`${styles.notificationBanner} ${
        show ? styles.show : styles.hide
      } ${color == Color.green ? styles.green : styles.red}`}
    >
      <div className={styles[`flex-area`]}>
        {color == Color.green ? (
          <span
            className={classNames("material-symbols-outlined", styles.success)}
          >
            check_circle
          </span>
        ) : (
          <span
            className={classNames("material-symbols-outlined", styles.failure)}
          >
            cancel
          </span>
        )}

        <p>{color == Color.green ? "Success ! ! !" : "Failure !!!"}</p>
      </div>
      {message}
    </div>
  );
};

export default NotificationBanner;
