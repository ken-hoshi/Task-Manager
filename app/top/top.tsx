"use client";

import { useState } from "react";
import { useFormContext } from "../provider/formProvider";
import Form from "./form/form";
import Title from "./title/title";
import styles from "./top.module.css";
import NotificationBanner from "../component/notificationBanner/notificationBanner";
import { useNotificationContext } from "../provider/notificationProvider";

const Top: React.FC = () => {
  const [clicked, setClicked] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { backForm } = useFormContext();
  const { notificationValue } = useNotificationContext();

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => {
      setShowForm(true);
    }, 1000);
  };

  return (
    <div className={styles[`top-page-area`]}>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}
      {backForm ? (
        <Form />
      ) : clicked ? (
        showForm ? (
          <Form className={styles.rotateIn} />
        ) : (
          <Title onClick={handleClick} className={styles.rotateOut} />
        )
      ) : (
        <Title onClick={handleClick} />
      )}
    </div>
  );
};

export default Top;
