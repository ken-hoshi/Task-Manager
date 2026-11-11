// clientSupabase の差し替え。テストでは次のように使う。
//   jest.mock("<app/lib/supabase/client への相対パス>", () => ({
//     clientSupabase: require("<このファイルへの相対パス>").mockClient,
//   }));
// select().eq().single() のようにつないで最後に await する書き方をまね、呼ばれた順に記録する。

type Op = [string, unknown[]];
type Result = { data: unknown; error: unknown };

export const supabaseCalls: { table: string; ops: Op[] }[] = [];
const responses: Record<string, Result[]> = {};

// 同じ表を何度も読むときは、返す値を順に並べる。最後の値は使い切ったあとも返し続ける
export const setResponses = (table: string, ...results: Result[]) => {
  responses[table] = results;
};

export const resetSupabaseMock = () => {
  supabaseCalls.length = 0;
  for (const table of Object.keys(responses)) delete responses[table];
};

export const opsOf = (table: string) =>
  supabaseCalls.filter((c) => c.table === table).flatMap((c) => c.ops);

// insert に渡した値を、呼ばれた順に返す
export const insertsOf = (table: string) =>
  opsOf(table)
    .filter(([op]) => op === "insert")
    .map(([, args]) => args[0]);

const nextResult = (table: string): Result => {
  const queue = responses[table];
  if (!queue || queue.length === 0) return { data: null, error: null };
  return queue.length > 1 ? queue.shift()! : queue[0];
};

const from = (table: string) => {
  const entry = { table, ops: [] as Op[] };
  supabaseCalls.push(entry);
  const builder: unknown = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === "then"
          ? (resolve: (v: unknown) => unknown) => resolve(nextResult(table))
          : (...args: unknown[]) => {
              entry.ops.push([String(prop), args]);
              return builder;
            },
    }
  );
  return builder;
};

export const mockClient = { from };
