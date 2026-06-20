import { NextResponse } from "next/server";
import { db } from "@studioflow/db";

// Opt-out of Next.js aggressive route caching so the CLI always gets fresh keys
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized access: Bearer token is missing." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1].trim();

    // 1. Find User using Drizzle's callback syntax (prevents TS and aliasing errors)
    const linkedUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.cliToken, token),
    });

    if (!linkedUser) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: Token parity mismatch or invalidated credentials.",
        },
        { status: 401 },
      );
    }

    // 2. Resolve tenant workspace layer
    // NOTE: If users can own multiple workspaces in the future, this logic will need
    // to target a specific active workspace ID rather than just grabbing the first one.
    const linkedWorkspace = await db.query.workspaces.findFirst({
      where: (workspaces, { eq }) => eq(workspaces.ownerId, linkedUser.id),
    });

    if (!linkedWorkspace) {
      return NextResponse.json(
        { error: "Tenant Fault: No attached active workspace node." },
        { status: 404 },
      );
    }

    // 3. Resolve the environment config matrix
    const linkedEnv = await db.query.workspaceEnvironments.findFirst({
      where: (envs, { eq }) => eq(envs.workspaceId, linkedWorkspace.id),
    });

    if (!linkedEnv) {
      return NextResponse.json(
        {
          error:
            "Infrastructure Fault: Workspace environment has not been initialized.",
        },
        { status: 404 },
      );
    }

    // Secure payload construction
    const envPayload = {
      databaseUrl: linkedEnv.databaseUrl,
      databaseEngine: linkedEnv.databaseEngine, // Sync this too!
      databaseOrm: linkedEnv.databaseOrm,
      redisUrl: linkedEnv.redisUrl,
      githubToken: linkedEnv.githubToken,
      deploymentProvider: linkedEnv.deploymentProvider,
      deploymentApiKey: linkedEnv.deploymentApiKey,
      deploymentOwnerId: linkedEnv.deploymentOwnerId,
      smtpHost: linkedEnv.smtpHost,
      smtpPort: linkedEnv.smtpPort,
      smtpUser: linkedEnv.smtpUser,
      smtpPass: linkedEnv.smtpPass,
      adminAlertEmail: linkedEnv.adminAlertEmail,
      targetOutputDir: linkedEnv.targetOutputDir,
    };

    return NextResponse.json(envPayload, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ [CLI Sync Route Execution Fault]:", err);
    return NextResponse.json(
      { error: "Internal Server Fault during CLI handshake." },
      { status: 500 },
    );
  }
}
