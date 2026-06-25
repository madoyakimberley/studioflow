// test-project.ts
import "dotenv/config";
import {
  db,
  users,
  workspaces,
  projects,
  clients,
  provisioningJobs,
} from "@studioflow/db";
import { eq } from "drizzle-orm";
import { getTenantDb } from "./src/lib/tenant-db"; // ⚠️ Adjust this path if needed
import crypto from "crypto";

async function runCreateProjectFlow() {
  console.log("\n==================================================");
  console.log("🧨 STARTING EXTREME DEBUG MODE: CREATE PROJECT FLOW 🧨");
  console.log("==================================================\n");

  const testEmail = "kimmadoya09@gmail.com";

  // This matches the exact state format from your index.tsx Wizard
  const dummyPayload = {
    name: "extreme-debug-project",
    clientName: "Debug Client",
    clientEmail: "debug@example.com",
    brief: "A test project to catch the bug.",
    gitProvider: "github",
    folderStructure: "monorepo",
    deploymentTarget: "vercel",
    nodePackageManager: "pnpm",
    services: [
      {
        id: "srv-123",
        name: "web",
        type: "frontend",
        runtime: "typescript",
        framework: "nextjs",
        dependencies: [],
      },
    ],
  };

  try {
    // ---------------------------------------------------------
    // STEP 1: Auth & Workspace verification
    // ---------------------------------------------------------
    console.log("🟢 [1] Fetching user by email:", testEmail);
    const user = await db.query.users.findFirst({
      where: eq(users.email, testEmail),
    });
    if (!user) throw new Error("User not found!");
    console.log("   ✅ User Found:", { id: user.id, username: user.username });

    console.log("\n🟢 [2] Fetching workspace for user:", user.id);
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerId, user.id),
    });
    if (!workspace) throw new Error("Workspace not found!");
    console.log("   ✅ Workspace Found:", {
      id: workspace.id,
      name: workspace.name,
    });

    const workspaceId = workspace.id;

    // ---------------------------------------------------------
    // STEP 3: Tenant DB Connection
    // ---------------------------------------------------------
    console.log("\n🟢 [3] Initializing Tenant Database Connection...");
    console.log(`   -> Calling getTenantDb(workspaceId: ${workspaceId})`);
    const tenantDb = await getTenantDb(workspaceId);
    console.log("   ✅ Tenant DB client instantiated successfully!");

    // ---------------------------------------------------------
    // STEP 4: Client Creation (Tenant DB)
    // ---------------------------------------------------------
    console.log("\n🟢 [4] Checking for existing Client in Tenant DB...");
    console.log(`   -> Searching for email: ${dummyPayload.clientEmail}`);
    let client = await tenantDb.query.clients.findFirst({
      where: eq(clients.email, dummyPayload.clientEmail),
    });

    if (client) {
      console.log("   ✅ Existing Client found:", client);
    } else {
      console.log("   ⚠️ Client not found. Attempting to insert new client...");
      const clientData = {
        workspaceId: workspaceId,
        name: dummyPayload.clientName,
        slug: `debug-client-${Date.now()}`,
        email: dummyPayload.clientEmail,
      };
      console.log(
        "   -> [INSERT PAYLOAD - CLIENT]:\n",
        JSON.stringify(clientData, null, 2),
      );

      await tenantDb.insert(clients).values(clientData as any);
      console.log("   ✅ Client inserted!");

      client = await tenantDb.query.clients.findFirst({
        where: eq(clients.email, dummyPayload.clientEmail),
      });
      console.log("   ✅ Newly created client fetched:", client);
    }

    if (!client)
      throw new Error(
        "CRITICAL: Client object is null AFTER insertion attempt!",
      );

    // ---------------------------------------------------------
    // STEP 5: Project Creation (Tenant DB)
    // ---------------------------------------------------------
    console.log("\n🟢 [5] Creating Project in Tenant DB...");
    const projectSlug = `debug-project-${Date.now()}`;
    const projectData = {
      workspaceId: workspaceId,
      clientId: client.id,
      name: dummyPayload.name,
      slug: projectSlug,
      status: "planning",
      clientEmail: dummyPayload.clientEmail,
      universalManifest: {
        projectName: dummyPayload.name,
        deploymentTarget: dummyPayload.deploymentTarget,
        services: dummyPayload.services,
      } as any,
    };
    console.log(
      "   -> [INSERT PAYLOAD - PROJECT]:\n",
      JSON.stringify(projectData, null, 2),
    );

    await tenantDb.insert(projects).values(projectData as any);
    console.log("   ✅ Project inserted into Tenant DB!");

    const newProject = await tenantDb.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });
    console.log("   ✅ Newly created project fetched from DB:", newProject);

    if (!newProject)
      throw new Error(
        "CRITICAL: Project object is null AFTER insertion attempt!",
      );

    // ---------------------------------------------------------
    // STEP 6: Job Queuing (Central DB)
    // ---------------------------------------------------------
    console.log("\n🟢 [6] Creating Provisioning Job in Central DB...");
    const uniqueIdempotencyKey = `job_${Date.now()}_${crypto.randomUUID()}`;
    const jobData = {
      projectId: newProject.id,
      workspaceId: workspaceId,
      idempotencyKey: uniqueIdempotencyKey,
      status: "pending",
      manifest: {
        projectName: dummyPayload.name,
        slug: projectSlug,
        gitProvider: dummyPayload.gitProvider,
        folderStructure: dummyPayload.folderStructure,
        deploymentTarget: dummyPayload.deploymentTarget,
        nodePackageManager: dummyPayload.nodePackageManager,
        services: dummyPayload.services,
      } as any,
    };
    console.log(
      "   -> [INSERT PAYLOAD - PROVISIONING JOB]:\n",
      JSON.stringify(jobData, null, 2),
    );

    await db.insert(provisioningJobs).values(jobData as any);
    console.log("   ✅ Provisioning Job inserted into Central DB!");

    console.log("\n==================================================");
    console.log("🎉 SUCCESS! ENTIRE CREATION FLOW COMPLETED FLAWLESSLY!");
    console.log("==================================================\n");
    process.exit(0);
  } catch (err: any) {
    console.error("\n==================================================");
    console.error("❌ CRITICAL BUG DETECTED IN PIPELINE ❌");
    console.error("==================================================");
    console.error("🔥 General Error Message:", err.message);
    if (err.sqlMessage) console.error("🔥 SQL Error Message:", err.sqlMessage);
    if (err.sql) console.error("🔥 SQL Query That Failed:\n", err.sql);
    console.error("==================================================\n");
    process.exit(1);
  }
}

runCreateProjectFlow();
