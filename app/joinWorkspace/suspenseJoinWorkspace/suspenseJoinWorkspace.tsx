"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseJoinWorkspace.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import Select, { MultiValue } from "react-select";
import { useFormContext } from "@/app/provider/formProvider";
import { getUserId } from "@/app/lib/api/getUserId";
import { selectBoxStyles } from "./selectBoxStyles";

interface WorkspaceProps {
  id: number;
  name: string;
}

interface WorkspaceOption {
  value: number;
  label: string;
}

interface SelectWorkspaceProps {
  workspaceList: WorkspaceProps[];
  selectedWorkspaceList: WorkspaceOption[];
}

const SuspenseJoinWorkspace: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsAtSignUp = searchParams.get("atSignUp") === "true";

  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [atSignUp, setAtSignUp] = useState(false);
  const [userId, setUserId] = useState(0);

  const [workspaceArray, setWorkspaceArray] = useState<SelectWorkspaceProps>({
    workspaceList: [],
    selectedWorkspaceList: [],
  });

  useEffect(() => {
    setLoading(true);
    setAtSignUp(paramsAtSignUp);

    const checkUserSession = async () => {
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
        console.error("Display Page", error);
        setNotificationValue({
          message: "You have not signed up.",
          color: 1,
        });
        setBackForm(true);
        router.back();
      }
    };
    checkUserSession();

    const fetchWorkspaceData = async () => {
      try {
        const { data: workspaceData, error: selectWorkspaceError } =
          await clientSupabase.from("workspace").select("id, workspace_name");

        if (selectWorkspaceError) {
          throw selectWorkspaceError;
        }

        setWorkspaceArray((prevWorkspaceArray) => ({
          ...prevWorkspaceArray,
          workspaceList: workspaceData.map((workspace) => ({
            id: workspace.id,
            name: workspace.workspace_name,
          })),
        }));
      } catch (error) {
        console.error("Fetch Workspace Data", error);
        router.back();
        setNotificationValue({
          message: "Couldn't get the Workspace Data.",
          color: 1,
        });
      }
    };
    fetchWorkspaceData();
    setLoading(false);
  }, []);

  const handlePageBack = () => {
    router.back();
  };

  const workspaceOptions = workspaceArray.workspaceList
    .filter(
      (workspace) =>
        !workspaceArray.selectedWorkspaceList.some(
          (selectedWorkspace) => selectedWorkspace.value === workspace.id
        )
    )
    .map((workspace) => ({
      value: workspace.id,
      label: workspace.name,
    }));

  const handleWorkspaceChange = (
    selectedOptions: MultiValue<WorkspaceOption>
  ) => {
    setWorkspaceArray((prevWorkspaceArray) => ({
      ...prevWorkspaceArray,
      selectedWorkspaceList: selectedOptions as WorkspaceOption[],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (buttonLoading) return;
    setButtonLoading(true);

    const workspaceUsers = workspaceArray.selectedWorkspaceList.map(
      (workspace) => ({ workspace_id: workspace.value, user_id: userId })
    );
    try {
      const { error: insertWorkspaceNameError } = await clientSupabase
        .from("workspace_users")
        .insert(workspaceUsers);

      if (insertWorkspaceNameError) {
        throw insertWorkspaceNameError;
      }
      setButtonLoading(false);
      setNotificationValue({
        message: "Joined Workspace.",
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

              <div className={styles[`form-area`]}>
                <h1>
                  ワークスペース
                  <br />
                  に参加する
                </h1>

                <form onSubmit={handleSubmit}>
                  <div className={styles[`input-area-container`]}>
                    <div className={styles[`input-area`]}>
                      <Select
                        isMulti
                        options={workspaceOptions}
                        value={workspaceArray.selectedWorkspaceList}
                        onChange={handleWorkspaceChange}
                        placeholder="-- Workspace --"
                        required
                        styles={selectBoxStyles}
                      />
                      <p className={styles.instruction}>Select Workspace</p>
                    </div>
                  </div>

                  <button type="submit" disabled={buttonLoading}>
                    {buttonLoading ? (
                      <div className={styles.spinner}></div>
                    ) : (
                      "Join"
                    )}
                  </button>
                  <div
                    className={styles[`to-create-workspace`]}
                    onClick={() => router.push("/createWorkspace")}
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
