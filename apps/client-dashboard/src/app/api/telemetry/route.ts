import { NextResponse } from "next/server";
import { db, siteMonitoring, projects } from "@studioflow/db";
import { eq } from "drizzle-orm";
// Adjust this import path so it properly points to your mailer!
import { sendSystemAlertEmail } from "../../../lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Map to the exact payload sent by the telemetry scripts
    const { projectSlug, payload } = body;

    if (!projectSlug) {
      return NextResponse.json(
        { success: false, error: "Missing projectSlug" },
        { status: 400 },
      );
    }

    // Look up the project by SLUG
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, projectSlug))
      .then((res) => res[0]);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Target project node not found." },
        { status: 404 },
      );
    }

    const statusCode = payload?.statusCode || 500;
    const errorTrace = payload?.message || "Unknown Error";

    // 1. Write the failure to the database
    await db.insert(siteMonitoring).values({
      projectId: project.id,
      isUp: false,
      statusCode: statusCode,
      errorTrace: errorTrace,
      checkedAt: new Date(),
    });

    // 2. Fire the dynamic encrypted SMTP email (Wrapped in try/catch to survive the stress test)
    try {
      await sendSystemAlertEmail({
        workspaceId: project.workspaceId,
        projectName: project.name,
        statusCode: statusCode,
        errorTrace: errorTrace,
      });
    } catch (mailError) {
      console.warn(
        `[MAILER RATE LIMIT]: Could not send email for ${project.name}, but DB ingestion succeeded.`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Outage logged and alert dispatched.",
    });
  } catch (error: any) {
    console.error("🚨 [TELEMETRY INGESTION FAILED]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
