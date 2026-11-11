import { postMailNotifications } from "@/app/lib/postMailNotifications";
import {
  insertsOf,
  resetSupabaseMock,
  setResponses,
} from "../helpers/mockSupabase";

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));

beforeEach(() => {
  resetSupabaseMock();
  setResponses("tasks", {
    data: { task_name: "設計", assigned_user_id: 5 },
    error: null,
  });
});

describe("期限の通知（type 4・5・6）", () => {
  it.each([
    [4, "明後日"],
    [5, "明日"],
    [6, "本日"],
  ])("type %i は「%s」の文面で担当者に送る", async (type, word) => {
    setResponses("mail_notifications", { data: [], error: null });
    await expect(
      postMailNotifications(1, null, 9, null, null, null, type, [])
    ).resolves.toBeUndefined();
    expect(insertsOf("mail_notifications")).toEqual([
      { workspace_id: 1, user_id: 5, text: `タスク「設計」の期限は${word}です！` },
    ]);
  });

  it("同じ文面の通知が既にあれば送らない", async () => {
    setResponses("mail_notifications", { data: [{ id: 1 }], error: null });
    await postMailNotifications(1, null, 9, null, null, null, 6, []);
    expect(insertsOf("mail_notifications")).toEqual([]);
  });
});

describe("タスクの操作の通知（type 0〜3）", () => {
  beforeEach(() => {
    setResponses("users", { data: { name: "星" }, error: null });
  });

  it.each([
    [0, "星さんがタスク「設計」を追加しました。"],
    [1, "星さんがタスク「設計」を編集しました。"],
    [2, "星さんがタスク「設計」を削除しました。"],
    [3, "星さんがタスク「設計」にコメントしました。"],
  ])("type %i の文面で担当者に送る", async (type, text) => {
    await postMailNotifications(1, 2, 9, null, null, null, type, []);
    expect(insertsOf("mail_notifications")).toEqual([
      { workspace_id: 1, user_id: 5, text },
    ]);
  });

  it("操作した人が担当者なら送らない", async () => {
    await postMailNotifications(1, 5, 9, null, null, null, 1, []);
    expect(insertsOf("mail_notifications")).toEqual([]);
  });
});

describe("プロジェクトの通知", () => {
  it("メンバーに追加した人たちに、操作した人を除いて送る", async () => {
    await postMailNotifications(1, 2, null, "P", "SP", null, 0, [1, 2, 3]);
    expect(insertsOf("mail_notifications")).toEqual([
      { workspace_id: 1, user_id: 1, text: "プロジェクト「P」「SP」のメンバーに追加されました。" },
      { workspace_id: 1, user_id: 3, text: "プロジェクト「P」「SP」のメンバーに追加されました。" },
    ]);
  });

  it("Wiki を足したら、操作した人を除くメンバーに送る", async () => {
    await postMailNotifications(1, 2, null, "P", "SP", "W", 0, [1, 2]);
    expect(insertsOf("mail_notifications")).toEqual([
      { workspace_id: 1, user_id: 1, text: "プロジェクト「P」「SP」にWiki 「W」が追加されました。" },
    ]);
  });
});

it("どの分岐にも当たらない引数なら、エラーを返して何も送らない", async () => {
  const result = await postMailNotifications(1, 2, null, null, null, null, 0, []);
  expect(result).toEqual(new Error("Couldn't setup arguments."));
  expect(insertsOf("mail_notifications")).toEqual([]);
});
