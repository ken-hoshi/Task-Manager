"use client";

import BackgroundImage2 from "@/app/component/backgroundImage2/backgroundImage2";
import Loading from "@/app/component/loading/loading";
import NotificationBanner from "@/app/component/notificationBanner/notificationBanner";
import { clientSupabase } from "@/app/lib/supabase/client";
import { useNotificationContext } from "@/app/provider/notificationProvider";
import { usePageUpdateContext } from "@/app/provider/pageUpdateProvider";
import styles from "./suspenseAccount.module.css";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import DeleteAccountConfirmModal from "../deleteAccountConfirmModal/deleteAccountConfirmModal";
import PasswordEditForm from "../passwordEditForm/passwordEditForm";
import Profile from "../profile/profile";
import UserDataEditForm from "../userDataEditForm/userDataEditForm";

const SuspenseAccount: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsUserId = searchParams.get("userId");

  const { notificationValue, setNotificationValue } = useNotificationContext();
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [switchDisplay, setSwitchDisplay] = useState({
    profile: true,
    userDataForm: false,
    passwordForm: false,
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [copiedFormData, setCopiedFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    setUserId(Number(paramsUserId));
    const getUserData = async () => {
      try {
        const { data: userData, error: userDataSelectError } =
          await clientSupabase
            .from("users")
            .select("*")
            .eq("id", Number(paramsUserId))
            .single();

        if (userDataSelectError) {
          throw userDataSelectError;
        }

        if (userData) {
          setFormData({
            name: userData.name,
            email: userData.email,
            password: "",
          });
          setCopiedFormData({
            name: userData.name,
            email: userData.email,
            password: "",
          });
        } else {
          throw new Error("User ID is null");
        }
      } catch (error) {
        console.error("Error fetch user data:", error);
        setNotificationValue({
          message: "Couldn't get User Data.",
          color: 1,
        });
        router.back();
      }
      setLoading(false);
    };
    getUserData();
    setPageUpdated(false);
  }, [pageUpdated]);

  const handleBackTop = () => {
    router.back();
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleAccountDelete = async () => {
    try {
      const { data: authUserData, error: getAuthUserDataError } =
        await clientSupabase.auth.getUser();

      if (getAuthUserDataError) {
        throw getAuthUserDataError;
      }

      const userId = authUserData?.user?.id;
      if (userId) {
        const { error: userDeleteError } =
          await clientSupabase.auth.admin.deleteUser(userId);

        if (userDeleteError) {
          throw userDeleteError;
        }
      }
      router.push("/");
    } catch (error) {
      console.error("Error delete user:", error);
      setNotificationValue({
        message: "Couldn't delete Account.",
        color: 1,
      });
      alert(
        "バックエンドサービスが無料プランのため現在、削除機能が使用できません。管理者に削除依頼をしてください。 (Error Code:403)"
      );
    }
  };

  return (
    <>
      {notificationValue.message && (
        <NotificationBanner
          message={notificationValue.message}
          color={notificationValue.color}
        />
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className={styles.register}>
            <BackgroundImage2 />

            <div className={styles[`account-area`]}>
              <span
                className={classNames("material-symbols-outlined", styles.back)}
                onClick={handleBackTop}
              >
                arrow_back
              </span>

              <div className={styles[`detail-area`]}>
                <span
                  className={classNames(
                    "material-symbols-outlined",
                    styles.icon
                  )}
                >
                  account_circle
                </span>

                {switchDisplay.profile && (
                  <Profile
                    formData={formData}
                    setSwitchDisplay={setSwitchDisplay}
                    openModal={openModal}
                  />
                )}

                {switchDisplay.userDataForm && (
                  <UserDataEditForm
                    userId={userId}
                    formData={formData}
                    setFormData={setFormData}
                    copiedFormData={copiedFormData}
                    handleFocus={handleFocus}
                    setSwitchDisplay={setSwitchDisplay}
                  />
                )}

                {switchDisplay.passwordForm && (
                  <PasswordEditForm
                    handleFocus={handleFocus}
                    setSwitchDisplay={setSwitchDisplay}
                    email={formData.email}
                  />
                )}
              </div>
            </div>
            {isModalOpen && (
              <DeleteAccountConfirmModal
                isOpen={isModalOpen}
                onConfirm={handleAccountDelete}
                closeModal={closeModal}
              />
            )}
          </div>
        </>
      )}
    </>
  );
};

export default SuspenseAccount;
