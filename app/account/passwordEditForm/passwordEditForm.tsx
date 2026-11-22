import { Dispatch, SetStateAction, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { FieldNote } from "../fieldNote";

const NEW_ID = "account-new-password";
const CONFIRM_ID = "account-confirm-password";
const CURRENT_ID = "account-current-password";

interface PasswordEditForm {
  handleFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  setSwitchDisplay: Dispatch<
    SetStateAction<{
      profile: boolean;
      userDataForm: boolean;
      passwordForm: boolean;
    }>
  >;
  email: string;
}

const PasswordEditForm: React.FC<PasswordEditForm> = ({
  handleFocus,
  setSwitchDisplay,
  email,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();

  const [updateLoading, setUpdateLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
    currentPassword: "",
  });

  const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prevPassword) => ({ ...prevPassword, [name]: value }));
    if (name === "newPassword") {
      setNewPasswordError("");
      // 確認欄との一致は、どちらの欄を直しても変わる
      setConfirmPasswordError("");
    }
    if (name === "confirmPassword") setConfirmPasswordError("");
    if (name === "currentPassword") setCurrentPasswordError("");
  };

  const validate = async (
    newPassword: string,
    confirmPassword: string,
    currentPassword: string
  ) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    const newInvalid = !regex.test(newPassword);
    const confirmInvalid = newPassword !== confirmPassword;

    if (newInvalid) {
      setNewPasswordError("パスワードは、英字と数字だけで両方を含む8文字以上にしてください。");
    }
    if (confirmInvalid) {
      setConfirmPasswordError("確認用のパスワードが、新しいパスワードと違います。");
    }
    const { error: signInError } = await clientSupabase.auth.signInWithPassword(
      {
        email: email,
        password: currentPassword,
      }
    );
    if (signInError) {
      setCurrentPasswordError("今のパスワードが違います。");
    }
    // 送信のボタンが押せない間に失ったフォーカスを、最初に直す欄へ移す
    const firstInvalid = newInvalid
      ? NEW_ID
      : confirmInvalid
        ? CONFIRM_ID
        : signInError
          ? CURRENT_ID
          : null;
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
    return firstInvalid !== null;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { newPassword, confirmPassword, currentPassword } = passwords;

    if (updateLoading) return;
    setUpdateLoading(true);

    setNewPasswordError("");
    setConfirmPasswordError("");
    setCurrentPasswordError("");
    if (await validate(newPassword, confirmPassword, currentPassword)) {
      setUpdateLoading(false);
      return;
    }

    try {
      const { error: passwordUpdateError } =
        await clientSupabase.auth.updateUser({
          password: newPassword,
        });

      if (passwordUpdateError) {
        throw passwordUpdateError;
      }
    } catch (error) {
      console.error("Update Password", error);
      setNotificationValue({
        message: "パスワードを更新できませんでした。",
        color: 1,
      });
    }
    setUpdateLoading(false);
    setPageUpdated(true);
    setNotificationValue({
      message: "パスワードを更新しました。",
      color: 0,
    });
    setSwitchDisplay({
      profile: true,
      userDataForm: false,
      passwordForm: false,
    });
  };

  return (
    <section aria-labelledby="account-password-heading" className="rounded-lg border bg-card p-4">
      <h2 id="account-password-heading" className="m-0 mb-4 text-base font-semibold">
        パスワードを編集
      </h2>
      <form aria-label="パスワードの編集" onSubmit={handleUpdatePassword} className="space-y-4">
        <FormField label="新しいパスワード" htmlFor={NEW_ID} required>
          <Input
            id={NEW_ID}
            type="password"
            name="newPassword"
            autoComplete="new-password"
            required
            autoFocus
            aria-invalid={newPasswordError ? true : undefined}
            aria-describedby={`${NEW_ID}-note`}
            value={passwords.newPassword}
            onChange={handleChangePassword}
            onFocus={handleFocus}
          />
          <FieldNote
            id={`${NEW_ID}-note`}
            error={newPasswordError}
            hint="英字と数字だけで、両方を含む8文字以上"
          />
        </FormField>

        <FormField label="新しいパスワード（確認）" htmlFor={CONFIRM_ID} required>
          <Input
            id={CONFIRM_ID}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            aria-invalid={confirmPasswordError ? true : undefined}
            aria-describedby={confirmPasswordError ? `${CONFIRM_ID}-note` : undefined}
            value={passwords.confirmPassword}
            onChange={handleChangePassword}
            onFocus={handleFocus}
          />
          <FieldNote id={`${CONFIRM_ID}-note`} error={confirmPasswordError} />
        </FormField>

        <FormField label="今のパスワード" htmlFor={CURRENT_ID} required>
          <Input
            id={CURRENT_ID}
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
            aria-invalid={currentPasswordError ? true : undefined}
            aria-describedby={currentPasswordError ? `${CURRENT_ID}-note` : undefined}
            value={passwords.currentPassword}
            onChange={handleChangePassword}
            onFocus={handleFocus}
          />
          <FieldNote id={`${CURRENT_ID}-note`} error={currentPasswordError} />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setSwitchDisplay({
                profile: true,
                userDataForm: false,
                passwordForm: false,
              })
            }
          >
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
export default PasswordEditForm;
