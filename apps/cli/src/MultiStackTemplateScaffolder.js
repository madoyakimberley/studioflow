import path from "path";
import fs from "fs/promises";
import { CommandProcessExecutor } from "./CommandProcessExecutor.js";

export class MultiStackTemplateScaffolder {
  constructor(projectSlug, manifest) {
    const baseWorkspace =
      process.env.TARGET_OUTPUT_DIR || "/Users/luna/Sites/work";
    this.targetPath = path.join(baseWorkspace, this.validateSlug(projectSlug));
    this.manifest = manifest;
    this.projectName = manifest.projectName || projectSlug;

    this.githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    this.githubRemote = `https://github.com/madoyakimberley/${this.validateSlug(projectSlug)}.git`;

    this.frontendChoice = this.manifest.frontendFramework || "nextjs";
    this.backendChoice = this.manifest.backendFramework || "none";

    // ✅ FIXED: Fallback to 'monorepo' if the DB manifest is missing the structure key
    const structChoice =
      this.manifest.folderStructure ||
      this.manifest.folder_structure ||
      "monorepo";
    this.isMonorepo = structChoice !== "src_flat";

    this.deploymentTarget = (
      this.manifest.deploymentTarget ||
      this.manifest.deploymentProvider ||
      this.manifest.deployment ||
      "none"
    ).toLowerCase();
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

  getFrontendPath() {
    if (this.isMonorepo) {
      return this.frontendChoice === "react"
        ? "apps/dashboard-react"
        : "apps/web-nextjs";
    }
    return this.frontendChoice === "react" ? "client-react" : "client-next";
  }

  getBackendPath() {
    if (this.backendChoice === "none") return null;
    if (this.isMonorepo) {
      if (this.backendChoice === "express") return "services/api-node";
      if (this.backendChoice === "fastapi") return "services/api-fastapi";
      if (this.backendChoice === "flask") return "services/service-flask";
    }
    return this.backendChoice === "express" ? "server-node" : "server-python";
  }

  async injectRenderBlueprint() {
    console.log(
      ` -> Injecting Render Infrastructure Blueprint (render.yaml)...`,
    );

    const slug = this.validateSlug(this.manifest.slug || this.projectName);

    let renderYaml = `services:\n`;
    renderYaml += `  - type: web\n`;
    renderYaml += `    name: ${this.projectName}-frontend\n`;
    renderYaml += `    runtime: node\n`;
    renderYaml += `    plan: free\n`;
    renderYaml += `    rootDir: .\n`;
    renderYaml += `    buildCommand: pnpm install && pnpm run build\n`;
    renderYaml += `    startCommand: pnpm run start\n`;
    renderYaml += `    healthCheckPath: /\n`;
    renderYaml += `    autoDeployTrigger: commit\n`;
    renderYaml += `    envVars:\n`;
    renderYaml += `      - key: NODE_VERSION\n`;
    renderYaml += `        value: 20.x\n`;
    renderYaml += `      - key: PNPM_VERSION\n`;
    renderYaml += `        value: 9.x\n`;

    const backendPath = this.getBackendPath();
    if (backendPath) {
      renderYaml += `\n  - type: web\n`;
      renderYaml += `    name: ${this.projectName}-backend\n`;
      renderYaml += `    runtime: python\n`;
      renderYaml += `    plan: free\n`;
      renderYaml += `    rootDir: ${backendPath}\n`;
      renderYaml += `    buildCommand: pip install -r requirements.txt\n`;
      renderYaml += `    startCommand: python -m gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT\n`;
      renderYaml += `    healthCheckPath: /api/v1/health\n`;
      renderYaml += `    autoDeployTrigger: commit\n`;
      renderYaml += `    envVars:\n`;
      renderYaml += `      - key: PYTHON_VERSION\n`;
      renderYaml += `        value: 3.12.0\n`;
    }

    await fs.writeFile(path.join(this.targetPath, "render.yaml"), renderYaml);
  }

  async injectRailwayBlueprint() {
    console.log(
      ` -> Injecting Railway Infrastructure Blueprint (railway.yaml)...`,
    );

    let railwayYaml = `services:\n`;
    railwayYaml += `  ${this.projectName}-frontend:\n`;
    railwayYaml += `    builder: NIXPACKS\n`;
    railwayYaml += `    buildCommand: pnpm install && pnpm run build\n`;
    railwayYaml += `    startCommand: pnpm run start\n`;
    railwayYaml += `    watch: [${this.getFrontendPath() || "."}]\n`;
    railwayYaml += `    env:\n`;
    railwayYaml += `      NODE_VERSION: 20.x\n`;
    railwayYaml += `      PNPM_VERSION: 9.x\n`;

    const backendPath = this.getBackendPath();
    if (backendPath) {
      railwayYaml += `\n  ${this.projectName}-backend:\n`;
      railwayYaml += `    builder: NIXPACKS\n`;
      railwayYaml += `    watch: [${backendPath}]\n`;
      railwayYaml += `    buildCommand: pip install -r requirements.txt\n`;
      railwayYaml += `    startCommand: python -m gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT\n`;
      railwayYaml += `    env:\n`;
      railwayYaml += `      PYTHON_VERSION: 3.12.0\n`;
    }

    await fs.writeFile(path.join(this.targetPath, "railway.yaml"), railwayYaml);
  }

  async buildNextjsTree(target) {
    const dirs = [
      "public",
      "src/app/dashboard",
      "src/app/api",
      "src/components/ui",
      "src/components/features",
      "src/hooks",
      "src/lib",
      "src/types",
    ];
    for (const d of dirs)
      await fs.mkdir(path.join(target, d), { recursive: true });

    await fs.writeFile(
      path.join(target, "src/app/layout.tsx"),
      `export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }`,
    );
    await fs.writeFile(
      path.join(target, "src/app/page.tsx"),
      `export default function Page() { return <main><h1>Next.js Client</h1></main>; }`,
    );
    await fs.writeFile(
      path.join(target, "src/app/dashboard/page.tsx"),
      `export default function Dashboard() { return <div>Dashboard</div>; }`,
    );

    const pkg = {
      name: "frontend-next",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        typescript: "^5",
        "@types/node": "^20",
        "@types/react": "^19",
        "@types/react-dom": "^19",
      },
    };
    await fs.writeFile(
      path.join(target, "package.json"),
      JSON.stringify(pkg, null, 2),
    );
    await fs.writeFile(
      path.join(target, "next.config.ts"),
      `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;`,
    );
  }

