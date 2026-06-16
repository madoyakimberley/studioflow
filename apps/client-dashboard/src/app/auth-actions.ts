"use server";

import { db, users, workspaces, workspaceEnvironments } from "@studioflow/db";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";

function secureHashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || "studioflow_fallback_system_guard_salt";
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

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

/**
 * Provisions a tenant profile, workspace, and environment settings atomically.
 */
export async function registerUser(payload: RegisterPayload) {
  try {
    // 1. Ensure username or email is not already registered
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

    // 2. Atomic Transaction to seed user, workspace, and environment settings
    const finalWorkspaceId = await db.transaction(async (tx) => {
      // Persist user
      await tx.insert(users).values({
        id: userId,
        username: payload.username.trim().toLowerCase(),
        email: payload.email.trim().toLowerCase(),
        name: payload.name.trim(),
        passwordHash: computedHash,
      });

      // Seed workspace
      const [workspaceResult] = await tx.insert(workspaces).values({
        ownerId: userId,
        name: payload.workspaceName.trim(),
        slug: `${workspaceSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
      });

      const newWorkspaceId = Number(workspaceResult.insertId);

      // Initialize workspace environment record
      await tx.insert(workspaceEnvironments).values({
        workspaceId: Number(newWorkspaceId),
        envVars: {},
      } as any);

      return newWorkspaceId;
    });

    // 3. Build session token
    const randomEntropySegment = Math.floor(100000 + Math.random() * 900000);
    const sessionToken = `dev_${finalWorkspaceId}_${randomEntropySegment}`;

    // New users always need onboarding
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

/**
 * Validates credentials and handles dynamic redirection pass-through tokens.
 */
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

    // Check if the environment has been configured to determine onboarding status
    const envCheck = await db.query.workspaceEnvironments.findFirst({
      where: eq(workspaceEnvironments.workspaceId, activeWorkspace.id),
    });

    const needsOnboarding = envCheck ? "false" : "true";

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
