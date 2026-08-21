import { MultiStackTemplateScaffolder } from "./apps/cli/src/MultiStackTemplateScaffolder.js";

const mockManifest = {
  projectName: "Terminal Render Test",
  folderStructure: "monorepo",
  deploymentTarget: "render",
  nodePackageManager: "npm",
  services: [
    {
      name: "web-api",
      type: "web_service",
      runtime: "node",
      rootDir: "apps/api",
    },
    {
      name: "app-2",
      type: "web_service",
      runtime: "node",
      rootDir: "apps/web",
    },
  ],
};

async function runTest() {
  console.log("🧪 Initiating local test execution...");

  const scaffolder = new MultiStackTemplateScaffolder(
    "render-test-app",
    mockManifest,
  );

  // Real public repo so Render's validation fetch succeeds
  scaffolder.githubRepoUrl =
    "https://github.com/render-examples/express-hello-world";

  try {
    // 1. Run local file/directory generation
    await scaffolder.processExecutionPipeline();

    // 2. Test Render API payload validation
    console.log("\n🚀 Triggering Render API test deploy...");
    const deployUrl = await scaffolder.deployToRenderAPI(
      "render-test-app",
      mockManifest.services[0],
    );

    console.log(`\n🎉 Success! Deploy URL: ${deployUrl}`);
  } catch (err) {
    console.error("\n❌ Test Failed:", err);
  }
}

runTest();
