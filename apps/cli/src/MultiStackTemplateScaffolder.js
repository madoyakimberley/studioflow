import os from "os";
import path from "path";
import fs from "fs/promises";
import { CommandProcessExecutor } from "./CommandProcessExecutor.js";

export class MultiStackTemplateScaffolder {
  constructor(projectSlug, manifest) {
    const baseWorkspace =
      process.env.TARGET_OUTPUT_DIR ||
      path.join(os.homedir(), "Downloads", "StudioFlow");

    this.projectSlug = this.validateSlug(projectSlug);
    this.targetPath = path.join(baseWorkspace, this.projectSlug);
    this.manifest = manifest;
    this.projectName = (manifest.projectName || projectSlug).trim();

    this.githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    this.githubRepoUrl = null; // Will be set during repo creation

    const structChoice = this.manifest.folderStructure || "monorepo";
    this.isMonorepo = structChoice === "monorepo";
    this.deploymentTarget = (
      this.manifest.deploymentTarget || "none"
    ).toLowerCase();
  }

  validateSlug(slug) {
    if (!slug) return "unnamed-project";
    return slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  async verifyClearance() {
    try {
      await fs.access(this.targetPath);
      return false;
    } catch {
      return true;
    }
  }

  async processExecutionPipeline() {
    console.log(`\n⚙️ Setting up project: [${this.projectName}]`);

    await fs.mkdir(this.targetPath, { recursive: true });

    const servicesList = this.manifest.services || [];

    for (const srv of servicesList) {
      const srvDirName = srv.rootDir || srv.name;
      const fullSrvPath = path.join(this.targetPath, srvDirName);

      console.log(
        `  -> Creating folder for [${srv.name}] inside /${srvDirName}`,
      );
      await fs.mkdir(fullSrvPath, { recursive: true });

      if (srv.runtime === "node") {
        await this.generateNodePackageManifest(fullSrvPath, srv);
      } else if (srv.runtime === "python") {
        await this.generatePythonPipManifest(fullSrvPath, srv);
      } else if (srv.runtime === "go") {
        await this.generateGoModuleManifest(fullSrvPath, srv);
      } else if (srv.runtime === "rust") {
        await this.generateRustCargoManifest(fullSrvPath, srv);
      } else {
        await fs.writeFile(
          path.join(fullSrvPath, "index.html"),
          `<!DOCTYPE html><html><head><title>${srv.name}</title></head><body><h1>StudioFlow Managed Project</h1></body></html>`,
        );
      }

      await this.stubServiceEntryPoint(fullSrvPath, srv);
    }

    await this.injectUniversalInfrastructureBlueprint();
    await this.generateEnvFiles();

    // NEW: Inject the secure .gitignore file right before touching Git
    await this.generateGitIgnore();
  }

  async generateNodePackageManifest(targetDir, spec) {
    const dependenciesMap = {};
    if (spec.dependencies) {
      spec.dependencies.forEach((d) => {
        dependenciesMap[d.name] = d.version || "latest";
      });
    }

    const pm = this.manifest.nodePackageManager || "npm";

    // ANTI-INFINITE LOOP SAFEGUARD FOR BUILD:
    // If the provided build command includes "run build" (meant for the cloud provider),
    // we strip it from the local package.json to prevent recursive OOM errors.
    const rawBuildCmd = spec.buildCommand || "echo 'No build script'";
    let safePkgBuildCmd = rawBuildCmd;
    if (
      rawBuildCmd.includes("run build") ||
      rawBuildCmd.includes("yarn build")
    ) {
      safePkgBuildCmd =
        "echo 'Insert explicit framework compiler here (e.g. next build, tsc)'";
    }

    // ANTI-INFINITE LOOP SAFEGUARD FOR START:
    // Same logic applies here! If the user passed "pnpm run start" to the cloud,
    // we must prevent package.json from pointing back to itself.
    const rawStartCmd = spec.startCommand || "node index.js";
    let safePkgStartCmd = rawStartCmd;
    if (
      rawStartCmd.includes("run start") ||
      rawStartCmd.includes("yarn start") ||
      rawStartCmd.includes("npm start") ||
      rawStartCmd.includes("pnpm start")
    ) {
      safePkgStartCmd = "node index.js"; // Safely fallback to the stub entry point
    }

    const pkgJson = {
      name: this.validateSlug(spec.name),
      version: "1.0.0",
      description: "StudioFlow managed project",
      main: "index.js",
      type: "module",
      packageManager:
        pm === "pnpm"
          ? "pnpm@9.0.0"
          : pm === "yarn"
            ? "yarn@4.1.0"
            : pm === "bun"
              ? "bun@1.1.0"
              : "npm@10.5.0",
      scripts: {
        build: safePkgBuildCmd,
        start: safePkgStartCmd,
      },
      dependencies: dependenciesMap,
    };

    await fs.writeFile(
      path.join(targetDir, "package.json"),
      JSON.stringify(pkgJson, null, 2),
    );
    console.log(`    ✅ Created package.json for [${pm}].`);
  }

  async generatePythonPipManifest(targetDir, spec) {
    let reqsContent = "# Required Python Packages\n";
    if (spec.dependencies && spec.dependencies.length > 0) {
      spec.dependencies.forEach((d) => {
        reqsContent += `${d.name}==${d.version.replace(/[^0-9.]/g, "") || "3.0.0"}\n`;
      });
    } else {
      reqsContent += "fastapi==0.111.0\nuvicorn==0.30.1\ngunicorn==22.0.0\n";
    }

    await fs.writeFile(path.join(targetDir, "requirements.txt"), reqsContent);
    console.log(`    ✅ Saved requirements.txt`);
  }

  async generateGoModuleManifest(targetDir, spec) {
    let goMod = `module ${this.validateSlug(spec.name)}\n\ngo 1.22\n\n`;
    if (spec.dependencies && spec.dependencies.length > 0) {
      goMod += "require (\n";
      spec.dependencies.forEach((d) => {
        goMod += `\t${d.name} ${d.version}\n`;
      });
      goMod += ")\n";
    }
    await fs.writeFile(path.join(targetDir, "go.mod"), goMod);
    console.log(`    ✅ Created go.mod`);
  }

  async generateRustCargoManifest(targetDir, spec) {
    let cargoToml = `[package]\nname = "${this.validateSlug(spec.name)}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`;
    if (spec.dependencies) {
      spec.dependencies.forEach((d) => {
        cargoToml += `${d.name} = "${d.version || "*"}"\n`;
      });
    }
    await fs.writeFile(path.join(targetDir, "Cargo.toml"), cargoToml);
    console.log(`    ✅ Created Cargo.toml`);
  }

  async stubServiceEntryPoint(targetDir, spec) {
    if (spec.runtime === "node") {
      // FIX: Creates an actual persistent HTTP server to prevent Render from exiting early
      await fs.writeFile(
        path.join(targetDir, "index.js"),
        `import http from "http";\n\nconst PORT = process.env.PORT || 10000;\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ status: "online", app: "${spec.name}" }));\n});\n\nserver.listen(PORT, "0.0.0.0", () => {\n  console.log("Starting server: ${spec.name} on port " + PORT);\n});\n`,
      );
    } else if (spec.runtime === "python") {
      await fs.writeFile(
        path.join(targetDir, "main.py"),
        `import uvicorn\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"status": "online", "app": "${spec.name}"}\n`,
      );
    }
  }

  async injectUniversalInfrastructureBlueprint() {
    const rawYaml = this.manifest.blueprintYaml;
    if (!rawYaml) return;

    let targetFilename = "render.yaml";
    if (this.deploymentTarget === "railway") targetFilename = "railway.json";
    if (this.deploymentTarget === "vercel") targetFilename = "vercel.json";
    if (this.deploymentTarget === "docker_compose")
      targetFilename = "docker-compose.yml";

    await fs.writeFile(path.join(this.targetPath, targetFilename), rawYaml);
    console.log(`    ✅ Saved cloud deployment settings to: ${targetFilename}`);
  }

  async generateEnvFiles() {
    let envContent = `# StudioFlow Generated Environment File\nPORT=10000\n`;
    if (process.env.DATABASE_URL)
      envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    if (process.env.SMTP_HOST)
      envContent += `SMTP_HOST="${process.env.SMTP_HOST}"\n`;
    if (process.env.SMTP_PORT)
      envContent += `SMTP_PORT="${process.env.SMTP_PORT}"\n`;
    if (process.env.SMTP_USER)
      envContent += `SMTP_USER="${process.env.SMTP_USER}"\n`;
    if (process.env.SMTP_PASS)
      envContent += `SMTP_PASS="${process.env.SMTP_PASS}"\n`;

    await fs.writeFile(path.join(this.targetPath, ".env"), envContent);
    console.log(`    ✅ Saved .env variables`);
  }

  // ==========================================
  // --- SECURITY: IGNORE FILE INJECTION ---
  // ==========================================
  async generateGitIgnore() {
    const gitignoreContent = `# ==============================================================================
# 1. DEPENDENCIES & PACKAGES (Never commit third-party code)
# ==============================================================================
# JavaScript / Node
node_modules/
jspm_packages/
web_modules/
.npm/
.yarn/
.pnpm-store/

# Python
.venv/
venv/
ENV/
env/
target/
.pytest_cache/
.poetry/
__pycache__/
*.py[cod]
*$py.class

# PHP / Ruby / Bundler
vendor/
.bundle/
vendor/bundle/

# Rust / Cargo
target/
**/*.rs.bk

# Go
/vendor/

# ==============================================================================
# 2. BUILD OUTPUTS, ARTIFACTS & CACHES
# ==============================================================================
# General Build Folders
dist/
build/
out/
bin/
obj/

# Compiled Binaries & Libraries
*.exe
*.dll
*.so
*.dylib
*.app
*.jar
*.war
*.ear
*.class

# Language-Specific Caches
.eslintcache
.tsbuildinfo
.sass-cache/
.parcel-cache/
.next/
.nuxt/
.svelte-kit/
.turbo/

# ==============================================================================
# 3. ENVIRONMENT SECRETS & CREDENTIALS (CRITICAL SECURITY)
# ==============================================================================
.env
.env.*
!.env.example
*.pem
*.crt
*.cert
*.key
*.pub
*.pfx
secrets.toml

# ==============================================================================
# 4. OS JUNK & LOCAL CONFIGS (Safetynet if not configured globally)
# ==============================================================================
.DS_Store
Thumbs.db
ehthumbs.db
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln.docstates`;

    await fs.writeFile(
      path.join(this.targetPath, ".gitignore"),
      gitignoreContent,
    );
    console.log(`    ✅ Created comprehensive .gitignore protection`);
  }

  async createGitHubRepo() {
    if (!this.githubToken) {
      console.log(
        "⚠️ Skipping GitHub repository creation: No access token provided.",
      );
      return null;
    }

    const repoSlug = this.validateSlug(this.projectName);
    console.log(
      ` -> Attempting to create GitHub repository [${repoSlug}] via API...`,
    );
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${this.githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: repoSlug,
        description: `Automatically provisioned via StudioFlow Engine`,
        private: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (
        errorData.errors &&
        errorData.errors.some(
          (e) => e.message === "name already exists on this account",
        )
      ) {
        console.log(
          `⚠️ Repository already exists. Fetching existing remote URL...`,
        );
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${this.githubToken}` },
        });
        const userData = await userRes.json();

        this.githubRepoUrl = `https://github.com/${userData.login}/${repoSlug}`;
        return `${this.githubRepoUrl}.git`;
      }
      throw new Error(`GitHub API Rejected Request: ${errorData.message}`);
    }

    const data = await response.json();
    console.log(
      `✅ GitHub repository created successfully at ${data.html_url}`,
    );

    this.githubRepoUrl = data.html_url; // Store for Cloud APIs
    return data.clone_url;
  }

  async setupGitRepository() {
    if (!this.githubToken) {
      console.log("⚠️ Skipping GitHub upload: No access token provided.");
      return;
    }

    const remoteUrl = await this.createGitHubRepo();
    if (!remoteUrl) return;

    const executor = new CommandProcessExecutor();
    console.log(` -> Uploading code to GitHub...`);

    await executor.execute("git init", this.targetPath);
    await executor.execute("git add .", this.targetPath);
    await executor.execute(
      'git commit -m "Initial commit: Project setup by StudioFlow"',
      this.targetPath,
    );
    await executor.execute("git branch -M main", this.targetPath);

    await executor
      .execute(`git remote remove origin`, this.targetPath)
      .catch(() => {});

    const parsedRemote = remoteUrl.replace(
      "https://",
      `https://x-access-token:${this.githubToken}@`,
    );

    const pushRes = await executor.execute(
      `git remote add origin ${parsedRemote} && git push -u origin main`,
      this.targetPath,
    );

    if (!pushRes.success) {
      throw new Error(`Failed to push to GitHub: ${pushRes.output}`);
    } else {
      console.log(`✅ Uploaded successfully. Keys secured by .gitignore.`);
    }
  }

  async deployToVercelAPI() {
    if (this.deploymentTarget !== "vercel") return null;

    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      console.log(
        `\n⚠️ VERCEL_TOKEN missing from .env. Automated Vercel deployment skipped.`,
      );
      return null;
    }

    if (!this.githubRepoUrl) {
      console.log(
        `⚠️ GitHub repository URL not found. Cannot deploy to Vercel.`,
      );
      return null;
    }

    console.log(
      `\n -> Authenticating with Vercel API to link and deploy project...`,
    );

    // Extract 'owner/repo' from 'https://github.com/owner/repo'
    const repoPath = this.githubRepoUrl.split("github.com/")[1];

    const payload = {
      name: this.projectSlug,
      framework: null, // Let Vercel auto-detect the framework
      gitRepository: {
        type: "github",
        repo: repoPath,
      },
    };

    const res = await fetch("https://api.vercel.com/v9/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`    ❌ Vercel Project Link Failed:`, err);
      return null;
    }

    console.log(
      `    ✅ Vercel project connected successfully. Vercel will auto-deploy the main branch.`,
    );
    return `https://${this.projectSlug}.vercel.app`;
  }

