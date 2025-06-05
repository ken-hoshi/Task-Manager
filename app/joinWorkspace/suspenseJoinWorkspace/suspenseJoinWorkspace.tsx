"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseJoinWorkspace.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useFormContext } from "@/app/provider/formProvider";
import { getUserId } from "@/app/lib/api/getUserId";
import classNames from "classnames";
import { Logout } from "@/app/hooks/logout";

interface WorkspaceProps {
  id: number;
  name: string;
}

const SuspenseJoinWorkspace: React.FC = () => {
  const { useLogout } = Logout();
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsAtSignUp = searchParams.get("atSignUp") === "true";
  const workspaceId = searchParams.get("workspaceId");
  const paramsWorkspaceId = workspaceId ? Number(workspaceId) : undefined;

  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [atSignUp, setAtSignUp] = useState(false);
  const [userId, setUserId] = useState(0);
  const [spaceId, setSpaceId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedWorkspaceList, setSelectedWorkspaceList] = useState<
    WorkspaceProps[]
  >([]);

  useEffect(() => {
    setLoading(true);
    setAtSignUp(paramsAtSignUp);

    (async () => {
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
        setBackForm(true);
        router.back();
      }
    })();
    const storedSpaceId = sessionStorage.getItem("spaceId");
    if (storedSpaceId) {
      (async () => {
        const { data: workspaceData, error: selectWorkspaceDataError } =
          await clientSupabase
            .from("workspace")
            .select("id, workspace_name")
            .eq("space_id", storedSpaceId)
            .single();

        if (!workspaceData || selectWorkspaceDataError) {
          console.error(
            "Get Workspace Data",
            selectWorkspaceDataError && selectWorkspaceDataError
          );
          setNotificationValue({
            message: "Couldn't get Workspace Data.",
            color: 1,
          });
          router.back();
          return;
        }
        if (
          !selectedWorkspaceList.find(
            (selectedWorkspace) => selectedWorkspace.id === workspaceData.id
          )
        ) {
          setSelectedWorkspaceList([
            { id: workspaceData.id, name: workspaceData.workspace_name },
          ]);
        }
      })();
    }

    setLoading(false);
    return () => {
      if (storedSpaceId) {
        sessionStorage.removeItem("spaceId");
      }
    };
  }, []);

  const handlePageBack = async () => {
    if (paramsWorkspaceId) {
      router.push(
        `/editWorkspace?workspaceId=${paramsWorkspaceId}&userId=${userId}`
      );
    } else {
      await useLogout();
    }
  };

  const searchSpaceId = async () => {
    if (searchLoading || !spaceId) return;
    setSearchLoading(true);
    setErrorMessage("");

    const { data: workspaceData, error: selectWorkspaceDataError } =
      await clientSupabase
        .from("workspace")
        .select("id, workspace_name")
        .eq("space_id", spaceId)
        .single();

    const { data: workspaceUsersData } = await clientSupabase
      .from("workspace_users")
      .select("id")
      .eq("workspace_id", workspaceData?.id)
      .eq("user_id", userId)
      .single();

    if (!workspaceData || selectWorkspaceDataError) {
      setErrorMessage("ワークスペースが見つかりません。再度検索してください。");
      setSearchLoading(false);
      return;
    }
    if (
      selectedWorkspaceList.find(
        (selectedWorkspace) => selectedWorkspace.id === workspaceData.id
      )
    ) {
      setErrorMessage(
        "ワークスペースは既に選択されています。再度検索してください。"
      );
      setSearchLoading(false);
      return;
    }
    if (workspaceUsersData && workspaceUsersData.id) {
      setErrorMessage(
        "検索したワークスペースに既に登録されています。再度検索してください。"
      );
      setSearchLoading(false);
      return;
    }

    setSelectedWorkspaceList((prevSelectedWorkspaceList) => [
      ...prevSelectedWorkspaceList,
      { id: workspaceData.id, name: workspaceData.workspace_name },
    ]);
    setSpaceId("");
    setSearchLoading(false);
  };

  const removeSelectedWorkspace = (workspaceId: number) => {
    setSelectedWorkspaceList((prevSelectedWorkspaceList) =>
      prevSelectedWorkspaceList.filter(
        (workspace) => workspace.id !== workspaceId
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (buttonLoading || selectedWorkspaceList.length === 0) return;
    setButtonLoading(true);

    const workspaceUsers = selectedWorkspaceList.map((workspace) => ({
      workspace_id: workspace.id,
      user_id: userId,
    }));
    try {
      const { error: insertWorkspaceNameError } = await clientSupabase
        .from("workspace_users")
        .insert(workspaceUsers);

      if (insertWorkspaceNameError) {
        throw insertWorkspaceNameError;
      }
      setNotificationValue({
        message: "Joined Workspace !",
        color: 0,
      });
      router.push("/task");
    } catch (error) {
      console.error("Join Workspace", error);
      setNotificationValue({
        message: "Couldn't join Workspace.",
        color: 1,
      });
      setButtonLoading(false);
    }
  };

  const handleMoveCreateWorkspace = () => {
    if (paramsWorkspaceId) {
      router.push(
        `/createWorkspace?atSignUp=${atSignUp}&workspaceId=${paramsWorkspaceId}`
      );
    } else {
      router.push(`/createWorkspace?atSignUp=${atSignUp}`);
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

              <div className={styles[`form-area`]}>
                <h1>
                  ワークスペース
                  <br />
                  に参加する
                </h1>

                <form onSubmit={handleSubmit}>
                  <div className={styles[`input-area-container`]}>
                    <div className={styles[`input-area`]}>
                      <div className={styles[`search-workspace-area`]}>
                        <div className={styles[`search-input-container`]}>
                          <input
                            type="text"
                            value={spaceId}
                            onChange={(e) => setSpaceId(e.target.value)}
                            placeholder="Space ID"
                            className={styles[`space-id`]}
                          />
                        </div>
                        <div className={styles[`search-button-container`]}>
                          <button type="button" onClick={searchSpaceId}>
                            {searchLoading ? (
                              <div
                                className={styles[`search-button-spinner`]}
                              ></div>
                            ) : (
                              "Search"
                            )}
                          </button>
                        </div>
                      </div>
                      {errorMessage ? (
                        <div className={styles[`error-message`]}>
                          {errorMessage}
                        </div>
                      ) : (
                        <p className={styles.instruction}> Enter Space ID</p>
                      )}

                      <div className={styles[`join-workspace-display-area`]}>
                        {selectedWorkspaceList.length > 0 && (
                          <div
                            className={styles[`workspace-name-block-container`]}
                          >
                            {selectedWorkspaceList.map(
                              (selectedWorkspace, index) => (
                                <div
                                  className={styles[`workspace-name-block`]}
                                  key={index}
                                >
                                  <div className={styles[`workspace-name`]}>
                                    {selectedWorkspace.name}
                                  </div>
                                  <div
                                    className={
                                      styles[`cancel-button-container`]
                                    }
                                  >
                                    <span
                                      className={classNames(
                                        "material-symbols-outlined",
                                        styles.cancel
                                      )}
                                      onClick={() =>
                                        removeSelectedWorkspace(
                                          selectedWorkspace.id
                                        )
                                      }
                                    >
                                      close_small
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={buttonLoading}
                    className={styles[`join-button`]}
                  >
                    {buttonLoading ? (
                      <div className={styles[`join-button-spinner`]}></div>
                    ) : (
                      "Join"
                    )}
                  </button>
                  <div
                    className={styles[`to-create-workspace`]}
                    onClick={handleMoveCreateWorkspace}
                  >
                    ワークスペースを作成する
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseJoinWorkspace;
