"use server";

import nodemailer from "nodemailer";
import { db, workspaceEnvironments } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";

// ==========================================
// --- MAILER CONFIGURATION & TEMPLATES ---
// ==========================================

// 1. Dynamic Multi-Tenant Transporter (For custom developer/workspace setups)
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

// 2. Primary Platform Transporter (Loads directly from your .env.local)
function createFallbackTransporter() {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const isSecure = port === 465;

  console.log("\n📬 NODEMAILER: Connecting via .env.local SMTP credentials...");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

// 3. Premium High-Resilience Pipeline (Reserved strictly for Premium Tier delivery)
async function tryHttpsDelivery(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ PREMIUM MAILER: Resend API Key missing. Reverting route.");
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    console.log(
      "⚡ PREMIUM MAILER: Firing high-resilience Resend HTTPS infrastructure...",
    );
    const systemSender =
      process.env.SMTP_FROM_EMAIL ||
      "StudioFlow Premium <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: systemSender,
        to: [to],
        subject: subject,
        html: html,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(
      "⚠️ PREMIUM MAILER: API pipeline stalled or dropped. Falling back to SMTP.",
    );
    return false;
  }
}

// ==========================================
// --- INTERFACES & PAYLOAD MATRICES ---
// ==========================================

interface AlertEmailPayload {
  workspaceId: number;
  projectName: string;
  statusCode: number | null;
  errorTrace: string | null;
}

interface PortalCodePayload {
  clientEmail: string;
  projectName: string;
  securePin: string;
  isPremium?: boolean; // ✨ Future-proof switch for routing
}

interface PortalWelcomePayload {
  clientEmail: string;
  projectName: string;
  portalLink: string;
  securePin: string;
  isPremium?: boolean; // ✨ Future-proof switch for routing
}

// ==========================================
// --- CORE DISPATCH ENGINES ---
// ==========================================

export async function sendSystemAlertEmail(payload: AlertEmailPayload) {
  try {
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
  const subject = `🔑 Secure Access Passcode for ${payload.projectName} Shared Portal`;
  const htmlTemplate = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: #0c0f16; color: #e0e2ec; max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
      <h2 style="font-size: 20px; color: #dac5ff; margin-bottom: 4px; font-weight: 600;">Secure Portal Authorization Request</h2>
      <p style="font-size: 13px; color: #94a3b8; margin-top: 0; margin-bottom: 24px;">StudioFlow Verification Gateway Infrastructure</p>
      <p style="font-size: 14px; line-height: 1.6; color: #c6c5d1;">A request was made to unlock the shared interactive workspace for project <strong>${payload.projectName}</strong>.</p>
      <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 20px; border-radius: 8px; text-align: center; margin: 28px 0;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; display: block; margin-bottom: 8px;">Single-Use Access Pin</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 34px; font-weight: 700; color: #e8b3ff; letter-spacing: 0.2em; display: inline-block; padding-left: 0.2em;">${payload.securePin}</span>
      </div>
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">This verification pin is locked to your email address and remains valid for 15 minutes.</p>
    </div>
  `;

  // 🌟 STRATEGY 1: Route premium users directly through Resend's HTTPS API
  if (payload.isPremium) {
    const apiSuccess = await tryHttpsDelivery(
      payload.clientEmail,
      subject,
      htmlTemplate,
    );
    if (apiSuccess) return true;
  }

  // 🌟 STRATEGY 2: Default pipeline (Nodemailer using your .env.local credentials)
  const transporter = createFallbackTransporter();
  const systemSender =
    process.env.SMTP_FROM_EMAIL ||
    `"StudioFlow Delivery" <delivery@studioflow.dev>`;

  return transporter.sendMail({
    from: systemSender,
    to: payload.clientEmail,
    subject: subject,
    html: htmlTemplate,
  });
}

export async function sendPortalWelcomeEmail(payload: PortalWelcomePayload) {
  const subject = `🔮 Your Client Portal Access - ${payload.projectName}`;
  const htmlTemplate = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 32px; background-color: #0c0f16; color: #e0e2ec; max-width: 550px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(175, 186, 255, 0.1);">
      <h2 style="font-size: 20px; color: #dac5ff; margin-bottom: 4px; font-weight: 600;">Welcome to your StudioFlow Portal</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #c6c5d1;">Your dedicated interactive client workspace for project <strong>${payload.projectName}</strong> has been provisioned and is ready.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${payload.portalLink}" style="display: inline-block; padding: 12px 28px; background-color: #dac5ff; color: #030712; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Access Secure Portal</a>
      </div>
      <div style="background: rgba(20, 24, 36, 0.5); border: 1px solid rgba(175, 186, 255, 0.15); padding: 16px; border-radius: 8px; text-align: center; margin: 28px 0;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; display: block; margin-bottom: 8px;">Your 6-Digit Auto-Login Pin</span>
        <span style="font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: #e8b3ff; letter-spacing: 0.2em;">${payload.securePin}</span>
      </div>
    </div>
  `;

  // 🌟 STRATEGY 1: Route premium users directly through Resend's HTTPS API
  if (payload.isPremium) {
    const apiSuccess = await tryHttpsDelivery(
      payload.clientEmail,
      subject,
      htmlTemplate,
    );
    if (apiSuccess) return true;
  }

  // 🌟 STRATEGY 2: Default pipeline (Nodemailer using your .env.local credentials)
  const transporter = createFallbackTransporter();
  const systemSender =
    process.env.SMTP_FROM_EMAIL ||
    `"StudioFlow Delivery" <delivery@studioflow.dev>`;

  return transporter.sendMail({
    from: systemSender,
    to: payload.clientEmail,
    subject: subject,
    html: htmlTemplate,
  });
}
