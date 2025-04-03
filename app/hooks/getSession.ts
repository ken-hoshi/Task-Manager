import { clientSupabase } from "../lib/supabase/client";

export const getSession = async () => {
  try {
    const { data: sessionData, error: sessionError } =
      await clientSupabase.auth.getSession();
    if (sessionError) throw sessionError;

    const { data: userData, error: userError } =
      await clientSupabase.auth.getUser();
    if (userError) throw userError;

    return sessionData.session || userData.user ? sessionData.session : null;
  } catch (error) {
    console.error("Get Session", error);
    return null;
  }
};
