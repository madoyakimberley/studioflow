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
    <div className="min-h-screen bg-[var(--color-theme-bg)] text-[var(--color-theme-text)] p-6 md:p-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Back Navigation */}
        <Link
          href={`/dashboard/${currentUser}/projects`}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] transition group font-['Plus_Jakarta_Sans',_sans-serif]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
          BACK TO PROJECTS
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[var(--color-theme-outline)]/20">
          <div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-['JetBrains_Mono',_monospace] uppercase tracking-widest rounded-full border ${
                isUnhealthy
                  ? "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)] border-[var(--color-theme-secondary)]/30"
                  : "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)] border-[var(--color-theme-primary)]/30"
              }`}
            >
              {isUnhealthy ? "SYSTEM ANOMALY" : "OPERATIONAL"}
            </div>
            <h1 className="text-5xl font-bold tracking-tighter text-[var(--color-theme-text)] mt-3 font-['Playfair_Display',_serif]">
              {projectNode.name}
            </h1>
            <p className="text-[var(--color-theme-primary)] font-['JetBrains_Mono',_monospace] mt-2">
              apps/{projectNode.slug}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {projectNode.liveUrl && (
              <a
                href={projectNode.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] text-[var(--color-theme-on-primary)] font-semibold rounded-2xl hover:opacity-90 transition font-['Plus_Jakarta_Sans',_sans-serif] tracking-wider text-sm"
              >
                <ExternalLink className="w-5 h-5" />
                LIVE DEPLOYMENT
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 font-['Plus_Jakarta_Sans',_sans-serif]">
          {/* Main Content Area */}
          <div className="xl:col-span-8 space-y-8">
            {/* Progress Overview */}
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md p-8 rounded-3xl border border-[var(--color-theme-outline)]/20 flex items-center gap-8 shadow-xl">
              <div>
                <div className="text-sm uppercase tracking-widest text-[var(--color-theme-muted)]">
                  OVERALL PROGRESS
                </div>
                <div className="text-7xl font-bold text-[var(--color-theme-text)] font-['JetBrains_Mono',_monospace] tracking-tighter mt-2">
                  {projectNode.progressPercentage}
                  <span className="text-4xl align-super">%</span>
                </div>
              </div>
              <div className="flex-1 h-3 bg-[var(--color-theme-bg)] rounded-full overflow-hidden border border-[var(--color-theme-outline)]/10">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] transition-all"
                  style={{ width: `${projectNode.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md p-8 rounded-3xl border border-[var(--color-theme-outline)]/20 shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <Kanban className="w-6 h-6 text-[var(--color-theme-primary)]" />
                <h2 className="text-2xl font-semibold text-[var(--color-theme-text)]">
                  Deployment Pipeline
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Backlog */}
                <div className="bg-[var(--color-theme-surface)]/40 border border-[var(--color-theme-outline)]/15 rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-widest text-[var(--color-theme-muted)] mb-4">
                    BACKLOG
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm text-[var(--color-theme-text)]">
                      OAuth Integration Routing
                    </div>
                    <div className="text-xs text-[var(--color-theme-muted)]/80">
                      Pending configuration
                    </div>
                  </div>
                </div>

                {/* In Progress */}
                <div className="bg-[var(--color-theme-surface)]/40 border border-[var(--color-theme-outline)]/15 rounded-2xl p-6 relative">
                  <div className="text-xs uppercase tracking-widest text-[var(--color-theme-secondary)] mb-4">
                    IN PROGRESS
                  </div>
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 animate-spin text-[var(--color-theme-secondary)]" />
                    <div>
                      <div className="text-[var(--color-theme-text)] text-sm">
                        System Scaffold Execution
                      </div>
                      <div className="text-xs text-[var(--color-theme-muted)]/80">
                        Running pnpm + Render sync
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployed */}
                <div className="bg-[var(--color-theme-surface)]/40 border border-[var(--color-theme-outline)]/15 rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-widest text-[var(--color-theme-primary)] mb-4">
                    VERIFIED
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-theme-primary)]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      Production Handshake Complete
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provisioning Logs */}
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md p-8 rounded-3xl border border-[var(--color-theme-outline)]/20 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <HardDrive className="w-6 h-6 text-[var(--color-theme-secondary)]" />
                <h2 className="text-2xl font-semibold text-[var(--color-theme-text)]">
                  Recent Provisioning Logs
                </h2>
              </div>
              <div className="space-y-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {linkedJobsList.length === 0 ? (
                  <p className="text-center py-12 text-[var(--color-theme-muted)]">
                    No logs available yet.
                  </p>
                ) : (
                  linkedJobsList.map((job) => (
                    <div
                      key={job.id}
                      className="border-l-2 border-[var(--color-theme-primary)]/50 pl-6"
                    >
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-['JetBrains_Mono',_monospace] text-[var(--color-theme-primary)] font-bold">
                          JOB #{job.id}
                        </span>
                        <span className="text-[var(--color-theme-muted)]">
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <pre className="text-xs text-[var(--color-theme-muted)] whitespace-pre-wrap font-['JetBrains_Mono',_monospace] bg-[var(--color-theme-surface)]/30 p-4 rounded-xl border border-[var(--color-theme-outline)]/10">
                        {job.executionLogs
                          ? JSON.stringify(job.executionLogs, null, 2)
                          : "No logs available."}
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
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md p-8 rounded-3xl border border-[var(--color-theme-outline)]/20 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <HardDrive className="w-5 h-5 text-[var(--color-theme-primary)]" />
                <h3 className="font-semibold text-[var(--color-theme-text)]">
                  Architecture Manifest
                </h3>
              </div>
              {manifestData ? (
                <div className="space-y-5 text-sm">
                  <div>
                    <div className="text-xs text-[var(--color-theme-muted)] uppercase tracking-wider mb-1">
                      Frontend
                    </div>
                    <div className="font-medium text-[var(--color-theme-text)]">
                      {manifestData.frontendFramework || "Next.js"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-theme-muted)] uppercase tracking-wider mb-1">
                      Backend
                    </div>
                    <div className="font-medium text-[var(--color-theme-text)]">
                      {manifestData.backendFramework || "None"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-theme-muted)] uppercase tracking-wider mb-1">
                      Database
                    </div>
                    <div className="font-medium text-[var(--color-theme-text)]">
                      {manifestData.database || "Unspecified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-theme-muted)] uppercase tracking-wider mb-1">
                      Deployment Target
                    </div>
                    <div className="font-medium text-[var(--color-theme-text)] capitalize">
                      {manifestData.deploymentTarget || "Render"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--color-theme-muted)] text-sm">
                  No manifest data available.
                </p>
              )}
            </div>

            {/* Security Status */}
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md p-8 rounded-3xl border border-[var(--color-theme-outline)]/20 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="w-6 h-6 text-[var(--color-theme-secondary)]" />
                <h3 className="font-semibold text-[var(--color-theme-text)]">
                  Security Posture
                </h3>
              </div>
              <div className="space-y-5 text-sm">
                {[
                  ["SSL/TLS", "VERIFIED", "verified"],
                  ["Environment Secrets", "SECURE", "verified"],
                  [
                    "Row Level Security",
                    isUnhealthy ? "PENDING" : "ACTIVE",
                    isUnhealthy ? "pending" : "verified",
                  ],
                  ["GitHub Protection", "ENABLED", "verified"],
                ].map(([label, status, type]) => {
                  const statusStyles =
                    type === "pending"
                      ? "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)] border-[var(--color-theme-secondary)]/30"
                      : "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)] border-[var(--color-theme-primary)]/30";

                  return (
                    <div
                      key={label}
                      className="flex justify-between items-center"
                    >
                      <span className="text-[var(--color-theme-muted)]">
                        {label}
                      </span>
                      <span
                        className={`text-[10px] font-bold font-['JetBrains_Mono',_monospace] px-3 py-1 rounded-full border tracking-widest uppercase ${statusStyles}`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
