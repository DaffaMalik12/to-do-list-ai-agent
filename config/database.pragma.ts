/**
 * PRAGMA yang wajib dijalankan setiap kali koneksi SQLite dibuka.
 * Dipakai bersama oleh runtime (src/shared/db/client.ts) dan runner migrasi.
 */
export const SQLITE_PRAGMAS: ReadonlyArray<readonly [string, string | number]> = [
  ["journal_mode", "WAL"],
  ["foreign_keys", "ON"],
  ["busy_timeout", 5000],
  ["synchronous", "NORMAL"],
] as const;
