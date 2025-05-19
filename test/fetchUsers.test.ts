import { clientSupabase } from "@/app/lib/supabase/client";
import { fetchUsers, fetchUsersThrowError } from "./fetchUsers";

// Supabase クライアントを Jest でモック化する
jest.mock("../app/lib/supabase/client", () => ({
  clientSupabase: {
    // .from() を呼び出せるようにモックし、チェーンできるように mockReturnThis() を使う
    from: jest.fn().mockReturnThis(),
    // .select() をモック（後で戻り値を設定する）
    select: jest.fn(),
  },
}));

test("fetchUsers returns mock data", async () => {
  // モックとして使うテスト用のデータ
  const mockData = [{ id: 1, name: "Taro" }];

  // .select() が呼ばれたときに、mockData を返すように設定
  (clientSupabase.from("users").select as jest.Mock).mockResolvedValue({
    data: mockData,
    error: null,
  });

  // fetchUsers を呼び出し、返ってきたデータが mockData と一致するか確認
  const users = await fetchUsers();
  expect(users).toEqual(mockData);
});

test("fetchUsers returns empty array when error occurs", async () => {
  // Supabase がエラーを返す想定
  const mockError = new Error("Database fetch failed");

  (clientSupabase.from("users").select as jest.Mock).mockResolvedValue({
    data: null,
    error: mockError,
  });

  const result = await fetchUsers();

  expect(result).toEqual([]); // もしくは例外を投げる仕様なら .toThrow() を使う
});

test("fetchUsers throws when Supabase returns an error", async () => {
  const mockError = { message: "Database fetch failed" };

  // select が呼ばれたとき、data=null, error にエラーを返すように設定
  (clientSupabase.from("users").select as jest.Mock).mockResolvedValue({
    data: null,
    error: mockError,
  });

  // fetchUsers() が例外を投げることを検証
  await expect(fetchUsersThrowError()).rejects.toThrow("Database fetch failed");
});
