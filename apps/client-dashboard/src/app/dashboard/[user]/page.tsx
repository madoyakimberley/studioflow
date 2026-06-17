import React from "react";
import Link from "next/link";
import { db, projects, provisioningJobs, checklistItems } from "@studioflow/db";
import { desc, inArray, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import SidebarConsole from "../../../components/SidebarConsole";
import SendPortalLinkButton from "../../../components/SendPortalLinkButton";

export const dynamic = "force-dynamic";

export default async function SystemsOverviewDashboard({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;
  const currentWorkspaceId = 1;

  // 1. Core dataset extraction sweep
  const fetchedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, currentWorkspaceId))
    .orderBy(desc(projects.id));

  let activeProjectsList: any[] = [];

  // O(M + N) RELATIONAL ALIGNMENT WORKFLOW PATTERN EXECUTION
  if (fetchedProjects.length > 0) {
    const projectIds = fetchedProjects.map((p) => p.id);

    const allJobs = await db
      .select()
      .from(provisioningJobs)
      .where(inArray(provisioningJobs.projectId, projectIds))
      .orderBy(desc(provisioningJobs.id));

    const allChecklistItems = await db
      .select()
      .from(checklistItems)
      .where(inArray(checklistItems.projectId, projectIds))
      .orderBy(checklistItems.id);

    // Convert secondary datasets to indexed hash mappings (O(N))
    const jobsMap = new Map<number, any[]>();
    for (const job of allJobs) {
      if (!jobsMap.has(job.projectId)) {
        jobsMap.set(job.projectId, []);
      }
      jobsMap.get(job.projectId)!.push(job);
    }

    const checklistMap = new Map<number, any[]>();
    for (const item of allChecklistItems) {
      if (!checklistMap.has(item.projectId)) {
        checklistMap.set(item.projectId, []);
      }
      checklistMap.get(item.projectId)!.push(item);
    }

    // Direct mapping configuration deployment (O(M))
    activeProjectsList = fetchedProjects.map((project) => ({
      ...project,
      jobs: jobsMap.get(project.id) || [],
      checklist: checklistMap.get(project.id) || [],
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

  // Server Actions for System Dashboard
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

  async function submitDevProofAction(formData: FormData) {
    "use server";
    try {
      const itemId = Number(formData.get("itemId"));
      const proofUrl = formData.get("proofUrl")?.toString();
      const userSlug = formData.get("userSlug")?.toString();

      if (!itemId || !proofUrl) return;

      await db
        .update(checklistItems)
        .set({ status: "pending_client_review", proofUrl: proofUrl })
        .where(eq(checklistItems.id, itemId));

      revalidatePath(`/dashboard/${userSlug}`);
    } catch (e) {
      console.error("[FAILED TO SUBMIT MVP PROOF]: ", e);
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
          font-size: 18px;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }

        .glass-card {
          background: rgba(20, 24, 36, 0.35);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(175, 186, 255, 0.08);
        }

        .glass-card:hover {
          border-color: rgba(175, 186, 255, 0.18);
        }

        .lilac-gradient {
          background: linear-gradient(135deg, #d3d7ff 0%, #e8b3ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .headline-lg {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .headline-sm {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 1.3;
        }

        .label-caps {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .body-md {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.5;
        }

        .mono-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.5;
        }

        .glow-point {
          position: absolute;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(232, 179, 255, 0.06) 0%, transparent 70%);
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
          background: rgba(175, 186, 255, 0.15);
          border-radius: 10px;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: radial-gradient(#afbaff 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }

        .status-badge {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.2rem 0.5rem;
          border-radius: 0.375rem;
        }

        .status-active {
          background-color: rgba(210, 167, 255, 0.08);
          color: #d3d7ff;
        }

        .status-paused {
          background-color: rgba(255, 202, 245, 0.08);
          color: #ffcaf5;
        }

        .status-unhealthy {
          background-color: rgba(255, 180, 171, 0.08);
          color: #ffb4ab;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#0c0f16]">
        <SidebarConsole userSlug={user} />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <header className="h-auto min-h-14 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(175,186,255,0.1)] sticky top-0 bg-[#0c0f16]/90 backdrop-blur-md z-40">
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="headline-lg text-[#e0e2ec] text-sm sm:text-base md:text-lg break-words">
                Systems Engine Operating Matrix
              </h1>
              <p className="label-caps text-[8px] text-[#94a3b8] mt-1 opacity-70 hidden md:block">
                Multi-Tenant Scaffolding Cluster Control Panel
              </p>
            </div>

            <div className="glass-card px-2.5 py-1 rounded-full flex items-center gap-2 text-[11px] whitespace-nowrap self-start sm:self-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8b3ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#e8b3ff]"></span>
              </span>
              <span className="mono-code text-[#e8b3ff] text-[10px]">
                Daemon Network Secure Sync Status: Active
              </span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8 md:mb-10">
              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-10 -right-10"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-2 opacity-80">
                    Projects Monitored
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {totalMonitored}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#d3d7ff] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      monitoring
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[#d3d7ff]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      Running multi-stack operational environments
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -bottom-10 -left-10 opacity-50"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-2 opacity-80">
                    Success Evaluation Metric
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {successRate}%
                    </span>
                    <span
                      className="material-symbols-outlined text-[#e8b3ff] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[#e8b3ff]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      {successRate < 100
                        ? `${unhealthyProjects.length} metrics flags thrown`
                        : "No telemetry anomalies detected"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-20 -left-20"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-2 opacity-80">
                    Active Core Pools
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {activeThreadsCount}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#ffcaf5] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      database
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[#ffcaf5]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      Processing background code allocations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-[#d3d7ff] text-base"
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  terminal
                </span>
                <h2 className="headline-sm text-[#e0e2ec] text-base md:text-lg">
                  Infrastructure Target Allotment Registries
                </h2>
              </div>

              {activeProjectsList.length === 0 && (
                <div className="glass-card rounded-xl p-8 md:p-14 text-center border-dashed relative overflow-hidden">
                  <div className="grid-overlay"></div>
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#272a32]">
                      <span className="material-symbols-outlined text-2xl text-[#d3d7ff]/30">
                        cloud_off
                      </span>
                    </div>
                    <p className="mono-code text-[#c6c5d1] text-[11px] max-w-sm mx-auto leading-relaxed opacity-60">
                      No cluster environments initialized. Trigger Project
                      Wizard mapping engine to begin scaffolding new
                      infrastructure nodes.
                    </p>
                  </div>
                </div>
              )}

              {activeProjectsList.length > 0 && (
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="flex flex-col">
                    {activeProjectsList.map((project) => {
                      const currentJob = project.jobs?.[0];
                      const isUnhealthy = project.status === "unhealthy";

                      return (
                        <div
                          key={project.id}
                          className="p-3.5 md:p-4 flex flex-col border-b border-[rgba(175,186,255,0.1)] last:border-0 hover:bg-[rgba(175,186,255,0.03)] transition-colors"
                        >
                          {/* TOP ROW: Infrastructure & Controls */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <Link
                                  href={`/dashboard/${user}/projects/${project.slug}`}
                                  className="headline-sm text-[#e0e2ec] hover:text-[#d3d7ff] transition text-sm md:text-base"
                                >
                                  {project.name}
                                </Link>
                                <span className="mono-code bg-[#1d2027] text-[#c6c5d1] border border-[#32353d] px-1.5 py-0.5 rounded text-[9px]">
                                  apps/{project.slug}
                                </span>
                              </div>

                              <div className="body-md text-[#c6c5d1] flex items-center gap-3 text-[11px] flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span>State Assessment Matrix:</span>
                                  <span
                                    className={`status-badge ${project.status === "paused" ? "status-paused" : isUnhealthy ? "status-unhealthy" : "status-active"}`}
                                  >
                                    {project.status}
                                  </span>
                                </div>

                                {/* PORTAL LINK & EMAIL BUTTON */}
                                <div className="ml-1 flex items-center gap-3 border-l border-[rgba(175,186,255,0.1)] pl-3">
                                  {/* <Link
                                    href={`https://${project.slug}.studioflow.dev`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[#e8b3ff] hover:underline text-[10px]"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">
                                      open_in_new
                                    </span>
                                    Live Link
                                  </Link> */}

                                  <SendPortalLinkButton
                                    clientEmail={project.clientEmail || ""}
                                    projectSlug={project.slug}
                                    projectName={project.name}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 w-full md:w-auto">
                              <div className="text-left md:text-right space-y-0.5">
                                <div className="label-caps text-[#94a3b8] text-[8px]">
                                  Pipeline State
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] label-caps border ${isUnhealthy ? "bg-[rgba(255,180,171,0.06)] text-[#ffb4ab] border-[rgba(255,180,171,0.15)]" : currentJob?.status === "completed" ? "bg-[#1d2027] text-[#c6c5d1] border-[#32353d]" : "bg-[#1d2027] text-[#d3d7ff] border-[#32353d]"}`}
                                >
                                  <div
                                    className={`w-1 h-1 rounded-full ${isUnhealthy ? "bg-[#ffb4ab]" : currentJob?.status === "completed" ? "bg-[#90909b]" : "bg-[#d3d7ff] animate-pulse"}`}
                                  />
                                  {isUnhealthy
                                    ? "CRITICAL_FAIL"
                                    : currentJob?.status || "QUEUED"}
                                </span>
                              </div>

                              <div className="w-20 md:w-24 bg-[#1d2027] h-1 rounded-full overflow-hidden border border-[#32353d] shrink-0">
                                <div
                                  className={`h-full transition-all duration-500 ${project.status === "paused" ? "bg-[#ffcaf5]" : isUnhealthy ? "bg-[#ffb4ab]" : "bg-gradient-to-r from-[#d3d7ff] to-[#ecb6e2]"}`}
                                  style={{
                                    width: `${project.progressPercentage}%`,
                                  }}
                                />
                              </div>

                              <div className="flex items-center gap-0.5 md:pl-3 md:border-l md:border-[rgba(175,186,255,0.1)]">
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
                                    className="p-1 text-[#c6c5d1] hover:text-[#e0e2ec] hover:bg-[#32353d] rounded transition disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-sm">
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
                                    className="p-1 text-[#c6c5d1] hover:text-[#e0e2ec] hover:bg-[#32353d] rounded transition"
                                  >
                                    <span className="material-symbols-outlined text-sm">
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
                                    className="p-1 text-[#c6c5d1] hover:text-[#ffb4ab] hover:bg-[rgba(255,180,171,0.06)] rounded transition"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      delete
                                    </span>
                                  </button>
                                </form>
                              </div>
                            </div>
                          </div>

                          {/* BOTTOM ROW: MVP Checklist & Proof Submission */}
                          {project.checklist &&
                            project.checklist.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-[rgba(175,186,255,0.05)]">
                                <h4 className="label-caps text-[#c6c5d1] mb-3 opacity-80 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[14px]">
                                    checklist
                                  </span>
                                  Project Scope & MVP Proofing
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {project.checklist.map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="bg-[#12151d] border border-[rgba(175,186,255,0.05)] p-3 rounded-lg flex flex-col gap-2 transition hover:border-[rgba(175,186,255,0.15)]"
                                    >
                                      <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs text-[#e0e2ec] font-medium leading-tight">
                                          {item.title}
                                        </span>
                                        <span
                                          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${item.type === "MVP" ? "bg-[#8b5cf6]/10 text-[#c084fc]" : "bg-cyan-400/10 text-cyan-400"}`}
                                        >
                                          {item.type}
                                        </span>
                                      </div>

                                      {item.status === "pending" ? (
                                        <form
                                          action={submitDevProofAction}
                                          className="flex gap-2 mt-1"
                                        >
                                          <input
                                            type="hidden"
                                            name="itemId"
                                            value={item.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="userSlug"
                                            value={user}
                                          />
                                          <input
                                            type="url"
                                            name="proofUrl"
                                            required
                                            placeholder="Paste proof URL (Loom, GitHub, Link)"
                                            className="flex-1 bg-[#1d2027] border border-[#32353d] rounded px-2 py-1.5 text-[10px] text-[#e0e2ec] focus:outline-none focus:border-[#8b5cf6] placeholder:text-[#94a3b8]/50"
                                          />
                                          <button
                                            type="submit"
                                            className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] hover:from-[#7c3aed] hover:to-[#9333ea] text-white px-3 py-1.5 rounded text-[10px] font-medium transition shadow-sm"
                                          >
                                            Submit
                                          </button>
                                        </form>
                                      ) : item.status ===
                                        "pending_client_review" ? (
                                        <div className="flex items-center gap-1.5 mt-1 bg-[#1d2027]/50 rounded py-1 px-2 border border-[#32353d]/50">
                                          <span className="material-symbols-outlined text-amber-400 text-[14px]">
                                            hourglass_empty
                                          </span>
                                          <span className="text-[10px] text-amber-400 font-medium">
                                            Awaiting Client Approval
                                          </span>
                                          <a
                                            href={item.proofUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ml-auto text-[10px] text-[#94a3b8] hover:text-[#e0e2ec] flex items-center gap-1"
                                          >
                                            View Proof{" "}
                                            <span className="material-symbols-outlined text-[12px]">
                                              open_in_new
                                            </span>
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 mt-1 bg-emerald-400/5 rounded py-1 px-2 border border-emerald-400/10">
                                          <span className="material-symbols-outlined text-emerald-400 text-[14px]">
                                            check_circle
                                          </span>
                                          <span className="text-[10px] text-emerald-400 font-medium">
                                            Approved by Client
                                          </span>
                                          <a
                                            href={item.proofUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ml-auto text-[10px] text-[#94a3b8] hover:text-[#e0e2ec] flex items-center gap-1"
                                          >
                                            Archive Link{" "}
                                            <span className="material-symbols-outlined text-[12px]">
                                              open_in_new
                                            </span>
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
