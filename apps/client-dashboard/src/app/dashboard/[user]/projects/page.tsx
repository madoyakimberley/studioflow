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
    <div className="flex h-screen bg-[var(--bg-main)] overflow-hidden">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--color-theme-primary)] mb-8 transition-colors group"
          >
            ← Back to Core Systems Overview
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="headline-lg lilac-gradient">
                Active <span className="text-[var(--color-theme-secondary)]">Systems</span>
              </h1>
              <p className="text-[var(--text-muted)] mt-2 max-w-xl">
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
                  className="glass-card rounded-3xl p-8 group hover:border-[var(--color-theme-primary)]/40 transition-all duration-300 relative overflow-hidden border border-[#1f2538]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span
                        className={`inline-block font-mono text-xs tracking-widest px-3 py-1 rounded-full ${
                          project.status === "active"
                            ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)]"
                            : project.status === "unhealthy"
                              ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                              : "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)]"
                        }`}
                      >
                        {project.status?.toUpperCase() || "STABLE"}
                      </span>
                      <h3 className="headline-sm mt-4 text-theme-text leading-tight">
                        {project.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                        apps/{project.slug}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                    <div>
                      <p className="label-caps text-[var(--text-muted)] text-[10px]">
                        CPU
                      </p>
                      <p className="text-[var(--color-theme-primary)] text-xl font-mono font-semibold">
                        {Math.floor(Math.random() * 35 + 55)}%
                      </p>
                    </div>
                    <div>
                      <p className="label-caps text-[var(--text-muted)] text-[10px]">
                        MEM
                      </p>
                      <p className="text-[var(--color-theme-secondary)] text-xl font-mono font-semibold">
                        8.4GB
                      </p>
                    </div>
                    <div>
                      <p className="label-caps text-[var(--text-muted)] text-[10px]">
                        LAT
                      </p>
                      <p className="text-[#ffcaf5] text-xl font-mono font-semibold">
                        12ms
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-8">
                    <div className="flex justify-between text-xs mb-2 font-mono">
                      <span className="text-[var(--text-muted)]">ALLOCATION</span>
                      <span className="text-[var(--color-theme-primary)]">
                        {project.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-surface)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-theme-primary)] via-[#c4b5fd] to-[#a078ff] transition-all"
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Access Button */}
                  <Link
                    href={`/dashboard/${user}/projects/${project.slug}`}
                    className="block w-full text-center py-4 border border-[var(--color-theme-primary)]/30 hover:border-[var(--color-theme-primary)] rounded-2xl text-sm font-medium hover:bg-white/5 transition-all"
                  >
                    ACCESS CORE MATRIX →
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-card p-20 text-center rounded-3xl">
                <p className="text-[var(--text-muted)] text-lg">
                  No active systems found
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
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
