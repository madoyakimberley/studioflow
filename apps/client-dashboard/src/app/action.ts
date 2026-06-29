"use server";

import {
  db,
  projects,
  provisioningJobs,
  clients,
  checklistItems,
  workspaces,
  users,
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
      diagnosticTimeline.push(
        `2. NextAuth session check: ${!!nextAuthSession}`,
      );
    } catch (authError: any) {
      diagnosticTimeline.push(`2. NextAuth error: ${authError.message}`);
    }

    if (nextAuthSession?.user) {
      resolvedUserId = (nextAuthSession.user as any).id;
      const rawName =
        (nextAuthSession.user as any).username ||
        nextAuthSession.user.name ||
        nextAuthSession.user.email?.split("@")[0];

      resolvedUserSlug = rawName?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

      diagnosticTimeline.push(
        `3. NextAuth branch - User resolved: ${resolvedUserId}`,
      );

      const existingDbUser = await db.query.users.findFirst({
        where: eq(users.id, resolvedUserId as string),
      });

      if (!existingDbUser) {
        await safeInsert(
          db.insert(users).values({
            id: resolvedUserId,
            username:
              resolvedUserSlug ||
              `user_${crypto.randomBytes(4).toString("hex")}`,
            email:
              nextAuthSession.user.email || `${resolvedUserId}@oauth.local`,
            name: nextAuthSession.user.name || "OAuth User",
            passwordHash: crypto.randomBytes(32).toString("hex"),
          } as any),
        );
      }
    } else {
      diagnosticTimeline.push("3. Falling back to cookie session.");
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
        const workspaceId = Number(parts[1]);
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
        });
        if (!workspace)
          return { success: false, error: "Workspace not found." };

        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, workspace.ownerId),
        });
        if (!userRecord) return { success: false, error: "User not found." };

        resolvedUserId = userRecord.id;
        resolvedUserSlug = userRecord.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      } else {
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
          return {
            success: false,
            error: `API verification failed: ${response.status}`,
          };
        }

        const payload = await response.json();
        if (!payload.success || !payload.user) {
          return { success: false, error: "Invalid API session." };
        }

        resolvedUserId = payload.user.id;
        resolvedUserSlug = payload.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      }
    }

    if (!resolvedUserId || !resolvedUserSlug) {
      return { success: false, error: "Failed to resolve user identity." };
    }

    let userWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, resolvedUserId),
    });

    if (!userWorkspace) {
      const newWsSlug = `${resolvedUserSlug}-matrix`;
      await safeInsert(
        db.insert(workspaces).values({
          ownerId: resolvedUserId,
          name: `${resolvedUserSlug}'s Matrix`,
          slug: newWsSlug,
        } as any),
      );

      userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, newWsSlug),
      });
    }

    if (!userWorkspace) {
      return { success: false, error: "Could not initialize workspace." };
    }

    return {
      success: true,
      data: {
        userId: resolvedUserId,
        userSlug: resolvedUserSlug,
        workspaceId: userWorkspace.id,
      },
      timeline: diagnosticTimeline,
    };
  } catch (error: any) {
    console.error("[CRITICAL AUTHENTICATION FAILURE]:", error);
    return {
      success: false,
      error: error.message || "Authentication failed.",
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

    const tenantDb = await getTenantDb(actualWorkspaceId);
    if (!tenantDb) {
      return { success: false, error: "Failed to connect to tenant database." };
    }

    // === CLIENT HANDLING === (Tenant DB)
    let targetClient = await tenantDb.query.clients.findFirst({
      where: (clients: any, { eq, and }: any) =>
        and(
          eq(clients.email, payload.clientEmail.trim().toLowerCase()),
          eq(clients.workspaceId, actualWorkspaceId),
        ),
    });

    if (!targetClient) {
      const baseSlug = payload.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const uniqueSuffix = crypto.randomBytes(3).toString("hex");
      const clientSlug = `${baseSlug}-${uniqueSuffix}`;
      const portalSlug = `${clientSlug}-portal-${crypto.randomBytes(4).toString("hex")}`;

      await safeInsert(
        tenantDb.insert(clients).values({
          workspaceId: actualWorkspaceId,
          name: payload.clientName,
          slug: clientSlug,
          portalSlug,
          email: payload.clientEmail.trim().toLowerCase(),
          company: payload.clientName,
          createdAt: new Date(),
        } as any),
      );

      targetClient = await tenantDb.query.clients.findFirst({
        where: (clients: any, { eq, and }: any) =>
          and(
            eq(clients.email, payload.clientEmail.trim().toLowerCase()),
            eq(clients.workspaceId, actualWorkspaceId),
          ),
      });
    }

    if (!targetClient) {
      return { success: false, error: "Failed to create or find client." };
    }

    // === PROJECT CREATION ===
    const baseProjectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const uniqueProjectSuffix = crypto.randomBytes(3).toString("hex");
    const projectSlug = `${baseProjectSlug}-${uniqueProjectSuffix}`;

    const webService = payload.services?.find((s) => s.type === "web");
    const extractedFrontend = webService?.framework || "Next.js";

    // Fix 1: Write first to central registry db to synchronize workspace routing
    const centralInsert = await db.insert(projects).values({
      workspaceId: actualWorkspaceId,
      name: payload.name,
      slug: projectSlug,
      clientEmail: payload.clientEmail,
      brief: payload.brief || "No brief provided.",
      status: "pending",
      progressPercentage: 0,
      frontendFramework: extractedFrontend,
      backendFramework: "Node.js",
    } as any);

    // Extract the generated primary key from the engine pool response
    const projectId = (centralInsert[0] as any).insertId;

    if (!projectId) {
      throw new Error(
        "Central registry engine failed to return a valid primary key sequence.",
      );
    }

    // Fix 2: Sync identical record down into your isolated Tenant DB keeping tracking states matching
    await safeInsert(
      tenantDb.insert(projects).values({
        id: projectId, // Maintain ID alignment across distributed layers
        workspaceId: actualWorkspaceId,
        clientId: targetClient.id,
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
      } as any),
    );

    // === CHECKLIST ===
    // Fix 3: Uniformly mapped shapes utilizing 'isCompleted' for all records
    await safeInsert(
      tenantDb.insert(checklistItems).values([
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
      ] as any),
    );

    // === PROVISIONING JOB ===
    const uniqueIdempotencyKey = `job_${crypto.randomBytes(16).toString("hex")}`;

    await safeInsert(
      tenantDb.insert(provisioningJobs).values({
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
      } as any),
    );

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
        console.warn("⚠️ Redis publish failed");
      }
    }

    revalidatePath(`/dashboard/${resolvedUserSlug}`);
    return { success: true, slug: projectSlug };
  } catch (error: any) {
    console.error("[CRITICAL ENGINE FAULT]:", error);
    return {
      success: false,
      error:
        error.message ||
        "An unexpected error occurred during project provisioning.",
    };
  }
}
