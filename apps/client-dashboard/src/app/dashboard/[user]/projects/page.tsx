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
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="headline-lg lilac-gradient">
                Active <span className="text-[#e8b3ff]">Systems</span>
              </h1>
              <p className="text-[#c6c5d1] mt-2 max-w-xl">
                Ecosystem overview and deployment matrices. Real-time telemetry
                across distributed nodes.
              </p>
            </div>

            <NewSystemButton />
          </div>

          {/* System Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-20">
            {allProjects.length > 0 ? (
              allProjects.map((project) => (
                <div
                  key={project.id}
                  className="glass-card rounded-2xl p-8 group hover:border-[#d3d7ff]/40 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span
                        className={`font-label-caps px-3 py-1 rounded text-xs ${
                          project.status === "active"
                            ? "bg-[#d3d7ff]/10 text-[#d3d7ff]"
                            : project.status === "unhealthy"
                              ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                              : "bg-[#e8b3ff]/10 text-[#e8b3ff]"
                        }`}
                      >
                        {project.status?.toUpperCase() || "STABLE"}
                      </span>
                      <h3 className="headline-sm mt-3 text-white">
                        {project.name}
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-[#94a3b8] cursor-pointer hover:text-white">
                      more_vert
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="text-center">
                      <p className="label-caps text-[#94a3b8] text-[10px]">
                        CPU
                      </p>
                      <p className="mono-code text-[#d3d7ff] text-lg">
                        {Math.floor(Math.random() * 40 + 60)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="label-caps text-[#94a3b8] text-[10px]">
                        MEM
                      </p>
                      <p className="mono-code text-[#e8b3ff] text-lg">8.4GB</p>
                    </div>
                    <div className="text-center">
                      <p className="label-caps text-[#94a3b8] text-[10px]">
                        LAT
                      </p>
                      <p className="mono-code text-[#ffcaf5] text-lg">12ms</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-8">
                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                      <span className="text-[#94a3b8]">System Allocation</span>
                      <span className="text-[#d3d7ff]">
                        {project.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1d2027] h-1.5 rounded-full overflow-hidden border border-[#32353d]">
                      <div
                        className="h-full bg-gradient-to-r from-[#d3d7ff] via-[#e8b3ff] to-[#ffcaf5] transition-all duration-1000"
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/${user}/projects/${project.slug}`}
                    className="mt-6 block w-full text-center py-3.5 border border-[#d3d7ff]/20 hover:border-[#d3d7ff] rounded-xl text-sm transition-all hover:bg-white/5"
                  >
                    Access Core Matrix →
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-card p-16 text-center">
                <p className="text-[#94a3b8]">No active systems yet.</p>
                <p className="text-sm mt-2">
                  Create your first project to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
