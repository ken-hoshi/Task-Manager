import { useRouter } from "next/navigation";
import { clientSupabase } from "../lib/supabase/client";
import { useFormContext } from "../provider/formProvider";
import { useNotificationContext } from "../provider/notificationProvider";

export const Logout = () => {
  const router = useRouter();

  const { setBackForm } = useFormContext();
  const { setNotificationValue } = useNotificationContext();

  const useLogout = async () => {
    try {
      const { error } = await clientSupabase.auth.signOut();

      if (error) {
        throw error;
      }
      setBackForm(true);
      router.push("/");
    } catch (error) {
      console.error("Error Log out ", error);
      setNotificationValue({
        message: "Failed to log out.",
        color: 1,
      });
    }
  };
  return { useLogout };
};
