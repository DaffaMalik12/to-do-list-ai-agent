import { defineConfig } from "drizzle-kit";
import { DEFAULT_DATABASE_PATH } from "./config/database.constants";

/**
 * Konfigurasi drizzle-kit.
 * Skema dikumpulkan dari glob `src/features/<fitur>/model/*.table.ts`
 * sehingga penambahan fitur baru otomatis terdeteksi.
 *
 * Output SQL migrasi berada di folder `drizzle/` (dipakai oleh
 * `drizzle-orm/better-sqlite3/migrator`). Lihat `src/shared/db/migrate.ts`
 * dan `docs/api.md` §5 untuk strategi evolusi skema.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/features/*/model/*.table.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  },
  strict: true,
  verbose: true,
});
