"use client";

import Form from "./form/form";
import NotificationBanner from "../component/notificationBanner/notificationBanner";
import { useNotificationContext } from "../provider/notificationProvider";

// 入口。以前は「Click me」を押して1秒待ってからログインの欄が出たが、最初から出す（UI 一覧の F1）
const Top: React.FC = () => {
  const { notificationValue } = useNotificationContext();

  return (
    <>
      {notificationValue && notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}
      <Form />
    </>
  );
};

export default Top;
