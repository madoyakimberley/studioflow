import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

console.log(
  `${c.magenta}${c.bold}🌪️ STARTING SYSTEM INTEGRATION SUITE (PART 6: PORTAL LINK RATE LIMIT) 🌪️${c.reset}\n`,
);

async function testPortalLinkLimit() {
  if (!process.env.DATABASE_URL) {
    console.error(
      `${c.red}❌ CRITICAL: DATABASE_URL must be specified.${c.reset}`,
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const runId = crypto.randomBytes(4).toString("hex");

  try {
    console.log(
      `${c.cyan}⚙️ PHASE 1: Deploying Isolated Rate-Limit Environment...${c.reset}`,
    );

    // 1. Setup the Dev and Workspace
    const devUsername = `limitdev_${runId}`;
    const devId = `dev_portallimit_${runId}`;

    await connection.query(
      `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, 'hash')`,
      [devId, devUsername, `limitdev${runId}@studioflow.dev`],
    );

    const [wsRes] = await connection.query(
      `INSERT INTO workspaces (owner_id, name, slug) VALUES (?, ?, ?)`,
      [devId, `Limit Agency`, `limit-${runId}`],
    );
    const workspaceId = wsRes.insertId;

    // ✨ THE FIX: Generate a completely unique email for this test run!
    const uniqueClientEmail = `client_limit_${runId}@corp.com`;

    // 2. Setup the Client
    const [clientRes] = await connection.query(
      `INSERT INTO clients (workspace_id, slug, portal_slug, name, email) VALUES (?, ?, ?, ?, ?)`,
      [
        workspaceId,
        `c-limit-${runId}`,
        `portal-limit-${runId}`,
        `Limit Corp`,
        uniqueClientEmail,
      ],
    );
    const clientId = clientRes.insertId;

    // 3. Setup the Project
    const projectSlug = `otplockout-${runId}`;
    const [projRes] = await connection.query(
      `INSERT INTO projects (workspace_id, client_id, name, slug, universal_manifest, client_email) VALUES (?, ?, ?, ?, '{}', ?)`,
      [
        workspaceId,
        clientId,
        `Project OTP Lockout`,
        projectSlug,
        uniqueClientEmail,
      ],
    );
    const projectId = projRes.insertId;

    console.log(
      `   ✅ Success: Provisioned Target Matrix -> '${projectSlug}'\n`,
    );

    console.log(
      `${c.cyan}⚙️ PHASE 2: Artificially Maxing Out the Send Count...${c.reset}`,
    );

    // ✨ THE MAGIC: We manually update the database to simulate that the admin has already clicked "Send Link" 5 times!
    await connection.query(
      `UPDATE projects SET portal_link_sent_count = 5 WHERE id = ?`,
      [projectId],
    );

    console.log(
      `   ✅ Success: Set portal_link_sent_count to 5 (Maximum allowed).`,
    );

    // Construct the clickable links based on your Next.js routing!
    const loginEmail = `limitdev${runId}@studioflow.dev`;
    const dashboardUrl = `http://localhost:3000/dashboard/${devUsername}`;

    console.log(
      `\n${c.bold}${c.green}🎉 TEST ENVIRONMENT SEEDED FOR PORTAL LINK LIMIT VALIDATION!🎉${c.reset}`,
    );
    console.log(
      `\n${c.bold}🧪 YOUR EXACT LINKS TO TEST THIS RIGHT NOW:${c.reset}`,
    );
    console.log(
      `1. Ensure your Next.js server is running (${c.cyan}npm run dev${c.reset})`,
    );
    console.log(
      `2. Log in with this test admin email: ${c.cyan}${loginEmail}${c.reset} (Password: password123 / anything if mock auth)`,
    );
    console.log(
      `3. Click this link to go straight to your dashboard: ${c.magenta}${c.bold}${dashboardUrl}${c.reset}`,
    );
    console.log(`4. Open the 'Project OTP Lockout' project.`);
    console.log(
      `5. Click the "Send Portal Link" button and watch the server reject it!`,
    );
  } catch (err) {
    console.error(
      `\n❌ [CRASH]: Database transaction bottleneck:`,
      err.message,
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

testPortalLinkLimit();
