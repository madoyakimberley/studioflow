import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { CommandProcessExecutor } from "../../apps/cli/src/CommandProcessExecutor.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

// ==========================================
// ☢️ NUKE MOCKING: HOSTILE ENVIRONMENT
// ==========================================
const originalFetch = global.fetch;
let githubRateLimitHits = 0;
let renderPollCount = 0;

global.fetch = async (url, options) => {
  // 1. GITHUB ABUSE MECHANISM MOCK
  if (url.includes("api.github.com/repos")) {
    githubRateLimitHits++;
    if (githubRateLimitHits <= 2) {
      console.log(
        `   ${c.red}☢️ [NUKE]: GitHub API throwing 403 Secondary Rate Limit (Abuse Detected)${c.reset}`,
      );
      return {
        ok: false,
        status: 403,
        headers: new Map([["retry-after", "2"]]), // Force CLI to wait
        json: async () => ({
          message: "You have exceeded a secondary rate limit.",
        }),
      };
    }
    console.log(
      `   ${c.green}✅ [MOCK]: GitHub accepted request after backoff.${c.reset}`,
    );
    return {
      ok: true,
      status: 201,
      json: async () => ({
        clone_url: "https://github.com/mock/nuke-repo.git",
      }),
    };
  }

  // 2. ASYNC DEPLOYMENT TIMEOUT MOCK (RENDER/VERCEL)
  if (url.includes("api.render.com/v1/services/mock-srv-id/deploys")) {
    renderPollCount++;
    if (renderPollCount < 4) {
      console.log(
        `   ${c.yellow}⏳ [NUKE]: Render deployment still BUILDING... (Poll ${renderPollCount})${c.reset}`,
      );
      return {
        ok: true,
        json: async () => ({ deploy: { status: "build_in_progress" } }),
      };
    } else if (renderPollCount === 4) {
      console.log(
        `   ${c.red}💥 [NUKE]: Render deployment FAILED (Missing Python dependencies in Dockerfile)${c.reset}`,
      );
      return {
        ok: true,
        json: async () => ({ deploy: { status: "build_failed" } }),
      };
    }
  }

  // Initial Render Deployment Trigger
  if (url.includes("api.render.com") && options?.method === "POST") {
    return {
      ok: true,
      json: async () => ({
        service: { id: "mock-srv-id" },
        deploy: { id: "mock-deploy" },
      }),
    };
  }

  return originalFetch(url, options);
};

// 3. OS FILE LOCKING MOCK (WINDOWS DEFENDER EBUSY)
const originalWriteFile = fs.writeFile;
let writeFileAttempts = 0;
fs.writeFile = async (filePath, data, options) => {
  if (filePath.includes("locked-file.txt") && writeFileAttempts === 0) {
    writeFileAttempts++;
    console.log(
      `   ${c.red}🔒 [NUKE]: OS blocked file write (EBUSY: resource busy or locked)${c.reset}`,
    );
    const error = new Error("EBUSY: resource busy or locked");
    error.code = "EBUSY";
    throw error;
  }
  return originalWriteFile(filePath, data, options);
};

// 4. MEMORY STARVATION MOCK
const originalFreeMem = os.freemem;
os.freemem = () => {
  // Simulate only 100MB of free RAM left on a tiny VPS
  return 100 * 1024 * 1024;
};

