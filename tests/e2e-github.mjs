import { chromium } from "playwright";
import assert from "node:assert";

(async () => {
  console.log("🚀 Starting GitHub OAuth Initiation E2E Test...");

  // Launching browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to the application
    console.log("Navigating to localhost:3000...");
    await page.goto("http://localhost:3000");

    // 2. Open the Auth Modal
    console.log("Opening the Auth Modal...");
    await page.click('button:has-text("Initialize Workspace")');

    // Wait for Framer Motion to animate the modal into the DOM
    await page.waitForSelector('input[name="username"]', { state: "visible" });

    // 3. Fill out Step 1: Identification
    console.log("Filling out Step 1 form data...");
    await page.fill('input[name="username"]', "github_operator_99");
    await page.fill('input[name="fullName"]', "Octocat Dev");
    await page.fill('input[name="workspaceId"]', "git-forge-404");

    // 4. Progress to Step 2
    console.log("Submitting Step 1...");
    // FIX: Updated button text selector to match "Next Step" from FormModal component
    await page.click('button:has-text("Next Step")');

    // Wait for the Step 2 animation to complete and the GitHub button to appear
    await page.waitForSelector("text=GitHub", { state: "visible" });

    // 5. Intercept the NextAuth network request for GitHub
    // We intercept this so the automated browser doesn't get blocked by GitHub's bot protection
    console.log("Intercepting NextAuth GitHub redirect...");
    await page.route("**/api/auth/signin/github*", (route) => {
      console.log("✅ NextAuth GitHub redirect intercepted successfully.");
      route.abort(); // Prevent actual navigation away from the page
    });

    // 6. Trigger the GitHub OAuth flow
    console.log("Clicking the GitHub OAuth button...");
    await page.click('button:has-text("GitHub")');

    // 7. Verify LocalStorage Cache
    // Wait a brief moment to ensure synchronous local storage writes complete
    await page.waitForTimeout(500);

    console.log("Verifying localStorage for studioflow_oauth_cache...");
    const cacheString = await page.evaluate(() => {
      return localStorage.getItem("studioflow_oauth_cache");
    });

    // 8. Assertions
    assert.ok(cacheString, "OAuth cache was not found in localStorage");

    const cacheData = JSON.parse(cacheString);
    assert.strictEqual(
      cacheData.username,
      "github_operator_99",
      "Username mismatch",
    );
    assert.strictEqual(cacheData.fullName, "Octocat Dev", "FullName mismatch");
    assert.strictEqual(
      cacheData.workspaceId,
      "git-forge-404",
      "WorkspaceId mismatch",
    );
    assert.strictEqual(
      cacheData.oauthProvider,
      "github",
      "Provider mismatch (Expected github)",
    );

    console.log(
      "🎉 E2E Test Passed: Form data successfully cached before GitHub OAuth redirect.",
    );
  } catch (error) {
    console.error("❌ E2E Test Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
