import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// --- TABLES ---

export const clients = mysqlTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  company: varchar("company", { length: 255 }),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  clientId: int("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("planning"), // planning, development, testing, live
  liveUrl: varchar("live_url", { length: 255 }),
  githubRepo: varchar("github_repo", { length: 255 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"), // pending, partial, paid
  progressPercentage: int("progress_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RELATIONS (For fast, joined queries) ---

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));
