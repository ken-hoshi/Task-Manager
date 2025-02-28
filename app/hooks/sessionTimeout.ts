import { useEffect, useState } from "react";
import { Logout } from "./logout";
import { GetSession } from "./getSession";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();
  const { useGetSession } = GetSession();
  const LAST_ACTIVITY_KEY = "lastActivityTime";
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isActive = true;

    const checkSessionTimeout = async () => {
      if (!isActive) return;
      try {
        const session = await useGetSession();
        if (!session?.user?.id) return;

        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (
          !lastActivity ||
          Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT
        ) {
          await useLogout();
          return;
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
        if (isActive) {
          await useLogout();
        }
      }, SESSION_TIMEOUT);
    };

    const handleUserActivity = async () => {
      if (!isActive || !isInitialized) return;
      try {
        const session = await useGetSession();
        if (!session?.user?.id) return;

        updateLastActivity();
        startInactivityTimer();
      } catch (error) {
        console.error("User activity error:", error);
      }
    };

    const initializeSession = async () => {
      if (!isActive) return;
      try {
        await checkSessionTimeout();
        const session = await useGetSession();
        if (!session?.user?.id) {
          await useLogout();
          setIsInitialized(false);
          return;
        }

        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        startInactivityTimer();
        setIsInitialized(true);
      } catch (error) {
        console.error("Session initialization error:", error);
        setIsInitialized(false);
        await useLogout();
      }
    };
    initializeSession();

    const initTimeout = setTimeout(async () => {
      if (isActive) {
        await checkSessionTimeout();
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionTimeout();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      isActive = false;
      clearTimeout(timer);
      clearTimeout(initTimeout);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isInitialized };
};
