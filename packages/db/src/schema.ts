import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// --- CLIENTS ---
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  company: varchar("company", { length: 255 }),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- PROJECTS ---
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("planning"),
  liveUrl: varchar("live_url", { length: 255 }),
  githubRepo: varchar("github_repo", { length: 255 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  progressPercentage: int("progress_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- CLIENT DELIVERABLES / KANBAN TASKS ---
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- AUTOMATED PROVISIONING JOBS ---
export const provisioningJobs = mysqlTable("provisioning_jobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in-progress, completed, failed
  manifest: json("manifest").notNull(), // Complete configuration payload
  executionLogs: text("execution_logs"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// --- DEPENDENCY LIBRARY (Registry for the Factory) ---
export const dependencyLibrary = mysqlTable("dependency_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  version: varchar("version", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // database, auth, UI, analytics
  techStack: varchar("tech_stack", { length: 50 }).notNull(), // nextjs, fastapi
});

// --- SITE MONITORING LOGS ---
export const siteMonitoring = mysqlTable("site_monitoring", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  isUp: boolean("is_up").notNull(),
  statusCode: int("status_code"),
  responseTimeMs: int("response_time_ms"),
  errorTrace: text("error_trace"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// --- RELATIONSHIPS ---

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  jobs: many(provisioningJobs),
  monitoringLogs: many(siteMonitoring),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const provisioningJobsRelations = relations(
  provisioningJobs,
  ({ one }) => ({
    project: one(projects, {
      fields: [provisioningJobs.projectId],
      references: [projects.id],
    }),
  }),
);

// Added missing inverse relationship for siteMonitoring
export const siteMonitoringRelations = relations(siteMonitoring, ({ one }) => ({
  project: one(projects, {
    fields: [siteMonitoring.projectId],
    references: [projects.id],
  }),
}));
