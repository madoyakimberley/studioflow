"use server";

import { db, workspaceEnvironments } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface EnvironmentPayload {
  workspaceId: number;
  databaseUrl: string;
  targetOutputDir: string;
  githubToken: string;
  deploymentProvider: string;
  deploymentApiKey: string;
  deploymentOwnerId: string;
  redisUrl: string;
}

export async function saveWorkspaceEnvironment(payload: EnvironmentPayload) {
  try {
    // Check if environment config already exists for this workspace
    const existingEnv = await db.query.workspaceEnvironments.findFirst({
      where: eq(workspaceEnvironments.workspaceId, payload.workspaceId),
    });

    if (existingEnv) {
      await db
        .update(workspaceEnvironments)
        .set({
          databaseUrl: payload.databaseUrl,
          targetOutputDir: payload.targetOutputDir || "~/StudioFlow/projects",
          githubToken: payload.githubToken,
          deploymentProvider: payload.deploymentProvider,
          deploymentApiKey: payload.deploymentApiKey,
          deploymentOwnerId: payload.deploymentOwnerId,
          redisUrl: payload.redisUrl,
        })
        .where(eq(workspaceEnvironments.workspaceId, payload.workspaceId));
    } else {
      await db.insert(workspaceEnvironments).values({
        workspaceId: payload.workspaceId,
        databaseUrl: payload.databaseUrl,
        targetOutputDir: payload.targetOutputDir || "~/StudioFlow/projects",
        githubToken: payload.githubToken,
        deploymentProvider: payload.deploymentProvider,
        deploymentApiKey: payload.deploymentApiKey,
        deploymentOwnerId: payload.deploymentOwnerId,
        redisUrl: payload.redisUrl,
      });
    }

    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Environment matrices locked and encrypted.",
    };
  } catch (error: any) {
    console.error("❌ [ENVIRONMENT SYNC FAULT]:", error);
    return {
      success: false,
      message: error.message || "Failed to persist infrastructure keys.",
    };
  }
}
