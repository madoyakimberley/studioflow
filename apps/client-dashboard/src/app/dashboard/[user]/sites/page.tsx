import React from "react";
import Link from "next/link";
import { db, siteMonitoring, projects } from "@studioflow/db";
import { desc, eq, isNotNull } from "drizzle-orm";
import SidebarConsole from "@/components/SidebarConsole";
import DeployNewNodeButton from "./DeployNewNodeButton";

export const dynamic = "force-dynamic";

export default async function LiveNodesPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  const deployedSites = await db
    .select({
      projectId: projects.id,
      name: projects.name,
      liveUrl: projects.liveUrl,
      slug: projects.slug,
      isUp: siteMonitoring.isUp,
      responseTime: siteMonitoring.responseTimeMs,
      checkedAt: siteMonitoring.checkedAt,
    })
    .from(projects)
    .leftJoin(siteMonitoring, eq(projects.id, siteMonitoring.projectId))
    .where(isNotNull(projects.liveUrl))
    .orderBy(desc(siteMonitoring.checkedAt));

  // Deduplicate to latest check per project
  const uniqueSites = deployedSites.filter(
    (site, index, self) =>
      index === self.findIndex((t) => t.projectId === site.projectId),
  );

  const activeCount = uniqueSites.filter((s) => s.isUp === true).length;
  const avgLatency =
    uniqueSites.length > 0
      ? Math.round(
          uniqueSites.reduce((sum, s) => sum + (s.responseTime || 0), 0) /
            uniqueSites.length,
        )
      : 0;

  return (
    <div className="flex h-screen bg-[#0c0f16] overflow-hidden">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#d3d7ff] mb-6 transition-colors"
          >
            ← Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
            <div>
              <h1 className="headline-lg lilac-gradient">
                Live <span className="text-[#e8b3ff]">Nodes</span>
              </h1>
              <p className="text-[#c6c5d1] mt-2 max-w-xl">
                Real-time telemetry and domain routing status.
              </p>
            </div>

            <DeployNewNodeButton />
          </div>

          {/* Main Empty / Table Panel */}
          <div className="glass-card rounded-2xl overflow-hidden min-h-[520px] relative">
            {uniqueSites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="relative w-48 h-48 mb-10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-36 h-36 border-2 border-dashed border-[#d3d7ff]/30 rounded-full flex items-center justify-center animate-[spin_25s_linear_infinite]">
                      <span className="material-symbols-outlined text-[#d3d7ff]/40 text-6xl">
                        satellite_alt
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="headline-sm text-white mb-3">System Idle</h3>
                <p className="text-[#c6c5d1] max-w-md mb-10">
                  No active production domains currently routed through this
                  node instance. Deploy a configuration to begin tracking live
                  telemetry.
                </p>
                <div className="flex gap-4">
                  <DeployNewNodeButton variant="primary" />
                  <button className="px-8 py-3.5 border border-[#d3d7ff]/30 hover:border-[#d3d7ff] rounded-2xl flex items-center gap-3 text-[#d3d7ff] transition-colors">
                    <span className="material-symbols-outlined">
                      upload_file
                    </span>
                    Import Config
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#32353d]">
                      <th className="label-caps text-left px-8 py-6 text-[#94a3b8]">
                        Domain / Target
                      </th>
                      <th className="label-caps text-left px-8 py-6 text-[#94a3b8]">
                        Status Matrix
                      </th>
                      <th className="label-caps text-left px-8 py-6 text-[#94a3b8]">
                        Latency (ms)
                      </th>
                      <th className="label-caps text-left px-8 py-6 text-[#94a3b8]">
                        Last Audit
                      </th>
                      <th className="label-caps text-right px-8 py-6 text-[#94a3b8]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#32353d]">
                    {uniqueSites.map((site) => (
                      <tr
                        key={site.projectId}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="font-semibold text-white">
                            {site.name}
                          </div>
                          <div className="mono-code text-sm text-[#d3d7ff] break-all">
                            {site.liveUrl}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {site.isUp === null ? (
                            <span className="inline-flex items-center gap-2 px-4 py-1 bg-[#1d2027] border border-[#32353d] rounded-full text-xs label-caps">
                              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                              AWAITING_PING
                            </span>
                          ) : site.isUp ? (
                            <span className="inline-flex items-center gap-2 px-4 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs label-caps">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                              200_OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-4 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400 text-xs label-caps">
                              FAULT
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6 mono-code text-[#e8b3ff]">
                          {site.responseTime ? `${site.responseTime} ms` : "--"}
                        </td>
                        <td className="px-8 py-6 mono-code text-[#94a3b8] text-sm">
                          {site.checkedAt
                            ? new Date(site.checkedAt).toLocaleString()
                            : "PENDING"}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <a
                            href={site.liveUrl!}
                            target="_blank"
                            className="text-[#d3d7ff] hover:underline flex items-center gap-1 justify-end"
                          >
                            Visit Node
                            <span className="material-symbols-outlined text-lg">
                              open_in_new
                            </span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="glass-card p-8 rounded-2xl">
              <div className="label-caps text-[#94a3b8]">Global Uptime</div>
              <div className="text-4xl font-mono text-emerald-400 mt-3">
                99.998%
              </div>
              <div className="h-1.5 bg-[#1d2027] rounded-full mt-6 overflow-hidden">
                <div className="h-full w-[99.998%] bg-gradient-to-r from-[#d3d7ff] to-[#e8b3ff]" />
              </div>
            </div>
            <div className="glass-card p-8 rounded-2xl">
              <div className="label-caps text-[#94a3b8]">Active Instances</div>
              <div className="text-4xl font-mono text-[#e8b3ff] mt-3">
                {activeCount} Active
              </div>
              <div className="flex gap-1 mt-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i < activeCount ? "bg-[#e8b3ff]" : "bg-[#32353d]"}`}
                  />
                ))}
              </div>
            </div>
            <div className="glass-card p-8 rounded-2xl">
              <div className="label-caps text-[#94a3b8]">Avg. Latency</div>
              <div className="text-4xl font-mono text-[#d3d7ff] mt-3">
                {avgLatency} ms
              </div>
              <div className="h-8 flex items-end gap-1 mt-6">
                {[40, 25, 55, 35, 45].map((h, i) => (
                  <div
                    key={i}
                    className="bg-[#d3d7ff]/70 rounded-t w-full"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
