import React from "react";
import { db, siteMonitoring, projects } from "@studioflow/db";
// FIX: Imported isNotNull from drizzle-orm
import { desc, eq, isNotNull } from "drizzle-orm";
import {
  Globe2,
  ArrowUpRight,
  Zap,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LiveSitesManagementScreen() {
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
    .innerJoin(siteMonitoring, eq(projects.id, siteMonitoring.projectId))
    // FIX: Using Drizzle's isNotNull operator
    .where(isNotNull(projects.liveUrl))
    .orderBy(desc(siteMonitoring.checkedAt));

  const uniqueSites = deployedSites.filter(
    (site, index, self) =>
      index === self.findIndex((t) => t.projectId === site.projectId),
  );

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-[#171f33] pb-6 flex items-end justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-[#958ea0] hover:text-[#adc6ff] mb-3 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Core Systems
              Overview
            </Link>
            <h1 className="text-4xl font-black font-['Playfair_Display',_serif] tracking-wider text-white">
              Live <span className="text-[#a078ff]">Nodes</span>
            </h1>
            <p className="text-sm text-[#948f9a] mt-2 font-mono">
              Real-time telemetry and domain routing status.
            </p>
          </div>
          <div className="text-xs bg-[#131b2e] border border-[#2d3449] px-4 py-2 rounded-xl text-[#adc6ff] flex items-center gap-2">
            <Globe2 className="w-4 h-4" /> Routing Engine Active
          </div>
        </header>

        <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#131b2e] text-[#948f9a] font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-[#171f33]">
                    Domain / Target
                  </th>
                  <th className="p-4 border-b border-[#171f33]">
                    Status Matrix
                  </th>
                  <th className="p-4 border-b border-[#171f33]">
                    Latency (ms)
                  </th>
                  <th className="p-4 border-b border-[#171f33]">Last Audit</th>
                  <th className="p-4 border-b border-[#171f33] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171f33]">
                {uniqueSites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-[#948f9a] font-mono text-xs"
                    >
                      No active production domains currently routed.
                    </td>
                  </tr>
                ) : (
                  uniqueSites.map((site) => (
                    <tr
                      key={site.projectId}
                      className="hover:bg-[#131b2e]/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-white">{site.name}</div>
                        <div className="text-[10px] text-[#adc6ff] font-mono mt-0.5">
                          {site.liveUrl}
                        </div>
                      </td>
                      <td className="p-4">
                        {site.isUp ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                            200_OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider">
                            <AlertCircle className="w-3 h-3" /> FAULT
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-mono text-xs text-[#cac4d0]">
                          <Zap
                            className={`w-3.5 h-3.5 ${site.responseTime! < 300 ? "text-[#a078ff]" : "text-amber-400"}`}
                          />
                          {site.responseTime || "---"} ms
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-[#948f9a]">
                        {new Date(site.checkedAt!).toLocaleTimeString()}
                      </td>
                      <td className="p-4 text-right">
                        <a
                          href={site.liveUrl!}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[#e364a7] hover:text-[#ffafd3] text-xs font-bold transition-colors"
                        >
                          Visit Node <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