  async buildReactTree(target) {
    const dirs = [
      "public",
      "src/assets",
      "src/components",
      "src/context",
      "src/features/auth/components",
      "src/features/auth/hooks",
      "src/services",
    ];
    for (const d of dirs)
      await fs.mkdir(path.join(target, d), { recursive: true });

    await fs.writeFile(
      path.join(target, "src/App.tsx"),
      `export default function App() { return <div><h1>React SPA</h1></div>; }`,
    );
    await fs.writeFile(
      path.join(target, "src/main.tsx"),
      `import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);`,
    );
    await fs.writeFile(
      path.join(target, "src/features/auth/components/LoginForm.tsx"),
      `export const LoginForm = () => <form>Login</form>;`,
    );
    await fs.writeFile(
      path.join(target, "src/features/auth/components/SignupForm.tsx"),
      `export const SignupForm = () => <form>Signup</form>;`,
    );
    await fs.writeFile(
      path.join(target, "src/features/auth/hooks/useAuth.ts"),
      `export const useAuth = () => ({ user: null });`,
    );
    await fs.writeFile(
      path.join(target, "src/features/auth/authSlice.ts"),
      `// Redux or Zustand state`,
    );

    const pkg = {
      name: "frontend-react",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
      },
      dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
      devDependencies: { typescript: "^5.2.2", vite: "^5.0.8" },
    };
    await fs.writeFile(
      path.join(target, "package.json"),
      JSON.stringify(pkg, null, 2),
    );
    await fs.writeFile(
      path.join(target, "vite.config.ts"),
      `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });`,
    );
  }

  async buildExpressTree(target) {
    const dirs = [
      "src/config",
      "src/constants",
      "src/controllers",
      "src/middleware",
      "src/models",
      "src/routes",
      "src/services",
      "src/utils",
      "tests",
    ];
    for (const d of dirs)
      await fs.mkdir(path.join(target, d), { recursive: true });

    await fs.writeFile(
      path.join(target, "src/app.js"),
      `const express = require('express');\nconst app = express();\napp.use(express.json());\napp.get('/api/health', (req, res) => res.json({ status: 'ok' }));\nmodule.exports = app;`,
    );
    await fs.writeFile(
      path.join(target, "server.js"),
      `const app = require('./src/app');\nconst PORT = process.env.PORT || 8080;\napp.listen(PORT, () => console.log('Server running'));`,
    );
    await fs.writeFile(
      path.join(target, ".env"),
      `PORT=8080\nNODE_ENV=development`,
    );

    const pkg = {
      name: "server-node",
      version: "1.0.0",
      main: "server.js",
      scripts: { start: "node server.js", dev: "nodemon server.js" },
      dependencies: { express: "^4.18.2", cors: "^2.8.5", dotenv: "^16.3.1" },
    };
    await fs.writeFile(
      path.join(target, "package.json"),
      JSON.stringify(pkg, null, 2),
    );
  }

  async buildFastApiTree(target) {
    const dirs = [
      "app/api/v1/endpoints",
      "app/core",
      "app/models",
      "app/schemas",
      "app/services",
      "tests",
      "venv",
    ];
    for (const d of dirs)
      await fs.mkdir(path.join(target, d), { recursive: true });

    await fs.writeFile(path.join(target, "app/__init__.py"), "");
    await fs.writeFile(path.join(target, "app/api/__init__.py"), "");
    await fs.writeFile(path.join(target, "app/api/v1/__init__.py"), "");

    await fs.writeFile(
      path.join(target, "app/api/v1/router.py"),
      `from fastapi import APIRouter\nrouter = APIRouter()\n@router.get("/health")\ndef health(): return {"status": "ok"}`,
    );
    await fs.writeFile(
      path.join(target, "app/main.py"),
      `from fastapi import FastAPI\nfrom app.api.v1.router import router\napp = FastAPI()\napp.include_router(router, prefix="/api/v1")`,
    );
    await fs.writeFile(
      path.join(target, "requirements.txt"),
      `fastapi>=0.110.0\nuvicorn[standard]>=0.28.0\npydantic>=2.6.0\npython-dotenv>=1.0.1\ngunicorn>=23.0.0`,
    );
    await fs.writeFile(path.join(target, ".env"), `NODE_ENV=development`);
  }

  async buildFlaskTree(target) {
    const dirs = ["src/routes", "src/utils", "tests", "venv"];
    for (const d of dirs)
      await fs.mkdir(path.join(target, d), { recursive: true });

    await fs.writeFile(
      path.join(target, "src/__init__.py"),
      `from flask import Flask\ndef create_app():\n    app = Flask(__name__)\n    from .routes.legacy_api import bp\n    app.register_blueprint(bp)\n    return app`,
    );
    await fs.writeFile(
      path.join(target, "src/config.py"),
      `class Config: pass`,
    );
    await fs.writeFile(
      path.join(target, "src/extensions.py"),
      `# Extensions initialization`,
    );
    await fs.writeFile(path.join(target, "src/routes/__init__.py"), ``);
    await fs.writeFile(
      path.join(target, "src/routes/webhooks.py"),
      `# Webhooks`,
    );
    await fs.writeFile(
      path.join(target, "src/routes/legacy_api.py"),
      `from flask import Blueprint, jsonify\nbp = Blueprint('api', __name__, url_prefix='/api')\n@bp.route('/health')\ndef health(): return jsonify({"status": "ok"})`,
    );
    await fs.writeFile(
      path.join(target, "run.py"),
      `from src import create_app\napp = create_app()\nif __name__ == '__main__':\n    app.run(port=8080)`,
    );
    await fs.writeFile(
      path.join(target, "requirements.txt"),
      `Flask>=3.0.0\ngunicorn>=21.2.0\npython-dotenv>=1.0.0`,
    );
    await fs.writeFile(path.join(target, ".env"), `FLASK_ENV=development`);
  }

  async writeBoilerplateFiles() {
    await fs.mkdir(this.targetPath, { recursive: true });

    if (this.isMonorepo) {
      await fs.writeFile(
        path.join(this.targetPath, "package.json"),
        JSON.stringify(
          {
            name: this.projectName,
            private: true,
            scripts: { dev: "turbo run dev", build: "turbo run build" },
            devDependencies: { turbo: "latest" },
          },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(this.targetPath, "turbo.json"),
        JSON.stringify(
          {
            $schema: "https://turbo.build/schema.json",
            pipeline: {
              build: {
                dependsOn: ["^build"],
                outputs: [".next/**", "dist/**"],
              },
              dev: { cache: false },
            },
          },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(this.targetPath, "pnpm-workspace.yaml"),
        `packages:\n  - 'apps/*'\n  - 'services/*'\n  - 'packages/*'`,
      );
    } else {
      // ✅ FIXED: Flat structure needs a basic root boundary so `pnpm install`
      // doesn't traverse up and install packages in your main /Sites folder
      await fs.writeFile(
        path.join(this.targetPath, "package.json"),
        JSON.stringify(
          { name: `${this.projectName}-root`, private: true },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(this.targetPath, "pnpm-workspace.yaml"),
        `packages:\n  - '*'\n`, // Maps pnpm directly to client-* and server-*
      );
    }

    const frontendPathAbs = path.join(this.targetPath, this.getFrontendPath());
    if (this.frontendChoice === "react") {
      await this.buildReactTree(frontendPathAbs);
    } else {
      await this.buildNextjsTree(frontendPathAbs);
    }

    const backendPathRel = this.getBackendPath();
    if (backendPathRel) {
      const backendPathAbs = path.join(this.targetPath, backendPathRel);
      if (this.backendChoice === "express")
        await this.buildExpressTree(backendPathAbs);
      else if (this.backendChoice === "fastapi")
        await this.buildFastApiTree(backendPathAbs);
      else if (this.backendChoice === "flask")
        await this.buildFlaskTree(backendPathAbs);
    }

    if (this.deploymentTarget === "render") {
      await this.injectRenderBlueprint();
    } else if (this.deploymentTarget === "railway") {
      await this.injectRailwayBlueprint();
    } else {
      console.log(
        ` -> Skipping deployment blueprint injection (Target is local/none).`,
      );
    }

    await this.generateEnvFiles();
  }

  async provisionPythonEnvironment() {
    const backendPathRel = this.getBackendPath();
    if (!backendPathRel) return;

    if (this.backendChoice === "fastapi" || this.backendChoice === "flask") {
      console.log(
        `\n -> Initializing isolated Python architecture environment via uv...`,
      );
      const apiPath = path.join(this.targetPath, backendPathRel);

      const venvResult = await CommandProcessExecutor.runCommand(
        "uv venv",
        apiPath,
      );
      if (!venvResult.success) {
        throw new Error(
          `uv venv orchestration layer failed: ${venvResult.output}`,
        );
      }

      console.log(
        ` -> Injecting compiled Python package dependencies via uv pip...`,
      );
      const pipResult = await CommandProcessExecutor.runCommand(
        "uv pip install -r requirements.txt",
        apiPath,
      );
      if (!pipResult.success) {
        throw new Error(
          `uv pip package optimization dropped: ${pipResult.output}`,
        );
      }

      console.log(`✅ Automated Python microservice cleanly provisioned.`);
    }
  }

  async generateEnvFiles() {
    console.log(` -> Injecting environment variables...`);
    let envContent = "";
    if (process.env.DATABASE_URL) {
      envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    }
    await fs.writeFile(path.join(this.targetPath, ".env.local"), envContent);
    await fs.writeFile(path.join(this.targetPath, ".env"), envContent);
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
        description: `Automatically provisioned via StudioFlow Engine`,
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
      "node_modules\n.next\ndist\n.env\n.env.local\n.DS_Store\nvenv\n.venv\n__pycache__\n";
    await fs.writeFile(
      path.join(this.targetPath, ".gitignore"),
      gitignoreContent,
    );

    await this.createGitHubRepo();

    await CommandProcessExecutor.runCommand("git init", this.targetPath);
    await CommandProcessExecutor.runCommand("git add .", this.targetPath);
    await CommandProcessExecutor.runCommand(
      `git commit -m "feat: initial architecture scaffold via StudioFlow engine"`,
      this.targetPath,
    );
    await CommandProcessExecutor.runCommand(
      "git branch -M main",
      this.targetPath,
    );
    await CommandProcessExecutor.runCommand(
      `git remote add origin ${this.githubRemote}`,
      this.targetPath,
    );

    const pushResult = await CommandProcessExecutor.runCommand(
      `git push -u origin main`,
      this.targetPath,
    );
    if (!pushResult.success) {
      throw new Error(`Git Push Failed:\n${pushResult.output}`);
    }

    return { success: true };
  }

  async deployToRenderAPI() {
    const deployProvider = this.deploymentTarget;
    if (deployProvider !== "render") {
      console.log(
        `\nℹ️ Deployment target is not Render. Skipping automated remote build trigger.`,
      );
      return null;
    }

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
    const backendPath = this.getBackendPath();

    try {
      if (backendPath) {
        console.log(` -> Instructing Render to build Backend service...`);

        const apiRes = await fetch("https://api.render.com/v1/services", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${renderApiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "web_service",
            name: `${slug}-backend`,
            ownerId: renderOwnerId,
            repo: repoUrl,
            branch: "main",
            autoDeploy: "yes", // ✅ FIXED: changed boolean `true` to string `"yes"`
            rootDir: backendPath,
            serviceDetails: {
              env: "python", // ✅ FIXED: changed 'runtime' to 'env' to stop "invalid JSON" error
              plan: "free",
              envSpecificDetails: {
                buildCommand: "pip install -r requirements.txt",
                startCommand:
                  "python -m gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT",
              },
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

      console.log(` -> Instructing Render to build Frontend dashboard...`);

      const webRes = await fetch("https://api.render.com/v1/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "web_service",
          name: `${slug}-frontend`,
          ownerId: renderOwnerId,
          repo: repoUrl,
          branch: "main",
          autoDeploy: "yes", // ✅ FIXED: changed boolean `true` to string `"yes"`
          rootDir: this.getFrontendPath() || ".",
          serviceDetails: {
            env: "node", // ✅ FIXED: changed 'runtime' to 'env' to stop "invalid JSON" error
            plan: "free",
            envSpecificDetails: {
              buildCommand: "pnpm install && pnpm run build",
              startCommand:
                this.frontendChoice === "react"
                  ? "pnpm run preview --port $PORT"
                  : "pnpm run start",
            },
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
        `    ❌ Render API Connection Dropped:`,
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
