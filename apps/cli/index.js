#!/usr/bin/env node

import mysql from "mysql2/promise";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import readline from "readline";
import Redis from "ioredis";

// Look for .env file at the workspace root context
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

class ProcessExecutor {
  static runCommand(shellStatement, executionDirectory) {
    return new Promise((resolve) => {
      const child = spawn(shellStatement, {
        cwd: executionDirectory,
        env: { ...process.env },
        shell: true,
      });

      let output = "";

      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stdout.write(chunk);
      });

      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stderr.write(chunk);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          resolve({
            success: false,
            output: output || `Process exited with code ${code}`,
          });
        }
      });

      child.on("error", (error) => {
        resolve({ success: false, output: error.stack || error.message });
      });
    });
  }
}

class HighFidelityScaffolder {
  constructor(projectSlug, manifest) {
    const baseWorkspace =
      process.env.TARGET_OUTPUT_DIR || "/Users/luna/Sites/work";
    this.targetPath = path.join(baseWorkspace, this.validateSlug(projectSlug));
    this.manifest = manifest;
    this.projectName = manifest.projectName || projectSlug;

    this.githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    this.githubRemote = `https://github.com/madoyakimberley/${this.validateSlug(projectSlug)}.git`;
    this.templatePath = path.resolve(process.cwd(), "../../templates");
  }

  validateSlug(slug) {
    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (safeSlug !== slug) throw new Error("Invalid slug format.");
    return safeSlug;
  }

  async verifyClearance() {
    try {
      await fs.access(this.targetPath);
      return false;
    } catch {
      return true;
    }
  }

  async injectRenderBlueprint() {
    console.log(
      ` -> Injecting Render Infrastructure Blueprint (render.yaml)...`,
    );

    const slug = this.validateSlug(this.manifest.slug || this.projectName);

    const renderYaml = `services:
  - type: web
    name: ${this.projectName}-frontend
    env: node
    plan: free
    rootDir: .
    buildCommand: pnpm install && pnpm run build
    startCommand: pnpm run start
    envVars:
      - key: NODE_VERSION
        value: 20.x
      - key: PNPM_VERSION
        value: 9.x
${
  this.manifest.apiIntegration
    ? `
  - type: web
    name: ${this.projectName}-backend
    env: python
    plan: free
    rootDir: apps/api-core
    buildCommand: pip install -r requirements.txt
    startCommand: python -m gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
    healthCheckPath: /api/v1/health
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.0
`
    : ""
}`;

    await fs.writeFile(path.join(this.targetPath, "render.yaml"), renderYaml);
  }

