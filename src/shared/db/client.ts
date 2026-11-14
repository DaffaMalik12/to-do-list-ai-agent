import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/shared/db/schema";
import { SQLITE_PRAGMAS } from "../../../config/database.pragma";
import { getServerEnv } from "@/shared/config/env";

/**
 * Singleton koneksi SQLite.
 * Disimpan di `globalThis` agar Next.js HMR tidak membuat koneksi baru
 * setiap kali modul di-reload (menghindari kebocoran file handle).
 */
export interface DbSingleton {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  path: string;
}

type GlobalWithDb = typeof globalThis & {
  __todoagent_db__?: DbSingleton;
};

function resolveDatabasePath(rawPath: string): string {
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
}

function applyPragmas(sqlite: Database.Database): void {
  for (const [pragma, value] of SQLITE_PRAGMAS) {
    sqlite.pragma(`${pragma} = ${value}`);
  }
}

function createConnection(): DbSingleton {
  const env = getServerEnv();
  const dbPath = resolveDatabasePath(env.DATABASE_PATH);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  applyPragmas(sqlite);

  const db = drizzle(sqlite, { schema });

  return { sqlite, db, path: dbPath };
}

/** Ambil instance database (membuat koneksi bila belum ada). */
export function getDb(): DbSingleton {
  const store = globalThis as GlobalWithDb;
  if (!store.__todoagent_db__) {
    store.__todoagent_db__ = createConnection();
  }
  return store.__todoagent_db__;
}

/** Cek kesehatan koneksi database (`SELECT 1`). */
export function isDatabaseUp(): boolean {
  try {
    const { sqlite } = getDb();
    const row = sqlite.prepare("SELECT 1 AS ok").get() as
      | { ok: number }
      | undefined;
    return row?.ok === 1;
  } catch (error) {
    console.error("[db] health check gagal:", error);
    return false;
  }
}
