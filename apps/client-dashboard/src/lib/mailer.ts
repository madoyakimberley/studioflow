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
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: #0c0f16; color: #e0e2ec; max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
          <h2 style="font-size: 20px; color: #dac5ff; margin-bottom: 4px; font-weight: 600; border-bottom: 1px solid rgba(175, 186, 255, 0.1); padding-bottom: 10px;">StudioFlow Incident Response</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #c6c5d1;"><strong>Target Node Instance:</strong> ${payload.projectName}</p>
          <p style="font-size: 14px; line-height: 1.6; color: #c6c5d1;"><strong>HTTP Status Code:</strong> ${payload.statusCode || "UNKNOWN"}</p>
          <div style="background: rgba(20, 24, 36, 0.5); padding: 16px; border-radius: 8px; border: 1px solid rgba(175, 186, 255, 0.15); border-left: 4px solid #ef4444; margin-top: 28px;">
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; display: block; margin-bottom: 8px;">Error Stack Trace</span>
            <pre style="font-family: 'JetBrains Mono', monospace; white-space: pre-wrap; margin-top: 5px; color: #ef4444; font-size: 12px; line-height: 1.5;">${payload.errorTrace || "No trace dumped."}</pre>
          </div>
          <div style="border-top: 1px solid rgba(175, 186, 255, 0.08); margin-top: 32px; padding-top: 16px; text-align: center; font-size: 10px; color: #64748b;">
            Powered securely via StudioFlow Universal Telemetry Clusters.
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
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: #0c0f16; color: #e0e2ec; max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
        <h2 style="font-size: 20px; color: #dac5ff; margin-bottom: 4px; font-weight: 600;">Secure Portal Authorization Request</h2>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 0; margin-bottom: 24px;">StudioFlow Verification Gateway Infrastructure</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #c6c5d1;">A request was made to unlock the shared interactive workspace for project <strong>${payload.projectName}</strong>.</p>
        
        <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 20px; border-radius: 8px; text-align: center; margin: 28px 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; display: block; margin-bottom: 8px;">Single-Use Access Pin</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 34px; font-weight: 700; color: #e8b3ff; letter-spacing: 0.2em; display: inline-block; padding-left: 0.2em;">${payload.securePin}</span>
        </div>
        
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">This verification pin is locked to your email address and remains valid for <strong>15 minutes</strong>. If you did not trigger this request, safely discard this record.</p>
        <div style="border-top: 1px solid rgba(175, 186, 255, 0.08); margin-top: 32px; padding-top: 16px; text-align: center; font-size: 10px; color: #64748b;">
          Powered securely via StudioFlow Universal Telemetry Clusters.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendPortalWelcomeEmail(payload: PortalWelcomePayload) {
  // 🚀 SPECIFICALLY USE RESEND FOR PORTAL LINKS
  const resendTransporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true, // Required for port 465 to bypass cloud blocks
    auth: {
      user: "resend", // Resend explicitly requires the username to be "resend"
      pass: process.env.RESEND_API_KEY, // 🌟 EXPLICITLY USING YOUR RESEND API KEY
    },
  });

  // Use your verified domain, or the default Resend testing email
  const systemSender =
    process.env.SMTP_FROM_EMAIL ||
    `"StudioFlow Delivery" <onboarding@resend.dev>`;

  const mailOptions = {
    from: systemSender,
    to: payload.clientEmail,
    subject: `🚀 Ready for Launch: Your Interactive Portal for ${payload.projectName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #030712; color: #f8fafc; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.02em;">StudioFlow</h1>
          <div style="height: 2px; width: 40px; background-color: #dac5ff; margin: 16px auto 0;"></div>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px;">Hello,</p>
        
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px;">Your interactive project portal for <strong>${payload.projectName}</strong> has been provisioned and is ready for access. You can use this secure gateway to monitor deployment metrics, approve features, and communicate directly with your workspace console:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${payload.portalLink}" style="display: inline-block; padding: 12px 28px; background-color: #dac5ff; color: #030712; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(218, 197, 255, 0.15);">Access Secure Portal</a>
        </div>
        
        <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 16px; border-radius: 8px; text-align: center; margin: 28px 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; display: block; margin-bottom: 8px;">Your 6-Digit Auto-Login Pin</span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: #e8b3ff; letter-spacing: 0.2em;">${payload.securePin}</span>
        </div>
        
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px;">
          This is a secure, single-use dispatch. If you did not request this link, please disregard this transmission.<br><br>
          Powered by StudioFlow Infrastructure
        </p>
      </div>
    `,
  };

  try {
    await resendTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("❌ Resend Delivery Error:", error);
    throw error; // Let the action catch block handle the failure
  }
}
