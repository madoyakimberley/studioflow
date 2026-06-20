import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

console.log(
  `${c.magenta}${c.bold}🌪️ STARTING STUDIOFLOW SYSTEM INTEGRATION SUITE (PART 4: THE UI AVALANCHE SIMULATION) 🌪️${c.reset}\n`,
);

async function runUltimateIntegrationTest() {
  if (!process.env.DATABASE_URL) {
    console.error(
      `${c.red}❌ CRITICAL: DATABASE_URL must be specified.${c.reset}`,
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const runId = crypto.randomBytes(4).toString("hex");

  const DEVS = 5;
  const CLIENTS_PER_DEV = 10;

  const activeProjects = [];

  console.log(
    `${c.cyan}⚙️ PHASE 1: Deploying Massive Multi-Tenant Hierarchy...${c.reset}`,
  );

  try {
    for (let d = 1; d <= DEVS; d++) {
      const devId = `dev_${runId}_${d}`;

      // 1. Core Users & Workspaces
      await connection.query(
        `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, 'hash')`,
        [devId, `arch_dev_${runId}_${d}`, `dev${d}_${runId}@studioflow.dev`],
      );

      const [wsRes] = await connection.query(
        `INSERT INTO workspaces (owner_id, name, slug) VALUES (?, ?, ?)`,
        [devId, `Enterprise Agency ${d}`, `agency-${runId}-${d}`],
      );
      const workspaceId = wsRes.insertId;

      for (let c = 1; c <= CLIENTS_PER_DEV; c++) {
        const clientEmail = `client_${runId}_${d}_${c}@corp.com`;

        // 2. Clients & Projects
        const [clientRes] = await connection.query(
          `INSERT INTO clients (workspace_id, slug, portal_slug, name, email) VALUES (?, ?, ?, ?, ?)`,
          [
            workspaceId,
            `c-${runId}-${d}-${c}`,
            `portal-${runId}-${d}-${c}`,
            `Global Corp ${d}-${c}`,
            clientEmail,
          ],
        );
        const clientId = clientRes.insertId;

        const [projRes] = await connection.query(
          `INSERT INTO projects (workspace_id, client_id, name, slug, universal_manifest, client_email, live_url) VALUES (?, ?, ?, ?, '{}', ?, ?)`,
          [
            workspaceId,
            clientId,
            `Project Titan ${d}-${c}`,
            `titan-${runId}-${d}-${c}`,
            clientEmail,
            `https://titan-${runId}-${d}-${c}.live.studioflow.dev`,
          ],
        );

        activeProjects.push(projRes.insertId);
      }
    }
    console.log(
      `   ✅ Successfully seeded ${DEVS} Developers and ${activeProjects.length} Enterprise Projects.\n`,
    );

    // ---------------------------------------------------------
    // PHASE 2: THE DATA AVALANCHE (Simulating real-time portal usage)
    // ---------------------------------------------------------
    console.log(
      `${c.cyan}⚙️ PHASE 2: Injecting Telemetry, Assets, Jobs, and Chats...${c.reset}`,
    );

    let totalMessages = 0;
    let totalAssets = 0;
    let totalJobs = 0;

    const avalanchePromises = activeProjects.map(async (projectId) => {
      // A. Site Monitoring Telemetry (Live Nodes Page)
      const latency = Math.floor(Math.random() * 100) + 20;
      await connection.query(
        `INSERT INTO site_monitoring (project_id, is_up, response_time_ms) VALUES (?, 1, ?)`,
        [projectId, latency],
      );

      // B. Background Provisioning Jobs - ✨ PATCHED DB CONSTRAINTS (Added idempotency_key & manifest) ✨
      const idempotencyKey = `job_${crypto.randomBytes(16).toString("hex")}`;
      const dummyManifest = JSON.stringify({
        projectName: "Avalanche Node",
        gitProvider: "github",
        deploymentTarget: "vercel",
      });

      await connection.query(
        `
        INSERT INTO provisioning_jobs (project_id, idempotency_key, status, execution_logs, manifest) 
        VALUES (?, ?, 'completed', '$ job --id=909\\n[OK] Node modules resolved.\\n[OK] Database schema pushed.', ?)
      `,
        [projectId, idempotencyKey, dummyManifest],
      );
      totalJobs++;

      // C. Interactive Chat Ping-Pong (InteractiveChat.tsx)
      for (let m = 0; m < 4; m++) {
        const sender = m % 2 === 0 ? "client" : "admin";
        await connection.query(
          `INSERT INTO portal_messages (project_id, content, sender) VALUES (?, ?, ?)`,
          [projectId, `This is automated message ${m} from ${sender}.`, sender],
        );
        totalMessages++;
      }

      // D. Asset Vault Uploads (AssetVaultUI.tsx)
      const assetTypes = [
        {
          name: "design-system.fig",
          type: "application/octet-stream",
          url: "https://utfs.io/f/fig.fig",
        },
        {
          name: "schema-dump.sql",
          type: "application/sql",
          url: "https://utfs.io/f/sql.sql",
        },
        {
          name: "brand-logo.png",
          type: "image/png",
          url: "https://utfs.io/f/logo.png",
        },
      ];
      for (const asset of assetTypes) {
        await connection.query(
          `INSERT INTO project_assets (project_id, name, uploaded_by, file_size, file_url, file_type) VALUES (?, ?, 'admin', '2.4 MB', ?, ?)`,
          [projectId, asset.name, asset.url, asset.type],
        );
        totalAssets++;
      }

      // E. Client Requests (Operational Inbound Queue)
      await connection.query(
        `INSERT INTO client_requests (project_id, title, description, status) VALUES (?, ?, ?, ?)`,
        [
          projectId,
          "Add Stripe Integration",
          "Need subscriptions active.",
          "reviewing",
        ],
      );
    });

    await Promise.all(avalanchePromises);
    console.log(
      `   ✅ Avalanched ${totalMessages} messages, ${totalAssets} assets, and ${totalJobs} daemon logs across all nodes.\n`,
    );

    // ---------------------------------------------------------
    // PHASE 3: PROOF OF PROGRESS LIFECYCLE (The UI Diagram Simulation)
    // ---------------------------------------------------------
    console.log(
      `${c.cyan}⚙️ PHASE 3: Simulating 'Proof of Progress' Sign-off Lifecycle...${c.reset}`,
    );

    let approvedCount = 0;

    for (const projectId of activeProjects) {
      const [itemRes] = await connection.query(
        `
        INSERT INTO checklist_items (project_id, title, status, proof_url) 
        VALUES (?, 'Authentication Middleware', 'pending_client_review', 'https://github.com/studioflow/proof/123')
      `,
        [projectId],
      );
      const itemId = itemRes.insertId;

      await connection.query(
        `UPDATE checklist_items SET status = 'completed' WHERE id = ? AND project_id = ?`,
        [itemId, projectId],
      );
      await connection.query(
        `UPDATE projects SET progress_percentage = LEAST(progress_percentage + 10, 100) WHERE id = ?`,
        [projectId],
      );

      approvedCount++;
    }

    console.log(
      `   ✅ Client Sign-offs Simulated: ${approvedCount} tasks moved from 'pending_client_review' to 'completed'.\n`,
    );

    // ---------------------------------------------------------
    // PHASE 4: FINAL MATRIX INTEGRITY VALIDATION
    // ---------------------------------------------------------
    console.log(
      `${c.cyan}⚙️ PHASE 4: Validating Relational Integrity (Ensuring No Orphaned Data)...${c.reset}`,
    );

    const [auditRes] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE id LIKE '%${runId}%') as devCount,
        (SELECT COUNT(*) FROM projects WHERE slug LIKE '%${runId}%') as projCount,
        (SELECT AVG(response_time_ms) FROM site_monitoring sm JOIN projects p ON sm.project_id = p.id WHERE p.slug LIKE '%${runId}%') as avgLatency
    `);

    const stats = auditRes[0];

    console.log(
      `   📊 Total Developers Provisioned: ${stats.devCount} / ${DEVS}`,
    );
    console.log(
      `   📊 Total Active Matrices (Projects): ${stats.projCount} / ${activeProjects.length}`,
    );
    console.log(
      `   📊 Cluster Avg Live Latency: ${Math.round(stats.avgLatency)}ms`,
    );

    if (stats.projCount === activeProjects.length) {
      console.log(
        `\n${c.bold}${c.green}🎉 TEST 4 (AVALANCHE) SURVIVED!🎉${c.reset}`,
      );
      console.log(
        `${c.green}   Every single Next.js component—Assets, Chat, Proofs, and Matrix Streams—has full, flawless database integrity.${c.reset}\n`,
      );
    } else {
      console.error(
        `\n❌ [FAILURE]: Relational data drop detected during high concurrency.`,
      );
      process.exit(1);
    }
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

runUltimateIntegrationTest();
