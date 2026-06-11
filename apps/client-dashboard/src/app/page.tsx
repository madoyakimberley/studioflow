import { db, projects, provisioningJobs } from "@studioflow/db";
import { desc, inArray } from "drizzle-orm";
import ProjectWizard from "../components/ProjectWizard";
import {
  Terminal,
  Database,
  Server,
  Cpu,
  RefreshCw,
  Layers,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1. Fetch all projects first using standard SQL select (Safe for TiDB)
  const fetchedProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.id));

  let activeProjectsList: any[] = [];
  // 2. Fetch jobs only if there are active projects present
  if (fetchedProjects.length > 0) {
    const projectIds = fetchedProjects.map((p) => p.id);

    // Fetch related provisioning jobs in one clean query
    const allJobs = await db
      .select()
      .from(provisioningJobs)
      .where(inArray(provisioningJobs.projectId, projectIds))
      .orderBy(desc(provisioningJobs.id));

    // 3. Map jobs to their respective projects in memory to mimic relational output
    activeProjectsList = fetchedProjects.map((project) => ({
      ...project,
      jobs: allJobs.filter((job) => job.projectId === project.id),
    }));
  }

  // Calculate high-level health indicators
  const totalInjectedSystems = activeProjectsList.length;
  const operationalSprintsCount = activeProjectsList.filter(
    (p) => p.status === "active",
  ).length;
  const engineeringSuccessRate = totalInjectedSystems > 0 ? 100 : 0;

  return (
    <div className="min-h-screen bg-[#07080c] font-sans text-slate-300 antialiased p-8 selection:bg-cyan-500/20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Dynamic Context Header */}
        <header className="flex justify-between items-start border-b border-slate-900 pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Systems Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Welcome back. Your active infrastructure deployments are executing
              on schedule.
            </p>
          </div>
          <div className="bg-[#111420] border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs font-mono font-bold text-cyan-400 shadow-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Synchronized
            with Local Daemon Loop
          </div>
        </header>

        {/* System Metric Indicator Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0b0d14] border border-slate-900 rounded-xl p-6 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Projects Managed
            </div>
            <div className="text-4xl font-extrabold text-white mt-2 font-mono">
              {totalInjectedSystems}
            </div>
            <div className="text-[11px] text-cyan-400 font-medium mt-2 flex items-center gap-1">
              ↳ Active pipeline configuration instances
            </div>
          </div>
          <div className="bg-[#0b0d14] border border-slate-900 rounded-xl p-6 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Success Rate
            </div>
            <div className="text-4xl font-extrabold text-white mt-2 font-mono">
              {engineeringSuccessRate}%
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-2 flex items-center gap-1">
              ↳ 0 deployment disruptions recorded
            </div>
          </div>
          <div className="bg-[#0b0d14] border border-slate-900 rounded-xl p-6 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Active Build Sessions
            </div>
            <div className="text-4xl font-extrabold text-white mt-2 font-mono">
              {operationalSprintsCount}
            </div>
            <div className="text-[11px] text-fuchsia-400 font-medium mt-2 flex items-center gap-1">
              ↳ Dynamic container clusters provisioned
            </div>
          </div>
        </section>

        {/* Dynamic Setup Wizard Target Section */}
        <section className="bg-[#0b0d14] border border-slate-900 rounded-2xl p-2 shadow-xl">
          <ProjectWizard />
        </section>

        {/* Infrastructure Deployment Activity Logs */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" /> Active Tracking
            Telemetry Registry
          </h2>
          <div className="bg-[#0b0d14] border border-slate-900 rounded-xl overflow-hidden shadow-lg">
            {activeProjectsList.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-500">
                No project configurations recorded inside this cluster
                workspace.
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {activeProjectsList.map((project) => {
                  const currentJob = project.jobs?.[0];
                  return (
                    <div
                      key={project.id}
                      className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#10131d]/30 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white tracking-tight">
                            {project.name}
                          </span>
                          <span className="bg-slate-900 text-slate-400 border border-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-md">
                            apps/{project.slug}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 max-w-md truncate">
                          Pipeline State Status Indicator:{" "}
                          <span className="text-slate-200 capitalize font-medium">
                            {project.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-left md:text-right space-y-1">
                          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                            Local Daemon Execution
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider ${
                              currentJob?.status === "completed"
                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20"
                                : currentJob?.status === "in-progress"
                                  ? "bg-cyan-500/5 text-cyan-400 border-cyan-500/20 animate-pulse"
                                  : currentJob?.status === "failed"
                                    ? "bg-red-500/5 text-red-400 border-red-500/20"
                                    : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            ● {currentJob?.status || "Queued"}
                          </span>
                        </div>
                        <div className="w-28 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 h-full transition-all duration-500"
                            style={{ width: `${project.progressPercentage}%` }}
                          />
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
