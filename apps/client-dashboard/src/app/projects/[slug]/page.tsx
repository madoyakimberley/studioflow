import React from "react";
import Link from "next/link";
import { db, projects, provisioningJobs } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Kanban,
  ShieldAlert,
  Calendar,
  HardDrive,
  Cpu,
  CheckCircle,
  AlertOctagon,
  FileCode,
  ExternalLink,
} from "lucide-react";

interface ProjectDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailsWorkspaceConsole({
  params,
}: ProjectDetailsPageProps) {
  const { slug } = await params;

  // Pull individual profile node properties
  const projectNode = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });

  if (!projectNode) return notFound();

  const linkedJobsList = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, projectNode.id))
    .orderBy(desc(provisioningJobs.id));

  const structuralJobRecord = linkedJobsList[0];
  const manifestData = structuralJobRecord?.manifest
    ? typeof structuralJobRecord.manifest === "string"
      ? JSON.parse(structuralJobRecord.manifest)
      : structuralJobRecord.manifest
    : null;

  const isUnhealthy = projectNode.status === "unhealthy";

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-300 font-serif flex antialiased">
      {/* Structural Utility Sidebar Container mapping */}
      <aside className="w-64 bg-[#0a0b11] border-r border-slate-900/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Cluster
          </Link>

          <div className="space-y-1">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-2">
              Focus Scope Architecture
            </div>
            <div className="text-white font-extrabold text-base truncate px-2 mt-1">
              {projectNode.name}
            </div>
          </div>
        </div>
      </aside>

      {/* Focus Console Layer Area */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Urgent Isolation Alert Banner if Node has failed HTTP evaluation */}
        {isUnhealthy && (
          <div className="bg-rose-950/20 border-2 border-rose-900/60 rounded-xl p-5 space-y-3 font-mono">
            <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
              <AlertOctagon className="w-5 h-5 text-rose-500 animate-spin" />
              SYSTEM ANOMALY TERMINAL LOGS TRIGGERED
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The continuous daemon engine worker failed HTTP-status evaluation
              hooks on this domain context. An automated alert has been
              dispatched across global secure integration groups (Brevo Relay
              and system logs updated).
            </p>
            <div className="bg-[#030407] p-3 rounded-lg border border-rose-950 text-[11px] text-rose-300 overflow-x-auto">
              <code>
                [DAEMON_MONITOR_FAIL] 502 Bad Gateway response received from
                origin cluster edge service. <br />
                [ERR_EXEC_TRACE] ProcessExecutor execution dropped with
                unexpected stack state during build mapping.
              </code>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-900 pb-6 gap-4">
          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-1.5 border text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase ${isUnhealthy ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20"}`}
            >
              {isUnhealthy
                ? "Anomaly State Isolation"
                : "Active Project Matrix Node"}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {projectNode.name} Implementation Tracking
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Created:{" "}
                {projectNode.createdAt?.toLocaleDateString()}
              </span>
              <span className="text-slate-700">|</span>
              <span className="font-mono text-cyan-400">
                apps/{projectNode.slug}
              </span>
              {projectNode.liveUrl && (
                <>
                  <span className="text-slate-700">|</span>
                  <a
                    href={projectNode.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    View Deploy <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#0b0e17] border border-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-xl">
            <div>
              <div className="text-[9px] font-bold tracking-wider text-slate-500 uppercase text-right">
                Workspace Construction Completion
              </div>
              <div className="text-xl font-black text-white font-mono text-right mt-0.5">
                {projectNode.progressPercentage}%
              </div>
            </div>
            <div className="w-16 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-900">
              <div
                className={`h-full ${isUnhealthy ? "bg-rose-600" : "bg-gradient-to-r from-cyan-400 to-fuchsia-500"}`}
                style={{ width: `${projectNode.progressPercentage}%` }}
              />
            </div>
          </div>
        </header>

        {/* Dynamic Project Kanban Execution Pipeline */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Kanban className="w-4 h-4 text-fuchsia-400" /> Interactive Sprint
            Deployment Flow Matrix
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Backlog System Column */}
            <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-2">
                Backlog Registry
              </div>
              <div className="bg-[#11131c] border border-slate-800 rounded-lg p-3.5 space-y-2">
                <div className="text-xs font-bold text-white">
                  OAuth2 Identity Configuration Routing
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Map cross-origin security callbacks cleanly across environment
                  scopes.
                </p>
                <span className="inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                  Critical
                </span>
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-slate-900 pb-2">
                Active Processing Loop
              </div>
              {projectNode.status !== "active" && !isUnhealthy ? (
                <div className="bg-[#121724]/40 border border-cyan-500/20 rounded-lg p-3.5 space-y-2 animate-pulse">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 animate-spin" /> Local Daemon
                    Building System...
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Expanding file paths, injecting Zod validation logic
                    blueprints, and running pnpm linking mechanisms.
                  </p>
                </div>
              ) : isUnhealthy ? (
                <div className="bg-rose-950/10 border border-rose-900/40 rounded-lg p-3.5 space-y-2 text-rose-400/80">
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    Pipeline Execution Halted
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    The build engine dropped execution threads. Manual telemetry
                    intervention required. Re-provisioning requested.
                  </p>
                </div>
              ) : (
                <div className="bg-[#11131c] border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="text-xs font-bold text-white">
                    Interface Asset Implementation
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wiring reactive functional variables into generated shadcn
                    workspace components.
                  </p>
                  <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                    Processing
                  </span>
                </div>
              )}
            </div>

            {/* Verification & Deployment Track */}
            <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-2">
                Review & Production Handshake
              </div>
              <div
                className={`border rounded-lg p-3.5 space-y-2 ${isUnhealthy ? "bg-amber-950/5 border-amber-900/30 text-amber-400/80" : "bg-[#0b1411] border-emerald-500/10"}`}
              >
                <div
                  className={`text-xs font-bold flex items-center gap-1 ${isUnhealthy ? "text-amber-500" : "text-emerald-400"}`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />{" "}
                  {isUnhealthy
                    ? "Integrity Check Flagged"
                    : "High-Fidelity Scaffolding Generated"}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isUnhealthy
                    ? "Scaffolding components exist but remote container platform execution limits or errors were thrown during ping tests."
                    : "The target files have been securely structured and verified within your directory layer configuration map."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Details: Security Logs & Infrastructure Blueprint mapping matrices */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Real-time Infrastructure Footprint Specs */}
          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-5 space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Provisioned Core
              Architecture Manifest Summary
            </h3>
            {manifestData ? (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-[#11131c] border border-slate-900 p-3 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Target Core Framework
                  </div>
                  <div className="text-white font-bold mt-1">
                    Next.js 16 (App Router, TypeScript)
                  </div>
                </div>
                <div className="bg-[#11131c] border border-slate-900 p-3 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Database Interface Layer
                  </div>
                  <div className="text-fuchsia-400 font-mono font-bold mt-1">
                    {manifestData.infrastructure?.database || "Unassigned"}
                  </div>
                </div>
                <div className="bg-[#11131c] border border-slate-900 p-3 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Cryptographic Access Layer
                  </div>
                  <div className="text-cyan-400 font-mono font-bold mt-1">
                    {manifestData.infrastructure?.auth || "Unassigned"}
                  </div>
                </div>
                <div className="bg-[#11131c] border border-slate-900 p-3 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Asset Blob Pipeline Storage
                  </div>
                  <div className="text-slate-300 font-bold mt-1">
                    {manifestData.infrastructure?.storage || "Unassigned"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono">
                No operational parameters loaded inside this job session
                tracking slot.
              </div>
            )}
          </div>

          {/* Real-time Active Continuous Audit Metrics */}
          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Continuous
              Security Assessment Audit
            </h3>
            <ul className="space-y-2 text-xs font-mono">
              <li className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">SSL Handshake Context</span>
                <span
                  className={
                    isUnhealthy
                      ? "text-rose-400 font-bold"
                      : "text-emerald-400 font-bold"
                  }
                >
                  {isUnhealthy ? "✗ Broken" : "✓ Active"}
                </span>
              </li>
              <li className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Zod Input Isolation</span>
                <span className="text-emerald-400 font-bold">✓ Enforced</span>
              </li>
              <li className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Cross-Origin Headers</span>
                <span className="text-emerald-400 font-bold">✓ Configured</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Mono-Env Scope Leak</span>
                <span className="text-emerald-400 font-bold">✓ Secure</span>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
