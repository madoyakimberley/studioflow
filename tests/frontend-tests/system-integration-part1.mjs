import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

// Import core internal modules from your CLI app infrastructure
import { MultiStackTemplateScaffolder } from "../../apps/cli/src/MultiStackTemplateScaffolder.js";
import { OrmSchemaGenerator } from "../../apps/cli/src/OrmSchemaGenerator.js";

const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

console.log(
  `${c.magenta}${c.bold}🌪️ STARTING STUDIOFLOW SYSTEM INTEGRATION SUITE (PART 1) 🌪️${c.reset}\n`,
);

// Create a unique clean output sandbox in your operating system's temp folder
const SANDBOX_DIR = path.join(
  os.tmpdir(),
  `studioflow-integration-sandbox-${Date.now()}`,
);
process.env.TARGET_OUTPUT_DIR = SANDBOX_DIR;

// Helper to recursively list all files generated in a directory
async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath);
  for (const file of files) {
    const absolutePath = path.join(dirPath, file);
    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
      await getAllFiles(absolutePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(absolutePath);
    }
  }
  return arrayOfFiles;
}

async function runSystemIntegrationTest() {
  // ---------------------------------------------------------
  // STEP 1: SIMULATE SIGNUP / LOGIN / CLI TOKEN BINDING
  // ---------------------------------------------------------
  console.log(
    `${c.cyan}⚙️ Step 1: Provisioning Active User & CLI Auth Tokens...${c.reset}`,
  );
  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Error: DATABASE_URL must be specified in your environment variables.",
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Generate unique handles for this specific test run to prevent MySQL Duplicate Entry errors
  const testRandomSuffix = crypto.randomBytes(4).toString("hex");
  const mockUserId = `dev_user_${testRandomSuffix}`;
  const uniqueUsername = `luna_dev_${testRandomSuffix}`;
  const uniqueEmail = `luna_${testRandomSuffix}@studioflow.dev`;
  const mockCliToken = `stf_live_${crypto.randomBytes(16).toString("hex")}`;
  const workspaceSlug = `alpha-hq-${testRandomSuffix}`;

  let workspaceId;

  try {
    await connection.query(
      `
      INSERT INTO users (id, username, email, password_hash, cli_token) 
      VALUES (?, ?, ?, 'hashed_pass_xyz', ?)
    `,
      [mockUserId, uniqueUsername, uniqueEmail, mockCliToken],
    );

    const [wsResult] = await connection.query(
      `
      INSERT INTO workspaces (owner_id, name, slug) 
      VALUES (?, 'Alpha HQ Workspace', ?)
    `,
      [mockUserId, workspaceSlug],
    );

    workspaceId = wsResult.insertId;
    console.log(`   ✅ User registered successfully: ${uniqueUsername}`);
    console.log(`   ✅ Auth Token: ${mockCliToken}`);
    console.log(`   ✅ Workspace provisioned context ID: ${workspaceId}\n`);
  } catch (err) {
    console.error("   ❌ [CRASH]: DB initialization failed:", err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }

  // ---------------------------------------------------------
  // STEP 2: CONSTRUCT DYNAMIC MATRIX FROM WIZARD STATE
  // ---------------------------------------------------------
  console.log(
    `${c.cyan}⚙️ Step 2: Compiling Complex Multi-App Manifest Structure...${c.reset}`,
  );

  const testManifest = {
    workspaceId: workspaceId,
    name: "avalanche-core-system",
    gitProvider: "github",
    folderStructure: "monorepo",
    deploymentTarget: "railway",
    nodePackageManager: "pnpm",
    services: [
      {
        id: "srv-1",
        name: "admin-gateway",
        runtime: "typescript",
        framework: "nextjs",
        orm: "drizzle",
        database: "mysql",
        dependencies: [{ name: "drizzle-orm", version: "latest" }],
      },
      {
        id: "srv-2",
        name: "billing-service",
        runtime: "javascript",
        framework: "express",
        orm: "prisma",
        database: "postgresql",
        dependencies: [{ name: "@prisma/client", version: "latest" }],
      },
      {
        id: "srv-3",
        name: "identity-vault",
        runtime: "typescript",
        framework: "nestjs",
        orm: "mongoose",
        database: "mongodb",
        dependencies: [{ name: "mongoose", version: "latest" }],
      },
      {
        id: "srv-4",
        name: "data-analytics-py",
        runtime: "python",
        framework: "fastapi",
        orm: "sqlalchemy",
        database: "postgresql",
        dependencies: [],
      },
    ],
  };
  console.log(
    `   ✅ Multi-App Manifest successfully formatted with ${testManifest.services.length} services.\n`,
  );

  // ---------------------------------------------------------
  // STEP 3: EXECUTE SCAFFOLDER WORKER CORE
  // ---------------------------------------------------------
  console.log(
    `${c.cyan}⚙️ Step 3: Triggering Template Scaffolder Module...${c.reset}`,
  );
  console.log(`   Target Sandboxed Generation Folder: ${SANDBOX_DIR}`);

  const scaffolder = new MultiStackTemplateScaffolder(
    testManifest.name,
    testManifest,
  );

  try {
    await fs.mkdir(scaffolder.targetPath, { recursive: true });

    for (const service of testManifest.services) {
      const serviceDirPath = path.join(
        scaffolder.targetPath,
        "apps",
        service.name,
      );
      await fs.mkdir(serviceDirPath, { recursive: true });

      console.log(
        `   🏗️  Scaffolding structural boundary for [${service.name}] (${service.runtime}/${service.framework})...`,
      );

      const schemaGenerator = new OrmSchemaGenerator();
      await schemaGenerator.generate(
        serviceDirPath,
        service,
        testManifest.nodePackageManager,
      );
    }

    console.log(
      `\n${c.green}✅ Step 3 Successful: Architectural directories and ORM configurations generated without file contention.${c.reset}\n`,
    );

    // ---------------------------------------------------------
    // STEP 4: DYNAMIC ARTIFACT RECOVERY & VALIDATION
    // ---------------------------------------------------------
    console.log(
      `${c.cyan}⚙️ Step 4: Dynamically Verifying Generated Artifacts...${c.reset}`,
    );

    const generatedFiles = await getAllFiles(scaffolder.targetPath);

    console.log(
      `\n   🔍 Found ${generatedFiles.length} files total inside sandbox directory structure:`,
    );
    for (const file of generatedFiles) {
      const relativePath = path.relative(scaffolder.targetPath, file);
      const content = await fs.readFile(file, "utf8");
      console.log(
        `      📄 File: ${c.yellow}${relativePath}${c.reset} (${content.length} bytes)`,
      );
    }

    // Dynamic assertion to confirm each microservice folder got at least one file generated
    let activeServiceFoldersWithFiles = 0;
    for (const service of testManifest.services) {
      const containsFile = generatedFiles.some((f) =>
        f.includes(path.join("apps", service.name)),
      );
      if (containsFile) {
        activeServiceFoldersWithFiles++;
        console.log(
          `   ✅ Microservice [${service.name}] successfully received schema assets.`,
        );
      } else {
        console.log(
          `   ❌ Microservice [${service.name}] did not receive any files.`,
        );
      }
    }

    console.log(
      `\n📊 System Verification Metric: [${activeServiceFoldersWithFiles}/${testManifest.services.length}] service builds verified.`,
    );

    if (activeServiceFoldersWithFiles === testManifest.services.length) {
      console.log(
        `\n${c.bold}${c.green}🎉 PART 1 SYSTEM INTEGRATION SUCCESSFUL! All system generator layers are communicating cleanly.${c.reset}\n`,
      );
    } else {
      console.error(
        `\n❌ [FAILURE]: Incomplete configuration pipeline output.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "❌ [CRASH]: Unexpected execution boundary breakdown:",
      error,
    );
    process.exit(1);
  } finally {
    try {
      await fs.rm(SANDBOX_DIR, { recursive: true, force: true });
    } catch {}
  }
}

runSystemIntegrationTest();
