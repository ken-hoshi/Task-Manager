import { useRouter } from "next/navigation";
import { clientSupabase } from "../lib/supabase/client";

export const signUp = () => {
  const router = useRouter();

  const useSignUp = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await clientSupabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/complete`,
          data: { display_name: name, email: email },
        },
      });

      if (error) {
        throw error;
      }

      // users の行は、DB のトリガーが登録と同時に作る（supabase/schema.sql）
      if (!data.user?.id) {
        throw new Error("User Id couldn't get.");
      }
      router.push("/authentication");
    } catch (error) {
      return error;
    }
  };
  return { useSignUp };
};
