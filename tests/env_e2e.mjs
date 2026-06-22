import { test, describe } from "node:test";
import assert from "node:assert";

// --- Matrix Definitions from page.tsx ---
const DATABASE_ENGINES = ["postgresql", "mysql", "mongodb", "sqlite"];

const DATABASE_ORMS = [
  "drizzle",
  "prisma",
  "mongoose",
  "sqlalchemy",
  "django_orm",
  "eloquent",
  "hibernate",
  "entity_framework",
  "active_record",
];

const REDIS_STATES = [
  { label: "Omitted (Optional)", value: "" },
  { label: "Provided", value: "redis://127.0.0.1:6379" },
];

// --- Form Logic Replication ---
// This mimics the exact state-handling and payload-cleaning logic inside handleSubmit
function processFormSubmission(formData, workspaceId = 1) {
  // Guard check from page.tsx
  if (!formData.databaseUrl || !formData.githubToken) {
    throw new Error(
      "Please fill in both the Database Connection URL and GitHub Token.",
    );
  }

  // Exact destructuring logic from page.tsx line 97
  const { databaseEngine, databaseOrm, ...cleanPayload } = formData;

  return {
    workspaceId: Number(workspaceId),
    ...cleanPayload,
  };
}

// --- Test Suite ---
describe("Environment Setup Form Logic & Payload Matrix", () => {
  // 1. Validation Guardrails Test
  describe("Form Validation Guardrails", () => {
    test("Should throw an error if databaseUrl is missing", () => {
      const invalidData = {
        databaseUrl: "",
        githubToken: "ghp_mock_token",
      };
      assert.throws(() => processFormSubmission(invalidData), /Please fill in/);
    });

    test("Should throw an error if githubToken is missing", () => {
      const invalidData = {
        databaseUrl: "postgresql://localhost:5432/db",
        githubToken: "",
      };
      assert.throws(() => processFormSubmission(invalidData), /Please fill in/);
    });
  });

  // 2. Comprehensive Exhaustive Matrix Test (All DBs x All ORMs x All Redis States)
  describe("Full Exhaustive Matrix Verification", () => {
    let totalCombinationsTested = 0;

    for (const engine of DATABASE_ENGINES) {
      for (const orm of DATABASE_ORMS) {
        for (const redisState of REDIS_STATES) {
          const testName = `DB: ${engine} | ORM: ${orm} | Redis: ${redisState.label}`;

          test(testName, () => {
            // Mocking the complete initial state mapping matching page.tsx
            const mockFormData = {
              databaseUrl: `${engine}://user:pass@localhost:5432/test_db`,
              databaseEngine: engine,
              databaseOrm: orm,
              targetOutputDir: "/Users/luna/Sites/work",
              githubToken: "ghp_secure_matrix_token_12345",
              deploymentProvider: "vercel",
              deploymentApiKey: "rnd_mock_api_key",
              deploymentOwnerId: "usr_mock_owner_id",
              redisUrl: redisState.value,
              smtpHost: "smtp.mailtrap.io",
              smtpPort: "587",
              smtpUser: "matrix_user",
              smtpPass: "matrix_pass",
              adminAlertEmail: "alerts@studioflow.dev",
            };

            const workspaceId = 42;
            const payload = processFormSubmission(mockFormData, workspaceId);

            // Assertions checking that UI-only fields were successfully excluded
            assert.strictEqual(
              payload.databaseEngine,
              undefined,
              "databaseEngine must be cleaned out of payload",
            );
            assert.strictEqual(
              payload.databaseOrm,
              undefined,
              "databaseOrm must be cleaned out of payload",
            );

            // Assertions verifying workspace metadata persistence
            assert.strictEqual(payload.workspaceId, 42);

            // Assertions checking absolute path and authentication fields
            assert.strictEqual(
              payload.targetOutputDir,
              "/Users/luna/Sites/work",
            );
            assert.strictEqual(
              payload.githubToken,
              "ghp_secure_matrix_token_12345",
            );

            // Assertions for Optional Redis Tracking
            if (redisState.value === "") {
              assert.strictEqual(
                payload.redisUrl,
                "",
                "Redis URL should accept optional empty strings cleanly",
              );
            } else {
              assert.strictEqual(
                payload.redisUrl,
                "redis://127.0.0.1:6379",
                "Redis URL must match the provided input string",
              );
            }

            // Assertions for remaining backend configurations
            assert.strictEqual(payload.deploymentProvider, "vercel");
            assert.strictEqual(payload.smtpHost, "smtp.mailtrap.io");
            assert.strictEqual(payload.smtpPort, "587");
            assert.strictEqual(
              payload.adminAlertEmail,
              "alerts@studioflow.dev",
            );

            totalCombinationsTested++;
          });
        }
      }
    }

    test("Verify total test execution depth", () => {
      // 4 DB Engines * 9 ORMs * 2 Redis States = 72 permutations
      const expectedTotal =
        DATABASE_ENGINES.length * DATABASE_ORMS.length * REDIS_STATES.length;
      assert.strictEqual(totalCombinationsTested, expectedTotal);
    });
  });
});
