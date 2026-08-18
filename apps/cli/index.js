#!/usr/bin/env node

import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import readline from "readline";
import Redis from "ioredis";
import fs from "fs";
import os from "os";
import { URL } from "url";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";

import { CommandProcessExecutor } from "./src/CommandProcessExecutor.js";
import { SystemCircuitBreaker } from "./src/SystemCircuitBreaker.js";
import { MultiStackTemplateScaffolder } from "./src/MultiStackTemplateScaffolder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Terminal Colors
const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const STUDIOFLOW_HOME = path.join(os.homedir(), ".studioflow");
const CONFIG_FILE_PATH = path.join(STUDIOFLOW_HOME, "config.json");
const cliEnvPath = path.resolve(__dirname, ".env");
const cwdEnvPath = path.resolve(process.cwd(), ".env");

// FIX: Prioritize local runtime directory environment flags first so developer tools override global modules.
if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
}
if (fs.existsSync(cliEnvPath)) {
  dotenv.config({ path: cliEnvPath });
}
dotenv.config();

function ensureTlsUrl(url) {
  if (!url) return url;
  if (url.includes("tidbcloud.com") && !url.includes("ssl=")) {
    const separator = url.includes("?") ? "&" : "?";
    const sslParam = `ssl=${encodeURIComponent(JSON.stringify({ rejectUnauthorized: true }))}`;
    return `${url}${separator}${sslParam}`;
  }
  return url;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://studioflow-dashboard.onrender.com"
)
  .replace(/['"]/g, "")
  .trim()
  .replace(/\/$/, "");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ====================== ENGINE DAEMON WORKER ======================
class EngineDaemonWorker {
  constructor(dbConnectionString, workspaceId) {
    this.connectionString = dbConnectionString;
    this.workspaceId = workspaceId;
    this.poolInstance = null;
    this.redis = null;
    this.isProcessing = false;
    this.dbBreaker = new SystemCircuitBreaker("Database Connection", 3, 5000);
  }

  async initializePool() {
    const connectionUri = ensureTlsUrl(this.connectionString);
    this.poolInstance = mysql.createPool({
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 15000,
    });
    console.log(` ${c.green}✓ Database pool created successfully.${c.reset}`);
  }

  async ensureTablesExist() {
    console.log(
      ` ${c.magenta}⚙️ Table Migration:${c.reset} Verifying and upgrading schema...`,
    );

    const jobColumns = {
      id: "INT AUTO_INCREMENT PRIMARY KEY",
      workspace_id: "INT NOT NULL",
      project_id: "INT NULL",
      idempotency_key: "VARCHAR(255) NULL UNIQUE",
      status: "VARCHAR(50) DEFAULT 'pending'",
      manifest: "JSON NOT NULL",
      execution_logs: "LONGTEXT",
      created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      started_at: "TIMESTAMP NULL",
      completed_at: "TIMESTAMP NULL",
    };

    async function getExistingColumns(tableName) {
      const [rows] = await this.poolInstance.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
        [tableName],
      );
      return rows.map((row) => row.COLUMN_NAME);
    }

    async function addMissingColumns(tableName, columnsDef) {
      const existing = await getExistingColumns.call(this, tableName);
      const missing = Object.keys(columnsDef).filter(
        (col) => !existing.includes(col),
      );

      if (missing.length === 0) return;

      console.log(
        `   ${c.yellow}→ Adding missing columns to ${tableName}: ${missing.join(", ")}${c.reset}`,
      );
      for (const col of missing) {
        const definition = columnsDef[col];
        await this.poolInstance.execute(
          `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${definition}`,
        );
      }
    }

    const [exists] = await this.poolInstance.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'provisioning_jobs' AND TABLE_SCHEMA = DATABASE()`,
    );

    if (exists.length === 0) {
      const createSQL = `CREATE TABLE provisioning_jobs (${Object.entries(
        jobColumns,
      )
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
      await this.poolInstance.execute(createSQL);
      console.log(` ${c.green}✓ provisioning_jobs table created.${c.reset}`);
    } else {
      await addMissingColumns.call(this, "provisioning_jobs", jobColumns);
      console.log(` ${c.green}✓ Schema state verified on tenant DB.${c.reset}`);
    }
  }

  async start() {
    await this.initializePool();
    await this.ensureTablesExist();

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.trim() !== "") {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 3000,
        });
        this.redis.on("error", () => {});

        await this.redis.subscribe("provisioning_queue");
        this.redis.on("message", async (channel, message) => {
          if (channel === "provisioning_queue") {
            try {
              const parsedEvent = JSON.parse(message);
              if (
                parsedEvent.event === "NEW_JOB" &&
                parseInt(parsedEvent.workspaceId, 10) ===
                  parseInt(this.workspaceId, 10)
              ) {
                await this.runProcessingCycle();
              }
            } catch (e) {}
          }
        });
        console.log(
          ` ${c.green}⚡ Real-time Redis events listener active.${c.reset}`,
        );
      } catch (e) {
        console.log(
          ` ${c.yellow}⚠️ Redis connection skipped. Operating in fallback polling mode.${c.reset}`,
        );
      }
    }

    setInterval(() => this.runProcessingCycle(), 5000);
    this.runProcessingCycle();
  }

  async runProcessingCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.dbBreaker.execute(async () => {
        const queryStr = `
          SELECT * FROM provisioning_jobs
          WHERE workspace_id = ? AND status = 'pending'
          ORDER BY id ASC LIMIT 1
        `;
        console.log(
          ` ${c.dim}🔍 Polling TENANT DB for workspace ${this.workspaceId}...${c.reset}`,
        );

        const [jobs] = await this.poolInstance.execute(queryStr, [
          this.workspaceId,
        ]);
        if (!jobs || jobs.length === 0) return;

        const activeJob = jobs[0];
        console.log(
          `\n${c.magenta}⚙️ Processing Job [ID: ${activeJob.id}] Found inside Tenant Database Queue...${c.reset}`,
        );

        await this.poolInstance.execute(
          "UPDATE provisioning_jobs SET status = 'processing', started_at = CURRENT_TIMESTAMP WHERE id = ?",
          [activeJob.id],
        );

        let manifestData = activeJob.manifest;
        if (typeof manifestData === "string") {
          manifestData = JSON.parse(manifestData);
        }

        try {
          const projectScaffolder = new MultiStackTemplateScaffolder(
            manifestData.projectSlug || "studioflow-app",
            manifestData,
            this.connectionString,
          );

          // CHANGED HERE: .scaffold() -> .execute()
          await projectScaffolder.processExecutionPipeline();

          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [activeJob.id],
          );

          console.log(
            `${c.green}✅ Job [ID: ${activeJob.id}] Scaffolding Executed and Verified!${c.reset}\n`,
          );
        } catch (jobException) {
          console.error(
            `${c.red}❌ Task Execution Failed for Job ID ${activeJob.id}:${c.reset}`,
            jobException.message,
          );
          const structuredLogs = JSON.stringify({
            error: jobException.message,
            stack: jobException.stack,
          });
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'failed', execution_logs = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [structuredLogs, activeJob.id],
          );
        }
      });
    } catch (err) {
      console.error(`${c.red}❌ Cycle Error:${c.reset}`, err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

// ====================== LOGIN & LOGOUT ======================
async function runLoginCommand(cliAuthToken) {
  if (!cliAuthToken) {
    console.error(
      `\n${c.red}❌ Error:${c.reset} You must supply a valid authentication token.`,
    );
    console.error(`Usage: studioflow login <token>\n`);
    process.exit(1);
  }

  console.log(
    `\n📡 Synchronizing CLI state environment parameters with Cloud Dashboard...`,
  );
  console.log(`   Token: ${cliAuthToken.substring(0, 15)}...`);

  try {
    const apiCallResponse = await fetch(`${API_BASE_URL}/api/cli/sync`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cliAuthToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`   Target API Base URL: ${API_BASE_URL}/api/cli/sync`);
    console.log(
      `   Response Status: ${apiCallResponse.status} ${apiCallResponse.statusText}`,
    );

    if (!apiCallResponse.ok) {
      let errorMsg = `Server responded with status code ${apiCallResponse.status}`;
      try {
        const errorPayload = await apiCallResponse.json();
        errorMsg = errorPayload.error || errorMsg;
        console.log(`   Error Payload Details:`, errorPayload);
      } catch (_) {}

      throw new Error(errorMsg);
    }

    const payloadData = await apiCallResponse.json();
    console.log(
      `   ✅ Connection Established with Workspace Target: ${payloadData.workspaceId}`,
    );

    if (!fs.existsSync(STUDIOFLOW_HOME)) {
      fs.mkdirSync(STUDIOFLOW_HOME, { recursive: true });
    }

    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify({ token: cliAuthToken }, null, 2),
    );

    const operationalDbUrl =
      payloadData.tenantDatabaseUrl ||
      payloadData.queueDatabaseUrl ||
      payloadData.databaseUrl;

    if (!operationalDbUrl) {
      console.error(
        `${c.red}❌ Synchronization Fault: No valid workspace database URL returned from central infrastructure.${c.reset}`,
      );
      process.exit(1);
    }

    const envFileString = [
      `# StudioFlow Local Engine Runtime Environment Sync Properties`,
      `WORKSPACE_ID="${payloadData.workspaceId}"`,
      `DATABASE_URL="${operationalDbUrl}"`,
      `GITHUB_TOKEN="${payloadData.githubToken || ""}"`,
      `REDIS_URL="${payloadData.redisUrl || ""}"`,
      `TARGET_OUTPUT_DIR="${payloadData.targetOutputDir || ""}"`,
      `DEPLOYMENT_PROVIDER="${payloadData.deploymentProvider || "none"}"`,
      `DEPLOYMENT_API_KEY="${payloadData.deploymentApiKey || ""}"`,
      `DEPLOYMENT_OWNER_ID="${payloadData.deploymentOwnerId || ""}"`,
      `API_BASE_URL="${API_BASE_URL}"`,
    ].join("\n");

    fs.writeFileSync(cliEnvPath, envFileString);

    console.log(
      `${c.green}✅ Login Successful! Global tenant environments synchronized and cached.${c.reset}\n`,
    );
    process.exit(0);
  } catch (syncFault) {
    console.error(
      `\n${c.red}❌ Cloud Environment Sync Failed:${c.reset}`,
      syncFault.message,
    );
    console.error(`\n${c.yellow}🔧 Troubleshoot Mismatch Guide:${c.reset}`);
    console.error(
      `   • Target Endpoint Attempted: ${c.cyan}${API_BASE_URL}/api/cli/sync${c.reset}`,
    );
    console.error(
      `   • If developing locally, ensure you have ${c.bold}API_BASE_URL="http://localhost:3000"${c.reset} inside your project folder's local .env file.`,
    );
    console.error(
      `   • Verify that your server backend application mounts the router execution path for /api/cli/sync`,
    );
    process.exit(1);
  }
}

function runLogoutCommand() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) fs.unlinkSync(CONFIG_FILE_PATH);
    if (fs.existsSync(cliEnvPath)) fs.unlinkSync(cliEnvPath);
    console.log(
      `\n${c.green}✅ Session cleared. Environment configurations reset successfully.${c.reset}\n`,
    );
  } catch (err) {
    console.error(`\n${c.red}❌ Logout Error:${c.reset}`, err.message);
  }
  process.exit(0);
}

