import { clientSupabase } from "./supabase/client";

export async function getUsers() {
  try {
    const { data: users, error:usersSelectError } = await clientSupabase
      .from("users")
      .select("id, name");

    if (usersSelectError) {
      throw usersSelectError;
    }

    return users;
  } catch (error) {
    console.error("Error fetch Users:", error);
    return [];
  }
}
