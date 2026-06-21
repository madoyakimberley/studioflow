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
  foreignKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Safely access process.env to prevent TypeScript compilation errors
// when @types/node is missing or in non-Node environments
const isIsolatedDev =
  (globalThis as any).process?.env?.IS_ISOLATED_DEV === "true";

// ==========================================
// MULTI-TENANT CORE ARCHITECTURE
// ==========================================

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash").notNull(),
  githubAccessToken: text("github_access_token"),
  cliToken: varchar("cli_token", { length: 255 }).unique(), // NEW: CLI Authentication Token
  createdAt: timestamp("created_at").defaultNow(),
});

export const workspaces = mysqlTable(
  "workspaces",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ownerIdx: index("owner_idx").on(table.ownerId),
    ...(!isIsolatedDev
      ? {
          ownerFk: foreignKey({
            columns: [table.ownerId],
            foreignColumns: [users.id],
          }),
        }
      : {}),
  }),
);

export const workspaceIntegrations = mysqlTable(
  "workspace_integrations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    accessToken: text("access_token"),
    clientId: varchar("client_id", { length: 255 }),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    workspaceProviderUidx: uniqueIndex("workspace_provider_uidx").on(
      table.workspaceId,
      table.provider,
    ),
    ...(!isIsolatedDev
      ? {
          workspaceFk: foreignKey({
            columns: [table.workspaceId],
            foreignColumns: [workspaces.id],
          }),
        }
      : {}),
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
    slug: varchar("slug", { length: 255 }).notNull(),
    portalSlug: varchar("portal_slug", { length: 255 }).notNull().unique(),
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
    ...(!isIsolatedDev
      ? {
          workspaceFk: foreignKey({
            columns: [table.workspaceId],
            foreignColumns: [workspaces.id],
          }),
        }
      : {}),
  }),
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull(),
    clientId: int("client_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),

    frontendFramework: varchar("frontend_framework", { length: 50 }).default(
      "dynamic",
    ),
    backendFramework: varchar("backend_framework", { length: 50 }).default(
      "dynamic",
    ),
    databaseProvider: varchar("database_provider", { length: 50 }).default(
      "dynamic",
    ),
    folderStructure: varchar("folder_structure", { length: 50 }).default(
      "monorepo",
    ),
    deploymentTarget: varchar("deployment_target", { length: 50 }).default(
      "custom",
    ),

    universalManifest: json("universal_manifest").notNull(),
    blueprintYaml: text("blueprint_yaml"),

    status: varchar("status", { length: 50 }).default("planning"),
    liveUrl: varchar("live_url", { length: 255 }),
    githubRepo: varchar("github_repo", { length: 255 }),
    paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
    progressPercentage: int("progress_percentage").default(0),

    // MVP Tracking Engine Logic
    mvpEditCount: int("mvp_edit_count").default(0),

    // Gateway Info
    clientEmail: varchar("client_email", { length: 255 }).notNull(),
    portalVerificationCode: varchar("portal_verification_code", { length: 6 }),
    portalCodeExpiresAt: timestamp("portal_code_expires_at"),
    portalLastCodeSentAt: timestamp("portal_last_code_sent_at"),
    portalEmailsSentCount: int("portal_emails_sent_count").default(0),
    portalLinkSentCount: int("portal_link_sent_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    workspaceProjectIdx: index("workspace_project_idx").on(table.workspaceId),
    ...(!isIsolatedDev
      ? {
          workspaceFk: foreignKey({
            columns: [table.workspaceId],
            foreignColumns: [workspaces.id],
          }),
          clientFk: foreignKey({
            columns: [table.clientId],
            foreignColumns: [clients.id],
          }),
        }
      : {}),
  }),
);

// ==========================================
// DELIVERABLES, ASSETS & PORTAL COMMUNICATION
// ==========================================

export const projectAssets = mysqlTable(
  "project_assets",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    uploadedBy: varchar("uploaded_by", { length: 50 }).notNull(), // 'client' or 'admin'
    name: varchar("name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 50 }).notNull(),
    fileSize: varchar("file_size", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    projectAssetIdx: index("project_asset_idx").on(table.projectId),
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
  }),
);

export const checklistItems = mysqlTable(
  "checklist_items",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'pending_client_review', 'completed'
    proofUrl: text("proof_url"),
    type: varchar("type", { length: 50 }).default("MVP"), // 'MVP' or 'Added Feature'
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
  }),
);

export const portalMessages = mysqlTable(
  "portal_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    sender: varchar("sender", { length: 50 }).notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
  }),
);

export const chatPresence = mysqlTable(
  "chat_presence",
  {
    projectId: int("project_id").primaryKey(),
    clientTyping: boolean("client_typing").default(false),
    adminTyping: boolean("admin_typing").default(false),
    lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
  },
  (table) => ({
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
  }),
);

export const clientRequests = mysqlTable(
  "client_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("project_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: varchar("status", { length: 50 }).default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
  }),
);

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
    status: varchar("status", { length: 50 }).default("pending"),
    manifest: json("manifest").notNull(),
    executionLogs: text("execution_logs"),
    createdAt: timestamp("created_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    projectJobIdx: index("project_job_idx").on(table.projectId),
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }),
        }
      : {}),
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
    ...(!isIsolatedDev
      ? {
          projectFk: foreignKey({
            columns: [table.projectId],
            foreignColumns: [projects.id],
          }).onDelete("cascade"),
        }
      : {}),
  }),
);

export const workspaceEnvironments = mysqlTable(
  "workspace_environments",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspace_id").notNull().unique(),

    databaseUrl: text("database_url"),
    databaseEngine: varchar("database_engine", { length: 50 }).default(
      "postgresql",
    ),
    databaseOrm: varchar("database_orm", { length: 50 }).default("drizzle"),
    redisUrl: text("redis_url"),
    targetOutputDir: varchar("target_output_dir", { length: 255 }).default(
      "~/StudioFlow/projects",
    ),

    githubToken: text("github_token"),

    deploymentProvider: varchar("deployment_provider", { length: 50 }).default(
      "none",
    ),
    deploymentApiKey: text("deployment_api_key"),
    deploymentOwnerId: varchar("deployment_owner_id", { length: 255 }),

    smtpHost: varchar("smtp_host", { length: 255 }),
    smtpPort: varchar("smtp_port", { length: 50 }),
    smtpUser: varchar("smtp_user", { length: 255 }),
    smtpPass: text("smtp_pass"),
    adminAlertEmail: varchar("admin_alert_email", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    ...(!isIsolatedDev
      ? {
          workspaceFk: foreignKey({
            columns: [table.workspaceId],
            foreignColumns: [workspaces.id],
          }),
        }
      : {}),
  }),
);

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
  checklistItems: many(checklistItems),
  jobs: many(provisioningJobs),
  monitoringLogs: many(siteMonitoring),
  clientRequests: many(clientRequests),
  portalMessages: many(portalMessages),
  assets: many(projectAssets),
}));

export const projectAssetsRelations = relations(projectAssets, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssets.projectId],
    references: [projects.id],
  }),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  project: one(projects, {
    fields: [checklistItems.projectId],
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
