"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseComplete.module.css";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";

const SuspenseComplete: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsName = searchParams.get("name");
  const paramsEmail = searchParams.get("email");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paramsName || !paramsEmail) {
      console.log("Error register: Params Name or Params Email is null");
      setNotificationValue({
        message: "Couldn't get Registered Data.",
        color: 1,
      });
      router.push("/register");
    }
    setLoading(false);
  }, []);

  const handleNavigateTaskPage = async () => {
    router.push("/task");
  };

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
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
                className={classNames("material-symbols-outlined", styles.icon)}
                onClick={handleNavigateTaskPage}
              >
                arrow_circle_right
              </span>
              <p>To Task page</p>
            </div>
            <div className={styles[`confirm-mail-area`]}>
              <p>
                登録したメールアドレス宛にメールが送信されます。問題がなければメール内の
                <span>Confirm your mail</span>
                をクリックして認証してください。その後、上記ボタンからタスクページに移動が可能になります。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SuspenseComplete;
