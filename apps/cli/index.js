#!/usr/bin/env node

import mysql from "mysql2/promise";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = util.promisify(exec);

/**
 * UTILITY ENGINE: ProcessExecutor
 * Wraps system terminal interface routing layers cleanly.
 */
class ProcessExecutor {
  static async runCommand(shellStatement, executionDirectory) {
    try {
      const { stdout, stderr } = await execAsync(shellStatement, {
        cwd: executionDirectory,
      });
      return { success: true, output: `${stdout}\n${stderr}` };
    } catch (error) {
      return { success: false, output: error.message };
    }
  }
}

/**
 * PATTERN LAYER: LocalWorkspaceScaffolder
 * Domain management class responsible for structural scaffolding operations.
 */
class LocalWorkspaceScaffolder {
  constructor(projectDirectoryName) {
    // We use an absolute path to ensure projects land exactly in /Users/luna/Sites/work
    this.targetWorkspaceRoot = path.join(
      "/Users/luna/Sites/work",
      projectDirectoryName,
    );
  }

  async verifySpaceClearance() {
    try {
      await fs.access(this.targetWorkspaceRoot);
      return false; // Directory exists, validation failed
    } catch {
      return true; // Directory clear, proceeding smoothly
    }
  }

  async executeBaseScaffold() {
    // Generate clean production layouts adjacent to current ecosystem components
    const buildCommand = `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install`;
    await fs.mkdir(this.targetWorkspaceRoot, { recursive: true });
    return await ProcessExecutor.runCommand(
      buildCommand,
      this.targetWorkspaceRoot,
    );
  }

  async injectSelectedDependencies(dependenciesList) {
    if (!dependenciesList || dependenciesList.length === 0)
      return { success: true, output: "No external components requested." };

    // Map human readable features from the dashboard wizard into real pnpm package records
    const registryMappingMatrix = {
      "User Dashboard": ["framer-motion", "clsx", "tailwind-merge"],
      "Payment Integration": ["stripe", "@stripe/stripe-js"],
      "Analytics API": ["lucide-react"],
      "Email Notifications": ["nodemailer", "@types/nodemailer"],
      "SEO Optimization": [],
    };

    const aggregatedPackages = [];
    for (const feature of dependenciesList) {
      const pkgs = registryMappingMatrix[feature];
      if (pkgs) aggregatedPackages.push(...pkgs);
    }

    if (aggregatedPackages.length === 0)
      return {
        success: true,
        output: "Registry map evaluated to empty setup stack.",
      };

    const uniquePackages = [...new Set(aggregatedPackages)].join(" ");
    const installationCommand = `pnpm add ${uniquePackages}`;
    return await ProcessExecutor.runCommand(
      installationCommand,
      this.targetWorkspaceRoot,
    );
  }
}

/**
 * ORCHESTRATION CORE: EngineDaemonWorker
 * Polling core coordinating engine loops and database updates.
 */
class EngineDaemonWorker {
  constructor(dbConnectionString) {
    this.connectionString = dbConnectionString;
    this.activeExecutionState = false;
    this.poolInstance = null;
  }

