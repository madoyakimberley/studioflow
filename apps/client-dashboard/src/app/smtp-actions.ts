"use server";

import { db, workspaceEnvironments, siteMonitoring } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { enforceWorkspaceOwnership } from "@/lib/auth-barriers";

// 1. SAVE DYNAMIC CONFIGURATION Matrix
export async function saveSmtpConfig(workspaceId: number, formData: FormData) {
  try {
    // Application-level RLS Verification
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

    // Only update and encrypt password if a new value was typed in the field
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
    // Application-level RLS Verification
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

    // Decrypt the isolated credentials token dynamically
    const cleartextPassword = decryptSecret(config.smtpPass);

    // Initialize custom transient transport architecture
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

    // Fetch the 10 most recent checked records to populate our live logs dashboard area
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