  async writeBoilerplateFiles() {
    const directories = [
      "src/app",
      "src/components/ui",
      "src/lib",
      "src/db",
      "src/schemas",
      "public",
    ];

    for (const dir of directories) {
      await fs.mkdir(path.join(this.targetPath, dir), { recursive: true });
    }

    const loadTemplate = async (fileName) => {
      const fullPath = path.join(this.templatePath, `${fileName}.template`);
      try {
        let content = await fs.readFile(fullPath, "utf8");
        content = content.replace(/{{PROJECT_NAME}}/g, this.projectName);
        content = content.replace(
          /{{PROJECT_SLUG}}/g,
          this.manifest.slug || this.projectName,
        );
        return content;
      } catch (err) {
        throw new Error(
          `Template Missing or Unreadable: Expected to find file at ${fullPath}\nSystem Error: ${err.message}`,
        );
      }
    };

    let packageJsonContent = await loadTemplate("package.json");
    let packageJson;
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch (err) {
      throw new Error(
        `JSON Parse Error in package.json.template: ${err.message}`,
      );
    }

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.devDependencies = packageJson.devDependencies || {};

    packageJson.devDependencies["typescript"] = "^5";
    packageJson.devDependencies["@types/react"] = "^19";
    packageJson.devDependencies["@types/node"] = "^20";

    if (this.manifest.database === "Supabase") {
      packageJson.dependencies["drizzle-orm"] = "^0.36.1";
      packageJson.dependencies["postgres"] = "^3.4.4";
      packageJson.devDependencies["drizzle-kit"] = "^0.28.1";
    }

    if (this.manifest.storage === "UploadThing") {
      packageJson.dependencies["@uploadthing/react"] = "^7.1.1";
      packageJson.dependencies["uploadthing"] = "^7.3.0";
    }

    await fs.writeFile(
      path.join(this.targetPath, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    const tsconfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    };
    await fs.writeFile(
      path.join(this.targetPath, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2),
    );

    await fs.writeFile(
      path.join(this.targetPath, "src/schemas/user.ts"),
      await loadTemplate("user.ts"),
    );

    if (this.manifest.database === "Supabase") {
      await fs.writeFile(
        path.join(this.targetPath, "drizzle.config.ts"),
        await loadTemplate("drizzle.config.ts"),
      );
      await fs.writeFile(
        path.join(this.targetPath, "src/db/schema.ts"),
        await loadTemplate("schema.ts"),
      );
    }

    // FRONTEND FIX: Inject default exports for page.tsx and layout.tsx
    let pageContent = await loadTemplate("page.tsx");
    if (!pageContent.includes("export")) {
      pageContent = `export default function Page() {\n  return (\n    <main>\n      <h1>${this.projectName}</h1>\n    </main>\n  );\n}`;
    }
    await fs.writeFile(
      path.join(this.targetPath, "src/app/page.tsx"),
      pageContent,
    );

    let layoutContent = await loadTemplate("layout.tsx");
    if (!layoutContent.includes("export")) {
      layoutContent = `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}`;
    }
    await fs.writeFile(
      path.join(this.targetPath, "src/app/layout.tsx"),
      layoutContent,
    );

    await fs.writeFile(
      path.join(this.targetPath, "src/app/globals.css"),
      await loadTemplate("globals.css"),
    );

    if (this.manifest.apiIntegration === true) {
      console.log(` -> Constructing Production-Grade FastAPI Structure...`);
      const apiPath = path.join(this.targetPath, "api");
      const pythonDirs = ["app/core", "app/api/v1", "app/schemas"];

      for (const dir of pythonDirs) {
        await fs.mkdir(path.join(apiPath, dir), { recursive: true });
      }

      await fs.writeFile(path.join(apiPath, "app/__init__.py"), "");
      await fs.writeFile(path.join(apiPath, "app/core/__init__.py"), "");
      await fs.writeFile(path.join(apiPath, "app/api/__init__.py"), "");
      await fs.writeFile(path.join(apiPath, "app/api/v1/__init__.py"), "");
      await fs.writeFile(path.join(apiPath, "app/schemas/__init__.py"), "");

      const configPy = `from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "${this.projectName} Engine API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")

    class Config:
        case_sensitive = True

settings = Settings()
`;

      const endpointsPy = `from fastapi import APIRouter

router = APIRouter()

@router.get("/health", status_code=200)
async def health_check():
    return {
        "status": "operational",
        "project": "${this.projectName}",
        "message": "Python microservice orchestration core online."
    }
`;

      const fastApiMain = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.API_V1_STR)
`;

      const requirements = `fastapi>=0.110.0\nuvicorn[standard]>=0.28.0\ngunicorn>=21.2.0\npydantic>=2.6.0\npydantic-settings>=2.2.1\npython-dotenv>=1.0.1`;

      await fs.writeFile(path.join(apiPath, "app/core/config.py"), configPy);
      await fs.writeFile(
        path.join(apiPath, "app/api/v1/endpoints.py"),
        endpointsPy,
      );
      await fs.writeFile(path.join(apiPath, "app/main.py"), fastApiMain);
      await fs.writeFile(path.join(apiPath, "requirements.txt"), requirements);
    }

    await this.injectRenderBlueprint();
    await this.generateEnvFiles();
  }

  async provisionPythonEnvironment() {
    if (this.manifest.apiIntegration !== true) return;

    console.log(
      `\n -> Initializing isolated Python architecture environment via uv...`,
    );
    const apiPath = path.join(this.targetPath, "api");

    const venvResult = await ProcessExecutor.runCommand("uv venv", apiPath);
    if (!venvResult.success) {
      throw new Error(
        `uv venv orchestration layer failed: ${venvResult.output}`,
      );
    }

    console.log(
      ` -> Injecting compiled Python package dependencies via uv pip...`,
    );
    const pipResult = await ProcessExecutor.runCommand(
      "uv pip install -r requirements.txt",
      apiPath,
    );
    if (!pipResult.success) {
      throw new Error(
        `uv pip package optimization dropped: ${pipResult.output}`,
      );
    }

    console.log(
      `✅ Automated Python microservice micro-layer cleanly provisioned.`,
    );
  }

  async generateEnvFiles() {
    console.log(` -> Injecting environment variables...`);
    let envContent = "";
    if (process.env.DATABASE_URL) {
      envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    }
    await fs.writeFile(path.join(this.targetPath, ".env.local"), envContent);
  }

  async createGitHubRepo() {
    if (!this.githubToken) {
      throw new Error(
        "GITHUB_PAT / GITHUB_TOKEN not found in environment settings. Cannot create repository.",
      );
    }

    console.log(` -> Attempting to create GitHub repository via API...`);
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${this.githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        name: this.validateSlug(this.manifest.slug || this.projectName),
        description: `Automatically provisioned via StudioFlow Engine -> Render Connected`,
        private: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API Rejected Request: ${errorData.message}`);
    }
    console.log(`✅ GitHub repository created successfully.`);
    return true;
  }

  async setupGitRepository() {
    console.log(
      `\n -> Initializing Git tracking and mapping to remote origin...`,
    );
    const gitignoreContent =
      "node_modules\n.next\n.env\n.env.local\n.DS_Store\napi/.venv\napi/__pycache__\n";
    await fs.writeFile(
      path.join(this.targetPath, ".gitignore"),
      gitignoreContent,
    );

    await this.createGitHubRepo();

    await ProcessExecutor.runCommand("git init", this.targetPath);
    await ProcessExecutor.runCommand("git add .", this.targetPath);
    await ProcessExecutor.runCommand(
      `git commit -m "feat: initial architecture scaffold via StudioFlow engine with Render Blueprint"`,
      this.targetPath,
    );
    await ProcessExecutor.runCommand("git branch -M main", this.targetPath);
    await ProcessExecutor.runCommand(
      `git remote add origin ${this.githubRemote}`,
      this.targetPath,
    );

    const pushResult = await ProcessExecutor.runCommand(
      `git push -u origin main`,
      this.targetPath,
    );
    if (!pushResult.success) {
      throw new Error(`Git Push Failed:\n${pushResult.output}`);
    }

    return { success: true };
  }

  async deployToRenderAPI() {
    const renderApiKey = process.env.RENDER_API_KEY;
    const renderOwnerId = process.env.RENDER_OWNER_ID;

    if (!renderApiKey || !renderOwnerId) {
      console.log(
        `\n⚠️ RENDER_API_KEY or RENDER_OWNER_ID missing from .env. Code pushed to GitHub, but automated Render deployment skipped.`,
      );
      return null;
    }

    console.log(
      `\n -> Authenticating with Render REST API to construct cloud nodes...`,
    );

    const repoUrl = this.githubRemote.replace(".git", "");
    const slug = this.validateSlug(this.manifest.slug || this.projectName);

    let apiUrl = null;

    try {
      if (this.manifest.apiIntegration) {
        console.log(
          ` -> Instructing Render to build Python API microservice...`,
        );

        const apiRes = await fetch("https://api.render.com/v1/services", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${renderApiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "web_service",
            name: `${slug}-api`,
            ownerId: renderOwnerId,
            repo: repoUrl,
            branch: "main",
            autoDeploy: "yes",
            // Align with the production monorepo path
            rootDir: "apps/api-core",
            serviceDetails: {
              env: "python",
              plan: "free",
              healthCheckPath: "/api/v1/health",
              envSpecificDetails: {
                // Standardize to pip for simplicity unless uv is specifically configured in the remote environment
                buildCommand: "pip install -r requirements.txt",
                // Ensure this matches the app.main:app structure
                startCommand:
                  "python -m gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT",
              },
              envVars: [
                { key: "PYTHON_VERSION", value: "3.12.0" },
                ...(process.env.DATABASE_URL
                  ? [{ key: "DATABASE_URL", value: process.env.DATABASE_URL }]
                  : []),
              ],
            },
          }),
        });

        if (!apiRes.ok) {
          const err = await apiRes.json();
          console.error("    ❌ Backend API Creation Failed:", err);
        } else {
          const backendData = await apiRes.json();

          apiUrl =
            backendData?.service?.serviceDetails?.url ||
            backendData?.service?.url ||
            null;

          console.log(`    ✅ Backend deployment initiated at: ${apiUrl}`);
        }
      }

      console.log(
        ` -> Instructing Render to build Next.js Frontend dashboard...`,
      );

      const frontendEnvVars = [
        {
          key: "NODE_VERSION",
          value: "20.x",
        },
        {
          key: "PNPM_VERSION",
          value: "9.x",
        },
        ...(process.env.DATABASE_URL
          ? [
              {
                key: "DATABASE_URL",
                value: process.env.DATABASE_URL,
              },
            ]
          : []),
      ];

      if (apiUrl) {
        frontendEnvVars.push({
          key: "NEXT_PUBLIC_API_BASE_URL",
          value: apiUrl,
        });
      }

      const webRes = await fetch("https://api.render.com/v1/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "web_service",
          name: `${slug}-dashboard`,
          ownerId: renderOwnerId,
          repo: repoUrl,
          branch: "main",
          autoDeploy: "yes",
          // Pointing to the specific monorepo workspace for frontend builds
          rootDir: ".",
          serviceDetails: {
            env: "node",
            plan: "free",
            envSpecificDetails: {
              buildCommand:
                "pnpm install && pnpm build --filter client-dashboard",
              startCommand: "cd apps/client-dashboard && pnpm start",
            },
            envVars: frontendEnvVars,
          },
        }),
      });

      if (!webRes.ok) {
        const err = await webRes.json();
        console.error("    ❌ Frontend Creation Failed:", err);
        return null;
      }

      const webData = await webRes.json();

      const frontendUrl =
        webData?.service?.serviceDetails?.url ||
        webData?.service?.url ||
        `https://${slug}-dashboard.onrender.com`;

      console.log(`    ✅ Frontend deployment initiated at: ${frontendUrl}`);

      return frontendUrl;
    } catch (error) {
      console.error(
        "    ❌ Render API Connection Dropped:",
        error?.message || error,
      );
      return null;
    }
  }

  async cleanupFailedRun() {
    const timestamp = Date.now();
    const failedPath = `${this.targetPath}.failed-${timestamp}`;
    console.log(
      `\n⚠️ Scaffolding failed. Moving partial files to ${failedPath}`,
    );
    try {
      await fs.rename(this.targetPath, failedPath);
      console.log(`✅ Cleanup complete.`);
    } catch (err) {
      console.error(`❌ Failed to move directory during cleanup:`, err.message);
    }
  }
}

