import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("demo_workspaces", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(0),
  expires: integer("expires").notNull(),
});
export const sessions = sqliteTable(
  "demo_sessions",
  {
    id: text("id").primaryKey(),
    workspace: text("workspace")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("guest"),
    userId: text("user_id").notNull().default("student-1"),
    name: text("name").notNull().default("Данияр"),
    expires: integer("expires").notNull(),
  },
  (t) => [index("session_workspace_idx").on(t.workspace)],
);
export const rateLimits = sqliteTable("demo_rate_limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(0),
  window: integer("window").notNull(),
});
