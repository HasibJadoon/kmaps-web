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
