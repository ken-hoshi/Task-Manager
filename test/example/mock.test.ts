import { fetchData } from "./api";
// jest.mockの使い方

// 目的：
// 本物のモジュールではなく、テスト用のダミー関数やデータに差し替えることで、
// 1,外部APIへのリクエストを防ぐ
// 2,DBやネットワークに依存せずテストできる
// 3,関数の呼び出し回数や引数を確認できる

// api.ts内のfetchData()をモック化
jest.mock("./api", () => ({
  fetchData: jest.fn(),
}));

test("jest.mockのテスト", async () => {
  (fetchData as jest.Mock).mockResolvedValue({ message: "hello" });
  const result = await fetchData();

  expect(result).toEqual({ message: "hello" });
  expect(fetchData).toHaveBeenCalled(); // ← 呼び出し回数チェック
});

// 関数のモックの種類
test("関数のモック", async () => {
  // 1. jest.fn()
  const mockFunc = jest.fn(); //モック関数を生成
  mockFunc("hello");
  expect(mockFunc).toHaveBeenCalledWith("hello"); //関数の動作を再現せず「呼ばれたかどうか」を確認できる

  // 2. mockReturnValue()
  const mock1 = jest.fn();
  mock1.mockReturnValue(42); // 同期処理の戻り値を固定で返したいとき
  expect(mock1()).toBe(42);

  // 3. mockResolvedValue()
  const mock2 = jest.fn();
  mock2.mockResolvedValue({ data: "Success" }); // 非同期処理の戻り値を固定で返したいとき
  const result = await mock2();
  expect(result?.data).toBe("Success");

  // 4. mockRejectedValue()
  const mock3 = jest.fn();
  mock3.mockRejectedValue(new Error("Fetch failed")); // 非同期関数の失敗ケース(例外)をテストしたいとき
  await expect(mock3()).rejects.toThrow("Fetch failed");

  // 5. jest.spyOn()
  const user = {
    getName: () => "Taro",
  };
  const spy = jest.spyOn(user, "getName"); // オブジェクトの既存の関数をモック化して監視する
  user.getName();
  expect(spy).toHaveBeenCalled();

  // 6. mockFn.mock.calls
  const mock4 = jest.fn();
  mock4("first", 123);
  mock4("second", 456);
  expect(mock4.mock.calls.length).toBe(2); // 何回、どんな引数で呼ばれたか詳細に追える
  expect(mock4.mock.calls[0][0]).toBe("first");
  expect(mock4.mock.calls[1][1]).toBe(456);

  // 7. mockClear()
  const mock5 = jest.fn();
  mock5("call");
  mock5.mockClear(); //　呼び出し履歴をクリア
  expect(mock5).not.toHaveBeenCalled();
});
