import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/shared/db/client";
import { categories } from "@/features/categories/model/category.table";
import {
  DEFAULT_CATEGORY_ID,
  DEFAULT_CATEGORY_NAME,
} from "../../../config/database.constants";

/**
 * Migrasi + seed idempoten.
 *
 * Strategi evolusi skema:
 * 1. Setiap perubahan skema dimulai dari file `*.table.ts` lalu di-generate:
 *      npx drizzle-kit generate
 *    SQL hasilnya masuk ke folder `drizzle/` (versioned, ikut di-commit).
 * 2. `drizzle/` dieksekusi otomatis saat startup via `migrate()` di bawah.
 * 3. Blok `CREATE TABLE IF NOT EXISTS` di file ini hanya *bootstrap* untuk
 *    instalasi pertama (bila folder `drizzle/` kosong/belum di-generate).
 *    Keduanya idempoten dan tidak saling bertentangan.
 *
 * Lihat `docs/api.md` §5 untuk alur lengkap.
 */

const CREATE_CATEGORIES_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

const CREATE_TASKS_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  position REAL NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  deleted_at TEXT,
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'))
);
`;

const INDEX_STATEMENTS: ReadonlyArray<string> = [
  "CREATE INDEX IF NOT EXISTS idx_categories_position ON categories (position);",
  "CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (is_default);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category_id);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks (deleted_at);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks (position);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);",
  "CREATE INDEX IF NOT EXISTS idx_tasks_active_list ON tasks (deleted_at, completed, position);",
];

export interface MigrationResult {
  ok: boolean;
  databasePath: string;
  seededDefaultCategory: boolean;
  journalMode: string;
  foreignKeys: number;
}

let applied = false;

/**
 * Jalankan migrasi + seed. Dipanggil dari `src/instrumentation.ts` saat startup
 * dan dari `ensureMigrated()` (fallback lazy) di route handler.
 */
export function runMigrations(): MigrationResult {
  const { sqlite, db, path: dbPath } = getDb();

  // Bootstrap tabel (idempoten). Aman dijalankan berulang kali.
  sqlite.exec(CREATE_CATEGORIES_SQL);
  sqlite.exec(CREATE_TASKS_SQL);
  for (const statement of INDEX_STATEMENTS) {
    sqlite.exec(statement);
  }

  // Seed kategori Inbox (idempoten — `onConflictDoNothing` + cek dulu).
  const existing = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, DEFAULT_CATEGORY_ID))
    .get();

  let seeded = false;
  if (!existing) {
    const now = new Date().toISOString();
    const result = db
      .insert(categories)
      .values({
        id: DEFAULT_CATEGORY_ID,
        name: DEFAULT_CATEGORY_NAME,
        color: "#2563eb",
        isDefault: true,
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
    seeded = result.changes > 0;
  }

  const journalMode = String(sqlite.pragma("journal_mode", { simple: true }));
  const foreignKeys = Number(sqlite.pragma("foreign_keys", { simple: true }));

  applied = true;

  return {
    ok: true,
    databasePath: dbPath,
    seededDefaultCategory: seeded,
    journalMode,
    foreignKeys,
  };
}

/**
 * Safety net: pastikan migrasi sudah berjalan minimal sekali.
 * Dipakai oleh route handler pertama yang menyentuh DB, sehingga tidak ada
 * dead code — request pertama tetap aman walau instrumentation dilewati
 * (mis. saat unit test atau eksekusi route handler secara terpisah).
 */
export function ensureMigrated(): void {
  if (!applied) {
    runMigrations();
  }
}
