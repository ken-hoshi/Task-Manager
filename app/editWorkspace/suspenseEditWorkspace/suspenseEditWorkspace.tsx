"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import styles from "./suspenseEditWorkspace.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import classNames from "classnames";
import { useFormContext } from "@/app/provider/formProvider";

interface WorkspaceProps {
  id: number;
  name: string;
}

interface WorkspaceOption {
  value: number;
  label: string;
}

const SuspenseEditWorkspace: React.FC = () => {
  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();
  const { notificationValue } = useNotificationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsUserId = Number(searchParams.get("userId"));

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(0);

  const [workspaceArray, setWorkspaceArray] = useState<WorkspaceProps[]>([]);

  useEffect(() => {
    setUserId(paramsUserId);

    const fetchWorkspaceData = async () => {
      try {
        const { data: workspaceDataArray, error: selectWorkspaceError } =
          await clientSupabase
            .from("workspace_users")
            .select("workspace(id, workspace_name)")
            .eq("user_id", paramsUserId);

        if (selectWorkspaceError) {
          throw selectWorkspaceError;
        }
        setWorkspaceArray(
          workspaceDataArray.map((workspaceData: any) => ({
            id: workspaceData.workspace.id,
            name: workspaceData.workspace.workspace_name,
          }))
        );
      } catch (error) {
        console.error("Fetch Workspace Data", error);
        router.back();
        setNotificationValue({
          message: "Couldn't get the Workspace Data.",
          color: 1,
        });
      }
      setLoading(false);
    };
    fetchWorkspaceData();
  }, []);

  const handlePageBack = () => {
    router.back();
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
              <span
                className={classNames("material-symbols-outlined", styles.back)}
                onClick={handlePageBack}
              >
                arrow_back
              </span>
              <div className={styles[`edit-area`]}>
                <h1>
                  ワークスペース
                  <br />
                  を編集する
                </h1>

                <div className={styles[`table-area-container`]}>
                  <div className={styles[`table-area`]}>
                    <table>
                      <tbody>
                        {workspaceArray.map((workspace, index) => (
                          <tr key={index}>
                            <td className={styles[`workspace-name`]}>
                              {workspace.name}
                            </td>
                            <td>
                              <div className={styles[`edit-button-container`]}>
                                <span
                                  className={classNames(
                                    "material-symbols-outlined",
                                    styles.edit
                                  )}
                                >
                                  {" "}
                                  edit{" "}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div
                  className={styles[`to-workspace-setup-button`]}
                  // onClick={() => router.push("/createWorkspace")}
                >
                  ワークスペースを作成する
                </div>
                <div
                  className={styles[`to-workspace-setup-button`]}
                  // onClick={() => router.push("/joinWorkspace")}
                >
                  ワークスペース登録へ
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseEditWorkspace;
