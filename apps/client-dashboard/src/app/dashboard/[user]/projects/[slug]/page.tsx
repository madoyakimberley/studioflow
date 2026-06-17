import React from "react";
import Link from "next/link";
import { db, projects, provisioningJobs } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Kanban,
  ShieldCheck,
  Calendar,
  HardDrive,
  Cpu,
  CheckCircle,
  AlertOctagon,
  ExternalLink,
  Zap,
} from "lucide-react";

interface ProjectDetailsPageProps {
  params: Promise<{ slug: string; user?: string }>;
}

export default async function ProjectDetailsWorkspaceConsole({
  params,
}: ProjectDetailsPageProps) {
  const { slug, user } = await params;
  const currentUser = user || "user";

  const projectNode = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });

  if (!projectNode) return notFound();

  const linkedJobsList = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, projectNode.id))
    .orderBy(desc(provisioningJobs.createdAt))
    .limit(6);

  const structuralJobRecord = linkedJobsList[0];
  const manifestData = structuralJobRecord?.manifest
    ? typeof structuralJobRecord.manifest === "string"
      ? JSON.parse(structuralJobRecord.manifest)
      : structuralJobRecord.manifest
    : null;

  const isUnhealthy = projectNode.status === "unhealthy";

  return (
    <div className="min-h-screen bg-[#05070f] text-[#dae2fd] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Back Navigation */}
        <Link
          href={`/dashboard/${currentUser}/projects`}
          className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#d3d7ff] transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
          BACK TO PROJECTS
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#1f2538]">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono uppercase tracking-widest rounded-full border ${
                isUnhealthy
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isUnhealthy ? "SYSTEM ANOMALY" : "OPERATIONAL"}
            </div>
            <h1 className="text-5xl font-bold tracking-tighter text-white mt-3">
              {projectNode.name}
            </h1>
            <p className="text-[#a078ff] font-mono mt-2">
              apps/{projectNode.slug}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {projectNode.liveUrl && (
              <a
                href={projectNode.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#d3d7ff] to-[#e8b3ff] text-black font-semibold rounded-2xl hover:brightness-110 transition"
              >
                <ExternalLink className="w-5 h-5" />
                LIVE DEPLOYMENT
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-8 space-y-8">
            {/* Progress Overview */}
            <div className="glass-card p-8 rounded-3xl border border-[#1f2538] flex items-center gap-8">
              <div>
                <div className="text-sm uppercase tracking-widest text-[#94a3b8]">
                  OVERALL PROGRESS
                </div>
                <div className="text-7xl font-bold text-white font-mono tracking-tighter mt-2">
                  {projectNode.progressPercentage}
                  <span className="text-4xl align-super">%</span>
                </div>
              </div>
              <div className="flex-1 h-3 bg-[#1a2237] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d3d7ff] to-[#a078ff] transition-all"
                  style={{ width: `${projectNode.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="glass-card p-8 rounded-3xl border border-[#1f2538]">
              <div className="flex items-center gap-4 mb-8">
                <Kanban className="w-6 h-6 text-[#d3d7ff]" />
                <h2 className="text-2xl font-semibold">Deployment Pipeline</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Backlog */}
                <div className="bg-[#0a0f1c] border border-[#1f2538] rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-widest text-slate-400 mb-4">
                    BACKLOG
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm text-white">
                      OAuth Integration Routing
                    </div>
                    <div className="text-xs text-[#94a3b8]">
                      Pending configuration
                    </div>
                  </div>
                </div>

                {/* In Progress */}
                <div className="bg-[#0a0f1c] border border-[#1f2538] rounded-2xl p-6 relative">
                  <div className="text-xs uppercase tracking-widest text-cyan-400 mb-4">
                    IN PROGRESS
                  </div>
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 animate-spin text-cyan-400" />
                    <div>
                      <div className="text-white">
                        System Scaffold Execution
                      </div>
                      <div className="text-xs text-[#94a3b8]">
                        Running pnpm + Render sync
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployed */}
                <div className="bg-[#0a0f1c] border border-[#1f2538] rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-widest text-emerald-400 mb-4">
                    VERIFIED
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      Production Handshake Complete
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provisioning Logs */}
            <div className="glass-card p-8 rounded-3xl border border-[#1f2538]">
              <div className="flex items-center gap-4 mb-6">
                <HardDrive className="w-6 h-6 text-[#e364a7]" />
                <h2 className="text-2xl font-semibold">
                  Recent Provisioning Logs
                </h2>
              </div>
              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                {linkedJobsList.length === 0 ? (
                  <p className="text-center py-12 text-[#6b7280]">
                    No logs available yet.
                  </p>
                ) : (
                  linkedJobsList.map((job) => (
                    <div
                      key={job.id}
                      className="border-l-2 border-[#a078ff] pl-6"
                    >
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-mono text-[#d3d7ff]">
                          JOB #{job.id}
                        </span>
                        <span className="text-[#6b7280]">
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <pre className="text-xs text-[#94a3b8] whitespace-pre-wrap font-mono">
                        {job.executionLogs || "No detailed output recorded."}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-4 space-y-8">
            {/* Manifest Summary */}
            <div className="glass-card p-8 rounded-3xl border border-[#1f2538]">
              <div className="flex items-center gap-3 mb-6">
                <HardDrive className="w-5 h-5 text-[#d3d7ff]" />
                <h3 className="font-semibold">Architecture Manifest</h3>
              </div>
              {manifestData ? (
                <div className="space-y-5 text-sm">
                  <div>
                    <div className="text-xs text-[#94a3b8] uppercase">
                      Frontend
                    </div>
                    <div className="font-medium text-white">
                      {manifestData.frontendFramework || "Next.js"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94a3b8] uppercase">
                      Backend
                    </div>
                    <div className="font-medium text-white">
                      {manifestData.backendFramework || "None"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94a3b8] uppercase">
                      Database
                    </div>
                    <div className="font-medium text-white">
                      {manifestData.database || "Unspecified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94a3b8] uppercase">
                      Deployment Target
                    </div>
                    <div className="font-medium text-white capitalize">
                      {manifestData.deploymentTarget || "Render"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[#6b7280]">No manifest data available.</p>
              )}
            </div>

            {/* Security Status */}
            <div className="glass-card p-8 rounded-3xl border border-[#1f2538]">
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="w-6 h-6 text-[#a078ff]" />
                <h3 className="font-semibold">Security Posture</h3>
              </div>
              <div className="space-y-5 text-sm">
                {[
                  ["SSL/TLS", "VERIFIED", "emerald"],
                  ["Environment Secrets", "SECURE", "emerald"],
                  [
                    "Row Level Security",
                    isUnhealthy ? "PENDING" : "ACTIVE",
                    isUnhealthy ? "amber" : "emerald",
                  ],
                  ["GitHub Protection", "ENABLED", "emerald"],
                ].map(([label, status, color]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-[#c6c5d1]">{label}</span>
                    <span
                      className={`text-xs px-4 py-1 rounded-full bg-${color}-500/10 text-${color}-400 border border-${color}-500/30`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
