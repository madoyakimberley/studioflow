"use server";

import { db, workspaceEnvironments, workspaces, users } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

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
    // 1. Persist or update the main infrastructure environment records
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

    // 2. Resolve token-provisioning context for CLI integration
    const targetWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, payload.workspaceId),
    });

    let activeCliToken = "";

    if (targetWorkspace) {
      const ownerUser = await db.query.users.findFirst({
        where: eq(users.id, targetWorkspace.ownerId),
      });

      if (ownerUser) {
        if (ownerUser.cliToken) {
          // Keep using their existing token so they don't have to re-login on their machine
          activeCliToken = ownerUser.cliToken;
        } else {
          // Generate an elegant, highly identifiable personal access token string
          const secureEntropy = crypto.randomBytes(24).toString("hex");
          activeCliToken = `sf_pat_${secureEntropy}`;

          await db
            .update(users)
            .set({ cliToken: activeCliToken })
            .where(eq(users.id, ownerUser.id));
        }
      }
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Environment setup saved successfully.",
      cliToken: activeCliToken,
    };
  } catch (error: any) {
    console.error("❌ [ENVIRONMENT SYNC FAULT]:", error);
    return {
      success: false,
      message: error.message || "Failed to save infrastructure configuration.",
      cliToken: "",
    };
  }
}
