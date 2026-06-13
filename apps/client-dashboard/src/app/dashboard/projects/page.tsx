import React from "react";
import Link from "next/link";
import { db, projects } from "@studioflow/db";
import { desc } from "drizzle-orm";
import {
  FolderGit2,
  ArrowRight,
  Activity,
  Clock,
  ChevronLeft,
} from "lucide-react";
import SidebarConsole from "@/components/SidebarConsole";

export const dynamic = "force-dynamic";

export default async function ActiveSystemsPage() {
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[#958ea0] hover:text-[#adc6ff] mb-3 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Core Systems
            Overview
          </Link>
          <h1 className="text-4xl font-black font-['Playfair_Display',_serif] tracking-wider text-white">
            Active <span className="text-[#adc6ff]">Systems</span>
          </h1>
          <p className="text-sm text-[#948f9a] mt-2 font-mono">
            Ecosystem overview and deployment matrices.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allProjects.map((project) => (
            <div
              key={project.id}
              className="group bg-[#0b1326]/80 backdrop-blur-xl border border-[#171f33] hover:border-[#2c4677] rounded-2xl p-6 transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle top glow based on status */}
              <div
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                  project.status === "active"
                    ? "from-emerald-500 to-cyan-500"
                    : project.status === "unhealthy"
                      ? "from-rose-500 to-orange-500"
                      : "from-[#e364a7] to-[#a078ff]"
                } opacity-50`}
              />

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#131b2e] rounded-xl border border-[#171f33]">
                    <FolderGit2 className="w-5 h-5 text-[#adc6ff]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {project.name}
                    </h3>
                    <div className="text-[10px] text-[#948f9a] font-mono">
                      apps/{project.slug}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-mono">
                    <span className="text-[#cac4d0]">System Allocation</span>
                    <span className="text-[#e9ddff]">
                      {project.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-[#060d20] h-1.5 rounded-full overflow-hidden border border-[#171f33]">
                    <div
                      className="h-full bg-gradient-to-r from-[#e364a7] via-[#d0bcff] to-[#adc6ff] transition-all duration-1000"
                      style={{ width: `${project.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono text-[#948f9a] bg-[#060d20] p-2.5 rounded-lg border border-[#171f33]">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#a078ff]" />{" "}
                    {(project.status || "UNKNOWN").toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#adc6ff]" />{" "}
                    {new Date(project.createdAt!).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Link
                href={`/dashboard/projects/${project.slug}`}
                className="w-full bg-[#131b2e] hover:bg-[#222a3e] border border-[#2d3449] text-[#e9ddff] text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors group-hover:border-[#665590]"
              >
                Access Core Matrix{" "}
                <ArrowRight className="w-4 h-4 text-[#a078ff] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
