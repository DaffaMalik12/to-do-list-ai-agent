import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Tabel `categories` — PRD 9.4.
 * Kategori menyimpan tugas; kategori "Inbox" (is_default = 1) selalu tersedia.
 */
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color"),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index("idx_categories_position").on(table.position),
    index("idx_categories_is_default").on(table.isDefault),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