  async initializeConnections() {
    this.poolInstance = mysql.createPool({
      uri: this.connectionString,
      waitForConnections: true,
      connectionLimit: 2,
      ssl: { rejectUnauthorized: true },
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

  async updateJobState(jobId, targetStatus, trackingLogs = "") {
    const timeColumnUpdate =
      targetStatus === "in-progress"
        ? ", started_at = NOW()"
        : targetStatus === "completed"
          ? ", completed_at = NOW()"
          : "";
    const updateStatement = `UPDATE provisioning_jobs SET status = ?, execution_logs = CONCAT(COALESCE(execution_logs, ''), ?)${timeColumnUpdate} WHERE id = ?`;
    await this.poolInstance.query(updateStatement, [
      targetStatus,
      trackingLogs,
      jobId,
    ]);
  }

  async updateProjectTrackingPercentage(projectId, progressInt, statusString) {
    const updateStatement = `UPDATE projects SET progress_percentage = ?, status = ? WHERE id = ?`;
    await this.poolInstance.query(updateStatement, [
      progressInt,
      statusString,
      projectId,
    ]);
  }

  async processingLoopSequence() {
    const job = await this.fetchOldestPendingJob();
    if (!job) return; // No jobs found, returning safely to poll phase interval

    const manifestPayload =
      typeof job.manifest === "string"
        ? JSON.parse(job.manifest)
        : job.manifest;
    const logTracePrefix = `[Daemon Auto-Run Execution Log - ${new Date().toISOString()}]\n`;

    console.log(
      `⚡ Processing Job Request #${job.id} -> Allocating local file space apps/${job.project_slug}`,
    );
    await this.updateJobState(
      job.id,
      "in-progress",
      `${logTracePrefix}Initialization token accepted. Locking run execution cycle.\n`,
    );
    await this.updateProjectTrackingPercentage(
      job.project_id,
      30,
      "provisioning",
    );

    const scaffolder = new LocalWorkspaceScaffolder(job.project_slug);

    // Step 1: Directory clearance confirmation check
    const spaceIsClear = await scaffolder.verifySpaceClearance();
    if (!spaceIsClear) {
      await this.updateJobState(
        job.id,
        "failed",
        `CRITICAL REJECTION: Target workspace path apps/${job.project_slug} is already occupied.\n`,
      );
      await this.updateProjectTrackingPercentage(job.project_id, 100, "failed");
      return;
    }

    // Step 2: Next.js standard layout template expansion
    console.log(` -> Launching Next.js standard blueprint extraction...`);
    const scaffoldResult = await scaffolder.executeBaseScaffold();
    if (!scaffoldResult.success) {
      await this.updateJobState(
        job.id,
        "failed",
        `SCAFFOLD EXTRACTION FAILED:\n${scaffoldResult.output}\n`,
      );
      await this.updateProjectTrackingPercentage(job.project_id, 100, "failed");
      return;
    }
    await this.updateJobState(
      job.id,
      "in-progress",
      `Scaffold generated cleanly.\n${scaffoldResult.output}\n`,
    );
    await this.updateProjectTrackingPercentage(job.project_id, 60, "injecting");

    // Step 3: Parse manifest features and inject modules
    console.log(
      ` -> Injecting user-selected packages and setting up features...`,
    );
    const dependencyResult = await scaffolder.injectSelectedDependencies(
      manifestPayload.features,
    );
    if (!dependencyResult.success) {
      await this.updateJobState(
        job.id,
        "failed",
        `DEPENDENCY INJECTION ENGINES ERRORED:\n${dependencyResult.output}\n`,
      );
      await this.updateProjectTrackingPercentage(job.project_id, 100, "failed");
      return;
    }

    // Success finalization sequence
    console.log(
      `✅ System allocation successful for workspace apps/${job.project_slug}`,
    );
    await this.updateJobState(
      job.id,
      "completed",
      `Dependency tree generated successfully.\n${dependencyResult.output}\nExecution pipeline completed cleanly without warnings.\n`,
    );
    await this.updateProjectTrackingPercentage(job.project_id, 100, "active");
  }

  async startupEngine() {
    console.log(
      "📡 StudioFlow orchestrator background daemon active. Monitoring TiDB queue slots...",
    );
    this.activeExecutionState = true;
    await this.initializeConnections();

    while (this.activeExecutionState) {
      try {
        await this.processingLoopSequence();
      } catch (loopError) {
        console.error(
          "🚨 Daemon processing engine dropped loop iteration step:",
          loopError.message,
        );
      }
      // Wait exactly 4 seconds before pulling the queue state again
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
}

// Global script entry configuration routing
async function main() {
  const argumentInputs = process.argv.slice(2);
  const coreCommand = argumentInputs[0];

  if (coreCommand === "watch") {
    if (!process.env.DATABASE_URL) {
      console.error(
        "❌ Error: DATABASE_URL variable missing in current environment scope.",
      );
      process.exit(1);
    }
    const workerInstance = new EngineDaemonWorker(process.env.DATABASE_URL);
    await workerInstance.startupEngine();
  } else {
    console.log(`
    StudioFlow Orchestration Engine
    
    Usage:
      studioflow watch      - Activates local OOP worker daemon monitoring TiDB jobs.
    `);
  }
}

main().catch(console.error);
