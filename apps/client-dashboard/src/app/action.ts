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

export interface UniversalServiceConfig {
  id: string;
  name: string;
  type: "web" | "worker" | "private" | "cron";
  runtime: string;
  rootDir: string;
  buildCommand: string;
  startCommand: string;
  dependencies: Array<{ name: string; version: string }>;
}

export interface UniversalManifestPayload {
  workspaceId: number;
  name: string;
  clientName: string;
  clientEmail: string;
  brief?: string;
  gitProvider: "github" | "gitlab";
  folderStructure: "monorepo" | "src_flat";
  deploymentTarget: "render" | "railway" | "vercel" | "docker_compose" | "none";
  nodePackageManager: "npm" | "pnpm" | "yarn" | "bun";
  services: UniversalServiceConfig[];
  blueprintYaml: string;
}

export async function queueProjectProvisioning(
  payload: UniversalManifestPayload,
) {
  try {
    // ==========================================
    // 🛡️ ACTION PARALLEL AUTH CHECK
    // ==========================================
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("sf_auth_token")?.value;

    if (!sessionToken) {
      return {
        success: false,
        error: "Unauthorized Action: No active token session.",
      };
    }

    let userId = "";
    let userEmail = "";

    if (sessionToken.startsWith("dev_")) {
      const parts = sessionToken.split("_");
      const workspaceId = Number(parts[1]);
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });
      if (!workspace) return { success: false, error: "Access Denied." };
      userId = workspace.ownerId;
    } else {
      const authResponse = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken }),
      });

      if (!authResponse.ok) {
        return { success: false, error: "Identity validation node reject." };
      }

      const authData = await authResponse.json();
      if (!authData.success || !authData.user) {
        return { success: false, error: "Access Denied: Revoked credentials." };
      }
      userId = authData.user.id;
      userEmail = authData.user.email;
    }

    let targetWorkspaceId = payload.workspaceId;

    let verifiedWorkspace = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.id, targetWorkspaceId),
        eq(workspaces.ownerId, userId),
      ),
    });

    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const isSuperAdmin = adminEmailsString
      .split(",")
      .map((e) => e.trim())
      .includes(userEmail);

    // --- SMART FALLBACK: Auto-resolve to user's actual workspace if hardcoded one fails ---
    if (!verifiedWorkspace && !isSuperAdmin && userId) {
      const fallbackWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.ownerId, userId),
      });

      if (fallbackWorkspace) {
        targetWorkspaceId = fallbackWorkspace.id;
        verifiedWorkspace = fallbackWorkspace;
      }
    }

    if (!verifiedWorkspace && !isSuperAdmin) {
      return {
        success: false,
        error:
          "Access Denied: Multi-tenant workspace target modification failure.",
      };
    }

    if (!payload.name || !payload.clientEmail) {
      return {
        success: false,
        error:
          "Missing identity markers: Project Name and Client Email required.",
      };
    }

    // 1. Establish slug and clear duplicates safely
    const projectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

    if (!projectSlug) {
      return {
        success: false,
        error: "Project tracking handle slug generation failure.",
      };
    }

    // 2. Clear or assign client node lookup strings
    let clientRecord = await db.query.clients.findFirst({
      where: (c, { eq, and }) =>
        and(
          eq(c.workspaceId, targetWorkspaceId),
          eq(c.name, payload.clientName),
        ),
    });

    if (!clientRecord) {
      const clientSlug =
        payload.clientName.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        `client-${Date.now()}`;

      const [newClient] = await db.insert(clients).values({
        workspaceId: targetWorkspaceId,
        name: payload.clientName,
        slug: clientSlug,
        portalSlug: `${clientSlug}-portal-${crypto.randomBytes(3).toString("hex")}`,
        email: payload.clientEmail,
        company: payload.clientName,
        onboardingCompleted: true,
      });
      clientRecord = { id: newClient.insertId } as any;
    }

    // 3. Inject new universal layout project record
    const [newProject] = await db.insert(projects).values({
      workspaceId: targetWorkspaceId,
      clientId: clientRecord!.id,
      name: payload.name.trim(),
      slug: projectSlug,
      clientEmail: payload.clientEmail.trim(),
      frontendFramework: "universal",
      backendFramework: "universal",
      databaseProvider: "dynamic",
      folderStructure: payload.folderStructure,
      deploymentTarget: payload.deploymentTarget,
      universalManifest: {
        services: payload.services,
        packageManager: payload.nodePackageManager,
      } as any,
      blueprintYaml: payload.blueprintYaml,
      status: "planning",
      progressPercentage: 15,
    });

    const projectId = newProject.insertId;

    // 4. INJECT PROFESSIONAL TEMPLATE (MVP, Testing, Security)
    const standardMvpChecklist = [
      {
        projectId,
        title: "Environment Setup (Staging Server Link)",
        type: "MVP",
      },
      { projectId, title: "Database Migration (Schema Logs)", type: "MVP" },
      { projectId, title: "Domain & SSL Configuration", type: "MVP" },
      { projectId, title: "Build Automation (CI/CD Logs)", type: "MVP" },
      {
        projectId,
        title: "Component Testing (Unit/Integration Success PDF)",
        type: "MVP",
      },
      {
        projectId,
        title: "User Acceptance Testing (UAT Screen Share)",
        type: "MVP",
      },
      {
        projectId,
        title: "Cross-Browser Check (Layout Compatibility)",
        type: "MVP",
      },
      {
        projectId,
        title: "API Verification (200 OK Responses Proof)",
        type: "MVP",
      },
      {
        projectId,
        title: "Authentication Security (Failure & Token Expiry Clip)",
        type: "MVP",
      },
      {
        projectId,
        title: "Dependency Audit (0 Critical Vulnerabilities)",
        type: "MVP",
      },
      {
        projectId,
        title: "Environment Variables (Hidden Private Keys Proof)",
        type: "MVP",
      },
      { projectId, title: "SQL Injection / XSS Protection Check", type: "MVP" },
    ];

    await db.insert(checklistItems).values(standardMvpChecklist);

    const uniqueIdempotencyKey = `job_${crypto.randomBytes(16).toString("hex")}`;

    // 5. Save provisioning engine manifest job entry
    await db.insert(provisioningJobs).values({
      projectId: projectId,
      idempotencyKey: uniqueIdempotencyKey,
      status: "pending",
      manifest: {
        projectName: payload.name.trim(),
        slug: projectSlug,
        gitProvider: payload.gitProvider,
        folderStructure: payload.folderStructure,
        deploymentTarget: payload.deploymentTarget,
        nodePackageManager: payload.nodePackageManager,
        services: payload.services,
        blueprintYaml: payload.blueprintYaml,
      } as any,
    });

    // 6. Instantly notify orchestrator CLI daemon nodes via Redis PubSub matrix if online
    if (redis && redis.status === "ready") {
      await redis.publish(
        "provisioning_queue",
        JSON.stringify({
          event: "NEW_JOB",
          slug: projectSlug,
          trackingKey: uniqueIdempotencyKey,
        }),
      );
    } else {
      console.log(
        `ℹ️ [FALLBACK CONSOLE NOTIFICATION]: Redis dropped. Daemon signal queued to DB registry for task: ${projectSlug}`,
      );
    }

    revalidatePath("/dashboard");
    return { success: true, slug: projectSlug };
  } catch (error: any) {
    console.error(
      "[CRITICAL SYSTEM FAULT DURING PROVISION ENGINE SEEDING]: ",
      error,
    );
    return {
      success: false,
      error: error.message || "Fatal Engine Pipeline Seeding Derailment.",
    };
  }
}

export async function establishSecureSessionAction(token: string) {
  try {
    let userPayload = null;

    // ==========================================
    // DUAL-VERIFICATION MATRIX
    // ==========================================
    if (token.startsWith("dev_")) {
      // 1. LOCAL DYNAMIC TOKEN (Generated by Next.js Auth Actions)
      const parts = token.split("_");
      const workspaceId = Number(parts[1]);

      if (isNaN(workspaceId)) throw new Error("Malformed local signature.");

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) throw new Error("Workspace node isolated or missing.");

      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, workspace.ownerId),
      });

      if (!userRecord) throw new Error("Attached user identity lost.");

      userPayload = {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        name: userRecord.name,
      };
    } else {
      // 2. REMOTE TELEMETRY TOKEN (Generated by Python API)
      const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return { success: false, error: "Network core handshake rejected." };
      }

      const payload = await response.json();
      if (!payload.success || !payload.user) {
        return { success: false, error: "Invalid session token signatures." };
      }

      userPayload = payload.user;
    }

    // Safely set the cookie on the server.
    const cookieStore = await cookies();
    cookieStore.set("sf_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400, // 24 hours
    });

    return { success: true, user: userPayload };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
