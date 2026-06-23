import React from "react";
import Link from "next/link";
import { db, siteMonitoring, projects } from "@studioflow/db";
import { desc, eq } from "drizzle-orm";
import SidebarConsole from "@/components/SidebarConsole";
import DeployNewNodeButton from "./DeployNewNodeButton";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function LiveNodesPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  // Server Action to allow devs to update their custom live URL
  // Uses the existing liveUrl column, no DB schema changes needed.
  async function updateLiveUrl(formData: FormData) {
    "use server";
    const newUrl = formData.get("liveUrl")?.toString();
    const projectId = parseInt(formData.get("projectId")?.toString() || "0");

    if (projectId && newUrl !== undefined) {
      await db
        .update(projects)
        .set({ liveUrl: newUrl })
        .where(eq(projects.id, projectId));

      // Revalidate to instantly show the updated URL
      revalidatePath(`/dashboard/${user}/nodes`);
    }
  }

  // Notice we removed `isNotNull(projects.liveUrl)` so developers can add a link
  // even to a project that hasn't successfully generated one yet.
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
    <div className="flex h-screen bg-[var(--color-theme-bg)] overflow-hidden font-['Plus_Jakarta_Sans',_sans-serif]">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] mb-8 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>{" "}
            Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="text-5xl font-bold font-['Playfair_Display',_serif] tracking-tight text-[var(--color-theme-text)]">
                Live{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] italic">
                  Nodes
                </span>
              </h1>
              <p className="text-[var(--color-theme-muted)] mt-2 max-w-xl text-sm leading-relaxed">
                Production deployments and active telemetry. Monitor endpoint
                health and override routing domains.
              </p>
            </div>

            <DeployNewNodeButton variant="secondary" />
          </div>

          {/* Top Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-lg p-8 rounded-3xl">
              <div className="text-[10px] font-bold font-['JetBrains_Mono',_monospace] uppercase tracking-widest text-[var(--color-theme-muted)]">
                Deployed Nodes
              </div>
              <div className="text-4xl font-bold font-['JetBrains_Mono',_monospace] text-[var(--color-theme-text)] mt-3">
                {uniqueSites.length}
              </div>
              <div className="w-full bg-[var(--color-theme-bg)] h-1.5 rounded-full overflow-hidden mt-6 border border-[var(--color-theme-outline)]/10">
                <div className="h-full w-full bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)]" />
              </div>
            </div>

            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-lg p-8 rounded-3xl">
              <div className="text-[10px] font-bold font-['JetBrains_Mono',_monospace] uppercase tracking-widest text-[var(--color-theme-muted)]">
                Active Instances
              </div>
              <div className="text-4xl font-bold font-['JetBrains_Mono',_monospace] text-[var(--color-theme-secondary)] mt-3">
                {activeCount} Active
              </div>
              <div className="flex gap-1 mt-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i < activeCount ? "bg-[var(--color-theme-secondary)]" : "bg-[var(--color-theme-outline)]/20"}`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-lg p-8 rounded-3xl">
              <div className="text-[10px] font-bold font-['JetBrains_Mono',_monospace] uppercase tracking-widest text-[var(--color-theme-muted)]">
                Avg. Latency
              </div>
              <div className="text-4xl font-bold font-['JetBrains_Mono',_monospace] text-[var(--color-theme-primary)] mt-3">
                {avgLatency} ms
              </div>
              <div className="h-8 flex items-end gap-1 mt-6">
                {[40, 25, 55, 35, 45].map((h, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-theme-primary)]/70 rounded-t w-full"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Node Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {uniqueSites.length > 0 ? (
              uniqueSites.map((site) => (
                <div
                  key={site.projectId}
                  className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-lg rounded-3xl p-8 flex flex-col group hover:border-[var(--color-theme-primary)]/40 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            site.isUp
                              ? "bg-[var(--color-theme-primary)] shadow-[0_0_8px_var(--color-theme-primary)]"
                              : "bg-[var(--color-theme-secondary)] shadow-[0_0_8px_var(--color-theme-secondary)] animate-pulse"
                          }`}
                        />
                        <span className="text-[10px] font-bold font-['JetBrains_Mono',_monospace] uppercase tracking-widest text-[var(--color-theme-muted)]">
                          {site.isUp ? "OPERATIONAL" : "DOWN / UNKNOWN"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-['Playfair_Display',_serif] text-[var(--color-theme-text)] leading-tight">
                        {site.name}
                      </h3>
                      <p className="text-xs text-[var(--color-theme-muted)] font-['JetBrains_Mono',_monospace] mt-1">
                        apps/{site.slug}
                      </p>
                    </div>
                  </div>

                  {/* Status Blocks */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-center bg-[var(--color-theme-bg)]/50 p-4 rounded-2xl border border-[var(--color-theme-outline)]/10">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)] mb-1">
                        Ping Check
                      </p>
                      <p className="text-[var(--color-theme-text)] font-['JetBrains_Mono',_monospace] font-semibold text-sm">
                        {site.checkedAt
                          ? new Date(site.checkedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)] mb-1">
                        Response
                      </p>
                      <p className="text-[var(--color-theme-primary)] font-['JetBrains_Mono',_monospace] font-semibold text-sm">
                        {site.responseTime || 0}ms
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4">
                    {/* View Live Deployment Button */}
                    {site.liveUrl ? (
                      <a
                        href={site.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] text-[var(--color-theme-on-primary)] rounded-xl text-center text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg"
                      >
                        Launch Deployment
                      </a>
                    ) : (
                      <div className="w-full py-3.5 bg-[var(--color-theme-surface)]/50 text-[var(--color-theme-muted)] rounded-xl text-center text-[12px] font-bold uppercase tracking-wider border border-[var(--color-theme-outline)]/20">
                        Awaiting Link
                      </div>
                    )}

                    {/* Developer Custom Link Override Form */}
                    <div className="border-t border-[var(--color-theme-outline)]/15 pt-4">
                      <label className="text-[10px] font-bold font-['Plus_Jakarta_Sans',_sans-serif] uppercase tracking-widest text-[var(--color-theme-muted)] mb-2 block">
                        Custom Domain / URL Override
                      </label>
                      <form action={updateLiveUrl} className="flex gap-2">
                        <input
                          type="hidden"
                          name="projectId"
                          value={site.projectId}
                        />
                        <input
                          name="liveUrl"
                          type="url"
                          defaultValue={site.liveUrl || ""}
                          placeholder="https://my-custom-link.com"
                          className="flex-1 bg-[var(--color-theme-bg)] border border-[var(--color-theme-outline)]/20 text-[11px] font-['JetBrains_Mono',_monospace] text-[var(--color-theme-text)] px-3 py-2 rounded-lg outline-none focus:border-[var(--color-theme-primary)] transition-colors placeholder:text-[var(--color-theme-muted)]/40"
                        />
                        <button
                          type="submit"
                          className="bg-[var(--color-theme-surface)]/50 border border-[var(--color-theme-outline)]/20 hover:bg-[var(--color-theme-primary)]/10 hover:text-[var(--color-theme-primary)] text-[var(--color-theme-text)] text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-[var(--color-theme-surface)]/20 border border-[var(--color-theme-outline)]/20 p-20 text-center rounded-3xl">
                <p className="text-[var(--color-theme-text)] text-lg font-semibold font-['Playfair_Display',_serif]">
                  No live deployments found
                </p>
                <p className="text-sm text-[var(--color-theme-muted)] mt-2 font-['Plus_Jakarta_Sans',_sans-serif]">
                  Deploy your first node to begin routing traffic.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
