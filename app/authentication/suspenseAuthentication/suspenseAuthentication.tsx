"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import styles from "./suspenseAuthentication.module.css";
import classNames from "classnames";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "@/app/provider/notificationProvider";

const SuspenseAuthentication: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();
  const router = useRouter();

  return (
    <>
      <BackgroundImage2 />
      <div className={styles[`inner-area`]}>
        <div className={styles[`progress-bar-container`]}>
          <div className={styles[`progress-bar`]}>
            <div className={styles.step}>
              <div className={styles.circle}></div>
              <span>Sign Up</span>
            </div>
            <div className={styles.line}></div>
            <div className={`${styles.step} ${styles.active}`}>
              <div className={styles.circle}></div>
              <span className={styles.active}>Email Verification</span>
            </div>
            <div className={styles.line}></div>
            <div className={styles.step}>
              <div className={styles.circle}></div>
              <span>Workspace Setup</span>
            </div>
          </div>
        </div>

        <div className={styles[`mail-image-area`]}>
          <span
            className={classNames("material-symbols-outlined", styles.mail)}
          >
            mail
          </span>
        </div>

        <div className={styles[`text-area`]}>
          <p>
            登録したメールアドレス宛に認証メールを送信しました。
            <br />
            メール内の認証が完了したらワークスペース登録に進んでください。
          </p>
        </div>

        <div
          className={styles[`to-workspace-setup-button`]}
          onClick={() => router.push("/createWorkspace?atSignUp=true")}
        >
          ワークスペース登録へ
        </div>
      </div>
    </>
  );
};

export default SuspenseAuthentication;
