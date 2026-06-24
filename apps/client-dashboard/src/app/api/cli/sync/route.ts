import { NextResponse } from "next/server";
import { db } from "@studioflow/db";
import { eq } from "drizzle-orm";

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

    // 1. Find User by cliToken
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

    // ✅ Expiry check removed – we'll add it later

    // 2. Resolve tenant workspace
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

    const envConfigured = !!(linkedEnv?.databaseUrl && linkedEnv?.githubToken);

    const envPayload = {
      workspaceId: linkedWorkspace.id,
      databaseUrl: linkedEnv?.databaseUrl || "",
      databaseEngine: linkedEnv?.databaseEngine || "postgresql",
      databaseOrm: linkedEnv?.databaseOrm || "drizzle",
      redisUrl: linkedEnv?.redisUrl || "",
      githubToken: linkedEnv?.githubToken || "",
      deploymentProvider: linkedEnv?.deploymentProvider || "none",
      deploymentApiKey: linkedEnv?.deploymentApiKey || "",
      deploymentOwnerId: linkedEnv?.deploymentOwnerId || "",
      smtpHost: linkedEnv?.smtpHost || "",
      smtpPort: linkedEnv?.smtpPort || "587",
      smtpUser: linkedEnv?.smtpUser || "",
      smtpPass: linkedEnv?.smtpPass || "",
      adminAlertEmail: linkedEnv?.adminAlertEmail || "",
      targetOutputDir: linkedEnv?.targetOutputDir || "~/StudioFlow/projects",
      envConfigured,
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
