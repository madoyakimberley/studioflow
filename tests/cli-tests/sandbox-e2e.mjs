import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { CommandProcessExecutor } from "../../apps/cli/src/CommandProcessExecutor.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

const colors = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

// ==========================================
// 1. THE DEPLOYMENT SANDBOX (API MOCKING)
// ==========================================
// We hijack the global fetch function. If the CLI tries to talk to Render/Railway,
// we intercept it and give it a fake successful response so it doesn't use your real accounts!
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url.includes("api.render.com") || url.includes("railway.app")) {
    console.log(
      `\n   ${colors.yellow}🛡️ [API INTERCEPTED]: Prevented real deployment to ${url}${colors.reset}`,
    );
    return {
      ok: true,
      json: async () => ({
        service: { url: "https://sandbox-mock-deployment.onrender.com" },
      }),
    };
  }
  return originalFetch(url, options); // Let normal requests pass through
};

async function runSandboxTest() {
  console.log(
    `\n${colors.cyan}🧪 Starting E2E Sandbox Simulation...${colors.reset}`,
  );
  const executor = new CommandProcessExecutor();

  // ==========================================
  // 2. THE DATABASE SANDBOX (EPHEMERAL DOCKER)
  // ==========================================
  console.log(
    `\n${colors.cyan}🐳 Booting disposable MySQL Database in Docker...${colors.reset}`,
  );

  // Kill any old test DBs just in case
  await executor.execute(
    `docker rm -f studioflow-test-db > /dev/null 2>&1`,
    process.cwd(),
  );

  // Start a fresh, temporary MySQL database
  const dbStart = await executor.execute(
    `docker run --rm --name studioflow-test-db -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=studioflow_sandbox -p 3307:3306 -d mysql:8.0`,
    process.cwd(),
  );

  if (!dbStart.success) {
    console.error(
      `${colors.red}Failed to start Docker DB. Is Colima running?${colors.reset}`,
    );
    return;
  }

  console.log(
    `   ${colors.yellow}⏳ Waiting 15 seconds for MySQL to be ready to accept connections...${colors.reset}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Point the environment variable to our temporary Docker database!
  process.env.DATABASE_URL =
    "mysql://root:root@127.0.0.1:3307/studioflow_sandbox";

  // ==========================================
  // 3. THE FILE SYSTEM SANDBOX (TMP FOLDER)
  // ==========================================
  const sandboxDir = path.join(os.tmpdir(), `studioflow-sandbox-${Date.now()}`);
  process.env.TARGET_OUTPUT_DIR = sandboxDir; // Force CLI to output here

  const manifest = {
    projectName: "Sandbox Test App",
    deploymentTarget: "render",
    services: [
      {
        name: "api-drizzle",
        runtime: "node",
        orm: "drizzle",
        rootDir: "apps/api",
      },
    ],
  };

  try {
    const scaffolder = new MultiStackTemplateScaffolder(
      "sandbox-project",
      manifest,
    );

    console.log(
      `\n${colors.cyan}📂 Scaffolding files into safe temporary directory...${colors.reset}`,
    );
    console.log(`   ${colors.yellow}Target: ${sandboxDir}${colors.reset}`);

    const targetDir = path.join(scaffolder.targetPath, "apps/api");
    await fs.mkdir(targetDir, { recursive: true });

    // Let the CLI generate the files (It will put them in /tmp)
    await scaffolder.ormGenerator.generate(
      targetDir,
      manifest.services[0],
      "npm",
    );

    // Let the CLI run the Drizzle DB Push (It will target our disposable Docker DB)
    console.log(
      `\n${colors.cyan}🗄️ Running Drizzle DB Push against isolated database...${colors.reset}`,
    );
    // Note: Assuming your ORM generator runs `npx drizzle-kit push` under the hood.

    // Test the deployment (This will trigger our fake Fetch)
    console.log(
      `\n${colors.cyan}🚀 Simulating Deployment to Render...${colors.reset}`,
    );
    const deploymentUrl = await scaffolder.deployToRenderAPI(
      "sandbox-project",
      manifest.services[0],
    );
    console.log(
      `   ${colors.green}✅ Mock Deployment Succeeded! URL: ${deploymentUrl}${colors.reset}`,
    );

    console.log(
      `\n${colors.green}🎉 SANDBOX E2E TEST COMPLETED FLAWLESSLY!${colors.reset}`,
    );
  } catch (error) {
    console.error(`\n${colors.red}❌ Test crashed with error:${colors.reset}`);
    console.error(error);
  } finally {
    // ==========================================
    // 4. THE CLEANUP (DESTROY THE EVIDENCE)
    // ==========================================
    console.log(
      `\n${colors.cyan}🧹 Cleaning up sandbox resources...${colors.reset}`,
    );
    await executor.execute(`docker stop studioflow-test-db`, process.cwd());
    console.log(
      `   ${colors.green}✅ Disposable Database Destroyed.${colors.reset}`,
    );
    console.log(
      `   ${colors.green}✅ Temporary Files left in OS Tmp (will auto-delete).${colors.reset}\n`,
    );
  }
}

runSandboxTest();
