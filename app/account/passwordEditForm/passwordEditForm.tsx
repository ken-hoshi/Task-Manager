import { Dispatch, SetStateAction, useState } from "react";
import styles from "./passwordEditForm.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

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
  };

  const validate = async (
    newPassword: string,
    confirmPassword: string,
    currentPassword: string
  ) => {
    let judge = false;
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!regex.test(newPassword)) {
      setNewPasswordError(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      );
      judge = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(
        "確認用パスワードが上記パスワードと相違しています。"
      );
      judge = true;
    }
    const { error: signInError } = await clientSupabase.auth.signInWithPassword(
      {
        email: email,
        password: currentPassword,
      }
    );
    if (signInError) {
      setCurrentPasswordError("変更前のパスワードが違います。");
      judge = true;
    }
    return judge;
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
      console.error("Error update password:", error);
      setNotificationValue({
        message: "Couldn't update Password.",
        color: 1,
      });
    }
    setUpdateLoading(false);
    setPageUpdated(true);
    setNotificationValue({
      message: "Password updated .",
      color: 0,
    });
    setSwitchDisplay({
      profile: true,
      userDataForm: false,
      passwordForm: false,
    });
  };

  return (
    <div className={styles[`password-edit-form-area`]}>
      <form onSubmit={handleUpdatePassword}>
        <input
          type="password"
          placeholder="New Password"
          name="newPassword"
          required
          value={passwords.newPassword}
          onChange={handleChangePassword}
          onFocus={handleFocus}
          className={styles.input}
        />
        {newPasswordError ? (
          <p className={styles.error}>{newPasswordError}</p>
        ) : (
          <p className={styles.instruction}>Enter New Password</p>
        )}

        <input
          type="password"
          placeholder="Confirm Password"
          name="confirmPassword"
          required
          value={passwords.confirmPassword}
          onChange={handleChangePassword}
          onFocus={handleFocus}
          className={styles.input}
        />
        {confirmPasswordError ? (
          <p className={styles.error}>{confirmPasswordError}</p>
        ) : (
          <p className={styles.instruction}>
            Enter the same password to confirm
          </p>
        )}

        <input
          type="password"
          placeholder="Current Password"
          name="currentPassword"
          required
          value={passwords.currentPassword}
          onChange={handleChangePassword}
          onFocus={handleFocus}
          className={styles.input}
        />
        {currentPasswordError ? (
          <p className={styles.error}>{currentPasswordError}</p>
        ) : (
          <p className={styles.instruction}>Enter Current Password</p>
        )}

        <div className={styles[`button-area`]}>
          <button
            className={styles[`back-button`]}
            type="button"
            onClick={() =>
              setSwitchDisplay({
                profile: true,
                userDataForm: false,
                passwordForm: false,
              })
            }
          >
            Back
          </button>

          <button
            className={styles[`update-button`]}
            type="submit"
            disabled={updateLoading}
          >
            {updateLoading ? <div className={styles.spinner}></div> : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
};
export default PasswordEditForm;
