import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { CommandProcessExecutor } from "../../apps/cli/src/CommandProcessExecutor.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

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
// MOCKING FOR DISASTER SCENARIOS
// ==========================================
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url.includes("api.github.com/user/repos")) {
    console.log(
      `   ${c.yellow}🛡️ [MOCK]: Simulating GitHub API Reject (Duplicate Repo)${c.reset}`,
    );
    return {
      ok: false,
      json: async () => ({
        message: "Repository creation failed.",
        errors: [{ message: "name already exists on this account" }],
      }),
    };
  }
  if (url.includes("api.github.com/user")) {
    return { ok: true, json: async () => ({ login: "doomsday-tester" }) };
  }
  return originalFetch(url, options);
};

async function runDoomsdaySuite() {
  console.log(
    `\n${c.red}${c.bold}☢️ INITIATING STUDIOFLOW DOOMSDAY EDGE-CASE SUITE ☢️${c.reset}\n`,
  );

  const sandboxDir = path.join(
    os.tmpdir(),
    `studioflow-doomsday-${Date.now()}`,
  );
  process.env.TARGET_OUTPUT_DIR = sandboxDir;

  const manifest = {
    projectName: "doomsday-app",
    deploymentTarget: "none",
    folderStructure: "monorepo",
    services: [
      {
        name: "secure-api",
        runtime: "node",
        orm: "drizzle",
        rootDir: "apps/api",
      },
    ],
  };

  const scaffolder = new MultiStackTemplateScaffolder("doomsday-app", manifest);

  // ==========================================
  // EDGE CASE 1: DIRECTORY COLLISION
  // ==========================================
  console.log(
    `${c.cyan}⚡ SCENARIO 1: Directory Collision Prevention${c.reset}`,
  );

  // Maliciously pre-create the folder to simulate an existing project
  await fs.mkdir(scaffolder.targetPath, { recursive: true });
  console.log(
    `   ${c.dim}Created dummy directory at ${scaffolder.targetPath}${c.reset}`,
  );

  const isCleared = await scaffolder.verifyClearance();
  if (isCleared) {
    console.error(
      `   ${c.red}❌ FATAL: Clearance verification failed. It thinks the folder is empty!${c.reset}`,
    );
    process.exit(1);
  } else {
    console.log(
      `   ${c.green}✅ System correctly identified a directory collision and blocked execution.${c.reset}\n`,
    );
  }

  // Delete it so we can continue testing
  await fs.rm(scaffolder.targetPath, { recursive: true, force: true });

  // ==========================================
  // EDGE CASE 2: VAULT DECRYPTION INTEGRITY
  // ==========================================
  console.log(
    `${c.cyan}⚡ SCENARIO 2: Cryptographic Vault Integrity Check${c.reset}`,
  );

  // Scaffold the actual project
  await scaffolder.processExecutionPipeline();

  const targetApiDir = path.join(scaffolder.targetPath, "apps/api");
  const vaultSeedPath = path.join(targetApiDir, "VAULT_SEED.json");
  const envLocalPath = path.join(targetApiDir, ".env.local");

  // Extract the generated master key
  const envLocalContent = await fs.readFile(envLocalPath, "utf8");
  const masterKey = envLocalContent.split("SF_VAULT_KEY=")[1].trim();

  // Read the seed
  const seedFile = await fs.readFile(vaultSeedPath, "utf8");
  const vaultData = JSON.parse(seedFile);

  console.log(
    `   ${c.dim}Attempting to decrypt vault using generated AES-256-GCM keys...${c.reset}`,
  );

  try {
    const keyBuffer = Buffer.from(masterKey, "hex");
    const ivBuffer = Buffer.from(vaultData.iv, "hex");
    const authTagBuffer = Buffer.from(vaultData.authTag, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      keyBuffer,
      ivBuffer,
    );
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(vaultData.encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    if (
      decrypted.includes("DATABASE_URL") &&
      decrypted.includes("API_SECRET")
    ) {
      console.log(
        `   ${c.green}✅ Vault Decryption Successful! The generated VaultManager.js will work in production.${c.reset}\n`,
      );
    } else {
      throw new Error(
        "Decrypted payload is missing expected environment variables.",
      );
    }
  } catch (err) {
    console.error(
      `   ${c.red}❌ FATAL: Vault Decryption failed. Apps will crash on boot! Error: ${err.message}${c.reset}`,
    );
    process.exit(1);
  }

  // ==========================================
  // EDGE CASE 3: GITHUB API FAILURE RECOVERY
  // ==========================================
  console.log(
    `${c.cyan}⚡ SCENARIO 3: GitHub API Rejection Handling${c.reset}`,
  );
  process.env.GITHUB_PAT = "fake_token_for_test";

  console.log(
    `   ${c.dim}Attempting to create a repo that already exists...${c.reset}`,
  );
  const remoteUrl = await scaffolder.createGitHubRepo();

  if (remoteUrl === "https://github.com/doomsday-tester/doomsday-app.git") {
    console.log(
      `   ${c.green}✅ System successfully fell back to existing repo URL instead of crashing.${c.reset}\n`,
    );
  } else {
    console.error(
      `   ${c.red}❌ FATAL: System failed to handle duplicate GitHub repo error gracefully.${c.reset}`,
    );
    process.exit(1);
  }

  // ==========================================
  // CLEANUP
  // ==========================================
  console.log(`${c.cyan}🧹 Purging Doomsday Sandbox...${c.reset}`);
  await fs.rm(sandboxDir, { recursive: true, force: true });
  console.log(
    `   ${c.green}${c.bold}🎉 DOOMSDAY SUITE PASSED. You are ready for live data.${c.reset}\n`,
  );
}

runDoomsdaySuite();
