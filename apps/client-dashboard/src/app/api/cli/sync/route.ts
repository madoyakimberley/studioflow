// app/api/cli/sync/route.ts
import { NextResponse } from "next/server";
import { db } from "@studioflow/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1].trim();

    const linkedUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.cliToken, token),
    });
    if (!linkedUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const linkedWorkspace = await db.query.workspaces.findFirst({
      where: (workspaces, { eq }) => eq(workspaces.ownerId, linkedUser.id),
    });
    if (!linkedWorkspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const linkedEnv = await db.query.workspaceEnvironments.findFirst({
      where: (envs, { eq }) => eq(envs.workspaceId, linkedWorkspace.id),
    });

    const queueDbUrl = process.env.DATABASE_URL || "";
    const tenantDbUrl = linkedEnv?.databaseUrl || "";
    const envConfigured = !!(linkedEnv?.databaseUrl && linkedEnv?.githubToken);

    return NextResponse.json(
      {
        workspaceId: linkedWorkspace.id,
        queueDatabaseUrl: queueDbUrl,
        tenantDatabaseUrl: tenantDbUrl,
        databaseEngine: linkedEnv?.databaseEngine || "mysql",
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
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("❌ [CLI Sync Error]:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
