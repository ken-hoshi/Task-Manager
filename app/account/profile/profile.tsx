import { Dispatch, SetStateAction, useState } from "react";
import styles from "./profile.module.css";

interface ProfileProps {
  formData: {
    name: string;
    email: string;
    password: string;
  };
  setSwitchDisplay: Dispatch<
    SetStateAction<{
      profile: boolean;
      userDataForm: boolean;
      passwordForm: boolean;
    }>
  >;
  openModal: () => void;
}

const Profile: React.FC<ProfileProps> = ({
  formData,
  setSwitchDisplay,
  openModal,
}) => {
  return (
    <>
      <div className={styles[`profile-area`]}>
        <div className={styles.name}>{formData.name}</div>
        <div className={styles.email}>{formData.email}</div>

        <table>
          <tbody>
            <tr
              onClick={() =>
                setSwitchDisplay({
                  profile: false,
                  userDataForm: true,
                  passwordForm: false,
                })
              }
            >
              <td className={styles.bottom}>名前・メールアドレスを編集</td>
            </tr>
            <tr
              onClick={() =>
                setSwitchDisplay({
                  profile: false,
                  userDataForm: false,
                  passwordForm: true,
                })
              }
            >
              <td className={styles.bottom}>パスワードを編集</td>
            </tr>
            <tr onClick={openModal}>
              <td className={styles.red}>アカウントを削除</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Profile;
