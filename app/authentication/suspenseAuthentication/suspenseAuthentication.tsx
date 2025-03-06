"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseAuthentication.module.css";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { useFormContext } from "@/app/provider/formProvider";
import { clientSupabase } from "@/app/lib/supabase/client";

const SuspenseAuthentication: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const { setBackForm } = useFormContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsName = searchParams.get("name");
  const paramsEmail = searchParams.get("email");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paramsName || !paramsEmail) {
      console.error(
        "Error Register: Params Name or Params Email couldn't get."
      );
      setNotificationValue({
        message: "Couldn't get Registered Data.",
        color: 1,
      });
      router.push("/register");
      return;
    }
    setLoading(false);

    const interval = setInterval(async () => {
      const { data: { session } } = await clientSupabase.auth.getSession();
      console.log("Checking session:", session); // デバッグ用

      if (session?.user?.user_metadata?.email_verified) {
        clearInterval(interval); // チェックを停止
        router.push(
          `/complete?name=${encodeURIComponent(paramsName)}&email=${encodeURIComponent(paramsEmail)}`
        );
      }
    }, 5000); // 5秒ごとに確認

    return () => clearInterval(interval);
  }, [paramsName, paramsEmail, router, setNotificationValue]);

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

          <div className={styles.authentication}>
            <BackgroundImage2 />
            <div className={styles[`inner-area`]}>
              <div className={styles[`mail-image-area`]}>
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles.mail
                  )}
                >
                  mail
                </span>
              </div>

              <div className={styles[`text-area`]}>
                <p>
                  登録したメールアドレス宛に認証メールを送信しました。メール内の指示に従って認証してください。
                </p>
              </div>
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

export default SuspenseAuthentication;