// ====================== MAIN EXECUTION ======================
const systemArguments = process.argv.slice(2);
const activeCommandRoute = systemArguments[0];

if (activeCommandRoute === "login") {
  runLoginCommand(systemArguments[1]);
} else if (activeCommandRoute === "logout") {
  runLogoutCommand();
} else {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    console.error(
      `\n${c.red}❌ Authentication Guard:${c.reset} No valid session found.`,
    );
    console.error(
      `Please run ${c.cyan}'studioflow login <token>'${c.reset} to connect.\n`,
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      `\n${c.red}❌ Environment Error:${c.reset} We don't have a database connection string.`,
    );
    console.error(
      `Please run ${c.cyan}'studioflow login'${c.reset} to sync your settings from the dashboard.\n`,
    );
    process.exit(1);
  }

  if (!process.env.WORKSPACE_ID) {
    console.error(
      `\n${c.red}❌ Environment Error:${c.reset} No Workspace ID mapped to this session.`,
    );
    console.error(
      `Please run ${c.cyan}'studioflow login'${c.reset} to refresh your cloud credentials.\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n${c.cyan}===========================================${c.reset}`,
  );
  console.log(`${c.bold} StudioFlow Control Panel ${c.reset}`);
  console.log(`${c.cyan}===========================================${c.reset}`);
  console.log(` ${c.bold}[1]${c.reset} Start Background Provisioning Worker`);
  console.log(` ${c.bold}[2]${c.reset} Exit`);

  rl.question(`\nWhat would you like to do? `, async (choice) => {
    if (choice.trim() === "1") {
      const activeWorker = new EngineDaemonWorker(
        process.env.DATABASE_URL,
        process.env.WORKSPACE_ID,
      );
      await activeWorker.start();
    } else {
      console.log("\nShutdown clean exit sequence initialized.\n");
      process.exit(0);
    }
  });
}
