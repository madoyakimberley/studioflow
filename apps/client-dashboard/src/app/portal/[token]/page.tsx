import React from "react";
import { notFound } from "next/navigation";
import { verifyPortalAccess } from "../../portal-actions"; // Adjust path as needed
import { ShieldCheck } from "lucide-react";
import SecureGateFormClient from "./SecureGateFormClient"; // Adjust path to your client form component

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PhilosophyPortal({ params }: PageProps) {
  // Next.js 15 pattern: await the params
  const { token } = await params;

  // Server-side validation before rendering
  const authResult = await verifyPortalAccess(token);

  // If the slug/token doesn't match an active project registry, trigger 404
  if (!authResult.success || !authResult.project) {
    notFound();
  }

  return (
    <main className="bg-[#06070b] text-[#dae2fd] min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-[#9d4edd]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full border border-[#171f33] bg-[#0b1326]/60 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl space-y-8 z-10 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#131b2e] border border-[#212d4a] rounded-full text-xs text-cyan-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Client Portal
          </div>
          <h1 className="text-4xl font-black font-serif tracking-tight text-white mt-4">
            Communication is{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e364a7] to-[#9d4edd]">
              Key
            </span>
          </h1>
          <p className="text-[#958ea0] text-sm mt-4">
            Welcome to your dedicated portal. We believe that transparent,
            continuous dialogue is the foundation of exceptional outcomes.
          </p>
        </div>

        <hr className="border-[#171f33]" />

        {/* Embedded Client-Side 2FA PIN Gate Verification */}
        <div className="pt-2 text-left">
          <SecureGateFormClient
            projectId={authResult.project.id}
            projectSlug={authResult.project.slug}
          />
        </div>
      </div>
    </main>
  );
}
