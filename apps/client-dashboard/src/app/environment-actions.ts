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

  // Appended configuration keys
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  adminAlertEmail: string;
}

export async function saveWorkspaceEnvironment(payload: EnvironmentPayload) {
  try {
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
          smtpHost: payload.smtpHost,
          smtpPort: payload.smtpPort,
          smtpUser: payload.smtpUser,
          smtpPass: payload.smtpPass,
          adminAlertEmail: payload.adminAlertEmail,
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
        smtpHost: payload.smtpHost,
        smtpPort: payload.smtpPort,
        smtpUser: payload.smtpUser,
        smtpPass: payload.smtpPass,
        adminAlertEmail: payload.adminAlertEmail,
      });
    }

    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Environment setup saved successfully.",
    };
  } catch (error: any) {
    console.error("❌ [ENVIRONMENT SYNC FAULT]:", error);
    return {
      success: false,
      message: error.message || "Failed to save infrastructure configuration.",
    };
  }
}
