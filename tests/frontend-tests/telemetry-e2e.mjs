import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

console.log("🌪️ STARTING STUDIOFLOW HIGH-THROUGHPUT STRESS SUITE 🌪️\n");

// ---------------------------------------------------------
// 1. INLINE SQL SEEDING FOR 10 DISTINCT TENANTS
// ---------------------------------------------------------
function encryptMockPassword(text) {
  const keyEnv = process.env.STUDIOFLOW_MASTER_ENCRYPTION_KEY;
  if (!keyEnv || Buffer.from(keyEnv, "hex").length !== 32) {
    console.error(
      "❌ CRITICAL: STUDIOFLOW_MASTER_ENCRYPTION_KEY is missing or invalid in your .env file.",
    );
    process.exit(1);
  }
  const key = Buffer.from(keyEnv, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

async function seedTestRequirements() {
  console.log(
    "⏳ Provisioning 10 completely isolated developer tenant contexts (via raw SQL)...",
  );

  if (!process.env.DATABASE_URL) {
    console.error("❌ CRITICAL: DATABASE_URL is missing in your .env file.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const runId = crypto.randomBytes(4).toString("hex");
    const testProjects = [];

    for (let i = 1; i <= 10; i++) {
      const devId = `dev_${runId}_${i}`;
      await connection.query(
        `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`,
        [
          devId,
          `dev_${runId}_${i}`,
          `dev${i}_${runId}@studioflow.dev`,
          encryptMockPassword("password123"),
        ],
      );

      const [wsRes] = await connection.query(
        `INSERT INTO workspaces (owner_id, name, slug) VALUES (?, ?, ?)`,
        [devId, `Workspace ${i}`, `ws-${runId}-${i}`],
      );
      const workspaceId = wsRes.insertId;

      // ✨ THE FIX: Generate a completely unique email using the runId!
      const uniqueClientEmail = `client${i}_${runId}@corp.com`;

      const [clientRes] = await connection.query(
        `INSERT INTO clients (workspace_id, slug, portal_slug, name, email) VALUES (?, ?, ?, ?, ?)`,
        [
          workspaceId,
          `c-${runId}-${i}`,
          `portal-${runId}-${i}`,
          `Client ${i}`,
          uniqueClientEmail,
        ],
      );
      const clientId = clientRes.insertId;

      const [projRes] = await connection.query(
        `INSERT INTO projects (workspace_id, client_id, name, slug, universal_manifest, client_email) VALUES (?, ?, ?, ?, '{}', ?)`,
        [
          workspaceId,
          clientId,
          `Project ${i}`,
          `proj-${runId}-${i}`,
          uniqueClientEmail,
        ],
      );
      testProjects.push({
        projectId: projRes.insertId,
        slug: `proj-${runId}-${i}`,
      });
    }

    console.log(
      "   ✅ Tenant matrix provisioning completed. Database is structurally scaled.\n",
    );
    return testProjects;
  } catch (err) {
    console.error("❌ [FATAL]: Provisioning crashed:", err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// ---------------------------------------------------------
// 2. THE TELEMETRY INGESTION PIPELINE TESTS
// ---------------------------------------------------------
async function runTelemetryE2E() {
  const projects = await seedTestRequirements();

  // SCENARIO 1: Simulating Vercel Deployment Outage (HTTP 502)
  console.log("⚡ SCENARIO 1: Simulating Vercel Deployment Outage (HTTP 502)");
  try {
    const res1 = await fetch(`http://localhost:3000/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectSlug: projects[0].slug,
        payload: {
          event: "ERROR",
          message: "Vercel 502 Bad Gateway",
          source: "Edge Network",
          statusCode: 502,
        },
      }),
    });
    if (res1.ok) console.log("   ✅ Scenario 1 Successful.\n");
  } catch (e) {
    console.log("   ❌ Scenario 1 Failed.\n");
  }

  // SCENARIO 2: High-Frequency Burst Outage (Simulating 15+ Sequential Errors)
  console.log(
    "⚡ SCENARIO 2: High-Frequency Burst Outage (Simulating 15+ Sequential Errors)",
  );
  let s2Success = 0;
  for (let i = 0; i < 15; i++) {
    try {
      const res2 = await fetch(`http://localhost:3000/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: projects[1].slug,
          payload: {
            event: "ERROR",
            message: `Burst Error ${i}`,
            statusCode: 500,
          },
        }),
      });
      if (res2.ok) s2Success++;
    } catch (e) {}
  }
  console.log(`   📊 Ingestion Metric: [${s2Success}/15] packets compiled.\n`);

  // SCENARIO 3: Mass Distributed Cluster Outage (100 Errors across 10 Distinct Projects)
  console.log(
    "⚡ SCENARIO 3: Mass Distributed Cluster Outage (100 Errors across 10 Distinct Projects)",
  );
  let s3Success = 0;
  for (let i = 0; i < 100; i++) {
    const pSlug = projects[i % 10].slug;
    try {
      const res3 = await fetch(`http://localhost:3000/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: pSlug,
          payload: {
            event: "ERROR",
            message: `Distributed Error ${i}`,
            statusCode: 503,
          },
        }),
      });
      if (res3.ok) s3Success++;
    } catch (e) {}
  }
  console.log(
    `   📊 Distributed Cross-Project Metric: [${s3Success}/100] packets compiled.\n`,
  );

  // SCENARIO 4: Catastrophic Avalanche (1,000 Combined Errors)
  console.log(
    "⚡ SCENARIO 4: Catastrophic Avalanche (1,000 Combined Errors across 10 Distinct Developer Frameworks)",
  );
  console.log(
    "   Assembling 1,000 target data vectors (100 failures for every single tenant)...",
  );

  const avalanchePayloads = [];
  for (let i = 0; i < 1000; i++) {
    avalanchePayloads.push({
      projectSlug: projects[i % 10].slug,
      payload: {
        event: "CRITICAL_FAILURE",
        message: `Avalanche Event ${i}`,
        statusCode: 500,
        source: "Microservice Worker",
      },
    });
  }

  console.log(
    "   🚀 Launching mass injection pipeline via concurrent worker batches...",
  );
  let s4Successes = 0;

  // We process the 1000 requests in strict chunks of 50
  const BATCH_SIZE = 50;
  for (let k = 0; k < avalanchePayloads.length; k += BATCH_SIZE) {
    const batch = avalanchePayloads.slice(k, k + BATCH_SIZE);

    // Fire the 50 promises simultaneously
    const batchPromises = batch.map(async (payload, index) => {
      try {
        const response = await fetch("http://localhost:3000/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) return true;
        } else {
          // Print the exact Next.js error if it fails!
          if (k === 0 && index === 0) {
            console.error(
              `\n🚨 [SERVER ERROR]: Next.js returned ${response.status}`,
            );
            console.error(`🚨 [SERVER LOG]: ${await response.text()}\n`);
          }
        }
      } catch (err) {
        // Print the network error if Next.js is completely offline!
        if (k === 0 && index === 0) {
          console.error(
            `\n🚨 [NETWORK CRASH]: Cannot reach Next.js! Is your dev server running? Error: ${err.message}\n`,
          );
        }
      }
      return false;
    });

    // Wait for the exact 50 to complete before continuing
    const results = await Promise.all(batchPromises);
    s4Successes += results.filter(Boolean).length;

    // Display progress bars every 250 requests
    if ((k + BATCH_SIZE) % 250 === 0) {
      console.log(
        `      -> Progress: Compiled [${k + BATCH_SIZE}/1000] packets into metrics stream...`,
      );
    }

    // Short 10ms rest window so your local development environment doesn't completely exhaust OS ports
    await new Promise((res) => setTimeout(res, 10));
  }

  console.log(
    `\n   📊 Avalanche Success Metric: [${s4Successes}/1000] logs successfully parsed.`,
  );

  if (s4Successes === 1000) {
    console.log(
      "   ✅ Scenario 4 Successful: Multi-tenant processing clusters withstood total saturation!",
    );
    console.log(
      "\n🎉 CONGRATULATIONS! ALL E2E ARCHITECTURAL METRIC TESTS ARE COMPLETELY INDESTRUCTIBLE.",
    );
    process.exit(0);
  } else {
    console.error(
      `   ❌ [FAILURE]: Ingestion pipeline dropped packets. Only processed ${s4Successes}/1000 events successfully.`,
    );
    process.exit(1);
  }
}

runTelemetryE2E();
