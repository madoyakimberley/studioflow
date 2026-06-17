"use server";

import {
  db,
  projects,
  provisioningJobs,
  clients,
  checklistItems,
} from "@studioflow/db";
import { revalidatePath } from "next/cache";
import Redis from "ioredis";
import crypto from "crypto";

// Fallback gracefully when localized Redis buffers drop
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

export interface UniversalServiceConfig {
  id: string;
  name: string;
  type: "web" | "worker" | "private" | "cron";
  runtime: string; // 'python', 'node', 'go', 'rust', etc.
  rootDir: string;
  buildCommand: string;
  startCommand: string;
  dependencies: Array<{ name: string; version: string }>;
}

export interface UniversalManifestPayload {
  workspaceId: number;
  name: string;
  clientName: string;
  clientEmail: string; // INJECTED CRITICAL ADJACENCY DATA HANDLER
  brief?: string;
  gitProvider: "github" | "gitlab";
  folderStructure: "monorepo" | "src_flat";
  deploymentTarget: "render" | "railway" | "vercel" | "docker_compose" | "none";
  nodePackageManager: "npm" | "pnpm" | "yarn" | "bun"; // Added globally for manifest inheritance
  services: UniversalServiceConfig[];
  blueprintYaml: string;
}

export async function queueProjectProvisioning(
  payload: UniversalManifestPayload,
) {
  try {
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
          eq(c.workspaceId, payload.workspaceId),
          eq(c.name, payload.clientName),
        ),
    });

    if (!clientRecord) {
      const clientSlug = payload.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const [newClient] = await db.insert(clients).values({
        workspaceId: payload.workspaceId,
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
      workspaceId: payload.workspaceId,
      clientId: clientRecord!.id,
      name: payload.name,
      slug: projectSlug,
      clientEmail: payload.clientEmail, // RECORD PERSISTENCE ASSIGNMENT FOR GATEWAY
      frontendFramework: "universal",
      backendFramework: "universal",
      databaseProvider: "dynamic",
      folderStructure: payload.folderStructure,
      deploymentTarget: payload.deploymentTarget,
      universalManifest: {
        services: payload.services,
        packageManager: payload.nodePackageManager,
      } as any, // Schema organically inherits schema keys here
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
        projectName: payload.name,
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
