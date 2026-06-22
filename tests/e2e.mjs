import { chromium } from "playwright";
import assert from "node:assert";

(async () => {
  console.log("🚀 Starting OAuth Initiation E2E Test...");

  // Launching browser (set headless: false if you want to watch it happen visually)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to the application
    console.log("Navigating to localhost:3000...");
    await page.goto("http://localhost:3000");

    // ✨ THE FIX: We must click the hero button to open the modal first!
    console.log("Opening the Auth Modal...");
    await page.click('button:has-text("Initialize Workspace")');

    // Wait for Framer Motion to animate the modal into the DOM
    await page.waitForSelector('input[name="username"]', { state: "visible" });

    // 2. Fill out Step 1: Identification
    console.log("Filling out Step 1 form data...");
    await page.fill('input[name="username"]', "test_operator_01");
    await page.fill('input[name="fullName"]', "Jane Doe");
    await page.fill('input[name="workspaceId"]', "test-forge-007");

    // 3. Progress to Step 2
    console.log("Submitting Step 1...");
    // FIX: Updated button text selector to match "Next Step" from FormModal component
    await page.click('button:has-text("Next Step")');

    // Wait for the Step 2 animation to complete and the Google button to appear
    await page.waitForSelector("text=Google", { state: "visible" });

    // 4. Intercept the NextAuth network request
    // We intercept this because we don't want the automated browser to actually
    // navigate to Google's real login page (which blocks automated bots).
    console.log("Intercepting NextAuth provider redirect...");
    await page.route("**/api/auth/signin/google*", (route) => {
      console.log("✅ NextAuth Google redirect intercepted successfully.");
      route.abort(); // Prevent actual navigation away from the page
    });

    // 5. Trigger the OAuth flow
    console.log("Clicking the Google OAuth button...");
    await page.click('button:has-text("Google")');

    // 6. Verify LocalStorage Cache (The Core Feature)
    // We must wait a brief moment to ensure the click event's synchronous code executes
    await page.waitForTimeout(500);

    console.log("Verifying localStorage for studioflow_oauth_cache...");
    const cacheString = await page.evaluate(() => {
      return localStorage.getItem("studioflow_oauth_cache");
    });

    // 7. Assertions
    assert.ok(cacheString, "OAuth cache was not found in localStorage");

    const cacheData = JSON.parse(cacheString);
    assert.strictEqual(
      cacheData.username,
      "test_operator_01",
      "Username mismatch",
    );
    assert.strictEqual(cacheData.fullName, "Jane Doe", "FullName mismatch");
    assert.strictEqual(
      cacheData.workspaceId,
      "test-forge-007",
      "WorkspaceId mismatch",
    );
    assert.strictEqual(cacheData.oauthProvider, "google", "Provider mismatch");

    console.log(
      "🎉 E2E Test Passed: Form data successfully cached before OAuth redirect.",
    );
  } catch (error) {
    console.error("❌ E2E Test Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
