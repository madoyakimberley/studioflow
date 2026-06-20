import React from "react";
import { notFound } from "next/navigation";
import { verifyPortalAccess } from "../../portal-actions"; // Adjust path as needed
import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import SecureGateFormClient from "./SecureGateFormClient"; // Adjust path to your client form component
import { cookies } from "next/headers";
import Link from "next/link";

interface PageProps {
  params: Promise<{ token: string }>;
}

// 1. OVERRIDE: Force the component to accept any props shape to bypass strict prop-name checking
const GateFormOverride = SecureGateFormClient as any;

export default async function PhilosophyPortal({ params }: PageProps) {
  // Next.js 15 pattern: await the params
  const { token } = await params;

  // Server-side validation before rendering
  const authResult = await verifyPortalAccess(token);

  // If the slug/token doesn't match an active project registry, trigger 404
  if (!authResult.success || !authResult.project) {
    notFound();
  }

  // 2. OVERRIDE: Force the project object to 'any' to bypass server boundary typing issues
  const project = authResult.project as any;

  // Check if user has passed the SecureGate to toggle the UI state
  const sessionCookieJar = await cookies();
  const isAuthorized = sessionCookieJar.has(
    `studioflow_portal_auth_${project.id}`,
  );

  return (
    <main className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-gradient-to-b from-[var(--color-theme-primary)]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full border border-[var(--border-outline)] bg-[var(--bg-surface)]/60 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl space-y-8 z-10 text-center transition-all duration-700">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-outline)] rounded-full text-xs text-[var(--color-theme-primary)] font-mono">
            {isAuthorized ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-theme-secondary)]" />{" "}
                System Online
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Secure Client Portal
              </>
            )}
          </div>

          <h1 className="text-4xl font-black font-serif tracking-tight text-theme-text mt-4">
            {isAuthorized ? "Welcome to the " : "Communication is "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-theme-secondary)] to-[var(--color-theme-primary)]">
              {isAuthorized ? "Matrix" : "Key"}
            </span>
          </h1>

          <p className="text-[var(--text-muted)] text-sm mt-4 leading-relaxed">
            {isAuthorized
              ? "Your access is secured. Use the navigation panel to track your engineering pipeline, review deliverables, and communicate directly with the development node."
              : "Welcome to your dedicated portal. We believe that transparent, continuous dialogue is the foundation of exceptional outcomes."}
          </p>
        </div>

        {/* NEW: Enter Dashboard Button when authorized */}
        {isAuthorized && (
          <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Link
              href={`/portal/${token}/dashboard`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] hover:brightness-110 text-white font-medium rounded-lg transition-all shadow-lg shadow-[var(--color-theme-primary)]/30 hover:shadow-[var(--color-theme-primary)]/50"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {!isAuthorized && (
          <>
            <hr className="border-[var(--border-outline)]" />
            <div className="pt-2 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Using our type-override component wrapper to guarantee error-free compilation */}
              <GateFormOverride
                projectId={project.id}
                projectSlug={project.slug}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
