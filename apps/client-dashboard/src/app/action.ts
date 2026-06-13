"use server";

import { db, projects, provisioningJobs, clients } from "@studioflow/db";
import { revalidatePath } from "next/cache";
import Redis from "ioredis";

// Initialize Redis client to signal the daemon
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

export interface ProjectManifestPayload {
  name: string;
  clientName: string;
  brief?: string;
  database: string;
  auth: string;
  storage: string;
  features: string[];
  priority: "STANDARD" | "PRIORITY" | "CRITICAL";
  apiIntegration?: boolean;
}

export async function queueProjectProvisioning(
  payload: ProjectManifestPayload,
) {
  try {
    // 1. Ensure a default operating client registry exists
    let targetClient = await db.query.clients.findFirst({
      where: (c, { eq }) => eq(c.email, "internal@studioflow.io"),
    });

    if (!targetClient) {
      const [insertedClient] = await db.insert(clients).values({
        name: payload.clientName || "Internal Studio",
        email: "internal@studioflow.io",
        company: payload.clientName || "StudioFlow Workspace",
        onboardingCompleted: true,
      });

      targetClient = {
        id: insertedClient.insertId,
        name: payload.clientName,
        email: "internal@studioflow.io",
        company: payload.clientName,
        onboardingCompleted: true,
        createdAt: new Date(),
      };
    }

    // 2. Generate systematic directory slug
    const projectSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // 3. Register tracking metric inside main projects schema
    const [newProject] = await db.insert(projects).values({
      clientId: targetClient.id,
      name: payload.name,
      slug: projectSlug,
      status: "planning",
      paymentStatus: "pending",
      progressPercentage: 10,
    });

    // 4. Serialize into execution manifest queue (FLATTENED INFRASTRUCTURE)
    await db.insert(provisioningJobs).values({
      projectId: newProject.insertId,
      status: "pending",
      manifest: {
        projectName: payload.name,
        slug: projectSlug,
        techStack: "nextjs",
        apiIntegration: payload.apiIntegration || false,
        database: payload.database, // Moved to root for daemon parity
        auth: payload.auth, // Moved to root for daemon parity
        storage: payload.storage, // Moved to root for daemon parity
        features: payload.features,
        priority: payload.priority,
      },
    });

    // 5. TRIGGER THE DAEMON: Publish to Redis so index.js wakes up
    await redis.publish(
      "provisioning_queue",
      JSON.stringify({ event: "NEW_JOB", slug: projectSlug }),
    );

    revalidatePath("/");
    return { success: true, slug: projectSlug };
  } catch (error: any) {
    console.error("Failed to queue system job:", error);
    return { success: false, error: error.message };
  }
}
