"use server";

import nodemailer from "nodemailer";
import { db, workspaceEnvironments } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";

// ==========================================
// --- MAILER CONFIGURATION & TEMPLATES ---
// ==========================================

// 1. NEW: Dynamic Multi-Tenant Transporter
async function createDynamicTransporter(workspaceId: number) {
  const config = await db
    .select()
    .from(workspaceEnvironments)
    .where(eq(workspaceEnvironments.workspaceId, workspaceId))
    .then((res) => res[0]);

  if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error(
      `SMTP configuration missing or incomplete for workspace ${workspaceId}`,
    );
  }

  const cleartextPassword = decryptSecret(config.smtpPass);

  return {
    transporter: nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort || "587"),
      secure: config.smtpPort === "465",
      auth: {
        user: config.smtpUser,
        pass: cleartextPassword,
      },
    }),
    senderEmail: config.smtpUser,
    adminAlertEmail: config.adminAlertEmail || config.smtpUser,
  };
}

// Fallback for generic portal emails if no workspace config is defined yet
function createFallbackTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525"),
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

interface AlertEmailPayload {
  workspaceId: number; // NEW: Required to fetch dynamic credentials
  projectName: string;
  statusCode: number | null;
  errorTrace: string | null;
}

interface PortalCodePayload {
  clientEmail: string;
  projectName: string;
  securePin: string;
}

interface PortalWelcomePayload {
  clientEmail: string;
  projectName: string;
  portalLink: string;
  securePin: string;
}

export async function sendSystemAlertEmail(payload: AlertEmailPayload) {
  try {
    // Dynamically boot the transport based on the workspace ID
    const { transporter, senderEmail, adminAlertEmail } =
      await createDynamicTransporter(payload.workspaceId);

    const mailOptions = {
      from: `"StudioFlow Core" <${senderEmail}>`,
      to: adminAlertEmail,
      subject: `🚨 CRITICAL ALERT: Outage Detected on [${payload.projectName}]`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: var(--bg-surface); color: var(--text-main);">
          <h2 style="color: var(--color-theme-secondary); border-bottom: 1px solid var(--border-outline); padding-bottom: 10px;">StudioFlow Incident Response</h2>
          <p><strong>Target Node Instance:</strong> ${payload.projectName}</p>
          <p><strong>HTTP Status Code:</strong> ${payload.statusCode || "UNKNOWN"}</p>
          <div style="background-color: var(--bg-surface); padding: 15px; border-radius: 8px; border-left: 4px solid var(--color-danger); font-family: monospace; margin-top: 15px;">
            <strong>Error Stack Trace:</strong><br/>
            <pre style="white-space: pre-wrap; margin-top: 5px; color: var(--color-danger);">${payload.errorTrace || "No trace dumped."}</pre>
          </div>
        </div>
      `,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(
      "🚨 [SMTP GATEWAY FAILURE]: Could not dispatch alert.",
      error,
    );
    return false;
  }
}

export async function sendPortalAccessCodeEmail(payload: PortalCodePayload) {
  const transporter = createFallbackTransporter();
  const systemSender =
    process.env.SMTP_FROM_EMAIL ||
    `"StudioFlow Delivery" <delivery@studioflow.dev>`;

  const mailOptions = {
    from: systemSender,
    to: payload.clientEmail,
    subject: `🔑 Secure Access Passcode for ${payload.projectName} Shared Portal`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: var(--bg-main); color: var(--text-main); max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
        <h2 style="font-size: 20px; color: var(--color-theme-primary); margin-bottom: 4px; font-weight: 600;">Secure Portal Authorization Request</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; margin-bottom: 24px;">StudioFlow Verification Gateway Infrastructure</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: var(--text-muted);">A request was made to unlock the shared interactive workspace for project <strong>${payload.projectName}</strong>.</p>
        
        <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 20px; border-radius: 8px; text-align: center; margin: 28px 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-muted); display: block; margin-bottom: 8px;">Single-Use Access Pin</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 34px; font-weight: 700; color: var(--color-theme-secondary); letter-spacing: 0.2em; display: inline-block; padding-left: 0.2em;">${payload.securePin}</span>
        </div>
        
        <p style="font-size: 11px; color: var(--text-muted); line-height: 1.5;">This verification pin is locked to your email address and remains valid for <strong>15 minutes</strong>. If you did not trigger this request, safely discard this record.</p>
        <div style="border-top: 1px solid rgba(175, 186, 255, 0.08); margin-top: 32px; padding-top: 16px; text-align: center; font-size: 10px; color: var(--text-muted);">
          Powered securely via StudioFlow Universal Telemetry Clusters.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendPortalWelcomeEmail(payload: PortalWelcomePayload) {
  const transporter = createFallbackTransporter();
  const systemSender =
    process.env.SMTP_FROM_EMAIL ||
    `"StudioFlow Delivery" <delivery@studioflow.dev>`;

  const mailOptions = {
    from: systemSender,
    to: payload.clientEmail,
    subject: `🔮 Your Client Portal Access - ${payload.projectName}`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: var(--bg-main); color: var(--text-main); max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
        <h2 style="font-size: 20px; color: var(--color-theme-primary); margin-bottom: 4px; font-weight: 600;">Welcome to your StudioFlow Portal</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 0; margin-bottom: 24px;">StudioFlow Onboarding Infrastructure Gateway</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: var(--text-muted);">Your dedicated interactive client workspace for project <strong>${payload.projectName}</strong> has been provisioned and is ready for secure engagement.</p>
        <p style="font-size: 14px; line-height: 1.6; color: var(--text-muted);">You can view and upload project assets, track pipeline updates, and chat with engineering teams directly inside your workspace console:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${payload.portalLink}" style="display: inline-block; padding: 12px 28px; background-color: var(--color-theme-primary); color: var(--bg-main); text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(218, 197, 255, 0.15);">Access Secure Portal</a>
        </div>
        
        <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 16px; border-radius: 8px; text-align: center; margin: 28px 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-muted); display: block; margin-bottom: 8px;">Your 6-Digit Auto-Login Pin</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: var(--color-theme-secondary); letter-spacing: 0.2em;">${payload.securePin}</span>
        </div>

        <p style="font-size: 11px; color: var(--text-muted); line-height: 1.5;">Clicking the link above will automatically apply your pin. If you are prompted manually, use the code provided.</p>
        <div style="border-top: 1px solid rgba(175, 186, 255, 0.08); margin-top: 32px; padding-top: 16px; text-align: center; font-size: 10px; color: var(--text-muted);">
          Powered securely via StudioFlow Universal Telemetry Clusters.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
