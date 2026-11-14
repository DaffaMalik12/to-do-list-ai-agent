import "server-only";

/**
 * Barrel schema untuk runtime Drizzle.
 * Seluruh tabel dikumpulkan di sini agar relasi & query builder mengenali semua.
 */
export * from "@/features/categories/model/category.table";
export * from "@/features/tasks/model/task.table";