class EngineDaemonWorker {
  constructor(dbConnectionString) {
    this.connectionString = dbConnectionString;
    this.activeExecutionState = false;
    this.poolInstance = null;
    this.isProcessing = false;
    this.redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
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

    const scaffolder = new HighFidelityScaffolder(
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
        `Architecture templates and Render routing injected successfully.`,
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

      const installResult = await ProcessExecutor.runCommand(
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

      if (manifestPayload.apiIntegration === true) {
        await this.appendJobLog(
          job.id,
          `Provisioning decoupled Python microservice engine via uv context...`,
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
      await this.appendJobLog(
        job.id,
        `Triggering Render REST API for Zero-Touch Deployment...`,
      );

      const actualLiveUrl = await scaffolder.deployToRenderAPI();

      console.log(`✅ System allocation successful for ${job.project_slug}`);
      await this.appendJobLog(
        job.id,
        `Ecosystem generated smoothly. Live environment provisioning started on Render.`,
      );
      await this.updateJobState(job.id, "completed");

      const finalUrl =
        actualLiveUrl || `https://${job.project_slug}-frontend.onrender.com`;
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
        "Render API Trigger Drop",
        err,
      );
      return;
    }
  }

  async startupEngine() {
    console.log(
      "📡 StudioFlow reactive daemon active. Listening for job events...",
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
    return await askQuestion("Enter your custom project slug: ");
  }

  if (isNaN(index) || index < 1 || index > projects.length) {
    console.log("❌ Invalid selection.");
    return null;
  }

  return projects[index - 1].slug;
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
    const slug = await projectSelectionWizard("scaffold");
    if (!slug) {
      return await runInteractiveMenu();
    }

    console.log(`\n[i] Bypassing queue to manually initialize apps/${slug}...`);

    const runPython = await askQuestion(
      "Include Python FastAPI Engine? (y/n): ",
    );

    const scaffolder = new HighFidelityScaffolder(slug, {
      slug,
      projectName: slug,
      database: "Supabase",
      apiIntegration: runPython.toLowerCase() === "y",
      infrastructure: {},
    });

    const isClear = await scaffolder.verifyClearance();
    if (!isClear) {
      console.log(
        `❌ Target directory /apps/${slug} already exists. Aborting manual initialization.`,
      );
      return await runInteractiveMenu();
    }

    console.log(` -> Writing boilerplate matrices and Render mapping...`);
    try {
      await scaffolder.writeBoilerplateFiles();
    } catch (err) {
      console.error(`❌ Template Injection Failed:\n`, err.stack);
      return await runInteractiveMenu();
    }

    console.log(` -> Running dependency installation...\n`);
    const installResult = await ProcessExecutor.runCommand(
      "pnpm install --no-frozen-lockfile --ignore-scripts",
      scaffolder.targetPath,
    );

    if (!installResult.success) {
      console.log(`❌ Dependency install failed:\n${installResult.output}`);
      await scaffolder.cleanupFailedRun();
    } else {
      try {
        await scaffolder.provisionPythonEnvironment();
        await scaffolder.setupGitRepository();

        await scaffolder.deployToRenderAPI();

        console.log(
          `✅ System allocation completed manually for ${slug}. Render API pushed.`,
        );
      } catch (err) {
        console.error(`❌ Git / Environment Setup Failed:\n`, err.stack);
      }
    }
    return await runInteractiveMenu();
  } else if (answer === "3") {
    const slug = await projectSelectionWizard("push to GitHub");
    if (!slug) {
      return await runInteractiveMenu();
    }

    const commitMsg = await askQuestion("\nEnter your commit message: ");
    const baseWorkspace =
      process.env.TARGET_OUTPUT_DIR || "/Users/luna/Sites/work";
    const targetPath = path.join(baseWorkspace, slug);

    console.log(
      ` -> Pushing updates to https://github.com/madoyakimberley/${slug}.git...`,
    );
    await ProcessExecutor.runCommand("git add .", targetPath);
    await ProcessExecutor.runCommand(
      `git commit -m "${commitMsg}"`,
      targetPath,
    );
    const result = await ProcessExecutor.runCommand(
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

  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Error: DATABASE_URL variable missing in current environment scope. Please check root .env.",
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
