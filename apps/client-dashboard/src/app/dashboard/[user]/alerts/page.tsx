import React from "react";
import Link from "next/link";
import {
  db,
  siteMonitoring,
  projects,
  provisioningJobs,
  workspaces,
  workspaceEnvironments,
  users,
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
  const resolvedParams = await params;
  const rawUser = resolvedParams?.user;

  if (!rawUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-bg text-theme-text font-mono transition-colors duration-300">
        🚨 [ROUTING EXCEPTION]: Missing Workspace Parameter in URL.
      </div>
    );
  }

  const userSlug = decodeURIComponent(rawUser);

  const workspace = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
    })
    .from(workspaces)
    .innerJoin(users, eq(workspaces.ownerId, users.id))
    .where(eq(users.username, userSlug))
    .limit(1)
    .then((res) => res[0] || null);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-theme-bg text-theme-text font-mono gap-4 px-6 text-center transition-colors duration-300">
        <span className="text-theme-secondary text-xl font-bold">
          🚨 [RESOURCE EXCEPTION]: Invalid Workspace Context Parameter Node.
        </span>
        <span className="text-sm text-theme-muted bg-theme-surface border border-theme-outline px-4 py-2 rounded-md">
          Diagnostic: Could not find a workspace owned by the user "
          <strong>{userSlug}</strong>". Check your database records.
        </span>
      </div>
    );
  }

  const envSettings = await db
    .select()
    .from(workspaceEnvironments)
    .where(eq(workspaceEnvironments.workspaceId, workspace.id))
    .limit(1)
    .then((res) => res[0] || null);

  const isSmtpValid = Boolean(
    envSettings?.smtpHost &&
    envSettings?.smtpPort &&
    envSettings?.smtpUser &&
    envSettings?.smtpPass,
  );

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
        eq(projects.workspaceId, workspace.id),
        eq(siteMonitoring.isUp, false),
      ),
    )
    .orderBy(desc(siteMonitoring.checkedAt));

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
        eq(projects.workspaceId, workspace.id),
        eq(provisioningJobs.status, "failed"),
      ),
    )
    .orderBy(desc(provisioningJobs.createdAt));

  return (
    <div className="flex h-screen bg-theme-bg overflow-hidden transition-colors duration-300">
      <SidebarConsole userSlug={userSlug} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${userSlug}`}
            className="inline-flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary mb-6 transition-colors"
          >
            ← Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary transition-colors duration-300">
              Telemetry Alerts &{" "}
              <span className="text-theme-secondary">SMTP Dispatch</span>
            </h1>
            <p className="text-theme-muted mt-2">
              System Infrastructure Monitoring Node Gateway (Workspace:{" "}
              {workspace.name})
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Dynamic Alerts */}
            <div className="lg:col-span-8 space-y-8">
              {/* Live Outage Exceptions */}
              <div className="bg-theme-surface border border-theme-outline/50 shadow-sm rounded-2xl p-8 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                    <Zap className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-theme-text font-serif">
                      Live Outage Exceptions
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-theme-muted mt-1">
                      ACTIVE TRACKING HITS IN SITE_MONITORING
                    </p>
                  </div>
                </div>

                {liveMonitoringErrors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-theme-outline rounded-2xl">
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className="text-theme-muted text-center text-sm">
                      All live sites reporting healthy uptime matrix targets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {liveMonitoringErrors.map((log) => (
                      <div
                        key={log.id}
                        className="bg-theme-bg border-l-4 border-rose-500 p-6 rounded-xl shadow-inner"
                      >
                        <div className="flex justify-between">
                          <span className="font-semibold text-theme-text">
                            {log.projectName}
                          </span>
                          <span className="text-rose-500 text-xs font-mono font-bold">
                            HTTP {log.statusCode}
                          </span>
                        </div>
                        {log.errorTrace && (
                          <pre className="mt-4 text-xs text-rose-400 bg-theme-surface border border-theme-outline p-4 rounded overflow-auto font-mono">
                            {log.errorTrace}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scaffolder Engine Crash Dumps */}
              <div className="bg-theme-surface border border-theme-outline/50 shadow-sm rounded-2xl p-8 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-theme-secondary/10 flex items-center justify-center border border-theme-secondary/20">
                    <AlertTriangle className="w-5 h-5 text-theme-secondary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-theme-text font-serif">
                      Scaffolder Engine Crash Dumps
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-theme-muted mt-1">
                      FAILED BUILDS MAPPED INSIDE PROVISIONING_JOBS
                    </p>
                  </div>
                </div>

                {failedBuildJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-theme-outline rounded-2xl">
                    <div className="w-16 h-16 rounded-full border-2 border-theme-secondary/30 bg-theme-secondary/10 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-theme-secondary" />
                    </div>
                    <p className="text-theme-muted text-center text-sm">
                      Zero provisioning compiler execution drops.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {failedBuildJobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-theme-bg border border-theme-outline shadow-inner p-6 rounded-xl"
                      >
                        <div className="flex justify-between mb-3">
                          <span className="font-mono text-theme-secondary text-sm font-bold">
                            Job #{job.id}
                          </span>
                          <span className="text-xs text-theme-muted font-mono">
                            {new Date(job.createdAt!).toLocaleString()}
                          </span>
                        </div>
                        <pre className="text-xs text-theme-muted bg-theme-surface border border-theme-outline p-4 rounded overflow-auto font-mono">
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
              <div className="bg-theme-surface border border-theme-outline/50 shadow-sm rounded-2xl p-8 sticky top-8 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20">
                    <Mail className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-theme-text font-serif">
                      SMTP Config Meta
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-theme-muted mt-1">
                      NODEMAILER NETWORK TRANSPORT
                    </p>
                  </div>
                </div>

                {/* Validation Banner: Warns user if credentials are missing or invalid */}
                {!isSmtpValid && (
                  <div className="mb-6 bg-theme-secondary/10 border border-theme-secondary/30 p-4 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-theme-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-theme-secondary">
                        Missing Credentials
                      </h3>
                      <p className="text-xs text-theme-text mt-1 leading-relaxed opacity-80">
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
