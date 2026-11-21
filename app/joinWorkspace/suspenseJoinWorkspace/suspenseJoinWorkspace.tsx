"use client";

import Loading from "@/app/component/loading/loading";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, LogOut, Search, X } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { FormField } from "@/components/form-field";
import { SignupSteps } from "@/components/signup-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useFormContext } from "@/app/provider/formProvider";
import { getUserId } from "@/app/lib/api/getUserId";
import { Logout } from "@/app/hooks/logout";

const SPACE_ID_INPUT_ID = "join-workspace-space-id";

interface WorkspaceProps {
  id: number;
  name: string;
  spaceId: string;
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
          message: "ログインしていません。",
          color: 1,
        });
        setBackForm(true);
        router.back();
      }
    })();
    const storedSpaceId = sessionStorage.getItem("spaceId");
    if (storedSpaceId) {
      (async () => {
        // まだメンバーでないワークスペースは表から読めないので、合言葉で引く関数を使う
        const { data: workspaceData, error: selectWorkspaceDataError } =
          await clientSupabase
            .rpc("find_workspace_by_space_id", { p_space_id: storedSpaceId })
            .single<{ id: number; workspace_name: string }>();

        if (!workspaceData || selectWorkspaceDataError) {
          console.error(
            "Get Workspace Data",
            selectWorkspaceDataError && selectWorkspaceDataError
          );
          setNotificationValue({
            message: "ワークスペースを読めませんでした。",
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
            {
              id: workspaceData.id,
              name: workspaceData.workspace_name,
              spaceId: storedSpaceId,
            },
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
        `/editWorkspace?workspaceId=${paramsWorkspaceId}`
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
        .rpc("find_workspace_by_space_id", { p_space_id: spaceId })
        .single<{ id: number; workspace_name: string }>();

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
      { id: workspaceData.id, name: workspaceData.workspace_name, spaceId },
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
    // 押したボタンが消えるので、フォーカスを合言葉の欄へ移す
    document.getElementById(SPACE_ID_INPUT_ID)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (buttonLoading || selectedWorkspaceList.length === 0) return;
    setButtonLoading(true);

    try {
      // 合言葉を確かめて参加させるのは DB の関数（1つでも合わなければ、どれにも参加しない）
      const { error: insertWorkspaceNameError } = await clientSupabase.rpc(
        "join_workspaces",
        { p_space_ids: selectedWorkspaceList.map((workspace) => workspace.spaceId) }
      );

      if (insertWorkspaceNameError?.code === "P0002") {
        setErrorMessage("ワークスペースが見つかりません。再度検索してください。");
        setButtonLoading(false);
        // 送信のボタンが押せない間に失ったフォーカスを、合言葉の欄へ移す
        document.getElementById(SPACE_ID_INPUT_ID)?.focus();
        return;
      }
      if (insertWorkspaceNameError) {
        throw insertWorkspaceNameError;
      }
      setNotificationValue({
        message: "ワークスペースに参加しました。",
        color: 0,
      });
      router.push("/task");
    } catch (error) {
      console.error("Join Workspace", error);
      setNotificationValue({
        message: "ワークスペースに参加できませんでした。",
        color: 1,
      });
      setButtonLoading(false);
      document.getElementById(SPACE_ID_INPUT_ID)?.focus();
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

  if (loading) return <Loading />;

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      <AuthCard>
        {paramsAtSignUp ? (
          <SignupSteps current={2} />
        ) : (
          <Button type="button" variant="ghost" className="-ml-2 self-start" onClick={handlePageBack}>
            {paramsWorkspaceId ? (
              <>
                <ArrowLeft className="size-4" aria-hidden />
                ワークスペースの設定へ戻る
              </>
            ) : (
              <>
                <LogOut className="size-4" aria-hidden />
                ログアウト
              </>
            )}
          </Button>
        )}

        <h1 className="m-0 text-2xl font-semibold tracking-tight">
          ワークスペースに参加する
        </h1>

        <form aria-label="ワークスペースへの参加" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="合言葉" htmlFor={SPACE_ID_INPUT_ID}>
            <div className="flex gap-2">
              <Input
                id={SPACE_ID_INPUT_ID}
                type="text"
                autoComplete="off"
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={`${SPACE_ID_INPUT_ID}-note`}
                value={spaceId}
                onChange={(e) => {
                  setSpaceId(e.target.value);
                  setErrorMessage("");
                }}
              />
              <Button type="button" variant="outline" onClick={searchSpaceId}>
                {searchLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="size-4" aria-hidden />
                )}
                検索
              </Button>
            </div>
            {/* key を分けて要素ごと入れ替える（既存の要素に role="alert" を足すだけだと読み上げられない環境がある） */}
            {errorMessage ? (
              <p key="error" id={`${SPACE_ID_INPUT_ID}-note`} role="alert" className="m-0 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : (
              <p key="hint" id={`${SPACE_ID_INPUT_ID}-note`} className="m-0 text-sm text-muted-foreground">
                ワークスペースの設定にある合言葉を入れて検索します。
              </p>
            )}
          </FormField>

          {selectedWorkspaceList.length > 0 && (
            <ul role="list" aria-label="参加するワークスペース" className="flex list-none flex-wrap gap-2 p-0">
              {selectedWorkspaceList.map((selectedWorkspace) => (
                <li
                  key={selectedWorkspace.id}
                  className="flex max-w-full items-center gap-1 rounded-md border bg-muted py-0.5 pr-0.5 pl-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">{selectedWorkspace.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`「${selectedWorkspace.name}」を外す`}
                    onClick={() => removeSelectedWorkspace(selectedWorkspace.id)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button type="submit" className="w-full" disabled={buttonLoading}>
            {buttonLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            参加する
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={handleMoveCreateWorkspace}>
            ワークスペースを作成する
          </Button>
        </form>
      </AuthCard>
    </>
  );
};

export default SuspenseJoinWorkspace;
