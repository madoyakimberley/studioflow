import React from "react";
import Link from "next/link";
import { db, projects, provisioningJobs } from "@studioflow/db";
import { desc, inArray, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import SidebarConsole from "../../../components/SidebarConsole";

export const dynamic = "force-dynamic";

export default async function SystemsOverviewDashboard({
  params,
}: {
  params: { user: string };
}) {
  const { user } = params;
  const currentWorkspaceId = 1;

  const fetchedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, currentWorkspaceId))
    .orderBy(desc(projects.id));

  let activeProjectsList: any[] = [];

  if (fetchedProjects.length > 0) {
    const projectIds = fetchedProjects.map((p) => p.id);

    const allJobs = await db
      .select()
      .from(provisioningJobs)
      .where(inArray(provisioningJobs.projectId, projectIds))
      .orderBy(desc(provisioningJobs.id));

    const jobsMap = new Map<number, any[]>();
    for (const job of allJobs) {
      if (!jobsMap.has(job.projectId)) {
        jobsMap.set(job.projectId, []);
      }
      jobsMap.get(job.projectId)!.push(job);
    }

    activeProjectsList = fetchedProjects.map((project) => ({
      ...project,
      jobs: jobsMap.get(project.id) || [],
    }));
  }

  const totalMonitored = activeProjectsList.length;
  const unhealthyProjects = activeProjectsList.filter(
    (p) => p.status === "unhealthy",
  );
  const activeThreadsCount = activeProjectsList.filter(
    (p) => p.status === "active",
  ).length;
  const successRate =
    totalMonitored > 0
      ? Math.round(
          ((totalMonitored - unhealthyProjects.length) / totalMonitored) * 100,
        )
      : 100;

  async function deleteProjectAction(formData: FormData) {
    "use server";
    try {
      const id = Number(formData.get("id"));
      await db
        .delete(provisioningJobs)
        .where(eq(provisioningJobs.projectId, id));
      await db.delete(projects).where(eq(projects.id, id));
      revalidatePath(`/dashboard/${user}`);
    } catch (e) {
      console.error("[CRITICAL FAILURE DELETING AT DEGRADATION OVERVIEW]: ", e);
    }
  }

  async function pauseProjectAction(formData: FormData) {
    "use server";
    try {
      const id = Number(formData.get("id"));
      await db
        .update(projects)
        .set({ status: "paused" })
        .where(eq(projects.id, id));
      revalidatePath(`/dashboard/${user}`);
    } catch (e) {
      console.error("[CRITICAL FAILURE PAUSING SYSTEM THREAD]: ", e);
    }
  }

  async function updateProjectAction(formData: FormData) {
    "use server";
    try {
      const id = Number(formData.get("id"));
      await db
        .update(projects)
        .set({ status: "pending", progressPercentage: 0 })
        .where(eq(projects.id, id));
      await db
        .update(provisioningJobs)
        .set({ status: "pending" })
        .where(eq(provisioningJobs.projectId, id));
      revalidatePath(`/dashboard/${user}`);
    } catch (e) {
      console.error(
        "[CRITICAL RE-PROVISION SYSTEM TERMINATION RE-TRIGGER]: ",
        e,
      );
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        body {
          background-color: #0c0f16;
          color: #e0e2ec;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 20px; /* Reduced from 24px */
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }

        .glass-card {
          background: rgba(27, 33, 49, 0.45);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(175, 186, 255, 0.15);
        }

        .glass-card:hover {
          border-color: rgba(175, 186, 255, 0.3);
        }

        .lilac-gradient {
          background: linear-gradient(135deg, #d3d7ff 0%, #e8b3ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .headline-lg {
          font-family: 'Playfair Display', serif;
          font-size: 34px; /* Reduced from 48px */
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .headline-sm {
          font-family: 'Playfair Display', serif;
          font-size: 24px; /* Reduced from 32px */
          font-weight: 500;
          line-height: 1.3;
        }

        .label-caps {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px; /* Reduced from 12px */
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .body-md {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; /* Reduced from 16px */
          font-weight: 400;
          line-height: 1.5;
        }

        .mono-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; /* Reduced from 14px */
          font-weight: 400;
          line-height: 1.5;
        }

        .glow-point {
          position: absolute;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(232, 179, 255, 0.1) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(175, 186, 255, 0.2);
          border-radius: 10px;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: radial-gradient(#afbaff 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }

        .status-badge {
          font-size: 10px; /* Reduced from 12px */
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.25rem 0.6rem;
          border-radius: 0.5rem;
        }

        .status-active {
          background-color: rgba(210, 167, 255, 0.1);
          color: #d3d7ff;
        }

        .status-paused {
          background-color: rgba(255, 202, 245, 0.1);
          color: #ffcaf5;
        }

        .status-unhealthy {
          background-color: rgba(255, 180, 171, 0.1);
          color: #ffb4ab;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#0c0f16]">
        <SidebarConsole userSlug={user} />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {/* Header */}
          <header className="h-auto min-h-16 py-4 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(175,186,255,0.15)] sticky top-0 bg-[#0c0f16]/80 backdrop-blur-md z-40">
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="headline-lg text-[#e0e2ec] text-base sm:text-lg md:text-xl lg:text-2xl break-words">
                Systems Engine Operating Matrix
              </h1>

              <p className="label-caps text-[9px] text-[#94a3b8] mt-1.5 opacity-70 hidden md:block">
                Multi-Tenant Scaffolding Cluster Control Panel
              </p>
            </div>

            <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2 text-xs whitespace-nowrap self-start sm:self-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8b3ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#e8b3ff]"></span>
              </span>
              <span className="mono-code text-[#e8b3ff] text-[11px]">
                Daemon Network Secure Sync Status: Active
              </span>
            </div>
          </header>

          {/* Content */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mb-10 md:mb-14">
              {/* Projects Monitored */}
              <div className="glass-card p-5 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-10 -right-10"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-3 opacity-80">
                    Projects Monitored
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="headline-lg lilac-gradient text-3xl md:text-4xl">
                      {totalMonitored}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#d3d7ff] text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      monitoring
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-[#d3d7ff]/70 text-xs">
                    <span className="material-symbols-outlined text-xs">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-xs">
                      Running multi-stack operational environments
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Evaluation Metric */}
              <div className="glass-card p-5 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="glow-point -bottom-10 -left-10 opacity-50"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-3 opacity-80">
                    Success Evaluation Metric
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="headline-lg lilac-gradient text-3xl md:text-4xl">
                      {successRate}%
                    </span>
                    <span
                      className="material-symbols-outlined text-[#e8b3ff] text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-[#e8b3ff]/70 text-xs">
                    <span className="material-symbols-outlined text-xs">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-xs">
                      {successRate < 100
                        ? `${unhealthyProjects.length} metrics flags thrown`
                        : "No telemetry anomalies detected"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Core Pools */}
              <div className="glass-card p-5 md:p-6 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-20 -left-20"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-3 opacity-80">
                    Active Core Pools
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="headline-lg lilac-gradient text-3xl md:text-4xl">
                      {activeThreadsCount}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#ffcaf5] text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      database
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-[#ffcaf5]/70 text-xs">
                    <span className="material-symbols-outlined text-xs">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-xs">
                      Processing background code allocations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Infrastructure Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="material-symbols-outlined text-[#d3d7ff] text-lg"
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  terminal
                </span>
                <h2 className="headline-sm text-[#e0e2ec] text-xl md:text-2xl">
                  Infrastructure Target Allotment Registries
                </h2>
              </div>

              {/* Empty State - ONLY when no projects */}
              {activeProjectsList.length === 0 && (
                <div className="glass-card rounded-xl p-10 md:p-20 text-center border-dashed relative overflow-hidden">
                  <div className="grid-overlay"></div>

                  <div className="relative z-10">
                    <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#272a32]">
                      <span className="material-symbols-outlined text-3xl text-[#d3d7ff]/30">
                        cloud_off
                      </span>
                    </div>

                    <p className="mono-code text-[#c6c5d1] text-xs max-w-sm mx-auto leading-relaxed opacity-60">
                      No cluster environments initialized. Trigger Project
                      Wizard mapping engine to begin scaffolding new
                      infrastructure nodes.
                    </p>

                    <div className="mt-6">
                      <button className="px-6 py-2 border border-[rgba(175,186,255,0.15)] rounded-lg label-caps text-[#d3d7ff] text-[10px] hover:bg-[#d3d7ff]/5 transition-colors">
                        Initialize Cluster Engine
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects List - Always shown when projects exist */}
              {activeProjectsList.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="flex flex-col">
                    {activeProjectsList.map((project) => {
                      const currentJob = project.jobs?.[0];
                      const isUnhealthy = project.status === "unhealthy";

                      return (
                        <div
                          key={project.id}
                          className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[rgba(175,186,255,0.15)] last:border-0 hover:bg-[rgba(175,186,255,0.05)] transition-colors"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Link
                                href={`/projects/${project.slug}`}
                                className="headline-sm text-[#e0e2ec] hover:text-[#d3d7ff] transition text-base md:text-lg"
                              >
                                {project.name}
                              </Link>
                              <span className="mono-code bg-[#1d2027] text-[#c6c5d1] border border-[#32353d] px-1.5 py-0.5 rounded text-[10px]">
                                apps/{project.slug}
                              </span>
                            </div>

                            <div className="body-md text-[#c6c5d1] flex items-center gap-2 text-[11px] flex-wrap">
                              <span>State Assessment Matrix:</span>
                              <span
                                className={`status-badge ${
                                  project.status === "paused"
                                    ? "status-paused"
                                    : isUnhealthy
                                      ? "status-unhealthy"
                                      : "status-active"
                                }`}
                              >
                                {project.status}
                              </span>
                              {project.status === "active" &&
                                project.liveUrl && (
                                  <a
                                    href={project.liveUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-white border border-white/10 hover:bg-white hover:text-black transition-all text-[10px]"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      open_in_new
                                    </span>
                                    <span className="label-caps text-[9px]">
                                      Live App
                                    </span>
                                  </a>
                                )}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
                            <div className="text-left md:text-right space-y-1">
                              <div className="label-caps text-[#94a3b8] text-[9px]">
                                Pipeline State
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] label-caps border ${
                                  isUnhealthy
                                    ? "bg-[rgba(255,180,171,0.1)] text-[#ffb4ab] border-[rgba(255,180,171,0.2)]"
                                    : currentJob?.status === "completed"
                                      ? "bg-[#1d2027] text-[#c6c5d1] border-[#32353d]"
                                      : "bg-[#1d2027] text-[#d3d7ff] border-[#32353d]"
                                }`}
                              >
                                <div
                                  className={`w-1 h-1 rounded-full ${
                                    isUnhealthy
                                      ? "bg-[#ffb4ab]"
                                      : currentJob?.status === "completed"
                                        ? "bg-[#90909b]"
                                        : "bg-[#d3d7ff] animate-pulse"
                                  }`}
                                />
                                {isUnhealthy
                                  ? "CRITICAL_FAIL"
                                  : currentJob?.status || "QUEUED"}
                              </span>
                            </div>

                            <div className="w-24 md:w-28 bg-[#1d2027] h-1.5 rounded-full overflow-hidden border border-[#32353d] shrink-0">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  project.status === "paused"
                                    ? "bg-[#ffcaf5]"
                                    : isUnhealthy
                                      ? "bg-[#ffb4ab]"
                                      : "bg-gradient-to-r from-[#d3d7ff] to-[#ecb6e2]"
                                }`}
                                style={{
                                  width: `${project.progressPercentage}%`,
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-1 md:pl-4 md:border-l md:border-[rgba(175,186,255,0.15)]">
                              <form
                                action={
                                  project.status === "paused"
                                    ? updateProjectAction
                                    : pauseProjectAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={project.id}
                                />
                                <button
                                  type="submit"
                                  disabled={isUnhealthy}
                                  className="p-1.5 text-[#c6c5d1] hover:text-[#e0e2ec] hover:bg-[#32353d] rounded transition disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-base">
                                    {project.status === "paused"
                                      ? "play_arrow"
                                      : "pause"}
                                  </span>
                                </button>
                              </form>

                              <form action={updateProjectAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={project.id}
                                />
                                <button
                                  type="submit"
                                  className="p-1.5 text-[#c6c5d1] hover:text-[#e0e2ec] hover:bg-[#32353d] rounded transition"
                                >
                                  <span className="material-symbols-outlined text-base">
                                    refresh
                                  </span>
                                </button>
                              </form>

                              <form action={deleteProjectAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={project.id}
                                />
                                <button
                                  type="submit"
                                  className="p-1.5 text-[#c6c5d1] hover:text-[#ffb4ab] hover:bg-[rgba(255,180,171,0.1)] rounded transition"
                                >
                                  <span className="material-symbols-outlined text-base">
                                    delete
                                  </span>
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
