import { useRouter } from "next/navigation";
import { clientSupabase } from "../lib/supabase/client";
import { useNotificationContext } from "../provider/notificationProvider";

export const login = () => {
  const router = useRouter();
  const { setNotificationValue } = useNotificationContext();

  const useLogin = async (email: string, password: string) => {
    try {
      const { error } = await clientSupabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }
      router.push("/task");
    } catch (error) {
      console.error("Login", error);
      setNotificationValue({
        message: "Password or Email address is wrong.",
        color: 1,
      });
      return error;
    }
  };
  return { useLogin };
};
