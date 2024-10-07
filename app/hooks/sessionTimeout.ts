import { useEffect, useState } from "react";
import { Logout } from "./logout";

export const useSessionTimeout = () => {
  const SESSION_TIMEOUT = 1 * 60 * 60 * 1000;
  const { useLogout } = Logout();

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const startInactivityTimer = () => {
      timer = setTimeout(async () => {
        await useLogout();
      }, SESSION_TIMEOUT);
    };

    const handleUserActivity = () => {
      clearTimeout(timer);
      startInactivityTimer();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    startInactivityTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, []);
};
