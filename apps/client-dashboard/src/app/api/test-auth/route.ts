import { NextResponse } from "next/server";
// Adjust the import path if your action.ts is located elsewhere
import { getVerifiedUserAndWorkspace } from "@/app/action";

export async function GET() {
  try {
    const result = await getVerifiedUserAndWorkspace();

    return NextResponse.json({
      status: result.success ? "🟢 SUCCESS" : "🔴 FAILED",
      error: result.error || "No explicit error string returned.",
      timeline: (result as any).timeline || [
        "❌ Timeline missing. Make sure you replaced getVerifiedUserAndWorkspace in action.ts with the diagnostic version.",
      ],
      data: result.data || null,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "💥 FATAL EXCEPTION",
      message: err.message,
      stack: err.stack,
    });
  }
}
