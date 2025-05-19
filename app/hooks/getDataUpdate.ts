import { useEffect } from "react";
import { usePageUpdateContext } from "../provider/pageUpdateProvider";

export const getDataUpdate = () => {
  const UPDATE_TIME = 1 * 60 * 15 * 1000;
  const UPDATE_LAST_ACTIVITY_KEY = "updateLastActivityTime";
  const { pageUpdated, setPageUpdated } = usePageUpdateContext();

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateLastActivity = () => {
      localStorage.setItem(UPDATE_LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const startGetDataUpdateTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setPageUpdated(true);
      }, UPDATE_TIME);
    };

    const handleUserActivity = () => {
      updateLastActivity();
      startGetDataUpdateTimer();
    };
    handleUserActivity();

    const checkUpdateTime = () => {
      const updateLastActivity = localStorage.getItem(UPDATE_LAST_ACTIVITY_KEY);
      const updateLastActivityTime = updateLastActivity
        ? parseInt(updateLastActivity, 10)
        : null;

      if (!updateLastActivityTime) {
        localStorage.setItem(UPDATE_LAST_ACTIVITY_KEY, Date.now().toString());
        return;
      }

      const elapsedTime = Date.now() - updateLastActivityTime;
      if (elapsedTime > UPDATE_TIME) {
        localStorage.removeItem(UPDATE_LAST_ACTIVITY_KEY);
        setPageUpdated(true);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        checkUpdateTime();
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
  }, [pageUpdated]);
};
