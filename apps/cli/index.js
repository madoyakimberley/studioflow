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
if (fs.existsSync(cliEnvPath)) dotenv.config({ path: cliEnvPath });
else if (fs.existsSync(cwdEnvPath)) dotenv.config({ path: cwdEnvPath });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class EngineDaemonWorker {
  constructor(dbConnectionString, workspaceId) {
    this.connectionString = dbConnectionString;
    this.workspaceId = workspaceId;
    this.poolInstance = null;
    this.redis = null;
    this.isProcessing = false;
    this.dbBreaker = new SystemCircuitBreaker("Database Connection", 3, 5000);
  }

  // SMART TABLE MIGRATION – adds missing columns, no data loss
  async ensureTablesExist() {
    console.log(
      `   ${c.magenta}⚙️  Table Migration:${c.reset} Verifying and upgrading schema...`,
    );

    // We only need provisioning_jobs for the queue, but we keep projects for compatibility.
    const projectColumns = {
      id: "INT AUTO_INCREMENT PRIMARY KEY",
      workspace_id: "INT NOT NULL",
      client_id: "INT NOT NULL",
      name: "VARCHAR(255) NOT NULL",
      slug: "VARCHAR(255) NOT NULL UNIQUE",
      frontend_framework: "VARCHAR(50) DEFAULT 'dynamic'",
      backend_framework: "VARCHAR(50) DEFAULT 'dynamic'",
      database_provider: "VARCHAR(50) DEFAULT 'dynamic'",
      folder_structure: "VARCHAR(50) DEFAULT 'monorepo'",
      deployment_target: "VARCHAR(50) DEFAULT 'custom'",
      universal_manifest: "JSON NOT NULL",
      blueprint_yaml: "TEXT",
      status: "VARCHAR(50) DEFAULT 'planning'",
      live_url: "VARCHAR(255)",
      github_repo: "VARCHAR(255)",
      payment_status: "VARCHAR(50) DEFAULT 'pending'",
      progress_percentage: "INT DEFAULT 0",
      mvp_edit_count: "INT DEFAULT 0",
      client_email: "VARCHAR(255) NOT NULL",
      portal_verification_code: "VARCHAR(6)",
      portal_code_expires_at: "TIMESTAMP",
      portal_last_code_sent_at: "TIMESTAMP",
      portal_emails_sent_count: "INT DEFAULT 0",
      portal_link_sent_count: "INT DEFAULT 0",
      created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    };

    const jobColumns = {
      id: "INT AUTO_INCREMENT PRIMARY KEY",
      project_id: "INT NOT NULL",
      workspace_id: "INT NOT NULL", // added for filtering
      idempotency_key: "VARCHAR(255) NOT NULL UNIQUE",
      status: "VARCHAR(50) DEFAULT 'pending'",
      manifest: "JSON NOT NULL",
      execution_logs: "TEXT",
      created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      started_at: "TIMESTAMP",
      completed_at: "TIMESTAMP",
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
        // Use IF NOT EXISTS – safe to run even if column exists
        await this.poolInstance.query(
          `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${definition}`,
        );
      }
    }

    // projects
    const projectsExists = await this.poolInstance.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'projects' AND TABLE_SCHEMA = DATABASE()`,
    );
    if (projectsExists[0].length === 0) {
      const createSQL = `CREATE TABLE projects (${Object.entries(projectColumns)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")})`;
      await this.poolInstance.query(createSQL);
      console.log(`   ${c.green}✅ projects table created.${c.reset}`);
    } else {
      await addMissingColumns.call(this, "projects", projectColumns);
      console.log(`   ${c.green}✅ projects table up to date.${c.reset}`);
    }

    // provisioning_jobs
    const jobsExists = await this.poolInstance.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'provisioning_jobs' AND TABLE_SCHEMA = DATABASE()`,
    );
    if (jobsExists[0].length === 0) {
      const createSQL = `CREATE TABLE provisioning_jobs (${Object.entries(
        jobColumns,
      )
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")})`;
      await this.poolInstance.query(createSQL);
      console.log(`   ${c.green}✅ provisioning_jobs table created.${c.reset}`);
    } else {
      // Ensure workspace_id column exists (critical fix)
      await addMissingColumns.call(this, "provisioning_jobs", jobColumns);
      console.log(
        `   ${c.green}✅ provisioning_jobs table up to date.${c.reset}`,
      );
    }

    console.log(`   ${c.dim}→ Tables are ready.${c.reset}`);
  }

  async initializeConnections() {
    try {
      console.log(
        `\n${c.cyan}===========================================${c.reset}`,
      );
      console.log(
        `${c.bold}${c.cyan} 🚀 STUDIOFLOW SYSTEM INITIALIZATION ${c.reset}`,
      );
      console.log(
        `${c.cyan}===========================================${c.reset}`,
      );
      console.log(
        `\n${c.yellow}🔔 [System Check]${c.reset} We're preparing to initialize your environment.`,
      );
      console.log(`${c.dim}Verifying database connectivity...${c.reset}\n`);

      console.log(
        `   ${c.magenta}⚙️  Phase 1:${c.reset} Testing database connection pool...`,
      );

      let parsedUrl;
      try {
        parsedUrl = new URL(this.connectionString);
        const maskedHost = parsedUrl.hostname;
        const maskedUser = parsedUrl.username || "(not set)";
        console.log(
          `   ${c.dim}→ Target: ${maskedUser}@${maskedHost}${c.reset}`,
        );
      } catch (parseErr) {
        console.error(
          `   ${c.red}✖ Invalid DATABASE_URL format:${c.reset} ${parseErr.message}`,
        );
        throw parseErr;
      }

      let sslConfig = undefined;
      if (
        parsedUrl.hostname !== "localhost" &&
        parsedUrl.hostname !== "127.0.0.1"
      ) {
        sslConfig = { rejectUnauthorized: true };
        console.log(`   ${c.dim}→ SSL enabled (non-localhost)${c.reset}`);
      }

      const dbName = parsedUrl.pathname.replace("/", "") || undefined;

      try {
        this.poolInstance = mysql.createPool({
          uri: this.connectionString,
          database: dbName,
          ssl: sslConfig,
          waitForConnections: true,
          connectionLimit: 5,
          queueLimit: 0,
          connectTimeout: 15000,
        });
        console.log(`   ${c.green}✓ Pool created successfully.${c.reset}`);
      } catch (poolErr) {
        console.error(
          `   ${c.red}✖ Failed to create connection pool:${c.reset} ${poolErr.message}`,
        );
        throw poolErr;
      }

      await this.dbBreaker.execute(async () => {
        try {
          console.log(`   ${c.dim}→ Sending SELECT 1...${c.reset}`);
          const [rows] = await this.poolInstance.query("SELECT 1");
          console.log(
            `   ${c.green}✅ Phase 1:${c.reset} Connection established. Response: ${JSON.stringify(rows)}`,
          );
          console.log(`   ${c.dim}→ All systems go.${c.reset}\n`);
        } catch (queryErr) {
          console.error(
            `   ${c.red}✖ Query failed:${c.reset} ${queryErr.message}`,
          );
          if (queryErr.code) {
            console.error(`   ${c.dim}→ Code: ${queryErr.code}${c.reset}`);
          }
          if (queryErr.errno) {
            console.error(`   ${c.dim}→ errno: ${queryErr.errno}${c.reset}`);
          }
          if (queryErr.sqlMessage) {
            console.error(
              `   ${c.dim}→ SQL Message: ${queryErr.sqlMessage}${c.reset}`,
            );
          }
          if (
            queryErr.message.includes("ER_ACCESS_DENIED_ERROR") ||
            queryErr.message.includes("Access denied")
          ) {
            console.error(
              `   ${c.yellow}💡 Hint: Check your database username and password.${c.reset}`,
            );
          } else if (
            queryErr.message.includes("ECONNREFUSED") ||
            queryErr.message.includes("ENOTFOUND")
          ) {
            console.error(
              `   ${c.yellow}💡 Hint: The database host is unreachable. Is it running?${c.reset}`,
            );
          } else if (queryErr.message.includes("ETIMEDOUT")) {
            console.error(
              `   ${c.yellow}💡 Hint: Connection timed out. Verify network/firewall.${c.reset}`,
            );
          }
          throw queryErr;
        }
      });

      // PHASE 2: SMART TABLE MIGRATION
      await this.ensureTablesExist();

      // Redis (optional)
      if (process.env.REDIS_URL) {
        console.log(
          `   ${c.magenta}⚙️  Redis:${c.reset} Connecting to Redis...`,
        );
        try {
          this.redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 2,
          });
          this.redis.on("error", (err) => {
            console.warn(
              `   ${c.yellow}⚠️ Redis warning:${c.reset} ${err.message}`,
            );
          });
          console.log(`   ${c.green}✅ Redis connected.${c.reset}`);
        } catch (redisErr) {
          console.warn(
            `   ${c.yellow}⚠️ Redis not available:${c.reset} ${redisErr.message}`,
          );
        }
      } else {
        console.log(`   ${c.dim}→ Redis not configured (skipping).${c.reset}`);
      }

      console.log(
        `\n${c.green}✅ Initialization complete. Worker is ready.${c.reset}\n`,
      );
    } catch (err) {
      console.error(`\n${c.red}❌ Critical Startup Failure:${c.reset}`);
      console.error(`   ${c.dim}${err.stack || err.message}${c.reset}`);
      console.error(
        `\n${c.yellow}Please verify your DATABASE_URL and ensure the database is accessible.${c.reset}`,
      );
      process.exit(1);
    }
  }

  async appendJobLog(jobId, logText) {
    console.log(`   ${c.dim}[JOB-${jobId}]:${c.reset} ${logText}`);
    try {
      if (this.poolInstance) {
        await this.poolInstance
          .execute(
            "UPDATE provisioning_jobs SET execution_logs = CONCAT(COALESCE(execution_logs, ''), ?) WHERE id = ?",
            [`\n[${new Date().toISOString()}] ${logText}`, jobId],
          )
          .catch(() => {});
      }
    } catch (e) {}
  }

  async runProcessingCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.dbBreaker.execute(async () => {
        let jobs;

        try {
          // Query central DB for pending jobs of this workspace
          const queryStr = `
            SELECT * FROM provisioning_jobs
            WHERE workspace_id = ? AND status = 'pending'
            ORDER BY id ASC LIMIT 1
          `;
          // Debug logging
          console.log(
            `   ${c.dim}🔍 Polling central DB for workspace ${this.workspaceId}...${c.reset}`,
          );
          [jobs] = await this.poolInstance.execute(queryStr, [
            this.workspaceId,
          ]);
          if (!jobs || jobs.length === 0) {
            console.log(`   ${c.dim}→ No pending jobs found.${c.reset}`);
            return;
          }
          console.log(
            `   ${c.green}✅ Found ${jobs.length} pending job(s).${c.reset}`,
          );
        } catch (dbErr) {
          console.error(
            `\n${c.red}🚨 Database error while fetching jobs:${c.reset} ${dbErr.message}`,
          );
          throw dbErr;
        }

        const currentJob = jobs[0];
        let manifest;
        try {
          manifest =
            typeof currentJob.manifest === "string"
              ? JSON.parse(currentJob.manifest)
              : currentJob.manifest;
        } catch (parseErr) {
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'failed', execution_logs = 'Failed to parse JSON manifest.' WHERE id = ?",
            [currentJob.id],
          );
          return;
        }

        const projectSlug = manifest.slug || manifest.projectName;
        console.log(
          `\n${c.cyan}===========================================${c.reset}`,
        );
        console.log(
          `${c.bold} 🚀 Initiating Provisioning: ${projectSlug} ${c.reset}`,
        );
        console.log(
          `${c.cyan}===========================================${c.reset}\n`,
        );

        // Update job status to 'processing'
        await this.poolInstance.execute(
          "UPDATE provisioning_jobs SET status = 'processing' WHERE id = ?",
          [currentJob.id],
        );

        try {
          // Get tenant DB URL from environment
          const tenantDbUrl =
            process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL;

          const scaffolder = new MultiStackTemplateScaffolder(
            projectSlug,
            manifest,
            tenantDbUrl,
          );

          await this.appendJobLog(
            currentJob.id,
            "Checking local directory clearance...",
          );
          const clearanceVerified = await scaffolder.verifyClearance();
          if (!clearanceVerified) {
            throw new Error(
              `The folder name '${projectSlug}' is already taken on your machine.`,
            );
          }

          await this.appendJobLog(
            currentJob.id,
            "Scaffolding codebase and running installations...",
          );
          await scaffolder.processExecutionPipeline();

          // Mark job as completed
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            [currentJob.id],
          );

          console.log(
            `\n${c.green}✅ Pipeline completed successfully for ${projectSlug}.${c.reset}\n`,
          );
        } catch (jobExecutionError) {
          console.error(
            `\n${c.red}❌ Pipeline Exception:${c.reset} ${jobExecutionError.message}\n`,
          );
          await this.appendJobLog(
            currentJob.id,
            `CRITICAL ERROR: ${jobExecutionError.message}`,
          );
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'failed' WHERE id = ?",
            [currentJob.id],
          );
        }
      });
    } catch (breakerError) {
      console.error(
        `\n${c.red}🚨 Execution aborted by Circuit Breaker:${c.reset} ${breakerError.message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async bootDaemonLoop() {
    await this.initializeConnections();
    console.log(
      `\n${c.dim}📡 Background worker listening for jobs on Workspace [${this.workspaceId}]...${c.reset}`,
    );

    if (this.redis) {
      this.redis.subscribe("provisioning_queue", (err) => {
        if (!err) {
          this.redis.on("message", (channel, message) => {
            try {
              const parsed = JSON.parse(message);
              if (parsed.event === "NEW_JOB") {
                if (
                  parsed.workspaceId &&
                  Number(parsed.workspaceId) !== Number(this.workspaceId)
                ) {
                  return;
                }
                // Wake up immediately
                this.runProcessingCycle();
              }
            } catch (e) {}
          });
        }
      });
    }

    setInterval(() => this.runProcessingCycle(), 5000);
    this.runProcessingCycle();
  }
}

// =========================================================================
// ROUTING MATRICES: Auth & CLI Commands
// =========================================================================

function getBaseApiUrl() {
  const rawAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://studioflow-dashboard.onrender.com";

  let cleanAppUrl = rawAppUrl.replace(/\/$/, "");

  if (!cleanAppUrl.startsWith("http")) {
    cleanAppUrl = `https://${cleanAppUrl}`;
  }

  return `${cleanAppUrl}/api/cli/sync`;
}

