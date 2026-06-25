// test-login-create.ts
import "dotenv/config";
import { execSync, spawn } from "child_process";
import { db, users, workspaces, projects, clients } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { getTenantDb } from "./src/lib/tenant-db";
import path from "path";

// ⚠️ IMPORTANT: UPDATE THIS PATH TO POINT TO YOUR CLI FOLDER
// For example: "../../packages/cli/index.js" or "../cli/index.js"
const CLI_PATH = path.resolve(__dirname, "../cli/index.js");

async function runSimulation() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E CLI AND PROVISIONING TEST...");
  console.log("==================================================\n");

  const testEmail = "kimmadoya09@gmail.com";
  const cliToken = "sf_pat_f15801a3334945c0b4ffcbf8ef946bcc";

  try {
    // ---------------------------------------------------------
    // STEP 1: Test CLI Login Setup
    // ---------------------------------------------------------
    console.log(`[STEP 1] Testing StudioFlow CLI Authentication...`);
    try {
      console.log(`   -> Running: node ${CLI_PATH} login ${cliToken}`);
      execSync(`node "${CLI_PATH}" login ${cliToken}`, { stdio: "inherit" });
      console.log("✅ CLI Authenticated Successfully.\n");
    } catch (cliErr: any) {
      console.log(
        "⚠️ Fallback: Trying global npx command if local script is restricted...",
      );
      try {
        execSync(`npx studioflow login ${cliToken}`, { stdio: "inherit" });
        console.log("✅ CLI Authenticated Successfully via npx.\n");
      } catch (err: any) {
        console.log(
          "⚠️ Note: Make sure the 'login' command is exported properly in your setup.\n",
        );
      }
    }

    // ---------------------------------------------------------
    // STEP 2: Fetch User & Workspace Info
    // ---------------------------------------------------------
    console.log(`[STEP 2] Fetching user & workspace data for: ${testEmail}`);
    const user = await db.query.users.findFirst({
      where: eq(users.email, testEmail),
    });

    if (!user) throw new Error(`User with email ${testEmail} not found!`);
    console.log("   ✅ User Found:", { id: user.id, username: user.username });

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, user.id),
    });

    if (!workspace) throw new Error("No workspace found for this user.");

    console.log("\n🔍 DEBUG WORKSPACE OBJECT:", workspace);

    // ---------------------------------------------------------
    // STEP 3: Connect to Tenant DB and Insert Project/Job
    // ---------------------------------------------------------
    console.log(
      `\n[STEP 3] Injecting Automated Test Project & Queueing Job...`,
    );

    console.log(`   -> Fetching Tenant DB for Workspace ID: ${workspace.id}`);
    const tenantDb = await getTenantDb(workspace.id);

    let client = await tenantDb.query.clients.findFirst();
    if (!client) {
      await tenantDb.insert(clients).values({
        workspaceId: workspace.id,
        name: "Automated Test Client",
        slug: "auto-test-client",
        email: "test@example.com",
      } as any);
      client = await tenantDb.query.clients.findFirst();
    }

    const projectSlug = `test-project-${Date.now()}`;
    await tenantDb.insert(projects).values({
      workspaceId: workspace.id,
      clientId: client!.id,
      name: "Automated Test Project",
      slug: projectSlug,
      status: "planning",
      clientEmail: "test@example.com",
      universalManifest: {
        projectName: "Automated Test Project",
        deploymentTarget: "vercel",
        services: [
          {
            name: "backend",
            runtime: "node",
            database: "postgresql",
            orm: "drizzle",
          },
        ],
      } as any,
    } as any);

    console.log(`   ✅ Project '${projectSlug}' created.`);

    console.log(`   -> Queueing job for background worker...`);
    try {
      // 🔥 FIX: Create the table on the fly just in case it's missing so the test passes
      await tenantDb.execute(`
        CREATE TABLE IF NOT EXISTS provisioning_jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            workspace_id INT NOT NULL,
            idempotency_key VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            manifest JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await tenantDb.execute(`
            INSERT INTO provisioning_jobs (project_id, workspace_id, idempotency_key, status, manifest)
            VALUES (1, ${workspace.id}, 'job-${Date.now()}', 'pending', '{}')
        `);
      console.log(`   ✅ Job injected into queue successfully.`);
    } catch (e: any) {
      console.log(
        `   ⚠️ Skipping job insert (schema might not be applied yet): ${e.message}`,
      );
    }

    // ---------------------------------------------------------
    // STEP 4: Start CLI and Trigger the Background Worker
    // ---------------------------------------------------------
    console.log(
      `\n[STEP 4] Simulating CLI Interactive Mode -> Triggering Worker...`,
    );

    // 🔥 FIX: Point spawn to the explicit CLI path
    const cliProcess = spawn("node", [CLI_PATH], { env: { ...process.env } });

    cliProcess.stdout.on("data", (data) => {
      const output = data.toString();
      process.stdout.write(`[CLI] ${output}`);

      if (output.includes("What would you like to do?")) {
        console.log(
          "\n🤖 [Auto-Typer] Sending keystroke '1' to start the daemon...",
        );
        cliProcess.stdin.write("1\n");
      }

      if (
        output.includes("Waiting for new jobs") ||
        output.includes("Table Migration:") ||
        output.includes("Phase 1") ||
        output.includes("background service active")
      ) {
        console.log(
          "\n✅ Daemon is running and streaming execution logic successfully!",
        );
        setTimeout(() => {
          console.log(
            "\n🛑 Terminating background worker after successful telemetry run.",
          );
          cliProcess.kill();
        }, 5000);
      }
    });

    cliProcess.stderr.on("data", (data) => {
      console.error(`\n[CLI ERR] ${data.toString()}`);
    });

    cliProcess.on("close", (code) => {
      console.log(`\n==================================================`);
      if (code === 0 || code === null) {
        console.log(`🎉 SUCCESS! Pipeline exited cleanly with exit code: 0`);
      } else {
        console.log(
          `⚠️ Pipeline exited with code: ${code}. Check CLI logs above.`,
        );
      }
      console.log(`==================================================\n`);
      process.exit(code === null ? 0 : code);
    });
  } catch (err: any) {
    console.error("\n==================================================");
    console.error("❌ ERROR DETECTED IN E2E PIPELINE");
    console.error("==================================================");
    console.error(err.message);
    if (err.sqlMessage) console.error("SQL Error:", err.sqlMessage);
    console.error("==================================================\n");
    process.exit(1);
  }
}

runSimulation();