  async deployToRenderAPI() {
    if (this.deploymentTarget !== "render") return null;

    const renderApiKey = process.env.RENDER_API_KEY;
    const renderOwnerId = process.env.RENDER_OWNER_ID;

    if (!renderApiKey || !renderOwnerId) {
      console.log(
        `\n⚠️ RENDER_API_KEY or RENDER_OWNER_ID missing from .env. Automated Render deployment skipped.`,
      );
      return null;
    }

    if (!this.githubRepoUrl) {
      console.log(
        `⚠️ GitHub repository URL not found. Cannot deploy to Render.`,
      );
      return null;
    }

    console.log(
      `\n -> Authenticating with Render REST API to construct dynamic cloud nodes...`,
    );

    const services = this.manifest.services || [];
    let backendUrl = null;
    let frontendUrl = null;

    // Sort services: Deploy APIs/Backends first so we can inject their URL into the Frontend
    const sortedServices = [...services].sort((a, b) => {
      const aIsApi =
        a.name.includes("api") ||
        a.name.includes("core") ||
        a.runtime !== "node";
      const bIsApi =
        b.name.includes("api") ||
        b.name.includes("core") ||
        b.runtime !== "node";
      return aIsApi === bIsApi ? 0 : aIsApi ? -1 : 1;
    });

    for (const srv of sortedServices) {
      console.log(
        ` -> Instructing Render to build [${srv.name}] (${srv.runtime})...`,
      );

      const isFrontend =
        srv.name.includes("front") ||
        srv.name.includes("web") ||
        srv.name.includes("ui");
      const envVars = [];

      if (srv.runtime === "node") {
        envVars.push({ key: "NODE_VERSION", value: "20.x" });
        if (this.manifest.nodePackageManager === "pnpm") {
          envVars.push({ key: "PNPM_VERSION", value: "9.x" });
        }
      } else if (srv.runtime === "python") {
        envVars.push({ key: "PYTHON_VERSION", value: "3.12.0" });
      } else if (srv.runtime === "go") {
        envVars.push({ key: "GO_VERSION", value: "1.22.0" });
      } else if (srv.runtime === "rust") {
        envVars.push({ key: "RUST_VERSION", value: "1.75.0" });
      }

      if (process.env.DATABASE_URL) {
        envVars.push({ key: "DATABASE_URL", value: process.env.DATABASE_URL });
      }

      if (isFrontend && backendUrl) {
        envVars.push({ key: "NEXT_PUBLIC_API_BASE_URL", value: backendUrl });
      }

      const payload = {
        type: "web_service",
        name: `${this.projectSlug}-${srv.name}`,
        ownerId: renderOwnerId,
        repo: this.githubRepoUrl,
        branch: "main",
        autoDeploy: "yes",
        rootDir: srv.rootDir || srv.name,
        serviceDetails: {
          env:
            srv.runtime === "node"
              ? "node"
              : srv.runtime === "python"
                ? "python"
                : srv.runtime === "go"
                  ? "go"
                  : srv.runtime === "rust"
                    ? "rust"
                    : "docker",
          plan: "free",
          envSpecificDetails: {
            buildCommand: srv.buildCommand || "echo 'No build command'",
            startCommand: srv.startCommand || "echo 'No start command'",
          },
          envVars: envVars,
        },
      };

      const res = await fetch("https://api.render.com/v1/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(`    ❌ ${srv.name} Creation Failed:`, err);
      } else {
        const data = await res.json();
        const deployedUrl =
          data?.service?.serviceDetails?.url || data?.service?.url || null;
        console.log(
          `    ✅ ${srv.name} deployment initiated at: ${deployedUrl}`,
        );

        if (isFrontend && !frontendUrl) {
          frontendUrl = deployedUrl;
        } else if (!isFrontend && !backendUrl) {
          backendUrl = deployedUrl;
        }
      }
    }

    return (
      frontendUrl || backendUrl || `https://${this.projectSlug}.onrender.com`
    );
  }

  async cleanupFailedRun() {
    const failedPath = `${this.targetPath}.failed-${Date.now()}`;
    console.log(`\n⚠️ Setup failed. Moving broken files to: ${failedPath}`);
    try {
      await fs.rename(this.targetPath, failedPath);
    } catch (err) {
      console.error(`❌ Could not move failed files:`, err.message);
    }
  }
}
