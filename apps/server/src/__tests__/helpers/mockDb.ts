import crypto from "crypto";

export interface MockRow {
  id: string;
  createdAt?: string;
  [key: string]: any;
}

/**
 * Creates a stateful in-memory mock matching Prisma 8's db.orm.public.<Model> interface
 * for fast, deterministic unit and integration testing without a live PostgreSQL server.
 */
export function createInMemoryTable(prefix: string) {
  const rows: MockRow[] = [];

  const matches = (row: MockRow, filter: Record<string, any>) =>
    Object.entries(filter).every(([key, val]) => row[key] === val);

  return {
    rows,
    clear() {
      rows.length = 0;
    },
    async create(data: Record<string, any>) {
      const record: MockRow = {
        id: data.id || `${prefix}_${crypto.randomBytes(6).toString("hex")}`,
        createdAt: data.createdAt || new Date().toISOString(),
        ...data,
      };
      rows.push(record);
      return record;
    },
    async all() {
      return [...rows];
    },
    async aggregate(fn: (a: { count: () => number }) => Record<string, number>) {
      return [fn({ count: () => rows.length })];
    },
    where(filter: Record<string, any>) {
      return {
        async first() {
          return rows.find((r) => matches(r, filter)) || null;
        },
        async all() {
          return rows.filter((r) => matches(r, filter));
        },
        async update(updates: Record<string, any>) {
          const updated: MockRow[] = [];
          rows.forEach((r, idx) => {
            if (matches(r, filter)) {
              rows[idx] = { ...r, ...updates };
              updated.push(rows[idx]);
            }
          });
          return updated[0] || null;
        },
        async delete() {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (matches(rows[i]!, filter)) {
              rows.splice(i, 1);
            }
          }
        },
      };
    },
  };
}

export function createMockDatabase() {
  const tables = {
    User: createInMemoryTable("usr"),
    RefreshToken: createInMemoryTable("rt"),
    Post: createInMemoryTable("pst"),
    Like: createInMemoryTable("lik"),
    Comment: createInMemoryTable("cmt"),
    Bookmark: createInMemoryTable("bmk"),
    Follows: createInMemoryTable("flw"),
    Notification: createInMemoryTable("ntf"),
    DirectMessage: createInMemoryTable("msg"),
  };

  return {
    tables,
    resetAll() {
      Object.values(tables).forEach((t) => t.clear());
    },
    db: {
      orm: {
        public: tables,
      },
    },
  };
}
