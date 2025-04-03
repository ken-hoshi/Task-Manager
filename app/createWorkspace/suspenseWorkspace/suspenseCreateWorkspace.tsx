"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseCreateWorkspace.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import classNames from "classnames";

const SuspenseCreateWorkspace: React.FC = () => {
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsAtSignUp = searchParams.get("atSignUp") === "true";

  const [loading, setLoading] = useState(false);
  const [atSignUp, setAtSignUp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(true);
  const [isRefreshed, setIsRefreshed] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceNameError, setWorkspaceNameError] = useState("");

  useEffect(() => {
    setAtSignUp(paramsAtSignUp);

    const fetchSession = async () => {
      const { data: sessionData } = await clientSupabase.auth.getSession();
      const emailVerified = sessionData?.session?.user.email_confirmed_at;

      if (!emailVerified) {
        setVerifiedEmail(false);
        setIsRefreshed(false);
        setLoading(false);
        return;
      }
      setVerifiedEmail(true);
      setLoading(false);
      setIsRefreshed(false);
    };
    fetchSession();
  }, [isRefreshed]);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (buttonLoading) return;
    setButtonLoading(true);
    setWorkspaceNameError("");

    try {
      const { data: workspaceId, error: selectWorkspaceIdError } =
        await clientSupabase
          .from("workspace")
          .select("id")
          .eq("workspace_name", workspaceName);

      if (selectWorkspaceIdError) {
        throw selectWorkspaceIdError;
      }

      if (workspaceId.length > 0) {
        setWorkspaceNameError("既に同名のワークスペースがあります。");
        setButtonLoading(false);
        return;
      }

      const { error: insertWorkspaceNameError } = await clientSupabase
        .from("workspace")
        .insert({ workspace_name: workspaceName });

      if (insertWorkspaceNameError) {
        throw insertWorkspaceNameError;
      }

      router.push(`/joinWorkspace?atSignUp=${atSignUp}`);
      setNotificationValue({
        message: "Created Workspace.",
        color: 0,
      });
    } catch (error) {
      console.error("Add Workspace Name", error);
      setNotificationValue({
        message: "Couldn't add Workspace Name.",
        color: 1,
      });
      setButtonLoading(false);
    }
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

          <div>
            <BackgroundImage2 />

            <div className={styles[`inner-area`]}>
              {atSignUp && (
                <div className={styles[`progress-bar-container`]}>
                  <div className={styles[`progress-bar`]}>
                    <div className={styles.step}>
                      <div className={styles.circle}></div>
                      <span>Sign Up</span>
                    </div>
                    <div className={styles.line}></div>
                    <div className={styles.step}>
                      <div className={styles.circle}></div>
                      <span>Email Verification</span>
                    </div>
                    <div className={styles.line}></div>
                    <div className={`${styles.step} ${styles.active}`}>
                      <div className={styles.circle}></div>
                      <span className={styles.active}>Workspace Setup</span>
                    </div>
                  </div>
                </div>
              )}
              {!verifiedEmail ? (
                <div className={styles[`attention-area`]}>
                  <div className={styles[`attention-text`]}>
                    メール認証が完了していません。メール認証してください。
                  </div>
                  <span
                    className={classNames(
                      "material-symbols-outlined",
                      styles.refresh
                    )}
                    onClick={() => setIsRefreshed(true)}
                  >
                    refresh
                  </span>
                </div>
              ) : (
                <div className={styles[`form-area`]}>
                  <h1>
                    ワークスペース
                    <br />
                    を作成する
                  </h1>

                  <form onSubmit={handleSubmit}>
                    <div className={styles[`input-area-container`]}>
                      <div className={styles[`input-area`]}>
                        <input
                          type="text"
                          placeholder="Workspace Name"
                          name="name"
                          autoComplete="off"
                          required
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          onFocus={handleFocus}
                          className={styles.input}
                        />

                        {workspaceNameError ? (
                          <p className={styles.error}>{workspaceNameError}</p>
                        ) : (
                          <p className={styles.instruction}>
                            Enter Workspace Name
                          </p>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={buttonLoading}>
                      {buttonLoading ? (
                        <div className={styles.spinner}></div>
                      ) : (
                        "Create"
                      )}
                    </button>
                    <div
                      className={styles[`to-join-workspace`]}
                      onClick={() =>
                        router.push(`/joinWorkspace?atSignUp=${atSignUp}`)
                      }
                    >
                      作成せずに既存のワークスペースに参加する
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseCreateWorkspace;
