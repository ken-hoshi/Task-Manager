import { clientSupabase } from "../lib/supabase/client";

export const GetSession = () => {
  const useGetSession = async () => {
    try {
      const { data: sessionData, error: getSessionDataError } =
        await clientSupabase.auth.getSession();

      if (getSessionDataError) {
        throw getSessionDataError;
      }
      return sessionData.session;
    } catch (error) {
      console.error("Error Get Session:", error);
      return null;
    }
  };

  return { useGetSession };
};
