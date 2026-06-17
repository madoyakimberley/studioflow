import React from "react";
import Link from "next/link";
import {
  db,
  siteMonitoring,
  projects,
  provisioningJobs,
  workspaces,
  workspaceEnvironments,
  users, // Added users table import
} from "@studioflow/db";
import { desc, eq, and } from "drizzle-orm";
import SidebarConsole from "@/components/SidebarConsole";
import {
  CheckCircle2,
  AlertTriangle,
  Mail,
  Zap,
  ShieldAlert,
} from "lucide-react";
import SmtpConfigForm from "@/components/SmtpConfigForm";
import SmtpActionButtons from "@/components/SmtpActionButtons";

export const dynamic = "force-dynamic";

export default async function AlertsAndDiagnosticsScreen({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  // 1. PARAMETER RESOLUTION: Safely unwrap and decode the URL parameter
  const resolvedParams = await params;
  const rawUser = resolvedParams?.user;

  // Prevent Drizzle from throwing a query builder error if the param is unexpectedly missing
  if (!rawUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0c0f16] text-white font-mono">
        🚨 [ROUTING EXCEPTION]: Missing Workspace Parameter in URL.
      </div>
    );
  }

  const userSlug = decodeURIComponent(rawUser);

  // 2. TENANT LOOKUP: Resolve the Workspace context safely by joining the users table
  // This matches the URL param to the owner's username instead of the workspace slug.
  const workspace = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
    })
    .from(workspaces)
    .innerJoin(users, eq(workspaces.ownerId, users.id))
    .where(eq(users.username, userSlug))
    .limit(1) // Optimization: Stop scanning after finding the unique match
    .then((res) => res[0] || null);

  // If no workspace exists in the DB under this username, render the exception
  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0c0f16] text-white font-mono gap-4 px-6 text-center">
        <span className="text-red-400 text-xl font-bold">
          🚨 [RESOURCE EXCEPTION]: Invalid Workspace Context Parameter Node.
        </span>
        <span className="text-sm text-[#94a3b8] bg-[#1d2027] px-4 py-2 rounded-md">
          Diagnostic: Could not find a workspace owned by the user "
          <strong>{userSlug}</strong>". Check your database records.
        </span>
      </div>
    );
  }

  // 3. DYNAMIC LOOKUP: Fetch custom environment configs assigned to this unique identifier
  const envSettings = await db
    .select()
    .from(workspaceEnvironments)
    .where(eq(workspaceEnvironments.workspaceId, workspace.id))
    .limit(1)
    .then((res) => res[0] || null);

  // VALIDATION: Check if credentials exist and are complete
  const isSmtpValid = Boolean(
    envSettings?.smtpHost &&
    envSettings?.smtpPort &&
    envSettings?.smtpUser &&
    envSettings?.smtpPass,
  );

  // 4. ISOLATED MONITORING QUERIES: Fetch Outages strictly bounded by this developer's Workspace ID
  const liveMonitoringErrors = await db
    .select({
      id: siteMonitoring.id,
      statusCode: siteMonitoring.statusCode,
      responseTimeMs: siteMonitoring.responseTimeMs,
      errorTrace: siteMonitoring.errorTrace,
      checkedAt: siteMonitoring.checkedAt,
      isUp: siteMonitoring.isUp,
      projectName: projects.name,
      projectSlug: projects.slug,
    })
    .from(siteMonitoring)
    .innerJoin(projects, eq(siteMonitoring.projectId, projects.id))
    .where(
      and(
        eq(projects.workspaceId, workspace.id), // Enforces strict tenant separation boundaries
        eq(siteMonitoring.isUp, false),
      ),
    )
    .orderBy(desc(siteMonitoring.checkedAt));

  // 5. ISOLATED COMPILER CRASH QUERIES: Fetch failure events bounded by this developer's Workspace ID
  const failedBuildJobs = await db
    .select({
      id: provisioningJobs.id,
      executionLogs: provisioningJobs.executionLogs,
      createdAt: provisioningJobs.createdAt,
      projectName: projects.name,
    })
    .from(provisioningJobs)
    .innerJoin(projects, eq(provisioningJobs.projectId, projects.id))
    .where(
      and(
        eq(projects.workspaceId, workspace.id), // Enforces strict tenant separation boundaries
        eq(provisioningJobs.status, "failed"),
      ),
    )
    .orderBy(desc(provisioningJobs.createdAt));

  return (
    <div className="flex h-screen bg-[#0c0f16] overflow-hidden">
      <SidebarConsole userSlug={userSlug} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${userSlug}`}
            className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#d3d7ff] mb-6 transition-colors"
          >
            ← Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="mb-12">
            <h1 className="headline-lg lilac-gradient">
              Telemetry Alerts &{" "}
              <span className="text-[#e8b3ff]">SMTP Dispatch</span>
            </h1>
            <p className="text-[#c6c5d1] mt-2">
              System Infrastructure Monitoring Node Gateway (Workspace:{" "}
              {workspace.name})
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Dynamic Alerts */}
            <div className="lg:col-span-8 space-y-8">
              {/* Live Outage Exceptions */}
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="headline-sm text-white">
                      Live Outage Exceptions
                    </h2>
                    <p className="label-caps text-[#94a3b8]">
                      ACTIVE TRACKING HITS IN SITE_MONITORING
                    </p>
                  </div>
                </div>

                {liveMonitoringErrors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#32353d] rounded-2xl">
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-400/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <p className="text-[#c6c5d1] text-center">
                      All live sites reporting healthy uptime matrix targets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveMonitoringErrors.map((log) => (
                      <div
                        key={log.id}
                        className="bg-[#1d2027] border-l-4 border-red-500 p-6 rounded-xl"
                      >
                        <div className="flex justify-between">
                          <span className="font-semibold text-white">
                            {log.projectName}
                          </span>
                          <span className="text-red-400 text-xs font-mono">
                            HTTP {log.statusCode}
                          </span>
                        </div>
                        {log.errorTrace && (
                          <pre className="mt-4 text-xs text-red-300/90 bg-black/40 p-4 rounded overflow-auto font-mono">
                            {log.errorTrace}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scaffolder Engine Crash Dumps */}
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="headline-sm text-white">
                      Scaffolder Engine Crash Dumps
                    </h2>
                    <p className="label-caps text-[#94a3b8]">
                      FAILED BUILDS MAPPED INSIDE PROVISIONING_JOBS
                    </p>
                  </div>
                </div>

                {failedBuildJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#32353d] rounded-2xl">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-400/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-[#c6c5d1] text-center">
                      Zero provisioning compiler execution drops.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {failedBuildJobs.map((job) => (
                      <div key={job.id} className="bg-[#1d2027] p-6 rounded-xl">
                        <div className="flex justify-between mb-3">
                          <span className="font-mono text-purple-400">
                            Job #{job.id}
                          </span>
                          <span className="text-xs text-[#94a3b8]">
                            {new Date(job.createdAt!).toLocaleString()}
                          </span>
                        </div>
                        <pre className="text-xs text-slate-400 bg-black/50 p-4 rounded overflow-auto font-mono">
                          {job.executionLogs || "No logs available."}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Encrypted Dynamic SMTP & Interactive Diagnostics */}
            <div className="lg:col-span-4 space-y-8">
              <div className="glass-card rounded-2xl p-8 sticky top-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-pink-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="headline-sm text-white">
                      SMTP Configuration Meta
                    </h2>
                    <p className="label-caps text-[#94a3b8]">
                      NODEMAILER NETWORK TRANSPORT LAYOUT
                    </p>
                  </div>
                </div>

                {/* Validation Banner: Warns user if credentials are missing or invalid */}
                {!isSmtpValid && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-red-400">
                        Invalid or Missing Credentials
                      </h3>
                      <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                        Your secure SMTP pipeline variables are currently unset.
                        Update your configuration matrix below to enable
                        telemetry dispatch.
                      </p>
                    </div>
                  </div>
                )}

                {/* Secure Encrypted Dynamic Form Input */}
                <SmtpConfigForm
                  config={envSettings}
                  workspaceId={workspace.id}
                />

                {/* Secure Transport Verification Actions */}
                <SmtpActionButtons workspaceId={workspace.id} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