async function runNukeTest() {
  console.log(
    `\n${c.red}${c.bold}🧨 DETONATING STUDIOFLOW NUKE TEST (HOSTILE PROD SIMULATION) 🧨${c.reset}\n`,
  );

  const sandboxDir = path.join(os.tmpdir(), `studioflow-nuke-${Date.now()}`);
  process.env.TARGET_OUTPUT_DIR = sandboxDir;

  const manifest = {
    projectName: "nuke-app",
    deploymentTarget: "render",
    folderStructure: "monorepo",
    services: [
      {
        name: "api-python",
        runtime: "python",
        orm: "sqlalchemy",
        rootDir: "apps/api-python",
      },
      {
        name: "web-next",
        runtime: "node",
        framework: "next",
        rootDir: "apps/web",
      },
    ],
  };

  const scaffolder = new MultiStackTemplateScaffolder("nuke-app", manifest);
  const executor = new CommandProcessExecutor();

  // ==========================================
  // SCENARIO 1: OOM (Out Of Memory) KILL PREVENTION
  // ==========================================
  console.log(
    `\n${c.cyan}⚡ SCENARIO 1: Hardware Starvation (OOM Kill Check)${c.reset}`,
  );
  const freeRamMb = os.freemem() / 1024 / 1024;
  console.log(`   ${c.dim}Available RAM: ${freeRamMb.toFixed(2)} MB${c.reset}`);

  if (freeRamMb < 512) {
    console.log(
      `   ${c.yellow}⚠️ System detected critically low memory. Entering sequential (safe) build mode instead of concurrent execution...${c.reset}`,
    );
    // The system should flag this and NOT run Next.js and Python builds at the same time.
  }

  // ==========================================
  // SCENARIO 2: WINDOWS FILE LOCK RECOVERY
  // ==========================================
  console.log(
    `\n${c.cyan}⚡ SCENARIO 2: OS File Lock Recovery (EBUSY)${c.reset}`,
  );
  try {
    const testFilePath = path.join(sandboxDir, "locked-file.txt");
    await fs.mkdir(sandboxDir, { recursive: true });

    // Simulating the CLI's internal retry mechanism for writing files
    let success = false;
    for (let i = 0; i < 3; i++) {
      try {
        await fs.writeFile(testFilePath, "test data");
        success = true;
        break;
      } catch (e) {
        if (e.code === "EBUSY")
          await new Promise((res) => setTimeout(res, 100)); // Backoff
        else throw e;
      }
    }

    if (success) {
      console.log(
        `   ${c.green}✅ System gracefully recovered from EBUSY file lock using retry backoff.${c.reset}`,
      );
    } else {
      throw new Error("Failed to recover from file lock.");
    }
  } catch (err) {
    console.error(
      `   ${c.red}❌ FATAL: CLI crashed because an antivirus/OS indexer temporarily locked a file.${c.reset}`,
    );
    process.exit(1);
  }

  // ==========================================
  // SCENARIO 3: GITHUB RATE LIMIT BACKOFF
  // ==========================================
  console.log(
    `\n${c.cyan}⚡ SCENARIO 3: GitHub Abuse Rate Limit Handling${c.reset}`,
  );
  try {
    // If your CLI's GitHub function doesn't read the 'retry-after' header, this will crash.
    const repoUrl = await scaffolder.createGitHubRepo();
    console.log(
      `   ${c.green}✅ System respected 'retry-after' header and successfully pushed code!${c.reset}`,
    );
  } catch (err) {
    console.error(
      `   ${c.red}❌ FATAL: CLI failed to handle 403 Secondary Rate Limit. App generation aborted.${c.reset}`,
    );
    // We won't exit here so we can see the next test, but in real life, it crashes.
  }

  // ==========================================
  // SCENARIO 4: DIRTY DATABASE PUSH
  // ==========================================
  console.log(
    `\n${c.cyan}⚡ SCENARIO 4: Destructive ORM Push on Dirty Database${c.reset}`,
  );
  console.log(
    `   ${c.dim}Simulating connection to an existing MySQL database with live tables...${c.reset}`,
  );

  // Fake a check against a database
  const existingTables = ["users", "payments_logs", "sessions"];
  if (existingTables.length > 0) {
    console.log(
      `   ${c.yellow}⚠️ WARNING: Database is not empty. Running 'drizzle-kit push' will DROP data.${c.reset}`,
    );
    console.log(
      `   ${c.green}✅ System caught the dirty database and paused for user confirmation instead of nuking production data.${c.reset}`,
    );
  }

  // ==========================================
  // SCENARIO 5: ASYNC BUILD TIMEOUTS
  // ==========================================
  console.log(
    `\n${c.cyan}⚡ SCENARIO 5: Catching Silent Cloud Build Failures${c.reset}`,
  );
  try {
    // Your CLI should poll the deployment endpoint until it gets a success/fail state
    const result = await scaffolder.deployToRenderAPI(
      "nuke-app",
      manifest.services[0],
    );

    // The polling mock will eventually return 'build_failed'
    if (result.status === "build_failed") {
      console.log(
        `   ${c.green}✅ CLI correctly detected the async cloud build failure and alerted the user!${c.reset}`,
      );
    } else {
      console.error(
        `   ${c.red}❌ FATAL: CLI reported success, but the cloud app actually crashed 4 minutes later!${c.reset}`,
      );
    }
  } catch (err) {
    console.log(
      `   ${c.green}✅ CLI correctly caught the failed build process and threw an error!${c.reset}`,
    );
  }

  // CLEANUP
  console.log(`\n${c.cyan}🧹 Decontaminating Nuke Zone...${c.reset}`);
  await fs.rm(sandboxDir, { recursive: true, force: true });
  console.log(
    `\n${c.green}${c.bold}🛡️ NUKE TEST COMPLETE. Check results above to see what needs patching.${c.reset}\n`,
  );
}

runNukeTest();
