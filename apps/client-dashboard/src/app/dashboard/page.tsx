import React from "react";
import Link from "next/link";
import { db, projects, provisioningJobs } from "@studioflow/db";
import { desc, inArray, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import SidebarConsole from "../../components/SidebarConsole";
import { Terminal, Radio, Play, Pause, RefreshCw, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SystemsOverviewDashboard() {
  const fetchedProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.id));

  let activeProjectsList: any[] = [];
  if (fetchedProjects.length > 0) {
    const projectIds = fetchedProjects.map((p) => p.id);
    const allJobs = await db
      .select()
      .from(provisioningJobs)
      .where(inArray(provisioningJobs.projectId, projectIds))
      .orderBy(desc(provisioningJobs.id));

    activeProjectsList = fetchedProjects.map((project) => ({
      ...project,
      jobs: allJobs.filter((job) => job.projectId === project.id),
    }));
  }

  // --- SERVER ACTIONS FOR DB MUTATIONS ---
  async function deleteProjectAction(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(provisioningJobs).where(eq(provisioningJobs.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
    revalidatePath("/dashboard");
  }

  async function pauseProjectAction(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db
      .update(projects)
      .set({ status: "paused" })
      .where(eq(projects.id, id));
    revalidatePath("/dashboard");
  }

  async function updateProjectAction(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db
      .update(projects)
      .set({ status: "pending", progressPercentage: 0 })
      .where(eq(projects.id, id));
    await db
      .update(provisioningJobs)
      .set({ status: "pending" })
      .where(eq(provisioningJobs.projectId, id));
    revalidatePath("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-300 font-serif flex antialiased">
      {/* Decoupled Interactive Client Workspace Sidebar Console Layout */}
      <SidebarConsole />

      {/* Primary Dashboard Grid Console Window */}
      <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-start border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Systems Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Welcome back. Active automated cluster instances are deploying
              correctly.
            </p>
          </div>
          <div className="bg-[#0b0e17] border border-slate-900 px-4 py-2 rounded-xl text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-2 shadow-inner">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Daemon Sync Active
          </div>
        </header>

        {/* Dynamic Pipeline Performance Analytic Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Projects Monitored
            </div>
            <div className="text-3xl font-black font-mono text-white">
              {activeProjectsList.length}
            </div>
            <div className="text-[11px] text-cyan-400">
              ↳ Running deployment specifications
            </div>
          </div>
          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Success Evaluation Metric
            </div>
            <div className="text-3xl font-black font-mono text-white">100%</div>
            <div className="text-[11px] text-emerald-400">
              ↳ Zero disruption anomalies logged
            </div>
          </div>
          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl p-5 space-y-2">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Active Threads
            </div>
            <div className="text-3xl font-black font-mono text-white">
              {activeProjectsList.filter((p) => p.status === "active").length}
            </div>
            <div className="text-[11px] text-fuchsia-400">
              ↳ Active container operations
            </div>
          </div>
        </section>

        {/* Active Structural Telemetry Workspace Directory Records */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" /> System Allocation
            Registries
          </h2>

          <div className="bg-[#0a0b11] border border-slate-900 rounded-xl overflow-hidden shadow-xl">
            {activeProjectsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No cluster nodes recorded. Use the deploy actions button.
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                {activeProjectsList.map((project) => {
                  const currentJob = project.jobs?.[0];
                  return (
                    <div
                      key={project.id}
                      className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#11131f]/20 transition group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <Link
                            href={`/projects/${project.slug}`}
                            className="text-sm font-bold text-white hover:text-cyan-400 transition"
                          >
                            {project.name}
                          </Link>
                          <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                            apps/{project.slug}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          State Matrix Assessment Flag:{" "}
                          <span
                            className={`uppercase font-mono text-[11px] ${project.status === "paused" ? "text-amber-500" : "text-slate-300"}`}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-left md:text-right space-y-0.5">
                          <div className="text-[9px] font-bold tracking-wider uppercase text-slate-500">
                            Daemon Pipeline Execution
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              currentJob?.status === "completed"
                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                                : currentJob?.status === "in-progress"
                                  ? "bg-cyan-500/5 text-cyan-400 border-cyan-500/10 animate-pulse"
                                  : "bg-amber-500/5 text-amber-400 border-amber-500/10"
                            }`}
                          >
                            ● {currentJob?.status || "Queued"}
                          </span>
                        </div>

                        <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className={`h-full transition-all duration-500 ${project.status === "paused" ? "bg-amber-500" : "bg-gradient-to-r from-cyan-400 to-fuchsia-500"}`}
                            style={{ width: `${project.progressPercentage}%` }}
                          />
                        </div>

                        {/* Action Control Panel */}
                        <div className="flex items-center gap-1.5 pl-3 ml-2 border-l border-slate-800/80 opacity-40 group-hover:opacity-100 transition-opacity">
                          <form
                            action={
                              project.status === "paused"
                                ? updateProjectAction
                                : pauseProjectAction
                            }
                          >
                            <input type="hidden" name="id" value={project.id} />
                            <button
                              type="submit"
                              title={
                                project.status === "paused" ? "Resume" : "Pause"
                              }
                              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                            >
                              {project.status === "paused" ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Pause className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </form>
                          <form action={updateProjectAction}>
                            <input type="hidden" name="id" value={project.id} />
                            <button
                              type="submit"
                              title="Re-provision System"
                              className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </form>
                          <form action={deleteProjectAction}>
                            <input type="hidden" name="id" value={project.id} />
                            <button
                              type="submit"
                              title="Purge from DB"
                              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