function showHelp() {
  console.log(
    `\n${c.cyan}===========================================${c.reset}`,
  );
  console.log(`${c.bold} StudioFlow CLI Commands ${c.reset}`);
  console.log(
    `${c.cyan}===========================================${c.reset}\n`,
  );
  console.log(
    `  ${c.green}studioflow${c.reset}               Start the background worker`,
  );
  console.log(
    `  ${c.green}studioflow login${c.reset}         Authenticate your machine`,
  );
  console.log(
    `  ${c.green}studioflow logout${c.reset}        Clear credentials`,
  );
  console.log(
    `  ${c.green}studioflow --help${c.reset}        Show this guide\n`,
  );
  process.exit(0);
}

function handleLogout() {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    fs.unlinkSync(CONFIG_FILE_PATH);
    console.log(
      `\n${c.green}✅ You have been securely logged out.${c.reset}\n`,
    );
  } else {
    console.log(`\n${c.dim}ℹ️ You were already logged out.${c.reset}\n`);
  }
  process.exit(0);
}

async function handleAuthenticationLogin() {
  console.log(
    `\n${c.cyan}===========================================${c.reset}`,
  );
  console.log(`${c.bold} StudioFlow Remote Authentication ${c.reset}`);
  console.log(
    `${c.cyan}===========================================${c.reset}\n`,
  );

  rl.question(
    `🔑 Enter your Developer CLI Token (sf_pat_...): `,
    async (token) => {
      const rawToken = token.trim();
      if (!rawToken) {
        console.log(`\n${c.red}❌ No token provided. Exiting.${c.reset}`);
        process.exit(1);
      }

      console.log(
        `\n${c.dim}⏳ Verifying token with StudioFlow Cloud...${c.reset}`,
      );

      try {
        const apiUrl = getBaseApiUrl();
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${rawToken}` },
        });

        if (!res.ok) {
          console.log(
            `\n${c.red}❌ Authentication Failed:${c.reset} Invalid or expired token.`,
          );
          console.log(`${c.dim}Error Code: ${res.status}${c.reset}\n`);
          process.exit(1);
        }

        const envData = await res.json();
        const workspaceId = envData.workspaceId;

        if (!fs.existsSync(STUDIOFLOW_HOME)) {
          fs.mkdirSync(STUDIOFLOW_HOME, { recursive: true });
        }

        fs.writeFileSync(
          CONFIG_FILE_PATH,
          JSON.stringify({ token: rawToken, workspaceId }, null, 2),
        );

        console.log(`\n${c.green}✅ Credentials Verified!${c.reset}`);
        console.log(`Configuration saved to: ${CONFIG_FILE_PATH}\n`);
        console.log(
          `You can now run ${c.cyan}'studioflow'${c.reset} to start the daemon.\n`,
        );
        process.exit(0);
      } catch (networkErr) {
        console.log(
          `\n${c.red}❌ Network Error:${c.reset} Could not reach StudioFlow Cloud.`,
        );
        process.exit(1);
      }
    },
  );
}

async function fetchRemoteConfiguration() {
  if (!fs.existsSync(CONFIG_FILE_PATH)) return false;

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf-8"));
    if (!config.token) return false;

    if (config.workspaceId) {
      process.env.WORKSPACE_ID = config.workspaceId;
    }

    const apiUrl = getBaseApiUrl();
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!res.ok) {
      console.error(
        `\n${c.red}❌ Session Expired:${c.reset} Your CLI token was rejected by the server.`,
      );
      console.error(
        `Please run ${c.cyan}'studioflow login'${c.reset} again.\n`,
      );
      process.exit(1);
    }

    const envData = await res.json();

    // -------- CRITICAL: Set central queue DB URL ----------
    if (envData.queueDatabaseUrl) {
      process.env.DATABASE_URL = envData.queueDatabaseUrl;
      console.log(
        `   ${c.dim}→ Queue DB set to: ${envData.queueDatabaseUrl.replace(/\/\/.*@/, "//***@")}${c.reset}`,
      );
    } else if (envData.databaseUrl) {
      // Fallback to old field for backward compatibility
      process.env.DATABASE_URL = envData.databaseUrl;
      console.log(
        `   ${c.dim}→ Queue DB (fallback) set to: ${envData.databaseUrl.replace(/\/\/.*@/, "//***@")}${c.reset}`,
      );
    } else {
      console.error(
        `\n${c.red}❌ No database URL provided by sync endpoint.${c.reset}`,
      );
      return false;
    }

    // -------- Tenant DB URL for generated projects ----------
    if (envData.tenantDatabaseUrl) {
      process.env.TENANT_DATABASE_URL = envData.tenantDatabaseUrl;
    } else if (envData.databaseUrl) {
      // If no separate tenant URL, use the same as queue (fallback)
      process.env.TENANT_DATABASE_URL = envData.databaseUrl;
    }

    // Update workspaceId
    if (envData.workspaceId) {
      process.env.WORKSPACE_ID = envData.workspaceId;
      if (!config.workspaceId || config.workspaceId !== envData.workspaceId) {
        config.workspaceId = envData.workspaceId;
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
      }
    }

    if (envData.redisUrl) process.env.REDIS_URL = envData.redisUrl;
    if (envData.targetOutputDir)
      process.env.TARGET_OUTPUT_DIR = envData.targetOutputDir;
    if (envData.githubToken) process.env.GITHUB_TOKEN = envData.githubToken;
    // Add other env vars as needed

    console.log(`${c.green}✅ Cloud settings downloaded and mapped.${c.reset}`);
    return true;
  } catch (err) {
    console.error(
      `\n${c.red}❌ Sync Error:${c.reset} Failed to communicate with StudioFlow Cloud.`,
    );
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "--help" || command === "-h" || command === "help")
    return showHelp();
  if (command === "login") return handleAuthenticationLogin();
  if (command === "logout") return handleLogout();

  const isTokenAuthed = await fetchRemoteConfiguration();

  if (!isTokenAuthed) {
    console.error(
      `\n${c.red}❌ Authentication Error:${c.reset} No valid session found.`,
    );
    console.error(
      `Please run ${c.cyan}'studioflow login'${c.reset} to connect.\n`,
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
      const daemon = new EngineDaemonWorker(
        process.env.DATABASE_URL,
        process.env.WORKSPACE_ID,
      );
      await daemon.bootDaemonLoop();
    } else {
      console.log(`\n${c.dim}Exiting...${c.reset}\n`);
      process.exit(0);
    }
  });
}

main();
