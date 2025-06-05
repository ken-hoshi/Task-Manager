import { clientSupabase } from "@/app/lib/supabase/client";

export const fetchUsers = async () => {
  const { data, error } = await clientSupabase.from("users").select();
  if (error) {
    console.error(error);
    return [];
  }
  return data;
};

export const fetchUsersThrowError = async () => {
  const { data, error } = await clientSupabase.from("users").select();
  if (error) {
    throw new Error(error.message || "Unknown error");
  }
  return data;
};
