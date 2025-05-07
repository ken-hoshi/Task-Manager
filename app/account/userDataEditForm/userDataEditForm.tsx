import { Dispatch, SetStateAction, useState } from "react";
import styles from "./userDataEditForm.module.css";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";

const WORD_LINCRAFT = "lincraft";

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
  };

  const validate = (email: string, password: string) => {
    let judge = false;
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!email.includes(WORD_LINCRAFT)) {
      setEmailError("このメールアドレスは使用できません。");
      judge = true;
    }
    if (!regex.test(password)) {
      setPasswordError(
        "パスワードは英字と数字を含む8文字以上でなければなりません。"
      );
      judge = true;
    }
    return judge;
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
        message: "Couldn't update User Data.",
        color: 1,
      });
    }
    setUpdateLoading(false);
    setPageUpdated(true);
    setNotificationValue({
      message: "User data was updated !",
      color: 0,
    });
    setSwitchDisplay({
      profile: true,
      userDataForm: false,
      passwordForm: false,
    });
  };

  return (
    <div className={styles[`user-data-edit-form-area`]}>
      <form onSubmit={handleUpdateUserData}>
        <input
          type="text"
          placeholder="Name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          onFocus={handleFocus}
          className={styles.input}
        />
        <p className={styles.instruction}>Enter your Name</p>

        <input
          type="email"
          placeholder="Email"
          name="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          onFocus={handleFocus}
          className={styles.input}
        />
        {emailError ? (
          <p className={styles.error}>{emailError}</p>
        ) : (
          <p className={styles.instruction}>Enter your Email Address</p>
        )}

        <input
          type="password"
          placeholder="Password"
          name="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          onFocus={handleFocus}
          className={styles.input}
        />
        {passwordError ? (
          <p className={styles.error}>{passwordError}</p>
        ) : (
          <p className={styles.instruction}>Enter Password</p>
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

export default UserDataEditForm;
