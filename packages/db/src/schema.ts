import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ==========================================
// MULTI-TENANT CORE ARCHITECTURE
// ==========================================

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(), // Unique routing handles (e.g., studioflow.ai/username)
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash").notNull(), // Added for secure credential tracking and verification
  githubAccessToken: text("github_access_token"), // Persistent direct GitHub fallback connection storage
  createdAt: timestamp("created_at").defaultNow(),
});

export const workspaces = mysqlTable(
  "workspaces",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(), // Unique routing endpoint (e.g., studioflow.ai/workspace-slug)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ownerIdx: index("owner_idx").on(table.ownerId),
  }),
);

export const workspaceIntegrations = mysqlTable(
  "workspace_integrations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'github', 'gitlab', etc.
    accessToken: text("access_token"),
    clientId: varchar("client_id", { length: 255 }),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    workspaceProviderUidx: uniqueIndex("workspace_provider_uidx").on(
      table.workspaceId,
      table.provider,
    ),
  }),
);

// ==========================================
// CLIENT & PROJECT RESOURCES
// ==========================================

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(), // Internal scope tracking string identifier used by generation engines
    portalSlug: varchar("portal_slug", { length: 255 }).notNull().unique(), // GitHub-like external custom URL for client onboarding portal routing
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    company: varchar("company", { length: 255 }),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    workspaceClientIdx: index("workspace_client_idx").on(table.workspaceId),
    uniqueClientSlugIdx: uniqueIndex("unique_client_slug_idx").on(
      table.workspaceId,
      table.slug,
    ),
  }),
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull(),
    clientId: int("client_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(), // Unique execution workspace prefix string (e.g., apps/[project-slug])

    // ✅ FIXED: Added specific columns to actually save UI choices
    frontendFramework: varchar("frontend_framework", { length: 50 }).default(
      "nextjs",
    ),
    backendFramework: varchar("backend_framework", { length: 50 }).default(
      "express",
    ),
    databaseProvider: varchar("database_provider", { length: 50 }).default(
      "postgres",
    ),
    folderStructure: varchar("folder_structure", { length: 50 }).default(
      "monorepo",
    ),
    deploymentTarget: varchar("deployment_target", { length: 50 }).default(
      "vercel",
    ),

    status: varchar("status", { length: 50 }).default("planning"), // planning, active, paused, unhealthy
    liveUrl: varchar("live_url", { length: 255 }),
    githubRepo: varchar("github_repo", { length: 255 }),
    paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
    progressPercentage: int("progress_percentage").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    workspaceProjectIdx: index("workspace_project_idx").on(table.workspaceId),
  }),
);

// ==========================================
// DELIVERABLES & PORTAL COMMUNICATION
// ==========================================

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portalMessages = mysqlTable("portal_messages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  sender: varchar("sender", { length: 50 }).notNull(), // 'admin' or 'client'
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatPresence = mysqlTable("chat_presence", {
  projectId: int("project_id").primaryKey(),
  clientTyping: boolean("client_typing").default(false),
  adminTyping: boolean("admin_typing").default(false),
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
});

export const clientRequests = mysqlTable("client_requests", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// AUTOMATION & INFRASTRUCTURE QUEUES
// ==========================================

export const provisioningJobs = mysqlTable(
  "provisioning_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 })
      .notNull()
      .unique(),
    status: varchar("status", { length: 50 }).default("pending"), // pending, running, completed, failed
    manifest: json("manifest").notNull(), // Flexible tech stack choice decisions & dynamic schema parameters
    executionLogs: text("execution_logs"),
    createdAt: timestamp("created_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    projectJobIdx: index("project_job_idx").on(table.projectId),
  }),
);

export const dependencyLibrary = mysqlTable("dependency_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  version: varchar("version", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  techStack: varchar("tech_stack", { length: 50 }).notNull(),
});

export const siteMonitoring = mysqlTable(
  "site_monitoring",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    isUp: boolean("is_up").notNull(),
    statusCode: int("status_code"),
    responseTimeMs: int("response_time_ms"),
    errorTrace: text("error_trace"),
    checkedAt: timestamp("checked_at").defaultNow(),
  },
  (table) => ({
    projMonitoringIdx: index("proj_monitoring_idx").on(table.projectId),
  }),
);

export const workspaceEnvironments = mysqlTable("workspace_environments", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspace_id").notNull().unique(),

  // Core Infrastructure
  databaseUrl: text("database_url"),
  redisUrl: text("redis_url"),
  targetOutputDir: varchar("target_output_dir", { length: 255 }).default(
    "~/StudioFlow/projects",
  ),

  // VCS Connectivity
  githubToken: text("github_token"),

  // Deployment Automation
  deploymentProvider: varchar("deployment_provider", { length: 50 }).default(
    "none",
  ), // 'render', 'railway', 'vercel', 'none'
  deploymentApiKey: text("deployment_api_key"),
  deploymentOwnerId: varchar("deployment_owner_id", { length: 255 }), // e.g., Render Owner ID or Vercel Team ID

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ==========================================
// SYSTEM RELATIONSHIPS MAPS
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  clients: many(clients),
  projects: many(projects),
  integrations: many(workspaceIntegrations),
}));

export const workspaceIntegrationsRelations = relations(
  workspaceIntegrations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceIntegrations.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  jobs: many(provisioningJobs),
  monitoringLogs: many(siteMonitoring),
  clientRequests: many(clientRequests),
  portalMessages: many(portalMessages),
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

export const siteMonitoringRelations = relations(siteMonitoring, ({ one }) => ({
  project: one(projects, {
    fields: [siteMonitoring.projectId],
    references: [projects.id],
  }),
}));

export const clientRequestsRelations = relations(clientRequests, ({ one }) => ({
  project: one(projects, {
    fields: [clientRequests.projectId],
    references: [projects.id],
  }),
}));

export const portalMessagesRelations = relations(portalMessages, ({ one }) => ({
  project: one(projects, {
    fields: [portalMessages.projectId],
    references: [projects.id],
  }),
}));

export const workspaceEnvironmentsRelations = relations(
  workspaceEnvironments,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceEnvironments.workspaceId],
      references: [workspaces.id],
    }),
  }),
);
