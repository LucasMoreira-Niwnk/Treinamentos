import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("portal_users", {
  sub: text("sub").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});

export const courses = sqliteTable("training_courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),
  lessons: text("lessons").notNull(),
  coverImage: text("cover_image").notNull().default(""),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
});

export const completions = sqliteTable("training_completions", {
  userSub: text("user_sub").notNull(),
  courseId: text("course_id").notNull(),
  userEmail: text("user_email").notNull(),
  score: integer("score").notNull(),
  completedAt: integer("completed_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userSub, table.courseId] }),
}));
