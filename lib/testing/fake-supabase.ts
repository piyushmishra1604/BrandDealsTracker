// Minimal chainable stand-in for the service-role client, for route tests. Each query is
// recorded so tests can assert on the filters and payloads that were sent.

export type FakeQuery = {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: Record<string, unknown>;
  filters: Record<string, unknown>;
  isNull: string[];
};

export type FakeResult = { data: unknown; error?: { code?: string; message: string } | null };
export type FakeHandler = (query: FakeQuery) => FakeResult;
export type FakeRpcHandler = (name: string, args: Record<string, unknown>) => FakeResult;

export function createFakeSupabase(handler: FakeHandler, rpcHandler: FakeRpcHandler = () => ({ data: null })) {
  const queries: FakeQuery[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const run = (query: FakeQuery) => {
    queries.push(query);
    return handler(query);
  };

  return {
    queries,
    rpcCalls,
    from(table: string) {
      const query: FakeQuery = { table, op: "select", filters: {}, isNull: [] };
      const builder = {
        select: () => builder,
        order: () => builder,
        eq(column: string, value: unknown) { query.filters[column] = value; return builder; },
        is(column: string) { query.isNull.push(column); return builder; },
        insert(payload: Record<string, unknown>) { query.op = "insert"; query.payload = payload; return builder; },
        update(payload: Record<string, unknown>) { query.op = "update"; query.payload = payload; return builder; },
        upsert(payload: Record<string, unknown>) { query.op = "upsert"; query.payload = payload; return builder; },
        delete() { query.op = "delete"; return builder; },
        maybeSingle: () => Promise.resolve(run(query)),
        single: () => Promise.resolve(run(query)),
        then: (resolve: (value: FakeResult) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(run(query)).then(resolve, reject),
      };
      return builder;
    },
    rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return Promise.resolve(rpcHandler(name, args));
    },
  };
}
