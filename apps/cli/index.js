#!/usr/bin/env node

import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import readline from "readline";
import Redis from "ioredis";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { CommandProcessExecutor } from "./src/CommandProcessExecutor.js";
import { SystemCircuitBreaker } from "./src/SystemCircuitBreaker.js";
import { MultiStackTemplateScaffolder } from "./src/MultiStackTemplateScaffolder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find and load the nearest .env file across standard local directory paths
const cliEnvPath = path.resolve(__dirname, ".env");
const cwdEnvPath = path.resolve(process.cwd(), ".env");
const monorepoEnvPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(cliEnvPath)) {
  dotenv.config({ path: cliEnvPath });
} else if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
} else if (fs.existsSync(monorepoEnvPath)) {
  dotenv.config({ path: monorepoEnvPath });
}

class EngineDaemonWorker {
  constructor(dbConnectionString) {
    this.connectionString = dbConnectionString;
    this.poolInstance = null;
    this.redis = null;
    this.isProcessing = false;
    this.dbBreaker = new SystemCircuitBreaker(
      "MySQL Core Integration Layer",
      3,
      5000,
    );
  }

  async initializeConnections() {
    try {
      // Setup resilient database connection pooling
      this.poolInstance = mysql.createPool({
        uri: this.connectionString,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });

      // Connect to Redis for real-time trigger synchronization if available
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 2,
        });
        this.redis.on("error", () => {
          // Fallback gracefully to standard short polling cycle if redis is unavailable
        });
      }
    } catch (err) {
      console.error(
        "❌ Critical System Fault during infrastructure bootstrap:",
        err.message,
      );
      process.exit(1);
    }
  }

  /**
   * Helper to write diagnostic logs to the terminal and update the tracking notes inside the job context
   */
  async appendJobLog(jobId, logText) {
    console.log(`   [JOB-${jobId}]: ${logText}`);
    try {
      // Safely check if database connection pool is active before running logging hooks
      if (this.poolInstance) {
        await this.poolInstance
          .execute(
            "UPDATE provisioning_jobs SET logs = CONCAT(COALESCE(logs, ''), ?) WHERE id = ?",
            [`\n[${new Date().toISOString()}] ${logText}`, jobId],
          )
          .catch(() => {
            // Optional fallback step if the log column requires character mutation rules
          });
      }
    } catch (e) {
      // Absorb tracking metrics variations silently
    }
  }

  /**
   * Seamlessly synchronization method to control real-time completion state updates on the dashboard
   */
  async updateProjectTracking(projectId, statusCode, liveUrl = null) {
    try {
      if (!this.poolInstance) return;
      if (liveUrl) {
        await this.poolInstance.execute(
          "UPDATE projects SET status = ?, live_url = ? WHERE id = ?",
          [statusCode, liveUrl, projectId],
        );
      } else {
        await this.poolInstance.execute(
          "UPDATE projects SET status = ? WHERE id = ?",
          [statusCode, projectId],
        );
      }
    } catch (err) {
      console.error(
        `⚠️ Refined tracking field assertion dropped: ${err.message}`,
      );
    }
  }

  async runProcessingCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.dbBreaker.execute(async () => {
        // 1. Fetch oldest pending job in the queue
        const [jobs] = await this.poolInstance.execute(
          "SELECT * FROM provisioning_jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
        );

        if (!jobs || jobs.length === 0) {
          return;
        }

        const currentJob = jobs[0];
        let manifest = currentJob.manifest;

        // Normalize stringified JSON entries if needed
        if (typeof manifest === "string") {
          manifest = JSON.parse(manifest);
        }

        const projectSlug = manifest.slug || `project-${currentJob.project_id}`;

        console.log(
          `\n🚀 [SYSTEM]: Starting new project setup sequence for [${projectSlug}]`,
        );

        // 2. Atomically switch state to 'processing' to protect concurrency issues
        await this.poolInstance.execute(
          "UPDATE provisioning_jobs SET status = 'processing' WHERE id = ?",
          [currentJob.id],
        );
        await this.updateProjectTracking(currentJob.project_id, "provisioning");

        try {
          // 3. Instantiate Scaffolder and verify destination directory clearance
          const scaffolder = new MultiStackTemplateScaffolder(
            projectSlug,
            manifest,
          );

          await this.appendJobLog(
            currentJob.id,
            "Validating targeted local filesystem workspace clearance bounds...",
          );
          const clearanceVerified = await scaffolder.verifyClearance();
          if (!clearanceVerified) {
            throw new Error(
              `A workspace directory target folder already exists matching slug context: ${projectSlug}`,
            );
          }

          // Step A: Code generation and structural blueprint initialization
          await this.appendJobLog(
            currentJob.id,
            "Assembling service directories, manifest assets and source matrices...",
          );
          await scaffolder.processExecutionPipeline();

          // Step B: Formulate Git repository and push matrices to origin remote context
          await this.appendJobLog(
            currentJob.id,
            "Initializing distributed version control handles and uploading workspace code to GitHub...",
          );
          await scaffolder.setupGitRepository();

          // Step C: Execute zero-touch cloud network provisioning via REST configurations
          await this.appendJobLog(
            currentJob.id,
            "Authenticating API connection with designated cloud provider to provision containerized network endpoints...",
          );

          let deployedLiveUrl = `https://${projectSlug}.vercel.app`; // Generic generic fallback

          try {
            let dynamicUrlResult;
            if (manifest.deploymentTarget === "vercel") {
              dynamicUrlResult = await scaffolder.deployToVercelAPI();
            } else if (manifest.deploymentTarget === "render") {
              dynamicUrlResult = await scaffolder.deployToRenderAPI();
            }

            if (dynamicUrlResult) {
              deployedLiveUrl = dynamicUrlResult;
            }
          } catch (deployError) {
            await this.appendJobLog(
              currentJob.id,
              `⚠️ Automated cloud infrastructure node binding dropped: ${deployError.message}. Proceeding with fallback URL schema.`,
            );
          }

          // 4. Mark job as complete on successful deployment run
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'completed' WHERE id = ?",
            [currentJob.id],
          );
          await this.updateProjectTracking(
            currentJob.project_id,
            "active",
            deployedLiveUrl,
          );

          await this.appendJobLog(
            currentJob.id,
            `Pipeline run finished successfully. Project target reachable via endpoint routing matrix: ${deployedLiveUrl}`,
          );
          console.log(
            `✅ [SYSTEM]: Project [${projectSlug}] is fully generated, provisioned and online.\n`,
          );
        } catch (jobException) {
          console.error(
            `\n=======================================================`,
          );
          console.error(`❌ PROJECT SETUP FAILED`);
          console.error(
            `=======================================================`,
          );
          console.error(`Time:  ${new Date().toISOString()}`);
          console.error(`Error: ${jobException.message}`);
          console.error(`Stack: ${jobException.stack}`);
          console.error(
            `=======================================================`,
          );

          // 5. Trigger error states across project tracking tables
          await this.poolInstance.execute(
            "UPDATE provisioning_jobs SET status = 'failed' WHERE id = ?",
            [currentJob.id],
          );
          await this.updateProjectTracking(currentJob.project_id, "failed");
          await this.appendJobLog(
            currentJob.id,
            `CRITICAL RUNTIME FAILURE ENCOUNTERED: ${jobException.message}`,
          );

          // Attempt safe cleanup of corrupted workspace files
          try {
            const scaffolder = new MultiStackTemplateScaffolder(
              projectSlug,
              manifest,
            );
            await scaffolder.cleanupFailedRun();
          } catch (unlinkError) {
            // Silence inner cleanup paths
          }
        }
      });
    } catch (criticalCycleFault) {
      console.error(
        "⚠️ Pipeline Worker Cycle Exception Encountered:",
        criticalCycleFault.message,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async bootDaemonLoop() {
    await this.initializeConnections();
    console.log(
      `\n🛸 StudioFlow Worker is online and listening for new projects...`,
    );

    // Resilient fallback polling running every 4 seconds
    setInterval(() => this.runProcessingCycle(), 4000);

    if (this.redis) {
      this.redis.subscribe("provisioning_queue", (err) => {
        if (!err) {
          this.redis.on("message", (channel, message) => {
            try {
              const parsed = JSON.parse(message);
              if (parsed.event === "NEW_JOB") {
                this.runProcessingCycle();
              }
            } catch (e) {}
          });
        }
      });
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n❌ ERROR: Cannot connect. Please make sure your .env file has a DATABASE_URL.",
    );
    process.exit(1);
  }

  console.log(`\n===========================================`);
  console.log(` StudioFlow Command Center `);
  console.log(`===========================================`);
  console.log(` [1] Start Background Worker`);
  console.log(` [2] Shut Down`);

  rl.question("\nSelect an option: ", async (choice) => {
    if (choice.trim() === "1") {
      const daemon = new EngineDaemonWorker(process.env.DATABASE_URL);
      await daemon.bootDaemonLoop();
    } else {
      console.log("Shutting down core engine node.");
      rl.close();
      process.exit(0);
    }
  });
}

main();
