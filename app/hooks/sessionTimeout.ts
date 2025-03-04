import { useEffect, useState } from "react";
import { Logout } from "./logout";
import { getSession } from "./getSession";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();
  const LAST_ACTIVITY_KEY = "lastActivityTime";
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkSessionTimeout = async () => {
      try {
        const session = await getSession();

        if (!session?.user?.id) {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          return;
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
        console.error("Session check error:", error);
      }
    };

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
      if (!isInitialized) return;
      updateLastActivity();
      startInactivityTimer();
    };

    const initializeSession = async () => {
      try {
        await checkSessionTimeout();

        const session = await getSession();
        if (!session?.user?.id) {
          await useLogout();
        }

        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        startInactivityTimer();
        setIsInitialized(true);
      } catch (error) {
        console.error("Session initialization error:", error);
        await useLogout();
      }
    };
    initializeSession();

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

  return { isInitialized };
};
