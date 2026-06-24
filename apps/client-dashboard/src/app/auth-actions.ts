"use server";

import { db, users, workspaces, workspaceEnvironments } from "@studioflow/db";
import { eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { getVerifiedUserAndWorkspace } from "./action";

// ==========================================
// Password Hashing
// ==========================================
function secureHashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || "studioflow_fallback_system_guard_salt";
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// ==========================================
// Types
// ==========================================
interface LoginPayload {
  identity: string;
  password: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  name: string;
  password: string;
  workspaceName: string;
}

// ==========================================
// Registration
// ==========================================
export async function registerUser(payload: RegisterPayload) {
  try {
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.email, payload.email.trim().toLowerCase()),
        eq(users.username, payload.username.trim().toLowerCase()),
      ),
    });

    if (existingUser) {
      return {
        success: false,
        message: "Ingress Failure: Username or email handle already allocated.",
      };
    }

    const userId = crypto.randomUUID();
    const computedHash = secureHashPassword(payload.password);
    const workspaceSlug = payload.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const finalWorkspaceId = await db.transaction(async (tx) => {
      // Ensure the workspace_environments table exists (safe)
      await tx.execute(`
        CREATE TABLE IF NOT EXISTS workspace_environments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          workspace_id INT NOT NULL UNIQUE,
          database_url TEXT,
          database_engine VARCHAR(50) DEFAULT 'postgresql',
          database_orm VARCHAR(50) DEFAULT 'drizzle',
          redis_url TEXT,
          target_output_dir VARCHAR(255) DEFAULT '~/StudioFlow/projects',
          github_token TEXT,
          deployment_provider VARCHAR(50) DEFAULT 'none',
          deployment_api_key TEXT,
          deployment_owner_id VARCHAR(255),
          smtp_host VARCHAR(255),
          smtp_port VARCHAR(50),
          smtp_user VARCHAR(255),
          smtp_pass TEXT,
          admin_alert_email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await tx.insert(users).values({
        id: userId,
        username: payload.username.trim().toLowerCase(),
        email: payload.email.trim().toLowerCase(),
        name: payload.name.trim(),
        passwordHash: computedHash,
      });

      const [workspaceResult] = await tx.insert(workspaces).values({
        ownerId: userId,
        name: payload.workspaceName.trim(),
        slug: `${workspaceSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      const newWorkspaceId = Number(workspaceResult.insertId);

      // Insert a row with default values
      await tx.insert(workspaceEnvironments).values({
        workspaceId: Number(newWorkspaceId),
        databaseUrl: null,
        githubToken: null,
        targetOutputDir: "~/StudioFlow/projects",
      } as any);

      return newWorkspaceId;
    });

    // Build session token and redirect URL
    const randomEntropySegment = Math.floor(100000 + Math.random() * 900000);
    const sessionToken = `dev_${finalWorkspaceId}_${randomEntropySegment}`;
    const targetGatewayUrl = `/auth-gate?token=${sessionToken}&user=${payload.username.trim().toLowerCase()}&onboard=true`;

    return {
      success: true,
      message: "Session token parity verified. Pipeline initialized.",
      token: sessionToken,
      redirectUrl: targetGatewayUrl,
      username: payload.username,
    };
  } catch (error: any) {
    console.error("❌ [CRITICAL REGISTRATION EXCEPTION]:", error);
    return {
      success: false,
      message:
        error.message || "Authentication gateway subsystem error encountered.",
    };
  }
}

// ==========================================
// Login
// ==========================================
export async function loginUser(payload: LoginPayload) {
  try {
    const computedHash = secureHashPassword(payload.password);

    const userRecord = await db.query.users.findFirst({
      where: or(
        eq(users.email, payload.identity.trim().toLowerCase()),
        eq(users.username, payload.identity.trim().toLowerCase()),
      ),
    });

    if (!userRecord || userRecord.passwordHash !== computedHash) {
      return {
        success: false,
        message:
          "Ingress Failure: Invalid profile identifier or credential match.",
      };
    }

    const activeWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, userRecord.id),
    });

    if (!activeWorkspace) {
      return {
        success: false,
        message:
          "Isolation Hazard: Profile verified but missing workspace node.",
      };
    }

    // Check if environment is configured (row exists and databaseUrl is not null)
    const envCheck = await db.query.workspaceEnvironments.findFirst({
      where: eq(workspaceEnvironments.workspaceId, activeWorkspace.id),
    });

    const needsOnboarding = envCheck && envCheck.databaseUrl ? "false" : "true";

    const randomEntropySegment = Math.floor(100000 + Math.random() * 900000);
    const sessionToken = `dev_${activeWorkspace.id}_${randomEntropySegment}`;

    return {
      success: true,
      message: "Session token parity verified.",
      token: sessionToken,
      redirectUrl: `/auth-gate?token=${sessionToken}&user=${userRecord.username}&onboard=${needsOnboarding}`,
      username: userRecord.username,
    };
  } catch (error: any) {
    console.error("❌ [CRITICAL LOGIN EXCEPTION]:", error);
    return {
      success: false,
      message:
        error.message || "Authentication gateway subsystem error encountered.",
    };
  }
}

// ==========================================
// REGENERATE CLI TOKEN
// ==========================================
export async function regenerateCliToken(workspaceId: number) {
  try {
    const auth = await getVerifiedUserAndWorkspace();
    if (!auth.success || !auth.data) {
      return { success: false, error: "Unauthorized" };
    }
    if (auth.data.workspaceId !== workspaceId) {
      return { success: false, error: "You don't own this workspace." };
    }

    const secureEntropy = crypto.randomUUID().replace(/-/g, "");
    const newToken = `sf_pat_${secureEntropy}`;

    await db
      .update(users)
      .set({
        cliToken: newToken,
      })
      .where(eq(users.id, auth.data.userId));

    revalidatePath(`/dashboard/${auth.data.userSlug}/configs`);
    return { success: true, token: newToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
