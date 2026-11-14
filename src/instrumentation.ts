/**
 * Hook startup Next.js (runtime nodejs).
 * Menjalankan migrasi database & seed kategori default secara otomatis.
 *
 * Lihat `AGENTS.md` (blok nextjs-agent-rules) untuk konvensi versi Next.js ini.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { runMigrations } = await import("@/shared/db/migrate");
    const result = runMigrations();
    console.info(
      `[db] migrasi selesai — path=${result.databasePath} journal=${result.journalMode} fk=${result.foreignKeys} seed=${result.seededDefaultCategory}`,
    );
  } catch (error) {
    console.error("[db] migrasi gagal saat startup:", error);
    throw error;
  }
}
