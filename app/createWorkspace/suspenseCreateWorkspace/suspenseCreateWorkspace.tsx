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
import { useFormContext } from "@/app/provider/formProvider";
import { getUserId } from "@/app/lib/api/getUserId";
import { Logout } from "@/app/hooks/logout";

const SuspenseCreateWorkspace: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const { useLogout } = Logout();
  const searchParams = useSearchParams();
  const paramsAtSignUp = searchParams.get("atSignUp") === "true";
  const workspaceId = searchParams.get("workspaceId");
  const paramsWorkspaceId = workspaceId ? Number(workspaceId) : undefined;

  const [loading, setLoading] = useState(false);
  const [atSignUp, setAtSignUp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(true);
  const [isRefreshed, setIsRefreshed] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceNameError, setWorkspaceNameError] = useState("");
  const [userId, setUserId] = useState(0);

  useEffect(() => {
    setAtSignUp(paramsAtSignUp);
    (async () => {
      if (!paramsAtSignUp) {
        try {
          const {
            data: { session },
          } = await clientSupabase.auth.getSession();

          if (!session?.user) {
            throw new Error("User has not signed up");
          }

          const userId = await getUserId(session!.user.id);
          if (!userId) {
            throw new Error("User Id couldn't get.");
          }
          setUserId(userId);
        } catch (error) {
          console.error("Error Display Page", error);
          setNotificationValue({
            message: "You have not signed up.",
            color: 1,
          });
          router.push("/task");
        }
      } else {
        const { data: sessionData } = await clientSupabase.auth.getSession();
        const emailVerified = sessionData?.session?.user.email_confirmed_at;

        if (!emailVerified) {
          setVerifiedEmail(false);
          setIsRefreshed(false);
          setLoading(false);
          return;
        }
      }
      setVerifiedEmail(true);
      setLoading(false);
      setIsRefreshed(false);
    })();
  }, [isRefreshed]);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleBackTop = () => {
    setBackForm(true);
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (buttonLoading) return;
    setButtonLoading(true);
    setWorkspaceNameError("");

    function generateSpaceId(length = 8): string {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return Array.from(
        { length },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    }

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

      let judgeExistSpaceId = true;
      let spaceId = "";
      while (judgeExistSpaceId) { 
        spaceId = generateSpaceId();

        const { data: existSpaceId } = await clientSupabase
          .from("workspace")
          .select("space_id")
          .eq("space_id", spaceId)
          .single();

        if (!existSpaceId) {
          const { error: insertWorkspaceNameError } = await clientSupabase
            .from("workspace")
            .insert({ workspace_name: workspaceName, space_id: spaceId });

          if (insertWorkspaceNameError) {
            throw insertWorkspaceNameError;
          }
          judgeExistSpaceId = false;
        }
      }

      setNotificationValue({
        message: " Workspace was created !",
        color: 0,
      });
      sessionStorage.setItem("spaceId", spaceId);
      router.push(`/joinWorkspace?atSignUp=${atSignUp}`);
    } catch (error) {
      console.error("Add Workspace Name", error);
      setNotificationValue({
        message: "Couldn't add Workspace Name.",
        color: 1,
      });
      setButtonLoading(false);
    }
  };

  const handlePageBack = async () => {
    if (paramsWorkspaceId) {
      router.push(
        `/editWorkspace?workspaceId=${paramsWorkspaceId}&userId=${userId}`
      );
    } else {
      await useLogout();
    }
  };

  const handleMoveJoinWorkspace = () => {
    if (paramsWorkspaceId) {
      router.push(
        `/joinWorkspace?atSignUp=${atSignUp}&workspaceId=${paramsWorkspaceId}`
      );
    } else {
      router.push(`/joinWorkspace?atSignUp=${atSignUp}`);
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
              {!atSignUp ? (
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles.back
                  )}
                  onClick={handlePageBack}
                >
                  arrow_back
                </span>
              ) : (
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

                  <div className={styles[`to-login-page-text`]}>
                    ※メール認証が完了しても画面が変わらない場合は、
                    <br />
                    <span
                      onClick={handleBackTop}
                      className={styles[`to-login-page-button`]}
                    >
                      ログイン
                    </span>
                    後にワークスペース登録をしてください。
                  </div>
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
                      onClick={handleMoveJoinWorkspace}
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
