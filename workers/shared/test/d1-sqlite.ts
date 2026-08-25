// ─── a D1 stand-in over better-sqlite3, for tests ────────────────────────────
//
// The repositories build real SQL and the interesting bugs are in the SQL, not
// around it: a filter applied to the wrong side of a join, an identifier that
// should have been a parameter, an ordering that only looks right until the
// tenth row. Mocking the database would hide exactly those.
//
// So the tests run the real statements against a real SQLite. This implements
// only the surface `shared/src/db.ts` actually uses — `prepare().bind().all()`
// and `.first()` — which is why it is twenty lines rather than a library.

import Database from 'better-sqlite3';

export interface FakeD1 {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

/** A D1-shaped handle over an in-memory SQLite, seeded by `setup`. */
export function fakeD1(setup: (db: Database.Database) => void): FakeD1 {
  const db = new Database(':memory:');
  setup(db);
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        bind(...params: unknown[]) {
          return {
            async all<T>() { return { results: stmt.all(...params) as T[] }; },
            async first<T>() { return (stmt.get(...params) as T) ?? null; },
            async run() { stmt.run(...params); return { success: true }; },
          };
        },
      };
    },
  };
}
