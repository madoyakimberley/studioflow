import React from "react";
import Link from "next/link";
import { db, siteMonitoring, projects, provisioningJobs } from "@studioflow/db";
import { desc, eq, isNotNull } from "drizzle-orm";
import SidebarConsole from "@/components/SidebarConsole";
import { CheckCircle2, AlertTriangle, Mail, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlertsAndDiagnosticsScreen({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

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
    .where(eq(siteMonitoring.isUp, false))
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
    .where(eq(provisioningJobs.status, "failed"))
    .orderBy(desc(provisioningJobs.createdAt));

  return (
    <div className="flex h-screen bg-[#0c0f16] overflow-hidden">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
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
              System Infrastructure Monitoring Node Gateway
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Alerts */}
            <div className="lg:col-span-8 space-y-8">
              {/* Live Outage Exceptions */}
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400">
                      bolt
                    </span>
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
                          <span className="font-semibold">
                            {log.projectName}
                          </span>
                          <span className="text-red-400 text-xs font-mono">
                            HTTP {log.statusCode}
                          </span>
                        </div>
                        {log.errorTrace && (
                          <pre className="mt-4 text-xs text-red-300/90 bg-black/40 p-4 rounded overflow-auto">
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
                    <span className="material-symbols-outlined text-purple-400">
                      bug_report
                    </span>
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
                        <pre className="text-xs text-slate-400 bg-black/50 p-4 rounded overflow-auto">
                          {job.executionLogs || "No logs available."}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - SMTP & Diagnostics */}
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

                <div className="space-y-5 text-sm">
                  <div className="bg-[#1d2027] p-5 rounded-xl space-y-4">
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">SMTP GATEWAY HOST</span>
                      <span className="mono-code">smtp.gmail.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">ACTIVE PORT VECTOR</span>
                      <span className="mono-code">465</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94a3b8]">
                        TARGET ADMIN RECEIVER
                      </span>
                      <span className="text-[#e8b3ff] break-all">
                        kimmadoya@gmail.com
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#1d2027]/70 border border-[#32353d] p-5 rounded-xl text-xs leading-relaxed text-[#c6c5d1]">
                    To dynamically update parameters, alter the master cluster
                    topology configuration variables in your Render dashboard
                    environment panel ecosystem.
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button className="flex-1 py-3 bg-[#1d2027] hover:bg-[#272a32] border border-[#32353d] rounded-xl text-sm transition">
                    Test Dispatch
                  </button>
                  <button className="flex-1 py-3 bg-[#1d2027] hover:bg-[#272a32] border border-[#32353d] rounded-xl text-sm transition">
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
