#!/usr/bin/env node

import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import readline from "readline";
import Redis from "ioredis";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { CommandProcessExecutor } from "./src/CommandProcessExecutor.js";
import { SystemCircuitBreaker } from "./src/SystemCircuitBreaker.js";
import { MultiStackTemplateScaffolder } from "./src/MultiStackTemplateScaffolder.js";

// Ensure compatibility for ES Modules to find the absolute directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Advanced Environment Resolution Sequence
const cliEnvPath = path.resolve(__dirname, ".env");
const cwdEnvPath = path.resolve(process.cwd(), ".env");
const monorepoEnvPath = path.resolve(__dirname, "../../.env");

let loadedEnvPath = null;

if (fs.existsSync(cliEnvPath)) {
  dotenv.config({ path: cliEnvPath });
  loadedEnvPath = cliEnvPath;
} else if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
  loadedEnvPath = cwdEnvPath;
} else if (fs.existsSync(monorepoEnvPath)) {
  dotenv.config({ path: monorepoEnvPath });
  loadedEnvPath = monorepoEnvPath;
}

class EngineDaemonWorker {
  constructor(dbConnectionString) {
    this.connectionString = dbConnectionString;
    this.activeExecutionState = false;
    this.poolInstance = null;
    this.isProcessing = false;
    this.redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
    this.breaker = new SystemCircuitBreaker("VCS_Gateway_Node", 3, 5000);
  }

