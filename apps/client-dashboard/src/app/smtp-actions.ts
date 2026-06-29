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
import { getTenantDb } from "@/lib/tenant-db";

// ==========================================
// 1. SAVE DYNAMIC SMTP CONFIGURATION
// ==========================================
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
    console.error("❌ [SMTP CONFIG UPDATE FAULT]:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 2. TEST SMTP CONNECTION
// ==========================================
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
        "SMTP configuration is incomplete. Please save settings first.",
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
      subject: "StudioFlow: SMTP Diagnostics Verification Successful ✓",
      text: `Your SMTP configuration is working correctly.\n\nWorkspace: ${workspaceId}\nHost: ${config.smtpHost}\nTimestamp: ${new Date().toISOString()}`,
    });

    return { success: true, message: "Test email sent successfully!" };
  } catch (error: any) {
    console.error("❌ [SMTP TEST FAILED]:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3A. FETCH PROJECT TELEMETRY LOGS (Tenant-Aware) - New Version
// ==========================================
export async function getProjectTelemetryLogs(projectId: number) {
  try {
    const project = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((res) => res[0]);

    if (!project || !project.workspaceId) {
      return { success: false, error: "Project not found.", logs: [] };
    }

    const tenantDb = await getTenantDb(project.workspaceId);

    const telemetryEntries = await tenantDb
      .select()
      .from(siteMonitoring)
      .where(eq(siteMonitoring.projectId, projectId))
      .orderBy(desc(siteMonitoring.checkedAt))
      .limit(10);

    return { success: true, logs: telemetryEntries };
  } catch (error: any) {
    console.error("❌ [TELEMETRY FETCH ERROR]:", error);
    return { success: false, error: error.message, logs: [] };
  }
}

// ==========================================
// 3B. FETCH HISTORICAL SYSTEM TELEMETRY LOGS (Kept for backward compatibility)
// ==========================================
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
    console.error("❌ [LIVE TELEMETRY FETCH ERROR]:", error);
    return { success: false, error: error.message, logs: [] };
  }
}

// ==========================================
// 4A. INGEST LIVE TELEMETRY OUTAGE (Tenant-Aware)
// ==========================================
export async function ingestTelemetryOutage(
  projectId: number,
  statusCode: number,
  errorTrace: string,
) {
  try {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((res) => res[0]);

    if (!project || !project.workspaceId) {
      throw new Error("Target project node not found in registry.");
    }

    const tenantDb = await getTenantDb(project.workspaceId);

    await tenantDb.insert(siteMonitoring).values({
      projectId: project.id,
      isUp: false,
      statusCode,
      errorTrace,
      checkedAt: new Date(),
    });

    await sendSystemAlertEmail({
      workspaceId: project.workspaceId,
      projectName: project.name,
      statusCode,
      errorTrace,
    });

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ [TELEMETRY INGESTION FAULT]:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 4B. LEGACY INGEST TELEMETRY OUTAGE (Kept for compatibility)
// ==========================================
export async function ingestTelemetryOutageLegacy(
  projectId: number,
  statusCode: number,
  errorTrace: string,
) {
  try {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .then((res) => res[0]);

    if (!project) throw new Error("Target project node not found in registry.");

    await db.insert(siteMonitoring).values({
      projectId: project.id,
      isUp: false,
      statusCode,
      errorTrace,
      checkedAt: new Date(),
    });

    await sendSystemAlertEmail({
      workspaceId: project.workspaceId,
      projectName: project.name,
      statusCode,
      errorTrace,
    });

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    console.error("Ingestion failed:", error);
    return { success: false, error: error.message };
  }
}
