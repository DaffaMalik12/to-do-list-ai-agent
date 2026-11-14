/**
 * Konstanta konfigurasi database & batasan domain.
 * Dipisah dari `src/` agar bisa dipakai tooling CLI (drizzle-kit) maupun runtime.
 */

/** Nama file database default bila `DATABASE_PATH` tidak di-set. */
export const DEFAULT_DATABASE_PATH = "./data/todoagent.db";

/** Batas maksimum total tugas aktif (tidak soft-deleted). */
export const MAX_TOTAL_TASKS = 5000;

/** Batas ukuran body request default (1 MB). */
export const MAX_BODY_BYTES = 1024 * 1024;

/** Batas ukuran body request untuk endpoint impor (2 MB) — disiapkan untuk rilis berikutnya. */
export const MAX_IMPORT_BODY_BYTES = 2 * 1024 * 1024;

/** ID kategori default yang selalu tersedia hasil seeding. */
export const DEFAULT_CATEGORY_ID = "inbox";

/** Nama kategori default. */
export const DEFAULT_CATEGORY_NAME = "Inbox";

/** Jeda antar posisi `position` saat membuat tugas baru. */
export const POSITION_STEP = 1000;
