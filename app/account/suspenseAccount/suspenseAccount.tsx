"use client";

import AppShell from "@/app/component/appShell/appShell";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useDisplayWorkspaceIdContext } from "@/app/provider/displayWorkspaceIdProvider";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import PasswordEditForm from "../passwordEditForm/passwordEditForm";
import Profile, {
  EDIT_PASSWORD_BUTTON_ID,
  EDIT_USER_BUTTON_ID,
} from "../profile/profile";
import UserDataEditForm from "../userDataEditForm/userDataEditForm";
import { useSessionTimeout } from "@/app/hooks/sessionTimeout";
import { getSession } from "@/app/hooks/getSession";
import { useFormContext } from "@/app/provider/formProvider";
import { getUserId } from "@/app/lib/api/getUserId";
import { getWorkspace } from "@/app/lib/api/getWorkspace";

const SuspenseAccount: React.FC = () => {
  const router = useRouter();
  const { notificationValue, setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();
  const { displayWorkspaceId, setDisplayWorkspaceId } =
    useDisplayWorkspaceIdContext();
  const { setBackForm } = useFormContext();

  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [switchDisplay, setSwitchDisplay] = useState({
    profile: true,
    userDataForm: false,
    passwordForm: false,
  });
  // 保存されている名前とメール。書きかけは各フォームの中だけに持ち、保存できたときだけここへ映す
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  const openedForm = useRef<string | null>(null);
  const latestDisplayWorkspaceId = useRef(displayWorkspaceId);

  useEffect(() => {
    // フォームを閉じると押したボタンが消えるので、開いたときのボタンへフォーカスを戻す
    if (switchDisplay.userDataForm) {
      openedForm.current = EDIT_USER_BUTTON_ID;
    } else if (switchDisplay.passwordForm) {
      openedForm.current = EDIT_PASSWORD_BUTTON_ID;
    } else if (openedForm.current) {
      // 保存を待つ間に別の場所へ移っていたら、フォーカスを奪わない
      const active = document.activeElement;
      if (!active || active === document.body) {
        document.getElementById(openedForm.current)?.focus();
      }
      openedForm.current = null;
    }
  }, [switchDisplay]);

  useEffect(() => {
    latestDisplayWorkspaceId.current = displayWorkspaceId;
  }, [displayWorkspaceId]);

  useEffect(() => {
    // 読み直しが重なったら、古い読み込みの返事は使わない
    let ignore = false;

    (async () => {
      const session = await getSession();
      // URL ではなくログイン中の人から決める（他人の id を渡されても読まない）
      const sessionUserId = session ? await getUserId(session.user.id) : null;
      if (ignore) return;
      if (!sessionUserId) {
        console.error("Fetch Data: User ID couldn't get.");
        setBackForm(true);
        alert("データの取得に失敗しました。");
        router.push("/");
        return;
      }

      setUserId(sessionUserId);

      // この画面を直接開くと表示中のワークスペースが無いので、サイドバーの一覧のために最初のものを選ぶ
      if (!displayWorkspaceId) {
        const workspaces = await getWorkspace(sessionUserId);
        if (ignore) return;
        const firstWorkspaceId = [workspaces[0]?.workspace].flat()[0]?.id;
        // 返事を待つ間にサイドバーで選んでいたら、その選択を残す
        if (firstWorkspaceId && !latestDisplayWorkspaceId.current) {
          setDisplayWorkspaceId(firstWorkspaceId);
        }
      }

      try {
        const { data: userData, error: userDataSelectError } =
          await clientSupabase
            .from("users")
            .select("*")
            .eq("id", sessionUserId)
            .single();

        if (ignore) return;
        if (userDataSelectError) {
          throw userDataSelectError;
        }

        if (userData) {
          setProfileData({ name: userData.name, email: userData.email });
        } else {
          throw new Error("User ID couldn't get.");
        }
      } catch (error) {
        console.error("Fetch User Data", error);
        setNotificationValue({
          message: "アカウントの情報を読めませんでした。",
          color: 1,
        });
        router.push("/task");
      }
      setLoading(false);
    })();
    setPageUpdated(false);

    return () => {
      ignore = true;
    };
  }, [pageUpdated]);

  useSessionTimeout();

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      <AppShell userId={userId} current={null}>
        {loading ? (
          <Loading />
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-4 px-6 py-6">
            <h1 className="text-xl font-semibold">アカウント</h1>

            {switchDisplay.profile && (
              <Profile profileData={profileData} setSwitchDisplay={setSwitchDisplay} />
            )}

            {switchDisplay.userDataForm && (
              <UserDataEditForm
                userId={userId}
                profileData={profileData}
                onSaved={(name) => setProfileData((prev) => ({ ...prev, name }))}
                handleFocus={handleFocus}
                setSwitchDisplay={setSwitchDisplay}
              />
            )}

            {switchDisplay.passwordForm && (
              <PasswordEditForm
                handleFocus={handleFocus}
                setSwitchDisplay={setSwitchDisplay}
                email={profileData.email}
              />
            )}
          </div>
        )}
      </AppShell>
    </>
  );
};

export default SuspenseAccount;
