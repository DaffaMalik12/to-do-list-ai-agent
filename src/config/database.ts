import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DEFAULT_DATABASE_FILE = path.join("data", "app.db");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category_id TEXT,
  due_date TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks (category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks (position);
`;

const globalForDatabase = globalThis as unknown as { __tasksDatabase?: Database.Database };

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (!configured) return path.join(process.cwd(), DEFAULT_DATABASE_FILE);
  if (configured === ":memory:") return configured;
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

/**
 * Koneksi SQLite tunggal (singleton) + migrasi idempotent.
 * Migrasi dijalankan otomatis saat koneksi pertama dibuat, sehingga
 * tidak ada langkah manual yang bisa terlewat saat deploy.
 */
export function getDatabase(): Database.Database {
  if (globalForDatabase.__tasksDatabase) return globalForDatabase.__tasksDatabase;

  const databasePath = resolveDatabasePath();
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.exec(SCHEMA_SQL);

  globalForDatabase.__tasksDatabase = database;
  return database;
}
