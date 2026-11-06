import { getSmallProjectData } from "@/app/lib/api/getSmallProjectData";
import { getSmallProjectTaskGenre } from "@/app/lib/api/getSmallProjectTaskGenre";

type Op = [string, unknown[]];
const mockCalls: { table: string; ops: Op[] }[] = [];
let mockResponses: Record<string, { data: unknown; error: unknown }> = {};

// select().in().eq() のようにつなげて最後に await する書き方をまねる
const mockFrom = (table: string) => {
  const entry = { table, ops: [] as Op[] };
  mockCalls.push(entry);
  const builder: unknown = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === "then"
          ? (resolve: (v: unknown) => unknown) =>
              resolve(mockResponses[table] ?? { data: null, error: null })
          : (...args: unknown[]) => {
              entry.ops.push([String(prop), args]);
              return builder;
            },
    }
  );
  return builder;
};

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: { from: (table: string) => mockFrom(table) },
}));

const opsOf = (table: string) =>
  mockCalls.filter((c) => c.table === table).flatMap((c) => c.ops);

beforeEach(() => {
  mockCalls.length = 0;
  mockResponses = {};
});

describe("getSmallProjectTaskGenre", () => {
  it("ジャンルが無い小プロジェクトも、空の配列を持つ要素で返す", async () => {
    mockResponses.task_genre = { data: [], error: null };
    await expect(getSmallProjectTaskGenre([1, 2])).resolves.toEqual([
      { smallProjectId: 1, taskGenreDataArray: [] },
      { smallProjectId: 2, taskGenreDataArray: [] },
    ]);
    expect(opsOf("task_genre")).toContainEqual(["in", ["small_project_id", [1, 2]]]);
  });

  it("担当者の人数は重複を除いて数える", async () => {
    mockResponses.task_genre = {
      data: [
        {
          id: 10,
          small_project_id: 1,
          task_genre_name: "設計",
          start_date: "2024-04-01",
          deadline_date: "2024-04-03",
          tasks: [
            { assigned_user_id: 1 },
            { assigned_user_id: 1 },
            { assigned_user_id: 2 },
            { assigned_user_id: null },
          ],
        },
      ],
      error: null,
    };
    const [result] = await getSmallProjectTaskGenre([1]);
    expect(result.taskGenreDataArray[0]).toMatchObject({
      taskGenreId: 10,
      numberOfPersons: 3,
      numberOfDays: 3,
    });
  });
});

describe("getSmallProjectData", () => {
  const workspace = {
    data: [
      {
        projects: [
          { small_projects: [{ id: 1 }, { id: 2 }] },
          { small_projects: [{ id: 3 }] },
        ],
      },
    ],
    error: null,
  };

  it("userId が null なら、ワークスペースの小プロジェクトをすべて返す", async () => {
    mockResponses.workspace = workspace;
    await expect(getSmallProjectData(null, 7)).resolves.toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(opsOf("small_project_users")).toEqual([]);
  });

  it("userId を渡すと、その人が入っている小プロジェクトだけをワークスペースの順で返す", async () => {
    mockResponses.workspace = workspace;
    mockResponses.small_project_users = {
      data: [{ small_project_id: 3 }, { small_project_id: 1 }],
      error: null,
    };
    await expect(getSmallProjectData(5, 7)).resolves.toEqual([{ id: 1 }, { id: 3 }]);
    expect(opsOf("small_project_users")).toEqual(
      expect.arrayContaining([
        ["in", ["small_project_id", [1, 2, 3]]],
        ["eq", ["user_id", 5]],
      ])
    );
  });

  it("userId が 0 なら、誰かが入っている小プロジェクトを返し、user_id では絞らない", async () => {
    mockResponses.workspace = workspace;
    mockResponses.small_project_users = {
      data: [{ small_project_id: 2 }],
      error: null,
    };
    await expect(getSmallProjectData(0, 7)).resolves.toEqual([{ id: 2 }]);
    expect(opsOf("small_project_users").map(([op]) => op)).not.toContain("eq");
  });

  it("ワークスペースに小プロジェクトが無ければ、メンバーの表は読まない", async () => {
    mockResponses.workspace = { data: [{ projects: [] }], error: null };
    await expect(getSmallProjectData(5, 7)).resolves.toEqual([]);
    expect(opsOf("small_project_users")).toEqual([]);
  });
});
