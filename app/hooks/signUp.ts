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
          emailRedirectTo: `https://task-manager-eta-eosin.vercel.app/complete?name=${encodeURIComponent(
            name
          )}&email=${encodeURIComponent(email)}`,
          data: {
            display_name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;
      if (userId) {
        const { error: insertError } = await clientSupabase
          .from("users")
          .insert({ email: email, name: name, auth_user_id: userId });

        if (insertError) {
          throw insertError;
        } else {
          router.push(
            `/authentication?name=${encodeURIComponent(
              name
            )}&email=${encodeURIComponent(email)}`
          );
        }
      } else {
        throw new Error("User Id is null");
      }
    } catch (error) {
      return error;
    }
  };
  return { useSignUp };
};
