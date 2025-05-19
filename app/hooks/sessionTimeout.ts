import { useEffect } from "react";
import { Logout } from "./logout";
import { getSession } from "./getSession";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();
  const TIMEOUT_LAST_ACTIVITY_KEY = "timeoutLastActivityTime";

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateTimeoutLastActivity = () => {
      localStorage.setItem(TIMEOUT_LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const startInactivityTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        localStorage.removeItem(TIMEOUT_LAST_ACTIVITY_KEY);
        await useLogout();
      }, SESSION_TIMEOUT);
    };

    const handleUserActivity = () => {
      updateTimeoutLastActivity();
      startInactivityTimer();
    };

    const checkSessionTimeout = async () => {
      const session = await getSession();
      if (!session?.user?.id) {
        alert("セッションが切れました。再度ログインしてください。");
        localStorage.removeItem(TIMEOUT_LAST_ACTIVITY_KEY);
        await useLogout();
      }

      const timeoutLastActivity = localStorage.getItem(
        TIMEOUT_LAST_ACTIVITY_KEY
      );
      const timeoutLastActivityTime = timeoutLastActivity
        ? parseInt(timeoutLastActivity, 10)
        : null;

      if (!timeoutLastActivityTime) {
        localStorage.setItem(TIMEOUT_LAST_ACTIVITY_KEY, Date.now().toString());
        return;
      }

      const elapsedTime = Date.now() - timeoutLastActivityTime;
      if (elapsedTime > SESSION_TIMEOUT) {
        localStorage.removeItem(TIMEOUT_LAST_ACTIVITY_KEY);
        await useLogout();
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await checkSessionTimeout();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
};
