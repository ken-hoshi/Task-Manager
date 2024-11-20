"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseAuthentication.module.css";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";

const SuspenseAuthentication: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
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
      return;
    }

    const checkAuthState = async () => {
      const { data: subscription } = clientSupabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            router.push(
              `/complete?name=${encodeURIComponent(paramsName)}&email=${encodeURIComponent(
                paramsEmail
              )}`
            );
          }
        }
      );
      return () => {
        subscription?.subscription?.unsubscribe(); 
      };
    };
    setLoading(false);
    checkAuthState();
  }, [paramsName, paramsEmail, router, setNotificationValue]);

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
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseAuthentication;
