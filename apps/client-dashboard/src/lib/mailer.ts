import nodemailer from "nodemailer";

// Create a reusable transporter using the global system environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525"),
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

interface AlertEmailPayload {
  projectName: string;
  statusCode: number | null;
  errorTrace: string | null;
}

/**
 * Dispatches an automated incident email to the administrator
 */
export async function sendSystemAlertEmail(payload: AlertEmailPayload) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || "admin@studioflow.dev";

  const mailOptions = {
    from: `"StudioFlow Core" <alerts@studioflow.dev>`,
    to: adminEmail,
    subject: `🚨 CRITICAL ALERT: Outage Detected on [${payload.projectName}]`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; background-color: #0b1326; color: #dae2fd;">
        <h2 style="color: #e364a7; border-bottom: 1px solid #171f33; padding-bottom: 10px;">StudioFlow Incident Response</h2>
        <p><strong>Target Node Instance:</strong> ${payload.projectName}</p>
        <p><strong>HTTP Status Code:</strong> ${payload.statusCode || "UNKNOWN"}</p>
        <div style="background-color: #131b2e; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; font-family: monospace; margin-top: 15px;">
          <strong>Error Stack Trace:</strong><br/>
          <pre style="white-space: pre-wrap; margin-top: 5px; color: #f87171;">${payload.errorTrace || "No trace provided by process supervisor."}</pre>
        </div>
        <p style="font-size: 11px; color: #958ea0; margin-top: 20px;">Automated telemetry trigger via StudioFlow Engine.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
