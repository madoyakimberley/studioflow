"use server";

import {
  db,
  workspaceEnvironments,
  siteMonitoring,
  projects,
} from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { enforceWorkspaceOwnership } from "@/lib/auth-barriers";
import { sendSystemAlertEmail } from "../lib/mailer";

// 1. SAVE DYNAMIC CONFIGURATION Matrix
export async function saveSmtpConfig(workspaceId: number, formData: FormData) {
  try {
    await enforceWorkspaceOwnership(workspaceId);

    const rawPass = formData.get("smtpPass") as string;

    const payload: any = {
      workspaceId,
      smtpHost: formData.get("smtpHost") as string,
      smtpPort: formData.get("smtpPort") as string,
      smtpUser: formData.get("smtpUser") as string,
      adminAlertEmail: formData.get("adminAlertEmail") as string,
      updatedAt: new Date(),
    };

    if (rawPass && !rawPass.startsWith("••••••••")) {
      payload.smtpPass = encryptSecret(rawPass);
    }

    const existingConfig = await db
      .select()
      .from(workspaceEnvironments)
      .where(eq(workspaceEnvironments.workspaceId, workspaceId))
      .then((res) => res[0]);

    if (existingConfig) {
      await db
        .update(workspaceEnvironments)
        .set(payload)
        .where(eq(workspaceEnvironments.workspaceId, workspaceId));
    } else {
      await db.insert(workspaceEnvironments).values(payload);
    }

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. DISPATCH LIVE SMTP TEST ROUTE
export async function testSmtpDispatch(workspaceId: number) {
  try {
    await enforceWorkspaceOwnership(workspaceId);

    const config = await db
      .select()
      .from(workspaceEnvironments)
      .where(eq(workspaceEnvironments.workspaceId, workspaceId))
      .then((res) => res[0]);

    if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
      throw new Error(
        "Config arrays incomplete. Save configuration nodes first.",
      );
    }

    const cleartextPassword = decryptSecret(config.smtpPass);

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort || "587"),
      secure: config.smtpPort === "465",
      auth: {
        user: config.smtpUser,
        pass: cleartextPassword,
      },
    });

    await transporter.sendMail({
      from: `"StudioFlow Engine Gateway" <${config.smtpUser}>`,
      to: config.adminAlertEmail || config.smtpUser,
      subject: "StudioFlow: Diagnostics Verification Pipeline Successful ✓",
      text: `Your dynamic configuration is active.\n\nWorkspace Vector: ${workspaceId}\nHost: ${config.smtpHost}\nTimestamp: ${new Date().toISOString()}`,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. FETCH HISTORICAL SYSTEM TELEMETRY LOGS DYNAMICALLY
export async function getLiveTelemetryLogs(workspaceId: number) {
  try {
    await enforceWorkspaceOwnership(workspaceId);

    const telemetryEntries = await db
      .select()
      .from(siteMonitoring)
      .orderBy(desc(siteMonitoring.checkedAt))
      .limit(10);

    return { success: true, logs: telemetryEntries };
  } catch (error: any) {
    return { success: false, error: error.message, logs: [] };
  }
}

// 4. INGEST LIVE TELEMETRY OUTAGE (NEW)
// Call this from your API Route, Cron Job, or Webhook when a ping fails
export async function ingestTelemetryOutage(
  projectId: number,
  statusCode: number,
  errorTrace: string,
) {
  try {
    // Look up the project to find the owner's workspaceId
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((res) => res[0]);

    if (!project) throw new Error("Target project node not found in registry.");

    // 1. Write the failure to the database so it appears on the UI
    await db.insert(siteMonitoring).values({
      projectId: project.id,
      isUp: false,
      statusCode,
      errorTrace,
      checkedAt: new Date(),
    });

    // 2. Fire the dynamic encrypted SMTP email directly to the developer
    await sendSystemAlertEmail({
      workspaceId: project.workspaceId,
      projectName: project.name,
      statusCode,
      errorTrace,
    });

    // Force UI cache update
    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    console.error("Ingestion failed:", error);
    return { success: false, error: error.message };
  }
}
