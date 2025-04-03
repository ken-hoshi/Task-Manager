import { useEffect } from "react";
import { Logout } from "./logout";
import { getSession } from "./getSession";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();
  const LAST_ACTIVITY_KEY = "lastActivityTime";

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateLastActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const startInactivityTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        await useLogout();
      }, SESSION_TIMEOUT);
    };

    const handleUserActivity = () => {
      updateLastActivity();
      startInactivityTimer();
    };

    const checkSessionTimeout = async () => {
      try {
        const session = await getSession();
        if (!session?.user?.id) {
          alert("セッションが切れました。再度ログインしてください。");
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          await useLogout();
        }

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        const lastActivityTime = lastActivity
          ? parseInt(lastActivity, 10)
          : null;

        if (!lastActivityTime) {
          localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
          return;
        }

        const elapsedTime = Date.now() - lastActivityTime;
        if (elapsedTime > SESSION_TIMEOUT) {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          await useLogout();
        }
      } catch (error) {
        console.error("Session check error", error);
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
