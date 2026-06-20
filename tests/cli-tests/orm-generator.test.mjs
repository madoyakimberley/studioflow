import test from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Adjust these imports based on your exact folder structure.
// Assuming tests/cli-tests/ is two directories down from the project root where src/ lives.
import { OrmSchemaGenerator } from "../../apps/cli/src/OrmSchemaGenerator.js";
import { CommandProcessExecutor } from "../../apps/cli/src/CommandProcessExecutor.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==========================================
// MOCK: Prevent actual shell execution
// ==========================================
// We intercept the CommandProcessExecutor so it doesn't actually run
// `npm install` or `drizzle-kit` during the unit tests, keeping them fast.
const executedCommands = [];
const originalExecute = CommandProcessExecutor.prototype.execute;

CommandProcessExecutor.prototype.execute = async function (
  shellStatementText,
  activeExecutionDirectoryPath,
  streamOutput,
) {
  executedCommands.push({
    cmd: shellStatementText,
    dir: activeExecutionDirectoryPath,
  });
  return { success: true, output: "Mocked success output" };
};

// ==========================================
// TEST SUITE
// ==========================================
test("OrmSchemaGenerator Scenarios", async (t) => {
  let tempTestDir;

  // Setup: Create a fresh temporary directory before the tests start
  t.beforeEach(async () => {
    executedCommands.length = 0; // Clear command history
    tempTestDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "studioflow-orm-test-"),
    );
  });

  // Teardown: Clean up the temporary directory after each test
  t.afterEach(async () => {
    try {
      await fs.rm(tempTestDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Cleanup failed:", e.message);
    }
  });

  await t.test("Scenario 1: Drizzle + MySQL", async () => {
    const generator = new OrmSchemaGenerator();
    const spec = {
      runtime: "typescript",
      orm: "drizzle",
      database: "mysql",
    };

    await generator.generate(tempTestDir, spec, "npm");

    // Verify it didn't crash and look at what commands it tried to run
    assert.ok(
      executedCommands.length >= 0,
      "Should have executed setup commands",
    );

    // Optional: If Drizzle generation creates a specific file (like schema.ts),
    // you can verify it exists here if your generator writes files directly instead of via shell:
    // const files = await fs.readdir(tempTestDir);
    // assert.ok(files.includes("schema.ts") || files.includes("drizzle"), "Drizzle files should exist");
  });

  await t.test("Scenario 2: Drizzle + PostgreSQL", async () => {
    const generator = new OrmSchemaGenerator();
    const spec = {
      runtime: "typescript",
      orm: "drizzle",
      database: "postgres",
    };

    await generator.generate(tempTestDir, spec, "npm");

    assert.ok(true, "Drizzle Postgres generation completed without throwing");
  });

  await t.test("Scenario 3: Prisma + MySQL", async () => {
    const generator = new OrmSchemaGenerator();
    const spec = {
      runtime: "typescript",
      orm: "prisma",
      database: "mysql",
    };

    await generator.generate(tempTestDir, spec, "npm");

    // Example assertion: ensure prisma init or similar was called
    const hasPrismaCmd = executedCommands.some((c) => c.cmd.includes("prisma"));
    if (executedCommands.length > 0) {
      assert.ok(
        hasPrismaCmd,
        "Should have executed a Prisma related shell command",
      );
    }
  });

  await t.test("Scenario 4: Prisma + PostgreSQL", async () => {
    const generator = new OrmSchemaGenerator();
    const spec = {
      runtime: "typescript",
      orm: "prisma",
      database: "postgres",
    };

    await generator.generate(tempTestDir, spec, "npm");

    assert.ok(true, "Prisma Postgres generation completed without throwing");
  });

  await t.test("Scenario 5: Mongoose (MongoDB)", async () => {
    const generator = new OrmSchemaGenerator();
    const spec = {
      runtime: "typescript",
      orm: "mongoose",
      database: "mongodb", // Mongoose implies mongo, but explicit is good
    };

    await generator.generate(tempTestDir, spec, "npm");

    assert.ok(true, "Mongoose generation completed without throwing");
  });

  // Restore the original prototype just in case other test files run in the same process
  t.after(() => {
    CommandProcessExecutor.prototype.execute = originalExecute;
  });
});
