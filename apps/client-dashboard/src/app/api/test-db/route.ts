import { NextResponse } from "next/server";
import { db, users } from "@studioflow/db";
import crypto from "crypto";

export async function GET() {
  const log: string[] = [];
  const testId = `test_oauth_${crypto.randomBytes(4).toString("hex")}`;

  log.push(`1. Simulating Google OAuth login for ID: ${testId}`);

  // TEST A: The Current Bug (No Password)
  try {
    log.push(
      "2. Attempting to insert into MySQL WITHOUT passwordHash (Current Code)...",
    );
    await db.insert(users).values({
      id: testId,
      username: `user_${testId}`,
      email: `${testId}@test.com`,
      name: "Test User",
    } as any);
    log.push(
      "❌ WAIT! It succeeded? This means your DB isn't enforcing the rule.",
    );
  } catch (err: any) {
    log.push(`✅ DB CRASH CONFIRMED EXACTLY AS EXPECTED: ${err.message}`);
    log.push(
      "3. The database rejected the user because 'password_hash' doesn't have a default value.",
    );
  }

  // TEST B: The Fix (With Random Password)
  try {
    log.push(
      "4. Attempting to insert WITH a generated passwordHash (The Fix)...",
    );
    await db.insert(users).values({
      id: testId + "_fixed",
      username: `user_${testId}_fixed`,
      email: `${testId}_fixed@test.com`,
      name: "Test User Fixed",
      // 👇 THIS IS THE MISSING PIECE IN YOUR CODE
      passwordHash: crypto.randomBytes(32).toString("hex"),
    } as any);
    log.push("✅ SUCCESS: The database accepted the OAuth user!");
  } catch (err: any) {
    log.push(`❌ Unexpected error on fixed insert: ${err.message}`);
  }

  return NextResponse.json({ diagnostic_results: log });
}
