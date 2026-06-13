import React from "react";
import Link from "next/link";
import { db, siteMonitoring, projects, provisioningJobs } from "@studioflow/db";
import { desc, eq, isNotNull, or } from "drizzle-orm";
import {
  AlertTriangle,
  Terminal,
  Mail,
  Server,
  ChevronLeft,
  Activity,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AlertsAndDiagnosticsScreen() {
  // 1. Fetch site monitoring issues from the database where things are down or errored
  // CHANGED: .join() to .innerJoin()
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

  // 2. Fetch provisioning pipeline jobs that crashed out
  // CHANGED: .join() to .innerJoin()
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
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] p-8 font-sans">
      {/* Header Context Vector */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[#958ea0] hover:text-[#adc6ff] mb-3 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Core Systems
            Overview
          </Link>
          <h1 className="text-3xl font-black font-['Playfair_Display',_serif] tracking-wider text-white">
            Telemetry Alerts &{" "}
            <span className="text-[#e364a7]">SMTP Dispatch</span>
          </h1>
          <p className="text-xs text-[#958ea0] mt-1 font-mono">
            System Infrastructure Monitoring Node Gateway
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Live Error Exception Streams */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Live Runtime Failures */}
          <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 border-b border-[#171f33] pb-3">
              <Activity className="w-5 h-5 text-[#ef4444]" />
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  Live Outage Exceptions
                </h2>
                <p className="text-[10px] text-[#958ea0] font-mono">
                  Active tracking hits in site_monitoring
                </p>
              </div>
            </div>

            {liveMonitoringErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[#171f33] rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
                <p className="text-xs font-medium text-slate-400">
                  All live sites reporting healthy uptime matrix targets.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveMonitoringErrors.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#131b2e] border-l-4 border-[#ef4444] rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white">
                        {log.projectName}
                      </span>
                      <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded font-mono border border-red-900">
                        HTTP {log.statusCode || "DOWN"}
                      </span>
                    </div>
                    {log.errorTrace && (
                      <div className="mt-2 bg-[#060e20] rounded-lg p-3 border border-[#171f33] font-mono text-[11px] text-red-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                        {log.errorTrace}
                      </div>
                    )}
                    <div className="mt-3 text-[10px] text-[#958ea0] font-mono text-right">
                      Logged: {new Date(log.checkedAt!).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Factory Pipeline Build Failures */}
          <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 border-b border-[#171f33] pb-3">
              <Terminal className="w-5 h-5 text-[#9d4edd]" />
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  Scaffolder Engine Crash Dumps
                </h2>
                <p className="text-[10px] text-[#958ea0] font-mono">
                  Failed builds mapped inside provisioning_jobs
                </p>
              </div>
            </div>

            {failedBuildJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[#171f33] rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-[#9d4edd] mb-2 opacity-80" />
                <p className="text-xs font-medium text-slate-400">
                  Zero provisioning compiler execution drops.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {failedBuildJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-[#131b2e] border border-[#171f33] rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Job ID #{job.id} — {job.projectName}
                      </span>
                      <span className="text-[10px] text-[#958ea0] font-mono">
                        {new Date(job.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-[#060e20] rounded-lg p-3 border border-[#171f33] font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre">
                      {job.executionLogs ||
                        "No logs captured prior to execution cancellation."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SMTP Real-Time Diagnostic Node */}
        <div className="space-y-8">
          <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6 sticky top-8">
            <div className="flex items-center gap-3 mb-4 border-b border-[#171f33] pb-3">
              <Mail className="w-5 h-5 text-[#d050c2]" />
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white">
                  SMTP Configuration Meta
                </h2>
                <p className="text-[10px] text-[#958ea0] font-mono">
                  Nodemailer network transport layout
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="bg-[#131b2e] p-3 rounded-xl border border-[#171f33] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#958ea0]">SMTP Gateway Host:</span>
                  <span className="text-[#adc6ff]">
                    {process.env.SMTP_HOST || "smtp.mailtrap.io"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#958ea0]">Active Port Vector:</span>
                  <span className="text-[#adc6ff]">
                    {process.env.SMTP_PORT || "2525"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#958ea0]">Target Admin Receiver:</span>
                  <span
                    className="text-[#e364a7] truncate max-w-[150px]"
                    title={process.env.ADMIN_ALERT_EMAIL}
                  >
                    {process.env.ADMIN_ALERT_EMAIL || "admin@studioflow.dev"}
                  </span>
                </div>
              </div>

              {/* Informational Guidance Alert */}
              <div className="bg-cyan-950/30 border border-cyan-800/50 text-cyan-200 p-4 rounded-xl text-[11px] leading-relaxed flex gap-3">
                <Server className="w-5 h-5 shrink-0 text-cyan-400 mt-0.5" />
                <div>
                  To dynamically update parameters, alter the master cluster
                  topology configuration variables (
                  <code className="bg-cyan-900/50 px-1 py-0.5 rounded text-white">
                    SMTP_HOST
                  </code>
                  ,{" "}
                  <code className="bg-cyan-900/50 px-1 py-0.5 rounded text-white">
                    SMTP_USER
                  </code>
                  ) in your Render dashboard environment panel ecosystem.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
