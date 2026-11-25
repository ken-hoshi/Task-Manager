import { Dispatch, SetStateAction, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { FieldNote } from "../fieldNote";

const NAME_ID = "account-user-name";
const EMAIL_ID = "account-user-email";
const PASSWORD_ID = "account-user-password";

interface UserDataEditFormProps {
  userId: number;
  // 保存されている名前とメール。書きかけはこのフォームの中だけに持つ
  profileData: { name: string; email: string };
  onSaved: (name: string) => void;
  handleFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  setSwitchDisplay: Dispatch<
    SetStateAction<{
      profile: boolean;
      userDataForm: boolean;
      passwordForm: boolean;
    }>
  >;
}

// 名前の編集。メールアドレスは確認の流れが無く変更が必ず失敗していたので、表示だけにする（台帳 決定29）
const UserDataEditForm: React.FC<UserDataEditFormProps> = ({
  userId,
  profileData,
  onSaved,
  handleFocus,
  setSwitchDisplay,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();

  const [name, setName] = useState(profileData.name);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const backToProfile = () =>
    setSwitchDisplay({
      profile: true,
      userDataForm: false,
      passwordForm: false,
    });

  const handleUpdateUserData = async (e: React.FormEvent) => {
    e.preventDefault();

    if (updateLoading) return;
    setUpdateLoading(true);
    setPasswordError("");

    // 本人確認は、ログイン中の認証のメールと入れたパスワードで行う（users 表のメールは認証のメールと食い違うことがある）。
    // パスワードの規則は登録のときのもので、今のパスワードが規則に合うとは限らないので確かめない
    const { data: authUserData } = await clientSupabase.auth.getUser();
    const { error: signInError } = await clientSupabase.auth.signInWithPassword({
      email: authUserData?.user?.email ?? profileData.email,
      password: password,
    });

    if (signInError) {
      console.error("Password verification failed", signInError.message);
      setPasswordError("パスワードが違います。");
      setUpdateLoading(false);
      document.getElementById(PASSWORD_ID)?.focus();
      return;
    }

    try {
      const { error: authUserUpdateError } = await clientSupabase.auth.updateUser({
        data: { display_name: name },
      });

      if (authUserUpdateError) {
        throw authUserUpdateError;
      }

      const { error: userUpdateError } = await clientSupabase
        .from("users")
        .update({ name: name })
        .eq("id", userId);

      if (userUpdateError) {
        // users 表に入らなかったので、認証の側の名前を元に戻す
        const { error: rollbackError } = await clientSupabase.auth.updateUser({
          data: { display_name: profileData.name },
        });

        if (rollbackError) {
          throw rollbackError;
        }
        throw userUpdateError;
      }

      // 保存できたときだけ、プロフィールへ映して閉じる
      onSaved(name);
      setPageUpdated(true);
      setNotificationValue({
        message: "名前を更新しました。",
        color: 0,
      });
      setUpdateLoading(false);
      backToProfile();
    } catch (error) {
      console.error("Update User Data", error);
      setNotificationValue({
        message: "名前を更新できませんでした。",
        color: 1,
      });
      setUpdateLoading(false);
      // 押した「更新する」が待つ間に押せなくなって失ったフォーカスを、名前の欄へ戻す
      document.getElementById(NAME_ID)?.focus();
    }
  };

  return (
    <section aria-labelledby="account-user-heading" className="rounded-lg border bg-card p-4">
      <h2 id="account-user-heading" className="m-0 mb-4 text-base font-semibold">
        名前を編集
      </h2>
      <form aria-label="名前の編集" onSubmit={handleUpdateUserData} className="space-y-4">
        <FormField label="名前" htmlFor={NAME_ID} required>
          <Input
            id={NAME_ID}
            type="text"
            name="name"
            autoComplete="name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleFocus}
          />
        </FormField>

        <FormField label="メールアドレス" htmlFor={EMAIL_ID}>
          <Input
            id={EMAIL_ID}
            type="email"
            name="email"
            readOnly
            aria-describedby={`${EMAIL_ID}-note`}
            value={profileData.email}
            className="bg-muted text-muted-foreground"
          />
          <FieldNote id={`${EMAIL_ID}-note`} hint="メールアドレスは変更できません。" />
        </FormField>

        <FormField label="パスワード" htmlFor={PASSWORD_ID} required>
          <Input
            id={PASSWORD_ID}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={`${PASSWORD_ID}-note`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            onFocus={handleFocus}
          />
          <FieldNote
            id={`${PASSWORD_ID}-note`}
            error={passwordError}
            hint="本人確認のために、今のパスワードを入力します。"
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={backToProfile}>
            戻る
          </Button>
          <Button type="submit" disabled={updateLoading}>
            {updateLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            更新する
          </Button>
        </div>
      </form>
    </section>
  );
};

export default UserDataEditForm;
