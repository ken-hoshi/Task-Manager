import { useEffect } from "react";
import { Logout } from "./logout";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();
  const LAST_ACTIVITY_KEY = 'lastActivityTime';

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity > SESSION_TIMEOUT) {
          useLogout();
          return;
        }
      }
    };

    const updateLastActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const startInactivityTimer = () => {
      timer = setTimeout(async () => {
        await useLogout();
      }, SESSION_TIMEOUT);
    };

    const handleUserActivity = () => {
      clearTimeout(timer);
      updateLastActivity();
      startInactivityTimer();
    };

    checkSessionTimeout();

    updateLastActivity();
    startInactivityTimer();

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, []);
};
