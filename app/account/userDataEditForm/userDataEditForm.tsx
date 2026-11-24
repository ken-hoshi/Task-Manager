import { Dispatch, SetStateAction, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import { isAllowedEmail } from "@/app/lib/isAllowedEmail";
import { FieldNote } from "../fieldNote";

const NAME_ID = "account-user-name";
const EMAIL_ID = "account-user-email";
const PASSWORD_ID = "account-user-password";

type formData = {
  name: string;
  email: string;
  password: string;
};

interface UserDataEditFormProps {
  userId: number;
  formData: formData;
  setFormData: Dispatch<SetStateAction<formData>>;
  copiedFormData: formData;
  handleFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  setSwitchDisplay: Dispatch<
    SetStateAction<{
      profile: boolean;
      userDataForm: boolean;
      passwordForm: boolean;
    }>
  >;
}

const UserDataEditForm: React.FC<UserDataEditFormProps> = ({
  userId,
  formData,
  setFormData,
  copiedFormData,
  handleFocus,
  setSwitchDisplay,
}) => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    if (name === "email") setEmailError("");
    if (name === "password") setPasswordError("");
  };

  const validate = (email: string, password: string) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    const emailInvalid = !isAllowedEmail(email);
    const passwordInvalid = !regex.test(password);

    if (emailInvalid) {
      setEmailError("このメールアドレスは使用できません。");
    }
    if (passwordInvalid) {
      setPasswordError("パスワードは、英字と数字だけで両方を含む8文字以上にしてください。");
    }
    // 送信のボタンが押せない間に失ったフォーカスを、直す欄へ移す
    if (emailInvalid) {
      document.getElementById(EMAIL_ID)?.focus();
    } else if (passwordInvalid) {
      document.getElementById(PASSWORD_ID)?.focus();
    }
    return emailInvalid || passwordInvalid;
  };

  const handleUpdateUserData = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (updateLoading) return;
    setUpdateLoading(true);

    const { error: signInError } = await clientSupabase.auth.signInWithPassword(
      {
        email: email,
        password: password,
      }
    );

    if (signInError) {
      console.error("Password verification failed", signInError.message);
      setPasswordError("パスワードが違います。");
      setUpdateLoading(false);
      document.getElementById(PASSWORD_ID)?.focus();
      return;
    }

    setEmailError("");
    setPasswordError("");
    if (validate(email, password)) {
      setUpdateLoading(false);
      return;
    }

    try {
      const { error: authUserUpdateError } =
        await clientSupabase.auth.updateUser({
          email: email,
          data: {
            display_name: name,
          },
        });

      if (authUserUpdateError) {
        throw authUserUpdateError;
      }

      const { error: userUpdateError } = await clientSupabase
        .from("users")
        .update({ email: email, name: name })
        .eq("id", userId);

      if (userUpdateError) {
        const { error: authUserUpdateError } =
          await clientSupabase.auth.updateUser({
            email: copiedFormData.email,
            data: {
              display_name: copiedFormData.name,
            },
          });

        if (authUserUpdateError) {
          throw authUserUpdateError;
        }
        throw userUpdateError;
      }
    } catch (error) {
      console.error("Update User Data", error);
      setNotificationValue({
        message: "名前とメールアドレスを更新できませんでした。",
        color: 1,
      });
    }
    setUpdateLoading(false);
    // 読み直しの返事を待たずに編集を開いても、送ったパスワードが欄に残らないようにする
    setFormData((prevData) => ({ ...prevData, password: "" }));
    setPageUpdated(true);
    setNotificationValue({
      message: "名前とメールアドレスを更新しました。",
      color: 0,
    });
    setSwitchDisplay({
      profile: true,
      userDataForm: false,
      passwordForm: false,
    });
  };

  return (
    <section aria-labelledby="account-user-heading" className="rounded-lg border bg-card p-4">
      <h2 id="account-user-heading" className="m-0 mb-4 text-base font-semibold">
        名前・メールアドレスを編集
      </h2>
      <form aria-label="名前とメールアドレスの編集" onSubmit={handleUpdateUserData} className="space-y-4">
        <FormField label="名前" htmlFor={NAME_ID} required>
          <Input
            id={NAME_ID}
            type="text"
            name="name"
            autoComplete="name"
            required
            autoFocus
            value={formData.name}
            onChange={handleChange}
            onFocus={handleFocus}
          />
        </FormField>

        <FormField label="メールアドレス" htmlFor={EMAIL_ID} required>
          <Input
            id={EMAIL_ID}
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${EMAIL_ID}-note` : undefined}
            value={formData.email}
            onChange={handleChange}
            onFocus={handleFocus}
          />
          <FieldNote id={`${EMAIL_ID}-note`} error={emailError} />
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
            value={formData.password}
            onChange={handleChange}
            onFocus={handleFocus}
          />
          <FieldNote
            id={`${PASSWORD_ID}-note`}
            error={passwordError}
            hint="本人確認のために、今のパスワードを入力します。"
          />
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

export default UserDataEditForm;
