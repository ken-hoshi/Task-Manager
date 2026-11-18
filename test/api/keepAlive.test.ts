/**
 * @jest-environment node
 */
// NextResponse は Fetch API の Response を使うので、jsdom ではなく node の環境で動かす
import { GET } from "@/app/api/keepAlive/route";

const rpc = jest.fn();

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

beforeEach(() => {
  rpc.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/keepAlive", () => {
  it("keep_alive を呼び、状態の件数を 200 で返す", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });

    const res = await GET();

    expect(rpc).toHaveBeenCalledWith("keep_alive");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, statusCount: 3 });
  });

  it("DB がエラーを返したら 500 を返し、エラーの中身は返さない", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false });
  });
});