  async initializeConnections() {
    this.poolInstance = mysql.createPool({
      uri: this.connectionString,
      waitForConnections: true,
      connectionLimit: 3,
      ssl: { rejectUnauthorized: true },
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }

  async fetchOldestPendingJob() {
    const queryStatement = `
      SELECT j.*, p.slug as project_slug 
      FROM provisioning_jobs j 
      JOIN projects p ON j.project_id = p.id 
      WHERE j.status = 'pending' 
      ORDER BY j.created_at ASC 
      LIMIT 1
    `;
    const [rows] = await this.poolInstance.query(queryStatement);
    return rows.length > 0 ? rows[0] : null;
  }

  async appendJobLog(jobId, message) {
    const timestamp = new Date().toISOString();
    const formattedLog = `[INFO] [${timestamp}] ${message}\n`;
    await this.poolInstance.query(
      `UPDATE provisioning_jobs SET execution_logs = CONCAT(COALESCE(execution_logs, ''), ?) WHERE id = ?`,
      [formattedLog, jobId],
    );
  }

  async updateJobState(jobId, targetStatus) {
    const timeColumnUpdate =
      targetStatus === "in-progress"
        ? ", started_at = NOW()"
        : targetStatus === "completed"
          ? ", completed_at = NOW()"
          : "";

    await this.poolInstance.query(
      `UPDATE provisioning_jobs SET status = ?${timeColumnUpdate} WHERE id = ?`,
      [targetStatus, jobId],
    );
  }

  async markJobFailed(jobId, projectId, phase, error, outputBuffer = "") {
    const timestamp = new Date().toISOString();
    const stackTrace = error?.stack || error?.message || String(error);

    const crashReport =
      `\n=======================================================\n` +
      `❌ CRITICAL ENGINE FAILURE DETECTED\n` +
      `=======================================================\n` +
      `Timestamp: ${timestamp}\n` +
      `Phase:     ${phase}\n` +
      `-------------------------------------------------------\n` +
      `STACK TRACE / ERROR DETAILS:\n${stackTrace}\n` +
      (outputBuffer
        ? `-------------------------------------------------------\nPROCESS OUTPUT:\n${outputBuffer}\n`
        : "") +
      `=======================================================\n`;

    console.error(crashReport);

    await this.poolInstance.query(
      `UPDATE provisioning_jobs SET status = 'failed', execution_logs = CONCAT(COALESCE(execution_logs, ''), ?) WHERE id = ?`,
      [crashReport, jobId],
    );
    await this.updateProjectTrackingPercentage(projectId, 100, "unhealthy");
  }

  async updateProjectTrackingPercentage(
    projectId,
    progressInt,
    statusString,
    liveUrl = null,
  ) {
    if (liveUrl) {
      await this.poolInstance.query(
        `UPDATE projects SET progress_percentage = ?, status = ?, live_url = ? WHERE id = ?`,
        [progressInt, statusString, liveUrl, projectId],
      );
    } else {
      await this.poolInstance.query(
        `UPDATE projects SET progress_percentage = ?, status = ? WHERE id = ?`,
        [progressInt, statusString, projectId],
      );
    }
  }

  async processingLoopSequence() {
    const job = await this.fetchOldestPendingJob();
    if (!job) return;

    const manifestPayload =
      typeof job.manifest === "string"
        ? JSON.parse(job.manifest)
        : job.manifest;

    console.log(
      `\n⚡ Processing Job Request #${job.id} -> Constructing App Domain: apps/${job.project_slug}`,
    );

    await this.updateJobState(job.id, "in-progress");
    await this.appendJobLog(
      job.id,
      `Initialization token accepted. Launching Custom Blueprint Scaffolder Engine for apps/${job.project_slug}.`,
    );
    await this.updateProjectTrackingPercentage(
      job.project_id,
      25,
      "provisioning",
    );

    const scaffolder = new MultiStackTemplateScaffolder(
      job.project_slug,
      manifestPayload,
    );

    const spaceIsClear = await scaffolder.verifyClearance();
    if (!spaceIsClear) {
      await this.markJobFailed(
        job.id,
        job.project_id,
        "Workspace Verification",
        new Error(
          `Target directory is already occupied at ${scaffolder.targetPath}`,
        ),
      );
      return;
    }

    try {
      console.log(` -> Injecting system layout architecture templates...`);
      await scaffolder.writeBoilerplateFiles();
      await this.appendJobLog(
        job.id,
        `Architecture templates injected successfully matching manifest directives.`,
      );
      await this.updateProjectTrackingPercentage(
        job.project_id,
        65,
        "injecting",
      );
    } catch (err) {
      await scaffolder.cleanupFailedRun();
      await this.markJobFailed(
        job.id,
        job.project_id,
        "Template Injection",
        err,
      );
      return;
    }

    try {
      console.log(
        ` -> Executing background pnpm system asset validation tree synchronization...\n`,
      );
      await this.appendJobLog(
        job.id,
        `Initiating package manager dependency installation (pnpm)...`,
      );

      const installResult = await CommandProcessExecutor.runCommand(
        "pnpm install --no-frozen-lockfile --ignore-scripts",
        scaffolder.targetPath,
      );

      if (!installResult.success) {
        await scaffolder.cleanupFailedRun();
        await this.markJobFailed(
          job.id,
          job.project_id,
          "PNPM Vendor Installation",
          new Error("Child process exited with a non-zero code."),
          installResult.output,
        );
        return;
      }

      console.log(`\n✅ Dependencies synchronized successfully.`);
      await this.appendJobLog(job.id, `Dependencies installed successfully.`);

      if (
        manifestPayload.backendFramework === "fastapi" ||
        manifestPayload.backendFramework === "flask"
      ) {
        await this.appendJobLog(
          job.id,
          `Provisioning decoupled Python environment via uv context...`,
        );
        await scaffolder.provisionPythonEnvironment();
      }
    } catch (err) {
      await scaffolder.cleanupFailedRun();
      await this.markJobFailed(
        job.id,
        job.project_id,
        "PNPM/Python Vendor Installation Exception",
        err,
      );
      return;
    }

    try {
      await this.appendJobLog(
        job.id,
        `Configuring Git and pushing to remote registry...`,
      );
      await scaffolder.setupGitRepository();
    } catch (err) {
      await this.markJobFailed(
        job.id,
        job.project_id,
        "Git Tracking / GitHub API Upload",
        err,
      );
      return;
    }

    try {
      const deployProvider = scaffolder.deploymentTarget;
      let finalUrl = null;

      if (deployProvider === "render") {
        await this.appendJobLog(
          job.id,
          `Triggering Render REST API for Zero-Touch Deployment...`,
        );
        const actualLiveUrl = await scaffolder.deployToRenderAPI();
        finalUrl =
          actualLiveUrl || `https://${job.project_slug}-dashboard.onrender.com`;

        console.log(
          `✅ System allocation successful for ${job.project_slug} on Render.`,
        );
        await this.appendJobLog(
          job.id,
          `Ecosystem generated smoothly. Live environment provisioning started on Render.`,
        );
      } else if (deployProvider === "railway") {
        console.log(
          `✅ System allocation successful for ${job.project_slug} with Railway Blueprint.`,
        );
        await this.appendJobLog(
          job.id,
          `Ecosystem generated smoothly. Railway layout tracking file injected successfully.`,
        );
      } else {
        console.log(
          `✅ System allocation successful for ${job.project_slug} (Local Worksite Environment Mode).`,
        );
        await this.appendJobLog(
          job.id,
          `Ecosystem generated smoothly. Cloud triggers skipped per architectural manifest settings.`,
        );
      }

      await this.updateJobState(job.id, "completed");
      await this.updateProjectTrackingPercentage(
        job.project_id,
        100,
        "active",
        finalUrl,
      );
    } catch (err) {
      await this.markJobFailed(
        job.id,
        job.project_id,
        "Cloud Resource Deployment Drop",
        err,
      );
      return;
    }
  }

  async startupEngine() {
    console.log(
      "\n⚡==========================================================================",
    );
    console.log(
      "🟢 STUDIOFLOW MULTI-TENANT UNIVERSAL DAEMON ENGINE SUITE OPERATIONAL",
    );
    console.log(
      "⚙️  Running deep monitoring sweeps across polymorphic target adapter pipelines...",
    );
    console.log(
      "============================================================================\n",
    );
    this.activeExecutionState = true;
    await this.initializeConnections();

    await this.redis.subscribe("provisioning_queue");

    this.redis.on("message", async (channel, message) => {
      if (channel === "provisioning_queue") {
        if (!this.isProcessing) {
          this.isProcessing = true;
          console.log(`🔔 New job event detected, triggering sequence...`);
          try {
            await this.processingLoopSequence();
          } catch (loopError) {
            console.error(
              "🚨 Daemon processing engine dropped loop iteration step:",
              loopError.message,
            );
          } finally {
            this.isProcessing = false;
          }
        } else {
          console.log(
            `🔔 Job event received, but engine is busy. Job remains in queue.`,
          );
        }
      }
    });

    setInterval(async () => {
      if (!this.isProcessing && this.activeExecutionState) {
        try {
          const fallbackJobCheck = await this.fetchOldestPendingJob();
          if (fallbackJobCheck) {
            this.isProcessing = true;
            console.log(
              `🔔 Database polling sweep detected a new job entry #${fallbackJobCheck.id}, triggering sequence...`,
            );
            await this.processingLoopSequence();
          }
        } catch (pollError) {
        } finally {
          this.isProcessing = false;
        }
      }
    }, 4000);

    if (!this.isProcessing) {
      this.isProcessing = true;
      try {
        await this.processingLoopSequence();
      } catch (err) {
        console.error("Startup check error", err);
      } finally {
        this.isProcessing = false;
      }
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function fetchProjectsFromTiDB() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 1,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const [rows] = await pool.query(
      "SELECT id, name, slug FROM projects ORDER BY created_at DESC LIMIT 20",
    );
    return rows;
  } catch (err) {
    console.error("❌ Failed to query database: ", err.message);
    return [];
  } finally {
    await pool.end();
  }
}

async function fetchLatestJobManifest(projectId) {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 1,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const [rows] = await pool.query(
      "SELECT manifest FROM provisioning_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
      [projectId],
    );
    if (rows.length > 0) {
      const manifest = rows[0].manifest;
      return typeof manifest === "string" ? JSON.parse(manifest) : manifest;
    }
    return null;
  } catch (err) {
    console.error(
      "❌ Failed to pull workspace manifest data from DB: ",
      err.message,
    );
    return null;
  } finally {
    await pool.end();
  }
}

async function insertProvisioningJob(projectId, manifest) {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 1,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const idempotencyKey = `scaffold-${projectId}-${Date.now()}`;
    await pool.query(
      "INSERT INTO provisioning_jobs (project_id, idempotency_key, status, manifest, execution_logs) VALUES (?, ?, 'completed', ?, ?)",
      [
        projectId,
        idempotencyKey,
        JSON.stringify(manifest),
        `[INFO] Manually initialized structural workspace sync via interactive CLI.\n`,
      ],
    );
    console.log(
      `✅ Structural wizard manifest settings successfully saved to provisioning_jobs.`,
    );
  } catch (err) {
    console.error(
      "⚠️ Database sync failure writing job manifest matrix:",
      err.message,
    );
  } finally {
    await pool.end();
  }
}

async function projectSelectionWizard(promptAction) {
  const projects = await fetchProjectsFromTiDB();

  if (projects.length === 0) {
    console.log(
      `\n❌ No projects found in Database. Please create one in the dashboard first.`,
    );
    return null;
  }

  console.log(`\n--- Active StudioFlow Workspaces ---`);
  projects.forEach((p, index) => {
    console.log(` [${index + 1}] ${p.name} (apps/${p.slug})`);
  });
  console.log(` [0] Enter a custom slug manually`);

  const selection = await askQuestion(
    `\nSelect a project to ${promptAction} (0-${projects.length}): `,
  );
  const index = parseInt(selection);

  if (index === 0) {
    const customSlug = await askQuestion("Enter your custom project slug: ");
    return { id: null, name: customSlug, slug: customSlug };
  }

  if (isNaN(index) || index < 1 || index > projects.length) {
    console.log("❌ Invalid selection.");
    return null;
  }

  return projects[index - 1];
}

async function runInteractiveMenu() {
  console.log(`\n===========================================`);
  console.log(`      StudioFlow CLI Command Center        `);
  console.log(`===========================================`);
  console.log(` 1. Run Background Daemon (Queue Watcher)  `);
  console.log(` 2. Initialize a Manual Project Scaffold   `);
  console.log(` 3. Push Updates to Existing GitHub Repo   `);
  console.log(` 4. Exit Engine                            `);
  console.log(`===========================================\n`);

  const answer = await askQuestion("Select an operation target [1-4]: ");

  if (answer === "1") {
    const workerInstance = new EngineDaemonWorker(process.env.DATABASE_URL);
    await workerInstance.startupEngine();
  } else if (answer === "2") {
    const project = await projectSelectionWizard("scaffold");
    if (!project) {
      return await runInteractiveMenu();
    }

    const slug = project.slug;
    console.log(`\n[i] Bypassing queue to manually initialize apps/${slug}...`);

    let manifestPayload = null;
    if (project.id) {
      manifestPayload = await fetchLatestJobManifest(project.id);
    }

    if (manifestPayload) {
      console.log(
        `🟢 Found active design configuration matrix within Cloud Database!`,
      );
      console.log(
        `   - Project Target: ${manifestPayload.projectName || slug}`,
      );
      console.log(
        `   - Frontend Stack: ${manifestPayload.frontendFramework || "None"}`,
      );
      console.log(
        `   - Backend Architecture: ${manifestPayload.backendFramework || "None"}`,
      );
      console.log(`   - Core Database:  ${manifestPayload.database}`);
      console.log(
        `   - Infrastructure Deployment Host: ${manifestPayload.deploymentTarget || manifestPayload.deploymentProvider || manifestPayload.deployment || "None"}`,
      );

      const confirmDbManifest = await askQuestion(
        "\nApply this remote structural profile configuration? (y/n): ",
      );
      if (confirmDbManifest.toLowerCase() !== "y") {
        manifestPayload = null;
      }
    }

    if (!manifestPayload) {
      console.log(`\n--- Interactive Blueprint Matrix Wizard ---`);

      const frontendChoice = await askQuestion(
        "Select Frontend Framework ([1] Next.js, [2] React SPA): ",
      );
      const frontendFramework = frontendChoice === "2" ? "react" : "nextjs";

      const backendChoice = await askQuestion(
        "Select Backend Architecture ([1] Node.js/Express, [2] Python FastAPI, [3] Python Flask, [4] None): ",
      );
      let backendFramework = "none";
      if (backendChoice === "1") backendFramework = "express";
      if (backendChoice === "2") backendFramework = "fastapi";
      if (backendChoice === "3") backendFramework = "flask";

      const dbChoice = await askQuestion(
        "Select Database Module Architecture ([1] PostgreSQL, [2] MySQL, [3] SQLite, [4] None): ",
      );
      let database = "none";
      if (dbChoice === "1") database = "postgres";
      if (dbChoice === "2") database = "mysql";
      if (dbChoice === "3") database = "sqlite";

      const folderChoice = await askQuestion(
        "Select Topology Structure ([1] Turborepo Monorepo, [2] Flat Client/Server): ",
      );
      const folderStructure = folderChoice === "2" ? "src_flat" : "monorepo";

      console.log("\n[!] Select Deployment Automation Provider target:");
      console.log(" [1] Render (Automated Cloud Nodes Sync)");
      console.log(" [2] Railway (Nixpacks Blueprint Generation Only)");
      console.log(" [3] None (Pure Local Workspace Isolation)");
      const deployChoice = await askQuestion("Select Choice [1-3]: ");

      let deploymentProvider = "none";
      if (deployChoice === "1") deploymentProvider = "render";
      if (deployChoice === "2") deploymentProvider = "railway";

      manifestPayload = {
        slug,
        projectName: slug,
        frontendFramework,
        backendFramework,
        database,
        folderStructure,
        deploymentTarget: deploymentProvider,
        deploymentProvider,
        deployment: deploymentProvider,
        infrastructure: {},
      };

      if (project.id) {
        await insertProvisioningJob(project.id, manifestPayload);
      }
    }

    const scaffolder = new MultiStackTemplateScaffolder(slug, manifestPayload);

    const isClear = await scaffolder.verifyClearance();
    if (!isClear) {
      console.log(
        `❌ Target directory /apps/${slug} already exists. Aborting manual initialization.`,
      );
      return await runInteractiveMenu();
    }

    console.log(` -> Writing boilerplate matrices and target mappings...`);
    try {
      await scaffolder.writeBoilerplateFiles();
    } catch (err) {
      console.error(`❌ Template Injection Failed:\n`, err.stack);
      return await runInteractiveMenu();
    }

    console.log(` -> Running dependency installation...\n`);
    const installResult = await CommandProcessExecutor.runCommand(
      "pnpm install --no-frozen-lockfile --ignore-scripts",
      scaffolder.targetPath,
    );

    if (!installResult.success) {
      console.log(`❌ Dependency install failed:\n${installResult.output}`);
      await scaffolder.cleanupFailedRun();
    } else {
      try {
        if (
          manifestPayload.backendFramework === "fastapi" ||
          manifestPayload.backendFramework === "flask"
        ) {
          await scaffolder.provisionPythonEnvironment();
        }
        await scaffolder.setupGitRepository();

        const deployProvider = scaffolder.deploymentTarget;
        if (deployProvider === "render") {
          await scaffolder.deployToRenderAPI();
          console.log(
            `✅ System allocation completed manually for ${slug}. Render API pushed.`,
          );
        } else if (deployProvider === "railway") {
          console.log(
            `✅ System allocation completed manually for ${slug}. Railway architecture matrix loaded.`,
          );
        } else {
          console.log(
            `✅ System allocation completed manually for ${slug}. Workspace up in pure Local Mode.`,
          );
        }
      } catch (err) {
        console.error(`❌ Git / Environment Setup Failed:\n`, err.stack);
      }
    }
    return await runInteractiveMenu();
  } else if (answer === "3") {
    const project = await projectSelectionWizard("push to GitHub");
    if (!project) {
      return await runInteractiveMenu();
    }

    const slug = project.slug;
    const commitMsg = await askQuestion("\nEnter your commit message: ");

    const baseWorkspace =
      process.env.TARGET_OUTPUT_DIR || path.join(os.homedir(), "StudioFlow");
    const targetPath = path.join(baseWorkspace, slug);

    console.log(
      ` -> Pushing updates to https://github.com/madoyakimberley/${slug}.git...`,
    );
    await CommandProcessExecutor.runCommand("git add .", targetPath);
    await CommandProcessExecutor.runCommand(
      `git commit -m "${commitMsg}"`,
      targetPath,
    );
    const result = await CommandProcessExecutor.runCommand(
      "git push -u origin main",
      targetPath,
    );

    if (result.success) {
      console.log(`✅ Update cleanly pushed to GitHub registry.`);
    } else {
      console.log(
        `❌ Failed to push. (Ensure the repository exists on your GitHub account first)\nOutput: ${result.output}`,
      );
    }
    return await runInteractiveMenu();
  } else {
    console.log("Shutting down core engine node.");
    rl.close();
    process.exit(0);
  }
}

async function main() {
  const argumentInputs = process.argv.slice(2);
  const coreCommand = argumentInputs[0];

  const missingVars = [];
  if (!process.env.DATABASE_URL) missingVars.push("DATABASE_URL");
  if (!process.env.GITHUB_PAT && !process.env.GITHUB_TOKEN)
    missingVars.push("GITHUB_PAT or GITHUB_TOKEN");

  if (missingVars.length > 0) {
    console.error("\n❌ CRITICAL BOOT FAILURE: Missing Environment Variables");
    if (loadedEnvPath) {
      console.error(`   Loaded configuration from: ${loadedEnvPath}`);
    } else {
      console.error(
        `   Could not locate a .env file locally, or in the monorepo root.`,
      );
    }
    console.error(
      `\nPlease provide the following keys to execute this module:\n - ${missingVars.join("\n - ")}\n`,
    );
    process.exit(1);
  }

  if (coreCommand === "watch") {
    const workerInstance = new EngineDaemonWorker(process.env.DATABASE_URL);
    await workerInstance.startupEngine();
  } else {
    await runInteractiveMenu();
  }
}

main().catch(console.error);
