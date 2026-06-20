import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { SystemCircuitBreaker } from "../../apps/cli/src/SystemCircuitBreaker.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

// ==========================================
// 1. THE CHAOS API INTERCEPTOR
// ==========================================
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url.includes("api.render.com")) {
    const payload = JSON.parse(options.body);

    // We intentionally force Python to fail deployment!
    if (payload.name && payload.name.includes("python")) {
      console.log(
        `   ${c.red}🔥 [CHAOS MONKEY]: Forcing Render API to fail for Python!${c.reset}`,
      );
      return {
        ok: false,
        json: async () => ({
          error: "Internal Server Error - Deployment Failed",
        }),
      };
    }

    // Everything else succeeds
    console.log(
      `   ${c.green}✅ [API MOCK]: Successful deployment for ${payload.name || "service"}!${c.reset}`,
    );
    return {
      ok: true,
      json: async () => ({
        service: { url: `https://chaos-mock-${Date.now()}.onrender.com` },
      }),
    };
  }
  return originalFetch(url, options);
};

async function runChaosSimulation() {
  console.log(
    `\n${c.cyan}${c.bold}🌪️ STARTING STUDIOFLOW CHAOS ENGINEERING SUITE 🌪️${c.reset}\n`,
  );

  // ==========================================
  // 2. STRESS TESTING THE CIRCUIT BREAKER
  // ==========================================
  console.log(
    `${c.yellow}⚡ SCENARIO 1: Database Connection Outage (Testing Circuit Breaker)${c.reset}`,
  );

  const dbBreaker = new SystemCircuitBreaker("MySQL_Database", 3, 2000); // 3 fails allowed, 2 second cooldown
  let connectionAttempts = 0;

  const flakyDatabaseConnection = async () => {
    connectionAttempts++;
    if (connectionAttempts <= 2) throw new Error("Connection Refused!");
    return "Connected Successfully!";
  };

  for (let i = 1; i <= 3; i++) {
    try {
      console.log(
        `   ${c.cyan}Attempting DB connection (Try ${i})...${c.reset}`,
      );
      await dbBreaker.execute(flakyDatabaseConnection);
    } catch (e) {
      // It's supposed to fail the first two times!
    }
  }

  console.log(
    `   ${c.cyan}Waiting for 2-second cooldown window to pass...${c.reset}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 2100));

  console.log(
    `   ${c.cyan}Attempting DB connection (Try 4 - Should Recover!)...${c.reset}`,
  );
  await dbBreaker.execute(flakyDatabaseConnection);

  // ==========================================
  // 3. MONOREPO GENERATION STRESS TEST
  // ==========================================
  console.log(
    `\n${c.yellow}⚡ SCENARIO 2: Massive Multi-Language Monorepo Generation${c.reset}`,
  );

  const sandboxDir = path.join(os.tmpdir(), `studioflow-chaos-${Date.now()}`);
  process.env.TARGET_OUTPUT_DIR = sandboxDir;

  const massiveManifest = {
    projectName: "Chaos Matrix App",
    deploymentTarget: "render",
    folderStructure: "monorepo",
    services: [
      {
        name: "api-drizzle",
        runtime: "node",
        orm: "drizzle",
        rootDir: "apps/api-drizzle",
      },
      {
        name: "api-python",
        runtime: "python",
        orm: "sqlalchemy",
        rootDir: "apps/api-python",
      },
      {
        name: "api-php",
        runtime: "php",
        orm: "eloquent",
        rootDir: "apps/api-php",
      },
    ],
  };

  const scaffolder = new MultiStackTemplateScaffolder(
    "chaos-project",
    massiveManifest,
  );
  console.log(`   ${c.cyan}Targeting: ${sandboxDir}${c.reset}`);

  for (const srv of massiveManifest.services) {
    const targetDir = path.join(scaffolder.targetPath, srv.rootDir);
    await fs.mkdir(targetDir, { recursive: true });

    console.log(
      `   ${c.cyan}Generating blueprints for [${srv.runtime}] with [${srv.orm}]...${c.reset}`,
    );
    await scaffolder.ormGenerator.generate(targetDir, srv, "npm");
  }

  // ==========================================
  // 4. DEPLOYMENT DISASTER RECOVERY
  // ==========================================
  console.log(
    `\n${c.yellow}⚡ SCENARIO 3: Partial Deployment Disaster Recovery${c.reset}`,
  );

  for (const srv of massiveManifest.services) {
    console.log(
      `   ${c.cyan}Initiating deployment for ${srv.name}...${c.reset}`,
    );
    const url = await scaffolder.deployToRenderAPI("chaos-project", srv);
    console.log(`   Result URL: ${url}\n`);
  }

  console.log(`\n${c.green}${c.bold}🎉 CHAOS SUITE COMPLETED!${c.reset}`);
  console.log(
    `${c.dim}If you didn't see any fatal Node crashes, your CLI successfully handled multiple catastrophic network and API failures gracefully!${c.reset}\n`,
  );
}

runChaosSimulation();
