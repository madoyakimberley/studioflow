"use server";

import { db, workspaceEnvironments, workspaces, users } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface EnvironmentPayload {
  workspaceId: number;
  databaseUrl: string;
  databaseEngine: string;
  databaseOrm: string;
  targetOutputDir: string;
  githubToken: string;
  deploymentProvider: string;
  deploymentApiKey: string;
  deploymentOwnerId: string;
  redisUrl: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  adminAlertEmail: string;
}

export async function saveWorkspaceEnvironment(payload: EnvironmentPayload) {
  try {
    // 1. Persist environment record
    const existingEnv = await db.query.workspaceEnvironments.findFirst({
      where: eq(workspaceEnvironments.workspaceId, payload.workspaceId),
    });

    if (existingEnv) {
      await db
        .update(workspaceEnvironments)
        .set({
          databaseUrl: payload.databaseUrl,
          databaseEngine: payload.databaseEngine,
          databaseOrm: payload.databaseOrm,
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
        databaseEngine: payload.databaseEngine,
        databaseOrm: payload.databaseOrm,
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

    // 2. Resolve the workspace owner and ensure a CLI token exists
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
          activeCliToken = ownerUser.cliToken;
        } else {
          const secureEntropy = crypto.randomUUID().replace(/-/g, "");
          activeCliToken = `sf_pat_${secureEntropy}`;

          await db
            .update(users)
            .set({ cliToken: activeCliToken })
            .where(eq(users.id, ownerUser.id));

          console.log(
            `🔄 [CLI TOKEN] Generated and saved for user ${ownerUser.username} (${ownerUser.id}) -> ${activeCliToken}`,
          );
        }
      } else {
        console.warn(
          `⚠️ [ENV SETUP] No owner found for workspace ${payload.workspaceId}`,
        );
      }
    } else {
      console.warn(`⚠️ [ENV SETUP] Workspace ${payload.workspaceId} not found`);
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

// ✅ NEW: Get workspace ID of authenticated user
export async function getCurrentWorkspaceId() {
  try {
    // Dynamically import to avoid circular dependency
    const { getVerifiedUserAndWorkspace } = await import("./action");
    const auth = await getVerifiedUserAndWorkspace();
    if (!auth.success || !auth.data) {
      return { success: false, workspaceId: null };
    }
    return { success: true, workspaceId: auth.data.workspaceId };
  } catch (error) {
    console.error("❌ Failed to get workspace ID:", error);
    return { success: false, workspaceId: null };
  }
}
