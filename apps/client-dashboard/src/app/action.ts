"use server";

import { db, projects, provisioningJobs, clients } from "@studioflow/db";
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

export interface UniversalManifestPayload {
  workspaceId: number;
  name: string;
  clientName: string;
  brief?: string;
  gitProvider: "github" | "gitlab";
  techStack: string;
  database: string;
  auth: string;
  folderStructure:
    | "monorepo"
    | "src_flat"
    | "layered_mvc"
    | "clean_architecture";
  deploymentTarget:
    | "vercel"
    | "railway"
    | "render"
    | "aws_amplify"
    | "docker_compose"
    | "netlify"
    | "none";
  features: string[];
  priority: "STANDARD" | "HIGH" | "PRIORITY" | "CRITICAL";
  apiIntegration?: boolean;
}

export async function queueProjectProvisioning(
  payload: UniversalManifestPayload,
) {
  try {
    // Structural Integrity Guard
    if (!payload.name || !payload.workspaceId) {
      throw new Error(
        "Validation Guard Trigger Deflection: Required payload tracking nodes omitted.",
      );
    }

    // Generate functional slugs for target routing engines
    const projectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const clientSlug = (payload.clientName || "operations-node")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // 1. Locate or Instantiate Client Mapping Layer Registry Context
    let targetClient = await db.query.clients.findFirst({
      where: (c, { and, eq }) =>
        and(eq(c.slug, clientSlug), eq(c.workspaceId, payload.workspaceId)),
    });

    if (!targetClient) {
      // Satisfy complex schema constraints with an isolated, unique platform portal slug
      const uniquePortalSlug = `${clientSlug}-${crypto.randomBytes(4).toString("hex")}`;
      // Account for unique email table key index structures securely per workspace context
      const uniqueInternalEmail = `${clientSlug}-${payload.workspaceId}@studioflow.internal`;

      const [insertedClient] = await db.insert(clients).values({
        workspaceId: payload.workspaceId,
        slug: clientSlug,
        portalSlug: uniquePortalSlug,
        name: payload.clientName || "Universal Operations Node",
        email: uniqueInternalEmail,
        company: payload.clientName || "StudioFlow Enterprise Systems",
        onboardingCompleted: true,
      });

      targetClient = {
        id: insertedClient.insertId,
        workspaceId: payload.workspaceId,
        slug: clientSlug,
        portalSlug: uniquePortalSlug,
        name: payload.clientName,
        email: uniqueInternalEmail,
        company: payload.clientName,
        onboardingCompleted: true,
        createdAt: new Date(),
      };
    }

    // 2. Generates strict cryptographic hash keys for dynamic idempotency validations
    const idempotencyPayloadString = JSON.stringify({
      slug: projectSlug,
      stack: payload.techStack,
      workspace: payload.workspaceId,
    });

    const uniqueIdempotencyKey = crypto
      .createHash("sha256")
      .update(idempotencyPayloadString)
      .digest("hex");

    // Defensive Verification Circuit Breaker Check
    const redundantExecutionCheck = await db.query.provisioningJobs.findFirst({
      where: (j, { eq }) => eq(j.idempotencyKey, uniqueIdempotencyKey),
    });

    if (redundantExecutionCheck) {
      return {
        success: true,
        slug: projectSlug,
        message:
          "Idempotent Transaction Cache Intercepted. Duplicate task bypass engaged.",
      };
    }

    // 3. Initialize primary core project mappings
    const [newProject] = await db.insert(projects).values({
      workspaceId: payload.workspaceId,
      clientId: targetClient.id,
      name: payload.name,
      slug: projectSlug,
      status: "planning",
      paymentStatus: "pending",
      progressPercentage: 5,
    });

    // 4. Register automated background runner execution engine manifest job
    await db.insert(provisioningJobs).values({
      projectId: newProject.insertId,
      idempotencyKey: uniqueIdempotencyKey,
      status: "pending",
      manifest: {
        projectName: payload.name,
        slug: projectSlug,
        gitProvider: payload.gitProvider,
        techStack: payload.techStack,
        database: payload.database,
        auth: payload.auth,
        folderStructure: payload.folderStructure,
        deploymentTarget: payload.deploymentTarget,
        apiIntegration: payload.apiIntegration || false,
        features: payload.features,
        priority: payload.priority,
      },
    });

    // 5. Instantly notify orchestrator CLI daemon nodes via Redis PubSub matrix if online
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
