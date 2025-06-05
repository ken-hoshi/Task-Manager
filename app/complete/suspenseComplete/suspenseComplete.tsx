"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseComplete.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";

const SuspenseComplete: React.FC = () => {
  const { notificationValue } = useNotificationContext();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [registeredName, setRegisteredName] = useState();
  const [registeredEmail, setRegisteredEmail] = useState();

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await clientSupabase.auth.getSession();
      const metaDataName =
        sessionData?.session?.user.user_metadata.display_name;
      const metaDataEmail = sessionData?.session?.user.user_metadata.email;
      const emailVerified =
        sessionData?.session?.user.user_metadata.email_verified;

      if (!emailVerified || !metaDataName || !metaDataEmail) {
        console.error(
          "Error Register: Registered Name or Registered Email couldn't get."
        );
        setLoading(false);
        return;
      }
      setRegisteredName(metaDataName);
      setRegisteredEmail(metaDataEmail);
      setLoading(false);
    })();
  }, []);

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

          <div>
            <BackgroundImage2 />

            <div className={styles[`text-area`]}>
              {registeredName && registeredEmail ? (
                <>
                  <h1 className={styles.success}>Success!</h1>
                  <ul>
                    <p>Name</p>
                    <li className={styles[`name-item`]}>{registeredName}</li>
                    <p>Email Address</p>
                    <li className={styles[`email-item`]}>{registeredEmail}</li>
                  </ul>
                </>
              ) : (
                <>
                  <h1 className={styles.failure}>Failure!</h1>
                  <div className={styles[`failure-text`]}>
                    メール認証に失敗しました。管理者に連絡してください。
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseComplete;
