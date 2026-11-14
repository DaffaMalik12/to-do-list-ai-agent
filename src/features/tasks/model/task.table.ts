import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { categories } from "@/features/categories/model/category.table";

/**
 * Tabel `tasks` — PRD 9.4.
 * Memakai soft delete (`deleted_at`) dan `position` REAL untuk penempatan manual.
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    priority: text("priority", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("medium"),
    dueDate: text("due_date"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    position: real("position").notNull().default(1000),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    completedAt: text("completed_at"),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("idx_tasks_category").on(table.categoryId),
    index("idx_tasks_completed").on(table.completed),
    index("idx_tasks_deleted").on(table.deletedAt),
    index("idx_tasks_due_date").on(table.dueDate),
    index("idx_tasks_position").on(table.position),
    index("idx_tasks_created_at").on(table.createdAt),
    index("idx_tasks_active_list").on(table.deletedAt, table.completed, table.position),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
