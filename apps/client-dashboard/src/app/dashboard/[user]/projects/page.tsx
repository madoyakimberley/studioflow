import React from "react";
import Link from "next/link";
import { db, projects } from "@studioflow/db";
import { desc } from "drizzle-orm";
import SidebarConsole from "@/components/SidebarConsole";
import NewSystemButton from "./NewSystemNodeButton";

export const dynamic = "force-dynamic";

export default async function ActiveSystemsPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return (
    <div className="flex h-screen bg-[var(--color-theme-bg)] overflow-hidden font-['Plus_Jakarta_Sans',_sans-serif]">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] mb-8 transition-colors group font-semibold tracking-[0.1em] uppercase"
          >
            ← Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="text-5xl font-bold font-['Playfair_Display',_serif] tracking-tight text-[var(--color-theme-text)]">
                Active{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] italic">
                  Systems
                </span>
              </h1>
              <p className="text-[var(--color-theme-muted)] mt-2 max-w-xl text-sm leading-relaxed">
                Ecosystem overview and deployment matrices. Real-time telemetry
                across distributed nodes.
              </p>
            </div>

            <NewSystemButton />
          </div>

          {/* System Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {allProjects.length > 0 ? (
              allProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md rounded-3xl p-8 group hover:border-[var(--color-theme-primary)]/40 transition-all duration-300 relative overflow-hidden border border-[var(--color-theme-outline)]/20 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span
                        className={`inline-block font-['JetBrains_Mono',_monospace] text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-full border ${
                          project.status === "active"
                            ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)] border-[var(--color-theme-primary)]/30"
                            : project.status === "unhealthy"
                              ? "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)] border-[var(--color-theme-secondary)]/30"
                              : "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)] border-[var(--color-theme-secondary)]/30"
                        }`}
                      >
                        {project.status?.toUpperCase() || "STABLE"}
                      </span>
                      <h3 className="text-2xl font-bold mt-4 text-[var(--color-theme-text)] font-['Playfair_Display',_serif] leading-tight">
                        {project.name}
                      </h3>
                      <p className="text-xs text-[var(--color-theme-muted)] font-['JetBrains_Mono',_monospace] mt-1">
                        apps/{project.slug}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-4 mb-8 text-center bg-[var(--color-theme-bg)]/50 p-4 rounded-2xl border border-[var(--color-theme-outline)]/10">
                    <div>
                      <p className="uppercase tracking-widest text-[var(--color-theme-muted)] text-[9px] font-bold mb-1">
                        CPU
                      </p>
                      <p className="text-[var(--color-theme-primary)] text-lg font-['JetBrains_Mono',_monospace] font-semibold">
                        {Math.floor(Math.random() * 35 + 55)}%
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-[var(--color-theme-muted)] text-[9px] font-bold mb-1">
                        MEM
                      </p>
                      <p className="text-[var(--color-theme-text)] text-lg font-['JetBrains_Mono',_monospace] font-semibold">
                        8.4GB
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-[var(--color-theme-muted)] text-[9px] font-bold mb-1">
                        LAT
                      </p>
                      <p className="text-[var(--color-theme-secondary)] text-lg font-['JetBrains_Mono',_monospace] font-semibold">
                        12ms
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-8">
                    <div className="flex justify-between text-[11px] mb-2 font-['JetBrains_Mono',_monospace] font-bold">
                      <span className="text-[var(--color-theme-muted)] tracking-widest">
                        ALLOCATION
                      </span>
                      <span className="text-[var(--color-theme-primary)]">
                        {project.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-theme-bg)] border border-[var(--color-theme-outline)]/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] transition-all"
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Access Button */}
                  <Link
                    href={`/dashboard/${user}/projects/${project.slug}`}
                    className="block w-full text-center py-4 border border-[var(--color-theme-primary)]/30 hover:border-[var(--color-theme-primary)] rounded-2xl text-[12px] font-bold hover:bg-[var(--color-theme-primary)]/5 transition-all text-[var(--color-theme-text)] uppercase tracking-widest"
                  >
                    ACCESS CORE MATRIX →
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-[var(--color-theme-surface)]/20 border border-[var(--color-theme-outline)]/20 p-20 text-center rounded-3xl">
                <p className="text-[var(--color-theme-text)] text-lg font-semibold">
                  No active systems found
                </p>
                <p className="text-sm text-[var(--color-theme-muted)] mt-2">
                  Initialize your first project to begin orchestration.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
