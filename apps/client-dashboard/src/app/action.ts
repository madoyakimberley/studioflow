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

// 💡 NEW IMPORTS FOR NEXTAUTH BRIDGE
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

const API_BASE_URL =
  process.env.API_BASE_URL || "https://studioflow-api-ieck.onrender.com";

// ==========================================
// 🚨 DRIZZLE ORM CRASH BYPASS HELPER (FIXED)
// ==========================================
async function safeInsert(insertPromise: Promise<any>) {
  try {
    return await insertPromise;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("resultset")) {
      return;
    }
    // STOP SWALLOWING ERRORS - Log to terminal and throw to the UI
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
// 🛡️ AUTH GATE ACTION
// ==========================================
export async function establishSecureSessionAction(token: string) {
  try {
    // 🌍 Force interaction with the remote auth api exclusively
    const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Authentication service is temporarily unavailable.");
    }

    const authPayload = await response.json();

    if (!authPayload.success || !authPayload.user) {
      throw new Error("Invalid or expired session. Please log in again.");
    }

    const userPayload = {
      id: authPayload.user.id,
      username: authPayload.user.username,
      email: authPayload.user.email,
      name: authPayload.user.name,
    };

    const cookieStore = await cookies();
    cookieStore.set("sf_auth_token", token, {
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
// HELPER: SECURE AUTHENTICATION & WORKSPACE RESOLUTION (BRIDGED)
// ==========================================
export async function getVerifiedUserAndWorkspace() {
  try {
    let resolvedUserId: string | null = null;
    let resolvedUserSlug: string | null = null;

    // 1️⃣ TRY NEXTAUTH SESSION FIRST (Google / GitHub)
    const nextAuthSession = await getServerSession(authOptions);

    if (nextAuthSession?.user) {
      resolvedUserId = (nextAuthSession.user as any).id;
      // Derive a clean URL-friendly slug from username, email, or name
      resolvedUserSlug =
        (nextAuthSession.user as any).username ||
        nextAuthSession.user.email?.split("@")[0] ||
        nextAuthSession.user.name?.toLowerCase().replace(/\s+/g, "-");
    } else {
      // 2️⃣ FALLBACK: CHECK FOR INDEPENDENT REMOTE API TOKEN
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("sf_auth_token")?.value;

      if (!sessionToken) {
        return {
          success: false,
          error: "Missing active session. Please log in again.",
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: "Authentication service is temporarily unavailable.",
        };
      }

      const authPayload = await response.json();
      if (!authPayload.success || !authPayload.user) {
        return {
          success: false,
          error: "Invalid or expired session. Please log in again.",
        };
      }

      resolvedUserId = authPayload.user.id;
      resolvedUserSlug = authPayload.user.username;
    }

    // Safety check to ensure we have a valid identity context
    if (!resolvedUserId || !resolvedUserSlug) {
      return {
        success: false,
        error: "Failed to resolve your account details.",
      };
    }

    // 3️⃣ RESOLVE OR PROVISION WORKSPACE
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

      if (!userWorkspace) {
        return {
          success: false,
          error: "Could not initialize your workspace environment.",
        };
      }
    }

    return {
      success: true,
      data: {
        userId: resolvedUserId,
        userSlug: resolvedUserSlug,
        workspaceId: userWorkspace.id,
      },
    };
  } catch (error) {
    console.error("[CRITICAL AUTHENTICATION FAILURE]: ", error);
    return {
      success: false,
      error: "A server error occurred while verifying your session.",
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
    const authResult = await getVerifiedUserAndWorkspace();
    if (!authResult.success || !authResult.data) {
      return { success: false, error: authResult.error };
    }

    const { userSlug: resolvedUserSlug, workspaceId: actualWorkspaceId } =
      authResult.data;

    console.log(
      `🚀 Starting project provisioning for workspace ${actualWorkspaceId}`,
    );

    // ---- Validation checks ----
    if (
      !payload.name?.trim() ||
      !payload.clientName?.trim() ||
      !payload.clientEmail?.trim()
    ) {
      return {
        success: false,
        error:
          "Please provide a valid project name, client name, and client email.",
      };
    }

    const validGitProviders = ["github", "gitlab"];
    if (!validGitProviders.includes(payload.gitProvider)) {
      return {
        success: false,
        error:
          "Please select a valid Git repository provider (GitHub or GitLab).",
      };
    }

    const validFolderStructures = ["monorepo", "src_flat"];
    if (!validFolderStructures.includes(payload.folderStructure)) {
      return {
        success: false,
        error: "Please select a valid structural repository layout.",
      };
    }

    // ---- Get tenant DB client ----
    let tenantDb;
    try {
      tenantDb = await getTenantDb(actualWorkspaceId);
      console.log(
        `✅ Tenant DB client obtained for workspace ${actualWorkspaceId}`,
      );
    } catch (err: any) {
      console.error(`❌ Failed to get tenant DB:`, err);
      return {
        success: false,
        error: `Failed to connect to tenant database: ${err.message}`,
      };
    }

    // ---- Client lookup / creation in Tenant DB ----
    let targetClient;
    try {
      targetClient = await tenantDb.query.clients.findFirst({
        where: (clients: any, { eq, and }: any) =>
          and(
            eq(clients.email, payload.clientEmail),
            eq(clients.workspaceId, actualWorkspaceId),
          ),
      });
      console.log(`🔍 Client lookup: ${targetClient ? "found" : "not found"}`);
    } catch (err: any) {
      console.error(`❌ Client lookup failed:`, err);
      return { success: false, error: `Client lookup failed: ${err.message}` };
    }

    if (!targetClient) {
      try {
        const baseClientSlug = payload.clientName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const uniqueClientSuffix = crypto.randomBytes(3).toString("hex");
        const clientSlug = `${baseClientSlug}-${uniqueClientSuffix}`;
        const portalSlug = `${clientSlug}-portal-${crypto.randomBytes(4).toString("hex")}`;

        await safeInsert(
          tenantDb.insert(clients).values({
            workspaceId: actualWorkspaceId,
            name: payload.clientName,
            slug: clientSlug,
            portalSlug: portalSlug,
            email: payload.clientEmail,
            company: payload.clientName,
          } as any),
        );

        targetClient = await tenantDb.query.clients.findFirst({
          where: (clients: any, { eq, and }: any) =>
            and(
              eq(clients.email, payload.clientEmail),
              eq(clients.workspaceId, actualWorkspaceId),
            ),
        });
        console.log(`✅ Created new client`);
      } catch (err: any) {
        console.error(`❌ Client creation failed:`, err);
        return {
          success: false,
          error: `Client creation failed: ${err.message}`,
        };
      }
    }

    if (!targetClient) {
      return {
        success: false,
        error: "Failed to map the client profile to this project context.",
      };
    }

    // ---- Project creation in Tenant DB ----
    const baseProjectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const uniqueProjectSuffix = crypto.randomBytes(3).toString("hex");
    const projectSlug = `${baseProjectSlug}-${uniqueProjectSuffix}`;

    const webService = payload.services?.find((s) => s.type === "web");
    const extractedFrontend = webService?.framework || "Next.js";
    const extractedBackend = "Node.js";

    let createdProject;
    let projectId;
    try {
      await safeInsert(
        tenantDb.insert(projects).values({
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
          backendFramework: extractedBackend,
        } as any),
      );

      // Retrieve project ID
      let retries = 3;
      while (!createdProject && retries > 0) {
        createdProject = await tenantDb.query.projects.findFirst({
          where: (projects: any, { eq }: any) => eq(projects.slug, projectSlug),
        });
        if (!createdProject) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          retries--;
        }
      }

      if (!createdProject || !createdProject.id) {
        throw new Error("Project creation failed – ID not found.");
      }
      projectId = createdProject.id;
      console.log(
        `✅ Project created in Tenant DB with slug: ${projectSlug}, id: ${projectId}`,
      );
    } catch (err: any) {
      console.error(`❌ Project creation failed in Tenant DB:`, err);
      return {
        success: false,
        error: `Project creation failed: ${err.message}`,
      };
    }

    // ---- Checklist items in Tenant DB ----
    try {
      await safeInsert(
        tenantDb.insert(checklistItems).values([
          {
            projectId,
            title: "Environment Setup (Staging Server Link)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Database Migration (Schema Logs)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Domain & SSL Configuration",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Build Automation (CI/CD Logs)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Component Testing (Unit/Integration Success PDF)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "User Acceptance Testing (UAT Screen Share)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Cross-Browser Check (Layout Compatibility)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "API Verification (200 OK Responses Proof)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Authentication Security (Failure & Token Expiry Clip)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Dependency Audit (0 Critical Vulnerabilities)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "Environment Variables (Hidden Private Keys Proof)",
            type: "MVP",
            status: "pending",
          },
          {
            projectId,
            title: "SQL Injection / XSS Protection Check",
            type: "MVP",
            status: "pending",
          },
        ]),
      );
      console.log(`✅ Checklist items created in Tenant DB`);
    } catch (err: any) {
      console.error(`❌ Checklist insertion failed:`, err);
      return {
        success: false,
        error: `Checklist insertion failed: ${err.message}`,
      };
    }

    // ---- Provisioning job (Central DB) ----
    let uniqueIdempotencyKey;
    try {
      uniqueIdempotencyKey = `job_${crypto.randomBytes(16).toString("hex")}`;
      await safeInsert(
        db.insert(provisioningJobs).values({
          projectId: projectId,
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
      console.log(
        `✅ Provisioning job created in Central DB with ID: ${uniqueIdempotencyKey}`,
      );
    } catch (err: any) {
      console.error(`❌ Job insertion failed in Central DB:`, err);
      return { success: false, error: `Job insertion failed: ${err.message}` };
    }

    // ---- Redis publish ----
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
      } catch (redisError) {
        console.error("⚠️ Failed to publish to Redis queue.");
      }
    }

    revalidatePath(`/dashboard/${resolvedUserSlug}`);
    return { success: true, slug: projectSlug };
  } catch (error: any) {
    console.error("[CRITICAL ENGINE FAULT]:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred.",
    };
  }
}
