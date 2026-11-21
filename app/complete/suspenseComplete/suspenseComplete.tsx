"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";

const SuspenseComplete: React.FC = () => {
  const { notificationValue } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [registeredName, setRegisteredName] = useState<string>();
  const [registeredEmail, setRegisteredEmail] = useState<string>();

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

  if (loading) {
    return (
      <AuthCard>
        <p role="status" className="m-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          読み込み中
        </p>
      </AuthCard>
    );
  }

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      <AuthCard>
        {registeredName && registeredEmail ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <CircleCheck className="size-10 text-status-done" aria-hidden />
              <h1 className="m-0 text-2xl font-semibold tracking-tight">
                メール認証が完了しました
              </h1>
              <p className="m-0 text-sm text-muted-foreground">
                登録した画面に戻るか、ログインしてワークスペース登録に進んでください。
              </p>
            </div>
            <dl className="m-0 space-y-3 rounded-lg border p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">名前</dt>
                <dd className="m-0 mt-0.5 font-medium [overflow-wrap:anywhere]">{registeredName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">メールアドレス</dt>
                <dd className="m-0 mt-0.5 font-medium [overflow-wrap:anywhere]">{registeredEmail}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <CircleX className="size-10 text-destructive" aria-hidden />
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              メール認証に失敗しました
            </h1>
            <p className="m-0 text-sm text-muted-foreground">
              管理者に連絡してください。
            </p>
          </div>
        )}
      </AuthCard>
    </>
  );
};

export default SuspenseComplete;
