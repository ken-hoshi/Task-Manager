import { getProjectData } from "@/app/lib/api/getProjectData";
import { getSmallProjectMember } from "@/app/lib/api/getSmallProjectMember";
import { getSmallProjectStatus } from "@/app/lib/api/getSmallProjectStatus";
import { getTaskGenreData } from "@/app/lib/api/getTaskGenreData";
import { getUserId } from "@/app/lib/api/getUserId";
import {
  opsOf,
  resetSupabaseMock,
  setResponses,
} from "../helpers/mockSupabase";

jest.mock("../../app/lib/supabase/client", () => ({
  clientSupabase: require("../helpers/mockSupabase").mockClient,
}));

const ok = (data: unknown) => ({ data, error: null });

beforeEach(() => {
  resetSupabaseMock();
  // 失敗の分岐で関数が console.error を出すので、テストの出力から消す
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("getSmallProjectStatus", () => {
  it("小プロジェクトごとに、未着手・進行中・完了の数を数える（タスクが無ければ 0）", async () => {
    setResponses("small_projects", ok([{ id: 1, project_id: 10 }, { id: 2, project_id: 10 }]));
    setResponses("tasks", ok([
      { small_project_id: 1, status_id: 1 },
      { small_project_id: 1, status_id: 2 },
      { small_project_id: 1, status_id: 3 },
      { small_project_id: 1, status_id: 3 },
    ]));
    await expect(getSmallProjectStatus([1, 2])).resolves.toEqual([
      { smallProjectId: 1, projectId: 10, notStarted: 1, processing: 1, completed: 2 },
      { smallProjectId: 2, projectId: 10, notStarted: 0, processing: 0, completed: 0 },
    ]);
  });

  it("小プロジェクトが見つからなければ、タスクを読まずに空の配列", async () => {
    setResponses("small_projects", ok([]));
    await expect(getSmallProjectStatus([1])).resolves.toEqual([]);
    expect(opsOf("tasks")).toEqual([]);
  });
});

describe("getSmallProjectMember", () => {
  it("小プロジェクトごとにメンバーをまとめる（users が配列でも1件目を使う）", async () => {
    setResponses("small_project_users", ok([
      { small_project_id: 1, users: { id: 5, name: "星" } },
      { small_project_id: 1, users: [{ id: 6, name: "田中" }] },
      { small_project_id: 2, users: { id: 5, name: "星" } },
    ]));
    await expect(getSmallProjectMember([1, 2, 3])).resolves.toEqual([
      { smallProjectId: 1, membersDataArray: [{ id: 5, name: "星" }, { id: 6, name: "田中" }] },
      { smallProjectId: 2, membersDataArray: [{ id: 5, name: "星" }] },
    ]);
  });

  it("メンバーが1人もいなければ空の配列", async () => {
    setResponses("small_project_users", ok([]));
    await expect(getSmallProjectMember([1])).resolves.toEqual([]);
  });
});

describe("getTaskGenreData", () => {
  it("ジャンルのあるタスクは、同じジャンルの人の実績・人数・日数を返す", async () => {
    setResponses(
      "tasks",
      ok([
        {
          id: 1,
          task_genre_id: 7,
          assigned_user_id: 5,
          task_name: "画面",
          number_of_result_days: 2,
          users: { name: "星" },
          task_genre: { task_genre_name: "設計", start_date: "2024-04-01", deadline_date: "2024-04-05" },
        },
      ]),
      ok([
        { id: 1, assigned_user_id: 5, task_name: "画面", number_of_result_days: 2, users: { name: "星" } },
        { id: 2, assigned_user_id: 6, task_name: "API", number_of_result_days: 3, users: { name: "田中" } },
        { id: 3, assigned_user_id: 5, task_name: "DB", number_of_result_days: 1, users: { name: "星" } },
      ])
    );
    await expect(getTaskGenreData([1])).resolves.toEqual([
      {
        taskId: 1,
        taskGenreId: 7,
        taskGenreName: "設計",
        numberOfPersons: 2,
        startDate: "2024-04-01",
        deadlineDate: "2024-04-05",
        numberOfDays: 5,
        assignedUserTaskResultData: [
          { userId: 5, userName: "星", taskId: 1, taskName: "画面", numberOfResultDays: 2 },
          { userId: 6, userName: "田中", taskId: 2, taskName: "API", numberOfResultDays: 3 },
          { userId: 5, userName: "星", taskId: 3, taskName: "DB", numberOfResultDays: 1 },
        ],
      },
    ]);
    expect(opsOf("tasks")).toContainEqual(["eq", ["task_genre_id", 7]]);
  });

  it("ジャンルの無いタスクは、担当者の実績だけを返す（実績が無ければ 0）", async () => {
    setResponses("tasks", ok([
      { id: 4, task_genre_id: null, assigned_user_id: 5, task_name: "雑務", number_of_result_days: null, users: { name: "星" } },
    ]));
    await expect(getTaskGenreData([4])).resolves.toEqual([
      {
        taskId: 4,
        assignedUserTaskResultData: [
          { userId: 5, userName: "星", taskName: "雑務", numberOfResultDays: 0 },
        ],
      },
    ]);
  });
});

describe("getUserId", () => {
  it("ログインの id に合う users の行が1件なら、その id を返す", async () => {
    setResponses("users", ok([{ id: 42 }]));
    await expect(getUserId("auth-uuid")).resolves.toBe(42);
    expect(opsOf("users")).toContainEqual(["eq", ["auth_user_id", "auth-uuid"]]);
  });

  it.each([
    ["0件", []],
    ["2件以上", [{ id: 1 }, { id: 2 }]],
  ])("%sなら null", async (_, rows) => {
    setResponses("users", ok(rows));
    await expect(getUserId("auth-uuid")).resolves.toBeNull();
  });

  it("ログインの id が空なら、DB を読まずに null", async () => {
    await expect(getUserId("")).resolves.toBeNull();
    expect(opsOf("users")).toEqual([]);
  });
});

describe("getProjectData", () => {
  it("userId が null なら、ワークスペースのプロジェクトをすべて返す", async () => {
    setResponses("projects", ok([{ id: 1 }, { id: 2 }]));
    await expect(getProjectData(null, 7)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(opsOf("small_project_users")).toEqual([]);
    expect(opsOf("projects").map(([op]) => op)).not.toContain("in");
  });

  it("userId を渡すと、その人が入っている小プロジェクトのプロジェクトだけに絞る", async () => {
    setResponses("small_project_users", ok([
      { small_projects: { project_id: 2 } },
      { small_projects: { project_id: 3 } },
    ]));
    setResponses("projects", ok([{ id: 2 }, { id: 3 }]));
    await expect(getProjectData(5, 7)).resolves.toEqual([{ id: 2 }, { id: 3 }]);
    expect(opsOf("small_project_users")).toContainEqual(["eq", ["user_id", 5]]);
    expect(opsOf("projects")).toContainEqual(["in", ["id", [2, 3]]]);
  });

  it("userId が 0 でも絞り込みの分岐に入り、入っている小プロジェクトが無ければ空の配列", async () => {
    setResponses("small_project_users", ok([]));
    await expect(getProjectData(0, 7)).resolves.toEqual([]);
    expect(opsOf("small_project_users")).toContainEqual(["eq", ["user_id", 0]]);
  });
});
