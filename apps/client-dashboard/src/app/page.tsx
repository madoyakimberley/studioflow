"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Sparkles, Shield, Loader2, UserCheck, FolderLock } from "lucide-react";
import { verifyPortalAccess } from "./portal-actions";

function SecurityScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scanStatus, setScanStatus] = useState<
    | "initializing"
    | "analyzing"
    | "admin_confirmed"
    | "client_confirmed"
    | "failed"
  >("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [clientDetails, setClientDetails] = useState<{
    name: string;
    project: string;
  } | null>(null);

  useEffect(() => {
    const runSecurityProtocol = async () => {
      const token = searchParams.get("token");

      if (!token) {
        router.push("/welcome");
        return;
      }

      setScanStatus("analyzing");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        // --- PHASE 1: Check if it is the Admin (Ping Python Core) ---
        const adminResponse = await fetch(
          "http://localhost:8000/api/v1/verify-auth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        ).catch(() => null);

        if (adminResponse && adminResponse.ok) {
          const adminData = await adminResponse.json();
          if (adminData.success) {
            setScanStatus("admin_confirmed");
            localStorage.setItem("studioflow_role", "admin");
            setTimeout(() => router.push("/dashboard"), 800);
            return;
          }
        }

        // --- PHASE 2: Check if it is a Client (Ping Next.js DB Actions) ---
        const clientResponse = await verifyPortalAccess(token);

        if (clientResponse && clientResponse.success) {
          setScanStatus("client_confirmed");

          // FIX: Safely map the nested Drizzle ORM response
          setClientDetails({
            name: clientResponse.project?.client?.name || "Client",
            project: clientResponse.project?.name || "Workspace",
          });

          localStorage.setItem("studioflow_role", "client");
          setTimeout(() => router.push(`/portal/${token}`), 1800);
          return;
        }

        // --- PHASE 3: Total Failure ---
        setScanStatus("failed");
        setErrorMessage(
          clientResponse?.error ||
            "Access token unrecognized by Core Engine and Database.",
        );
      } catch (error: any) {
        setScanStatus("failed");
        setErrorMessage(`System Error: ${error.message}`);
      }
    };

    runSecurityProtocol();
  }, [router, searchParams]);

  // Helper to get client initials safely to prevent undefined crashes
  const getInitials = (name?: string) => {
    if (!name) return "CL";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "CL";
    return parts
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Helper to get first name safely
  const getFirstName = (name?: string) => {
    if (!name) return "Client";
    return name.split(" ")[0] || "Client";
  };

  return (
    <main className="z-10 text-center space-y-8 flex flex-col items-center max-w-md w-full px-6">
      {/* DYNAMIC AVATAR / BADGE */}
      {scanStatus === "client_confirmed" && clientDetails ? (
        <div className="relative w-32 h-32 rounded-full border-2 border-[#e364a7] bg-[#0b1326] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(227,100,167,0.2)] animate-in fade-in zoom-in duration-500">
          <FolderLock className="w-6 h-6 text-[#a078ff] mb-2" />
          <div className="text-2xl font-black font-serif text-white tracking-wider">
            {getInitials(clientDetails.name)}
          </div>
          <div className="text-[8px] font-mono text-[#e364a7] mt-1 text-center truncate w-24 uppercase tracking-widest">
            {clientDetails.project}
          </div>
        </div>
      ) : (
        <div
          className={`relative w-32 h-32 rounded-full overflow-hidden border-2 ${
            scanStatus === "failed"
              ? "border-rose-500"
              : scanStatus === "admin_confirmed"
                ? "border-cyan-500"
                : "border-slate-800"
          } shadow-2xl transition-colors duration-500`}
        >
          <Image
            src="/images/admin_pfp.jpg"
            alt="Admin Profile"
            fill
            priority
            loading="eager"
            sizes="128px"
            className={`object-cover ${
              scanStatus === "admin_confirmed" ? "grayscale-0" : "grayscale"
            } transition-all duration-700`}
          />
          {scanStatus === "analyzing" && (
            <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay animate-pulse" />
          )}
          {scanStatus === "failed" && (
            <div className="absolute inset-0 bg-rose-500/30 mix-blend-overlay" />
          )}
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-serif">
          {scanStatus === "initializing" && "Initializing..."}
          {scanStatus === "analyzing" && "Analyzing Context..."}
          {scanStatus === "admin_confirmed" && "Admin Confirmed."}
          {scanStatus === "client_confirmed" &&
            `Welcome, ${getFirstName(clientDetails?.name)}.`}
          {scanStatus === "failed" && "Access Denied."}
        </h1>

        {scanStatus === "failed" ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-mono text-left w-full mt-4 break-words">
            &gt;_ ERROR TRACE:
            <br />
            {errorMessage}
          </div>
        ) : (
          <p className="text-[#948f9a] text-sm font-mono h-6">
            {scanStatus === "analyzing" &&
              "Verifying token against system architectures..."}
            {scanStatus === "admin_confirmed" &&
              "Establishing core admin session..."}
            {scanStatus === "client_confirmed" &&
              `Decrypting ${clientDetails?.project || "Workspace"} environment...`}
          </p>
        )}
      </div>

      <div className="h-12 flex items-center justify-center mt-4">
        {scanStatus === "analyzing" && (
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        )}
        {scanStatus === "admin_confirmed" && (
          <Shield className="w-8 h-8 text-cyan-500 animate-in zoom-in" />
        )}
        {scanStatus === "client_confirmed" && (
          <UserCheck className="w-8 h-8 text-[#e364a7] animate-in zoom-in" />
        )}
      </div>

      <div className="inline-flex items-center gap-2 border border-[#171f33] bg-[#0b1326] px-4 py-1.5 rounded-full text-[10px] font-mono text-[#948f9a] tracking-widest uppercase mt-8">
        <Sparkles className="w-3.5 h-3.5 text-[#a078ff]" /> Omni-Auth Routing
        Active
      </div>
    </main>
  );
}

export default function StudioFlowAuthGate() {
  return (
    <div className="min-h-screen bg-[#060e20] flex flex-col items-center justify-center font-sans text-slate-300 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-[#a078ff]/10 to-transparent blur-3xl pointer-events-none" />
      <Suspense
        fallback={
          <div className="z-10 text-[#948f9a] font-mono text-xs animate-pulse">
            Loading secure environment...
          </div>
        }
      >
        <SecurityScanner />
      </Suspense>
    </div>
  );
}
