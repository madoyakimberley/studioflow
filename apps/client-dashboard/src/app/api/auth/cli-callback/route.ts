import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Ingress Error: Missing security token.", {
      status: 400,
    });
  }

  // Redirect instantly to the waiting local CLI server launched in index.js
  const localCliServerUrl = `http://localhost:8989/callback?token=${token}`;

  return NextResponse.redirect(localCliServerUrl);
}
