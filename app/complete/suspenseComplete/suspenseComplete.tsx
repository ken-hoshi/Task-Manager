"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseComplete.module.css";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { useFormContext } from "@/app/provider/formProvider";

const SuspenseComplete: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsName = searchParams.get("name");
  const paramsEmail = searchParams.get("email");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paramsName || !paramsEmail) {
      console.error("Error Register: Params Name or Params Email couldn't get.");
      setNotificationValue({
        message: "Couldn't get Registered Data.",
        color: 1,
      });
      router.push("/register");
    }
    setLoading(false);
  }, []);

  const handleNavigateTopPage = async () => {
    setBackForm(true);
    router.push("/");
  };

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          {notificationValue.message && (
            <NotificationBanner
              message={notificationValue.message}
              color={notificationValue.color}
            />
          )}

          <div className={styles.complete}>
            <BackgroundImage2 />

            <div className={styles[`text-area`]}>
              <h1>Success!</h1>

              <ul>
                <p>Name</p>
                <li className={styles[`name-item`]}>{paramsName}</li>
                <p>Email Address</p>
                <li className={styles[`email-item`]}>{paramsEmail}</li>
              </ul>

              <div className={styles[`to-task-page-area`]}>
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles.icon
                  )}
                  onClick={handleNavigateTopPage}
                >
                  arrow_circle_right
                </span>
                <p>To Login page</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseComplete;
