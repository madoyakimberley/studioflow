"use server";

import {
  db,
  projects,
  provisioningJobs,
  clients,
  checklistItems,
  workspaces,
  users,
  workspaceEnvironments,
} from "@studioflow/db";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Redis from "ioredis";
import crypto from "crypto";
import { getTenantDb } from "@/lib/tenant-db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ==========================================
// REDIS CONNECTION POOL
// ==========================================
let redis: Redis | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    redis.on("error", (err) => {
      console.warn(
        "⚠️ [REDIS DEGRADATION]: Core pipeline operating in polling-fallback state.",
      );
    });
  }
} catch (e) {
  console.warn(
    "⚠️ [REDIS DISCONNECTED]: Defaulting to database persistence pipelines.",
  );
}

const rawApiUrl =
  process.env.API_BASE_URL || "https://studioflow-api-ieck.onrender.com";
const API_BASE_URL = rawApiUrl.replace(/['"]/g, "").trim().replace(/\/+$/, "");

// ==========================================
// DRIZZLE ORM CRASH BYPASS HELPER
// ==========================================
async function safeInsert(insertPromise: Promise<any>) {
  try {
    return await insertPromise;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("resultset")) {
      return;
    }
    console.error("🚨 [DATABASE WRITE FAULT]:", {
      message: err?.message,
      stack: err?.stack,
    });
    throw err;
  }
}

// ==========================================
// TYPES
// ==========================================
export interface UniversalServiceConfig {
  id: string;
  name: string;
  type: "web" | "worker" | "private" | "cron";
  runtime: string;
  rootDir: string;
  buildCommand: string;
  startCommand: string;
  dependencies: Array<{ name: string; version: string }>;
  framework?: string;
}

export interface UniversalManifestPayload {
  workspaceId?: number;
  name: string;
  clientName: string;
  clientEmail: string;
  brief?: string;
  gitProvider: "github" | "gitlab";
  folderStructure: "monorepo" | "src_flat";
  deploymentTarget: "vercel" | "render" | "railway" | "none";
  nodePackageManager: "npm" | "pnpm" | "yarn" | "bun";
  blueprintYaml?: string;
  services: UniversalServiceConfig[];
}

// ==========================================
// ESTABLISH SECURE SESSION ACTION
// ==========================================
export async function establishSecureSessionAction(token: string) {
  try {
    const cleanToken = token.trim();

    const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "StudioFlow-Client-Dashboard/1.0",
      },
      body: JSON.stringify({ token: cleanToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorDetails = await response
        .text()
        .catch(() => "No payload context available");
      throw new Error(`API Gate Refusal (${response.status}): ${errorDetails}`);
    }

    const authPayload = await response.json();

    if (!authPayload.success) {
      throw new Error("Invalid or expired session. Please log in again.");
    }

    const isEmail = cleanToken.includes("@");
    const inferredUsername = isEmail ? cleanToken.split("@")[0] : cleanToken;

    const userPayload = {
      id: cleanToken,
      username: inferredUsername,
      email: isEmail ? cleanToken : `${inferredUsername}@system.local`,
      name: inferredUsername,
    };

    const cookieStore = await cookies();
    cookieStore.set("sf_auth_token", cleanToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return { success: true, user: userPayload };
  } catch (error: any) {
    console.error("[SESSION ESTABLISHMENT ERROR]:", error);
    return {
      success: false,
      error: error.message || "Failed to establish session.",
    };
  }
}

// ==========================================
// SECURE AUTHENTICATION & WORKSPACE RESOLUTION
// ==========================================
export async function getVerifiedUserAndWorkspace() {
  const diagnosticTimeline: string[] = [];

  try {
    let resolvedUserId: string | null = null;
    let resolvedUserSlug: string | null = null;

    diagnosticTimeline.push(
      "1. Starting getVerifiedUserAndWorkspace execution.",
    );

    let nextAuthSession = null;
    try {
      nextAuthSession = await getServerSession(authOptions);
    } catch (authError: any) {
      diagnosticTimeline.push(`2. NextAuth error: ${authError.message}`);
    }

    if (nextAuthSession?.user) {
      const sessionEmail = nextAuthSession.user.email;
      if (!sessionEmail) {
        return {
          success: false,
          error: "OAuth session missing email context.",
          timeline: diagnosticTimeline,
        };
      }

      let existingDbUser = await db.query.users.findFirst({
        where: eq(users.email, sessionEmail.trim().toLowerCase()),
      });

      if (!existingDbUser) {
        const oauthUserId =
          (nextAuthSession.user as any).id || crypto.randomUUID();
        const rawName =
          (nextAuthSession.user as any).username ||
          nextAuthSession.user.name ||
          sessionEmail.split("@")[0];
        const generatedSlug =
          rawName.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          `user_${crypto.randomBytes(4).toString("hex")}`;

        await db.insert(users).values({
          id: oauthUserId,
          username: generatedSlug,
          email: sessionEmail.trim().toLowerCase(),
          name: nextAuthSession.user.name || "OAuth User",
          passwordHash: crypto.randomBytes(32).toString("hex"),
        } as any);

        existingDbUser = await db.query.users.findFirst({
          where: eq(users.id, oauthUserId),
        });
      }

      if (!existingDbUser) {
        return {
          success: false,
          error: "Failed to retrieve user registry.",
          timeline: diagnosticTimeline,
        };
      }

      resolvedUserId = existingDbUser.id;
      resolvedUserSlug = existingDbUser.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    } else {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("sf_auth_token")?.value;

      if (!sessionToken) {
        return {
          success: false,
          error: "Missing active session.",
          timeline: diagnosticTimeline,
        };
      }

      const cleanToken = sessionToken.trim();

      if (cleanToken.startsWith("dev_")) {
        const parts = cleanToken.split("_");
        // 🌟 FIXED: Explicitly convert to Number so SQL queries match the integer column
        const parsedWsId = Number(parts[1]);

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, parsedWsId as any),
        });

        if (!workspace) {
          return {
            success: false,
            error: "Workspace not found.",
            timeline: diagnosticTimeline,
          };
        }

        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, workspace.ownerId),
        });

        if (!userRecord) {
          return {
            success: false,
            error: "User not found.",
            timeline: diagnosticTimeline,
          };
        }

        resolvedUserId = userRecord.id;
        resolvedUserSlug = userRecord.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      } else {
        const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: cleanToken }),
        });

        if (!response.ok)
          return {
            success: false,
            error: "API verification failed.",
            timeline: diagnosticTimeline,
          };
        const payload = await response.json();
        if (!payload.success || !payload.user)
          return {
            success: false,
            error: "Invalid API session.",
            timeline: diagnosticTimeline,
          };

        resolvedUserId = payload.user.id;
        resolvedUserSlug = payload.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      }
    }

    if (!resolvedUserId || !resolvedUserSlug) {
      return {
        success: false,
        error: "Failed to resolve user identity.",
        timeline: diagnosticTimeline,
      };
    }

    let userWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, resolvedUserId),
    });

    if (!userWorkspace) {
      const newWsSlug = `${resolvedUserSlug}-matrix`;

      await db.insert(workspaces).values({
        ownerId: resolvedUserId,
        name: `${resolvedUserSlug}'s Matrix`,
        slug: newWsSlug,
      } as any);

      userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, newWsSlug),
      });
      if (!userWorkspace)
        return {
          success: false,
          error: "Could not verify workspace creation.",
          timeline: diagnosticTimeline,
        };

      const generatedWorkspaceId = userWorkspace.id;

      await db
        .update(users)
        .set({ workspaceId: generatedWorkspaceId })
        .where(eq(users.id, resolvedUserId));

      await db.insert(workspaceEnvironments).values({
        workspaceId: generatedWorkspaceId as any,
        databaseEngine: "postgresql",
        databaseUrl: "",
        databaseOrm: "drizzle",
        targetOutputDir: "~/StudioFlow/projects",
      } as any);
    }

    // Secondary sync step
    const userRowSync = await db.query.users.findFirst({
      where: eq(users.id, resolvedUserId),
    });
    if (userRowSync && !(userRowSync as any).workspaceId) {
      await db
        .update(users)
        .set({ workspaceId: userWorkspace.id as any } as any)
        .where(eq(users.id, resolvedUserId));
    }

    return {
      success: true,
      data: {
        userId: resolvedUserId,
        userSlug: resolvedUserSlug,
        // 🌟 FIXED: Enforce Number conversion so downstream getTenantDb() doesn't crash
        workspaceId: Number(userWorkspace.id),
      },
      timeline: diagnosticTimeline,
    };
  } catch (error: any) {
    console.error("Critical Auth Failure:", error);
    return {
      success: false,
      error: error.message || "Auth failed.",
      timeline: diagnosticTimeline,
    };
  }
}
// ==========================================
// CORE SERVER ACTION: PROJECT PROVISIONING
// ==========================================
export async function queueProjectProvisioning(
  payload: UniversalManifestPayload,
) {
  try {
    let resolvedUserSlug = "admin";
    let actualWorkspaceId = payload.workspaceId;

    // ==========================================
    // 1. AUTH MATRIX RESOLUTION
    // ==========================================
    if (!actualWorkspaceId) {
      const session = await getServerSession(authOptions);
      const userId = (session?.user as any)?.id;

      if (userId) {
        const userRec = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        const userWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.ownerId, userId),
        });

        if (userRec && userWorkspace) {
          resolvedUserSlug = userRec.username;
          actualWorkspaceId = userWorkspace.id;
        }
      }
    }

    if (!actualWorkspaceId) {
      const authResult = await getVerifiedUserAndWorkspace();
      if (!authResult.success || !authResult.data) {
        return { success: false, error: authResult.error };
      }
      const { userSlug, workspaceId } = authResult.data;
      resolvedUserSlug = userSlug;
      actualWorkspaceId = workspaceId;
    }

    if (
      !payload.name?.trim() ||
      !payload.clientName?.trim() ||
      !payload.clientEmail?.trim()
    ) {
      return {
        success: false,
        error: "Project name, client name, and email are required.",
      };
    }

    // Connect to Tenant Isolation DB
    const tenantDb = await getTenantDb(actualWorkspaceId as any);
    if (!tenantDb) {
      return { success: false, error: "Failed to connect to tenant database." };
    }

    // ==========================================
    // 2. TENANT DB: CLIENT PROVISIONING
    // ==========================================
    let targetClient = await tenantDb.query.clients
      .findFirst({
        where: (clients: any, { eq, and }: any) =>
          and(
            eq(clients.email, payload.clientEmail.trim().toLowerCase()),
            eq(clients.workspaceId, actualWorkspaceId),
          ),
      })
      .catch((err: any) => {
        throw new Error(`Tenant client lookup crash: ${err.message}`);
      });

    if (!targetClient) {
      const baseSlug = payload.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const uniqueSuffix = crypto.randomBytes(3).toString("hex");
      const clientSlug = `${baseSlug}-${uniqueSuffix}`;
      const portalSlug = `${clientSlug}-portal-${crypto.randomBytes(4).toString("hex")}`;

      // Bypass generic safeInsert to let internal DB validation errors bubble up safely
      await tenantDb
        .insert(clients)
        .values({
          workspaceId: actualWorkspaceId,
          name: payload.clientName,
          slug: clientSlug,
          portalSlug,
          email: payload.clientEmail.trim().toLowerCase(),
          company: payload.clientName,
          createdAt: new Date(),
        } as any)
        .catch((err: any) => {
          throw new Error(
            `Tenant client insertion constraint violation: ${err.message}`,
          );
        });

      targetClient = await tenantDb.query.clients.findFirst({
        where: (clients: any, { eq, and }: any) =>
          and(
            eq(clients.email, payload.clientEmail.trim().toLowerCase()),
            eq(clients.workspaceId, actualWorkspaceId),
          ),
      });
    }

    if (!targetClient) {
      return {
        success: false,
        error: "Failed to create or find client context.",
      };
    }

    // ==========================================
    // 3. GENERATE ALL STRATEGIC SLUGS
    // ==========================================
    const baseProjectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const uniqueProjectSuffix = crypto.randomBytes(3).toString("hex");
    const projectSlug = `${baseProjectSlug}-${uniqueProjectSuffix}`;

    const webService = payload.services?.find((s) => s.type === "web");
    const extractedFrontend = webService?.framework || "Next.js";

    // ==========================================
    // 4. CENTRAL DB: WRITE MASTER REGISTRY POINTER
    // ==========================================
    // Essential for global asset handling and global routing lookup engines!
    const centralInsertResult = await db
      .insert(projects)
      .values({
        workspaceId: actualWorkspaceId,
        name: payload.name,
        slug: projectSlug,
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        brief: payload.brief || "No brief provided.",
        status: "pending",
        progressPercentage: 0,
        frontendFramework: extractedFrontend,
        backendFramework: "Node.js",
        universalManifest: {
          services: payload.services || [],
          gitProvider: payload.gitProvider,
          folderStructure: payload.folderStructure,
          deploymentTarget: payload.deploymentTarget,
          nodePackageManager: payload.nodePackageManager,
        },
      } as any)
      .catch((err: any) => {
        throw new Error(`Central Registry insert failure: ${err.message}`);
      });

    // Extract the auto-generated ID from the primary MySQL cluster pool response
    const projectId = (centralInsertResult[0] as any).insertId;

    if (!projectId) {
      throw new Error(
        "Central engine failed to return a deterministic insert ID.",
      );
    }

    // ==========================================
    // 5. TENANT DB: SYNC COMPLEMENTARY RECORD
    // ==========================================
    // We pass down the exact Central projectId to satisfy internal foreign keys!
    await tenantDb
      .insert(projects)
      .values({
        id: projectId,
        workspaceId: actualWorkspaceId,
        clientId: targetClient.id,
        clientName: payload.clientName,
        name: payload.name,
        slug: projectSlug,
        clientEmail: payload.clientEmail,
        brief: payload.brief || "No brief provided.",
        status: "pending",
        progressPercentage: 0,
        portalLinkSentCount: 0,
        universalManifest: {
          services: payload.services || [],
          gitProvider: payload.gitProvider,
          folderStructure: payload.folderStructure,
          deploymentTarget: payload.deploymentTarget,
          nodePackageManager: payload.nodePackageManager,
        },
        frontendFramework: extractedFrontend,
        backendFramework: "Node.js",
      } as any)
      .catch((err: any) => {
        throw new Error(`Tenant DB dual-write sync failed: ${err.message}`);
      });

    // ==========================================
    // 6. TENANT DB: BULK INGEST CHECKLIST MATRIX
    // ==========================================
    await tenantDb
      .insert(checklistItems)
      .values([
        {
          projectId,
          title: "Initialize Secure Git Repository",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: `Configure ${payload.folderStructure} Monorepo Structure`,
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: `Provision ${payload.deploymentTarget} Deployment Pipeline`,
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Environment Setup (Staging Server Link)",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Database Migration (Schema Logs)",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Domain & SSL Configuration",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Build Automation (CI/CD Logs)",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Component Testing",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "User Acceptance Testing (UAT)",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Cross-Browser Check",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "API Verification",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Authentication Security",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Dependency Audit",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Environment Variables",
          type: "MVP",
          isCompleted: false,
        },
        {
          projectId,
          title: "Security Checks (SQLi / XSS)",
          type: "MVP",
          isCompleted: false,
        },
      ])
      .catch((err: any) => {
        throw new Error(
          `Tenant Checklist creation batch failure: ${err.message}`,
        );
      });

    // ==========================================
    // 7. TENANT DB: DISPATCH PIPELINE ACTION JOB
    // ==========================================
    const uniqueIdempotencyKey = `job_${crypto.randomBytes(16).toString("hex")}`;

    await tenantDb
      .insert(provisioningJobs)
      .values({
        projectId,
        workspaceId: actualWorkspaceId,
        idempotencyKey: uniqueIdempotencyKey,
        status: "pending",
        manifest: {
          projectName: payload.name,
          slug: projectSlug,
          gitProvider: payload.gitProvider,
          folderStructure: payload.folderStructure,
          deploymentTarget: payload.deploymentTarget,
          nodePackageManager: payload.nodePackageManager,
          services: payload.services || [],
          blueprintYaml: payload.blueprintYaml || "",
        } as any,
      } as any)
      .catch((err: any) => {
        throw new Error(
          `Tenant Orchestration Job submission failed: ${err.message}`,
        );
      });

    // ==========================================
    // 8. REDIS ASYNC EVENTS DISPATCHER
    // ==========================================
    if (redis && redis.status === "ready") {
      try {
        await redis.publish(
          "provisioning_queue",
          JSON.stringify({
            event: "NEW_JOB",
            slug: projectSlug,
            trackingKey: uniqueIdempotencyKey,
            workspaceId: actualWorkspaceId,
          }),
        );
      } catch (e) {
        console.warn("⚠️ Redis publish degradation activated.");
      }
    }

    revalidatePath(`/dashboard/${resolvedUserSlug}`);
    return { success: true, slug: projectSlug };
  } catch (error: any) {
    console.error("[CRITICAL ENGINE FAULT]:", error);
    // Directly bubbles the deep underlying error text back to your Toast notification wrapper!
    return {
      success: false,
      error:
        error.message ||
        "An unexpected error occurred during project provisioning.",
    };
  }
}
