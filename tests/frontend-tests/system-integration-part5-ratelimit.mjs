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
  `${c.magenta}${c.bold}🌪️ STARTING SYSTEM INTEGRATION SUITE (PART 5: THE SPAMMER RATE LIMIT) 🌪️${c.reset}\n`,
);

async function testRateLimiter() {
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
      `${c.cyan}⚙️ PHASE 1: Deploying Isolated Spammer Environment...${c.reset}`,
    );

    const devId = `dev_spammer_${runId}`;
    await connection.query(
      `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, 'hash')`,
      [devId, `spammer_${runId}`, `spammer${runId}@studioflow.dev`],
    );

    const [wsRes] = await connection.query(
      `INSERT INTO workspaces (owner_id, name, slug) VALUES (?, ?, ?)`,
      [devId, `Spam Agency`, `spam-${runId}`],
    );
    const workspaceId = wsRes.insertId;

    const [clientRes] = await connection.query(
      `INSERT INTO clients (workspace_id, slug, portal_slug, name, email) VALUES (?, ?, ?, ?, ?)`,
      [
        workspaceId,
        `c-spam-${runId}`,
        `portal-spam-${runId}`,
        `Spam Corp`,
        `client_spammer_${runId}@corp.com`,
      ],
    );
    const clientId = clientRes.insertId;

    // We generate a mock secure PIN for the test environment
    const mockPin = "777777";

    // PROJECT 1: SCENARIO 1 (The Blocked User)
    const [projRes1] = await connection.query(
      `INSERT INTO projects (workspace_id, client_id, name, slug, universal_manifest, client_email, portal_verification_code, portal_code_expires_at) VALUES (?, ?, ?, ?, '{}', ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [
        workspaceId,
        clientId,
        `Project Blocked`,
        `ratelimit-blocked-${runId}`,
        `client_spammer_${runId}@corp.com`,
        mockPin,
      ],
    );
    const projectId1 = projRes1.insertId;

    // PROJECT 2: SCENARIO 2 (The Reset User & Warning Trigger)
    const [projRes2] = await connection.query(
      `INSERT INTO projects (workspace_id, client_id, name, slug, universal_manifest, client_email, portal_verification_code, portal_code_expires_at) VALUES (?, ?, ?, ?, '{}', ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [
        workspaceId,
        clientId,
        `Project Passed`,
        `ratelimit-passed-${runId}`,
        `client_spammer_${runId}@corp.com`,
        mockPin,
      ],
    );
    const projectId2 = projRes2.insertId;

    console.log(
      `   ✅ Success: Provisioned Target Matrix 1 -> 'ratelimit-blocked-${runId}' (with unlocked OTP)`,
    );
    console.log(
      `   ✅ Success: Provisioned Target Matrix 2 -> 'ratelimit-passed-${runId}' (with unlocked OTP)\n`,
    );

    console.log(
      `${c.cyan}⚙️ PHASE 2: Injecting Data for Scenario 1 & Scenario 2...${c.reset}`,
    );

    const insertPromises = [];

    // --- SCENARIO 1: Insert 30 messages NOW (User should be blocked immediately) ---
    for (let i = 1; i <= 30; i++) {
      insertPromises.push(
        connection.query(
          `INSERT INTO portal_messages (project_id, content, sender, created_at) VALUES (?, ?, 'client', NOW())`,
          [projectId1, `Blocked Spam message #${i}`],
        ),
      );
    }

    // --- SCENARIO 2: Insert 30 messages 25 HOURS AGO (User limit has reset) ---
    for (let i = 1; i <= 30; i++) {
      insertPromises.push(
        connection.query(
          `INSERT INTO portal_messages (project_id, content, sender, created_at) VALUES (?, ?, 'client', DATE_SUB(NOW(), INTERVAL 25 HOUR))`,
          [projectId2, `Passed Spam message #${i} (Sent 25 hours ago)`],
        ),
      );
    }

    // --- SCENARIO 2 BONUS: Insert 25 messages NOW so they trigger the "5 Remaining" warning ---
    for (let i = 1; i <= 25; i++) {
      insertPromises.push(
        connection.query(
          `INSERT INTO portal_messages (project_id, content, sender, created_at) VALUES (?, ?, 'client', NOW())`,
          [projectId2, `Current message #${i} (Warning Trigger)`],
        ),
      );
    }

    await Promise.all(insertPromises);

    console.log(`   ✅ Success: Inserted telemetry across both registries.\n`);

    console.log(
      `\n${c.bold}${c.green}🎉 TEST ENVIRONMENT SEEDED FOR RATE LIMIT VALIDATION!🎉${c.reset}\n`,
    );

    console.log(
      `${c.bold}🧪 YOUR NEXT STEPS TO PROVE THE LIMIT & WARNINGS WORK:${c.reset}`,
    );
    console.log(`1. Start your local server: ${c.cyan}npm run dev${c.reset}\n`);

    console.log(`${c.bold}🔴 SCENARIO 1 (The Blocked Spammer):${c.reset}`);
    console.log(
      `   Open: ${c.cyan}http://localhost:3000/portal/ratelimit-blocked-${runId}?code=${mockPin}${c.reset}`,
    );
    console.log(`   Action: Send a message.`);
    console.log(
      `   Expectation: You are blocked instantly with the limit reached message.\n`,
    );

    console.log(
      `${c.bold}🟢 SCENARIO 2 (The 24hr Reset & 5 Remaining Warning):${c.reset}`,
    );
    console.log(
      `   Open: ${c.cyan}http://localhost:3000/portal/ratelimit-passed-${runId}?code=${mockPin}${c.reset}`,
    );
    console.log(`   Action: Send a message.`);
    console.log(
      `   Expectation: It succeeds! Because the 30 massive spam messages were sent 25 hours ago.`,
    );
    console.log(
      `   Bonus: We also seeded exactly 25 fresh messages today, so your very next message will return the "You only have 4 messages remaining" warning!\n`,
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

testRateLimiter();
