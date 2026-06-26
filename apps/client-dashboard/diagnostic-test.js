/**
 * 🕵️‍♂️ STUDIOFLOW ISOLATED AUTH GATE DIAGNOSTIC
 * Run this using: node diagnostic-test.js
 */

const API_BASE_URL = "https://studioflow-api-ieck.onrender.com";

// These are the exact credentials extracted from your database screenshot
const ACCOUNTS_FROM_DB = [
  {
    label: "Account 1 (Madison)",
    id: "b6683cda-6583-40bd-bc90-38271597ed2a",
    email: "kimmadoya09@gmail.com",
  },
  {
    label: "Account 2 (kimmadoya)",
    id: "superadmin_node_kimmadoya",
    email: "kimmadoya@gmail.com",
  },
  {
    label: "Account 3 (kimmadoya06)",
    id: "superadmin_node_kimmadoya06",
    email: "kimmadoya06@gmail.com",
  },
  {
    label: "Account 4 (kimmsimbi)",
    id: "superadmin_node_kimmsimbi",
    email: "kimmsimbi@gmail.com",
  },
];

// 👇 OPTIONAL: If you have an exact token from your browser's address bar (e.g., ?token=ey...), paste it here:
const CUSTOM_BROWSER_TOKEN = "";

async function runAuthSuite() {
  console.log(
    "===============================================================",
  );
  console.log("🚀 STARTING STUDIOFLOW AUTH GATE ISOLATED DIAGNOSTIC SUITE");
  console.log(`🌍 Target API Endpoint: ${API_BASE_URL}/api/v1/verify-auth`);
  console.log(
    "===============================================================\n",
  );

  // Test 1: Testing DB Account IDs as tokens (how the current gate treats them)
  console.log(
    "STAGE 1: Testing User IDs directly against the Verification API...",
  );
  for (const account of ACCOUNTS_FROM_DB) {
    await verifyTokenWithServer(account.id, account.label);
  }

  // Test 2: Testing DB Account Emails as tokens
  console.log(
    "\nSTAGE 2: Testing Emails directly against the Verification API...",
  );
  for (const account of ACCOUNTS_FROM_DB) {
    await verifyTokenWithServer(account.email, `${account.label} (Email)`);
  }

  // Test 3: Testing Browser Token if provided
  if (CUSTOM_BROWSER_TOKEN) {
    console.log("\nSTAGE 3: Testing Custom URL Browser Token...");
    await verifyTokenWithServer(
      CUSTOM_BROWSER_TOKEN,
      "Active Browser URL Token",
    );
  } else {
    console.log(
      "\nSTAGE 3: Skipped. (No CUSTOM_BROWSER_TOKEN was pasted into the script)",
    );
  }

  console.log(
    "\n===============================================================",
  );
  console.log("🏁 DIAGNOSTIC COMPLETED");
  console.log(
    "===============================================================",
  );
}

async function verifyTokenWithServer(tokenValue, accountLabel) {
  console.log(`\n🔄 [${accountLabel}] Sending payload...`);
  console.log(`   ↳ String sent to API: "${tokenValue}"`);

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/v1/verify-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenValue.trim() }),
    });
    const duration = Date.now() - startTime;

    console.log(
      `   ↳ 📡 HTTP Response Status: ${response.status} ${response.statusText} (${duration}ms)`,
    );

    const responseText = await response.text();

    try {
      const json = JSON.parse(responseText);
      if (response.ok && json.success) {
        console.log(
          "   ✅ [SUCCESS]: The remote server accepted this string as a valid session!",
        );
        // 💡 THIS IS THE CHANGED LINE: DUMPING THE FULL OBJECT
        console.log(
          "   ↳ Full Raw Server Response:",
          JSON.stringify(json, null, 2),
        );
      } else {
        console.log(
          "   ❌ [REJECTED]: The remote server explicitly denied validation.",
        );
        console.log(
          "   ↳ Server JSON Error response:",
          JSON.stringify(json, null, 2),
        );
      }
    } catch (parseErr) {
      console.log(
        "   🚨 [CRITICAL RESPONSE FAULT]: The server did not return valid JSON data.",
      );
      console.log(`   ↳ Raw HTML/Text output from server: ${responseText}`);
    }
  } catch (networkError) {
    console.log("   🚨 [NETWORK ERROR]: Could not reach the API server.");
    console.log(`   ↳ Technical Trace: ${networkError.message}`);
  }
}

runAuthSuite();
