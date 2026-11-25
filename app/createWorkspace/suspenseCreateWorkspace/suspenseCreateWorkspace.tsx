"use client";

import Loading from "@/app/component/loading/loading";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, LogOut, MailWarning, RefreshCw } from "lucide-react";
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

const NAME_INPUT_ID = "create-workspace-name";

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
  const [recheckNotice, setRecheckNotice] = useState("");
  const focusNameAfterRecheck = useRef(false);

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
        } catch (error) {
          console.error("Error Display Page", error);
          setNotificationValue({
            message: "ログインしていません。",
            color: 1,
          });
          router.push("/task");
        }
      } else {
        const { data: sessionData } = await clientSupabase.auth.getSession();
        const emailVerified = sessionData?.session?.user.email_confirmed_at;

        if (!emailVerified) {
          // 「確認し直す」を押した結果を伝える
          if (isRefreshed) setRecheckNotice("まだメール認証を確認できません。");
          setVerifiedEmail(false);
          setIsRefreshed(false);
          setLoading(false);
          return;
        }
        if (isRefreshed) focusNameAfterRecheck.current = true;
      }
      setVerifiedEmail(true);
      setLoading(false);
      setIsRefreshed(false);
    })();
  }, [isRefreshed]);

  // 認証が確認できると、押した「確認し直す」が消えるので、フォーカスを名前の欄へ移す
  useEffect(() => {
    if (!verifiedEmail || !focusNameAfterRecheck.current) return;
    focusNameAfterRecheck.current = false;
    document.getElementById(NAME_INPUT_ID)?.focus();
  }, [verifiedEmail]);

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

    try {
      // 同じ名前の確認と合言葉（space_id）の発行は DB の関数が行う（supabase/schema.sql）
      const { data: spaceId, error: createWorkspaceError } =
        await clientSupabase.rpc("create_workspace", {
          p_workspace_name: workspaceName,
        });

      if (createWorkspaceError?.code === "23505") {
        setWorkspaceNameError("既に同名のワークスペースがあります。");
        setButtonLoading(false);
        // 送信のボタンが押せない間に失ったフォーカスを、直す欄へ移す
        document.getElementById(NAME_INPUT_ID)?.focus();
        return;
      }
      if (createWorkspaceError) {
        throw createWorkspaceError;
      }

      setNotificationValue({
        message: "ワークスペースを作成しました。",
        color: 0,
      });
      sessionStorage.setItem("spaceId", spaceId);
      // 設定から来たときは、参加の画面の戻るが設定へ戻れるよう、ワークスペースも引き継ぐ
      router.push(
        paramsWorkspaceId
          ? `/joinWorkspace?atSignUp=${atSignUp}&workspaceId=${paramsWorkspaceId}`
          : `/joinWorkspace?atSignUp=${atSignUp}`
      );
    } catch (error) {
      console.error("Add Workspace Name", error);
      setNotificationValue({
        message: "ワークスペースを作成できませんでした。",
        color: 1,
      });
      setButtonLoading(false);
      document.getElementById(NAME_INPUT_ID)?.focus();
    }
  };

  const handlePageBack = async () => {
    if (paramsWorkspaceId) {
      router.push(
        `/editWorkspace?workspaceId=${paramsWorkspaceId}`
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

  // 読み終えたあとと同じカードの中に出し、表示の位置が跳ばないようにする
  if (loading)
    return (
      <AuthCard>
        <Loading className="min-h-0" />
      </AuthCard>
    );

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

        {!verifiedEmail ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MailWarning className="size-6" aria-hidden />
            </span>
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              メール認証が完了していません
            </h1>
            <p className="m-0 text-sm text-muted-foreground">
              メール内のリンクで認証してから、確認し直してください。
            </p>
            <Button type="button" variant="outline" onClick={() => setIsRefreshed(true)}>
              <RefreshCw className="size-4" aria-hidden />
              確認し直す
            </Button>
            <p role="status" className="m-0 min-h-5 text-sm text-destructive">
              {recheckNotice}
            </p>
            <p className="m-0 text-sm text-muted-foreground">
              認証が完了しても画面が変わらない場合は、
              <Button type="button" variant="link" className="h-auto p-0" onClick={handleBackTop}>
                ログイン
              </Button>
              してからワークスペースを登録してください。
            </p>
          </div>
        ) : (
          <>
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              ワークスペースを作成する
            </h1>

            <form aria-label="ワークスペースの作成" onSubmit={handleSubmit} className="space-y-4">
              <FormField label="ワークスペース名" htmlFor={NAME_INPUT_ID} required>
                <Input
                  id={NAME_INPUT_ID}
                  type="text"
                  name="name"
                  autoComplete="off"
                  required
                  aria-invalid={workspaceNameError ? true : undefined}
                  aria-describedby={workspaceNameError ? `${NAME_INPUT_ID}-error` : undefined}
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    setWorkspaceNameError("");
                  }}
                  onFocus={handleFocus}
                />
                {workspaceNameError && (
                  <p id={`${NAME_INPUT_ID}-error`} role="alert" className="m-0 text-sm text-destructive">
                    {workspaceNameError}
                  </p>
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={buttonLoading}>
                {buttonLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                作成する
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleMoveJoinWorkspace}>
                作成せずに既存のワークスペースに参加する
              </Button>
            </form>
          </>
        )}
      </AuthCard>
    </>
  );
};

export default SuspenseCreateWorkspace;
