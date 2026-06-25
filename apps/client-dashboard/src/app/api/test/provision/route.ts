// apps/client-dashboard/src/app/api/test/provision/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queueProjectProvisioning } from "@/app/action";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const result = await queueProjectProvisioning(payload);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Test API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
