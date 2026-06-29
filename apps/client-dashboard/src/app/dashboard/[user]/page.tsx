import Link from "next/link";
import { redirect } from "next/navigation";
import {
  db,
  projects,
  provisioningJobs,
  checklistItems,
  users,
  workspaces,
} from "@studioflow/db";
import { desc, inArray, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import SidebarConsole from "../../../components/SidebarConsole";
import SendPortalLinkButton from "../../../components/SendPortalLinkButton";
import { getTenantDb } from "@/lib/tenant-db";

// 👇 Use the single source of truth for authentication
import { getVerifiedUserAndWorkspace } from "../../action";

export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.API_BASE_URL || "https://studioflow-api-ieck.onrender.com";

export default async function SystemsOverviewDashboard({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  // ==========================================
  // 1. MASTER AUTHENTICATION ZONE
  // ==========================================
  const auth = await getVerifiedUserAndWorkspace();

  if (!auth.success || !auth.data) {
    console.error("Auth Gate Failed: No valid session.");
    redirect("/");
  }

  // Fetch the full user record using the trusted userId (needed for the email check)
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, auth.data.userId),
  });

  if (!userRecord) {
    redirect("/");
  }

  // Construct the sessionUser object so the rest of your page works normally!
  const sessionUser = {
    id: auth.data.userId,
    username: auth.data.userSlug,
    email: userRecord.email,
    workspaceId: auth.data.workspaceId,
  };

  // ==========================================
  // 2. SLUG NORMALIZATION (THE REDIRECT FIX)
  // ==========================================
  // Strip spaces, special characters, and force lowercase to ensure a perfect match
  const urlParamUser = user.toLowerCase().replace(/[^a-z0-9]/g, "");
  const loggedInUser = sessionUser.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  // ==========================================
  // 3. SUPERADMIN RESOLUTION
  // ==========================================
  const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const superAdminEmails = adminEmailsString
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const isSuperAdmin = superAdminEmails.includes(sessionUser.email);

  // If not super admin AND the safe URL doesn't match the safe Username, bounce them to THEIR dashboard
  if (!isSuperAdmin && urlParamUser !== loggedInUser) {
    console.warn(
      `Mismatch! Redirecting to correct slug: /dashboard/${loggedInUser}`,
    );
    redirect(`/dashboard/${loggedInUser}`);
  }

  // ==========================================
  // SCOPED DATA EXTRACTION
  // ==========================================
  const workspaceRecord = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, sessionUser.id),
  });

  if (!workspaceRecord && !isSuperAdmin) {
    throw new Error(
      "Unauthorized Access: No active workspace assigned to this account.",
    );
  }

  const currentWorkspaceId = workspaceRecord?.id;

  // 👇 Get tenant DB client for this workspace (only if not superadmin)
  let tenantDb;
  if (!isSuperAdmin && currentWorkspaceId) {
    tenantDb = await getTenantDb(currentWorkspaceId);
  }

  // ── Fetch Projects ───────────────────────────────────────────
  let fetchedProjects;

  if (isSuperAdmin) {
    fetchedProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.id));
  } else {
    fetchedProjects = await tenantDb
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, currentWorkspaceId!))
      .orderBy(desc(projects.id));
  }

  let activeProjectsList: any[] = [];

  if (fetchedProjects.length > 0) {
    const projectIds = fetchedProjects.map((p: { id: any }) => p.id);

    let allJobs, allChecklistItems;

    if (isSuperAdmin) {
      allJobs = await db
        .select()
        .from(provisioningJobs)
        .where(inArray(provisioningJobs.projectId, projectIds))
        .orderBy(desc(provisioningJobs.id));

      allChecklistItems = await db
        .select()
        .from(checklistItems)
        .where(inArray(checklistItems.projectId, projectIds))
        .orderBy(checklistItems.id);
    } else {
      allJobs = await tenantDb
        .select()
        .from(provisioningJobs)
        .where(inArray(provisioningJobs.projectId, projectIds))
        .orderBy(desc(provisioningJobs.id));

      allChecklistItems = await tenantDb
        .select()
        .from(checklistItems)
        .where(inArray(checklistItems.projectId, projectIds))
        .orderBy(checklistItems.id);
    }

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

    activeProjectsList = fetchedProjects.map((project: { id: number }) => ({
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

  // ==========================================
  // SERVER ACTIONS (Self-contained)
  // ==========================================

  async function deleteProjectAction(formData: FormData) {
    "use server";
    try {
      const id = Number(formData.get("id"));
      let targetProject;
      let dbClient;

      if (isSuperAdmin) {
        targetProject = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = db;
      } else {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        if (!project) throw new Error("Project not found");
        const wsId = project.workspaceId;
        if (wsId !== currentWorkspaceId)
          throw new Error("Unauthorized to access this project scope");
        const tenant = await getTenantDb(wsId);
        targetProject = await tenant.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = tenant;
      }

      if (!targetProject) throw new Error("Project not found");

      await dbClient
        .delete(checklistItems)
        .where(eq(checklistItems.projectId, id));
      await dbClient
        .delete(provisioningJobs)
        .where(eq(provisioningJobs.projectId, id));
      await dbClient.delete(projects).where(eq(projects.id, id));

      revalidatePath(`/dashboard/${user}`);
    } catch (e) {
      console.error("[CRITICAL FAILURE DELETING AT DEGRADATION OVERVIEW]: ", e);
    }
  }

  async function pauseProjectAction(formData: FormData) {
    "use server";
    try {
      const id = Number(formData.get("id"));
      let targetProject;
      let dbClient;

      if (isSuperAdmin) {
        targetProject = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = db;
      } else {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        if (!project) throw new Error("Project not found");
        const wsId = project.workspaceId;
        if (wsId !== currentWorkspaceId)
          throw new Error("Unauthorized to access this project scope");
        const tenant = await getTenantDb(wsId);
        targetProject = await tenant.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = tenant;
      }

      if (!targetProject) throw new Error("Project not found");

      await dbClient
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
      let targetProject;
      let dbClient;

      if (isSuperAdmin) {
        targetProject = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = db;
      } else {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        if (!project) throw new Error("Project not found");
        const wsId = project.workspaceId;
        if (wsId !== currentWorkspaceId)
          throw new Error("Unauthorized to access this project scope");
        const tenant = await getTenantDb(wsId);
        targetProject = await tenant.query.projects.findFirst({
          where: eq(projects.id, id),
        });
        dbClient = tenant;
      }

      if (!targetProject) throw new Error("Project not found");

      // Reset project
      await dbClient
        .update(projects)
        .set({ status: "pending", progressPercentage: 0 })
        .where(eq(projects.id, id));

      // Reset job (set to pending)
      await dbClient
        .update(provisioningJobs)
        .set({ status: "pending" })
        .where(eq(provisioningJobs.projectId, id));

      // Reset checklist
      await dbClient
        .update(checklistItems)
        .set({ status: "pending", proofUrl: null })
        .where(eq(checklistItems.projectId, id));

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

      let targetItem;
      let dbClient;

      if (isSuperAdmin) {
        targetItem = await db.query.checklistItems.findFirst({
          where: eq(checklistItems.id, itemId),
          with: { project: true },
        });
        dbClient = db;
      } else {
        const item = await db.query.checklistItems.findFirst({
          where: eq(checklistItems.id, itemId),
          with: { project: true },
        });
        if (!item) throw new Error("Checklist item not found");
        const wsId = item.project.workspaceId;
        if (wsId !== currentWorkspaceId)
          throw new Error("Unauthorized to modify this checklist item");
        const tenant = await getTenantDb(wsId);
        targetItem = await tenant.query.checklistItems.findFirst({
          where: eq(checklistItems.id, itemId),
          with: { project: true },
        });
        dbClient = tenant;
      }

      if (!targetItem) throw new Error("Checklist item not found");

      // Update checklist item
      await dbClient
        .update(checklistItems)
        .set({ status: "pending_client_review", proofUrl: proofUrl })
        .where(eq(checklistItems.id, itemId));

      // Recalculate progress
      const allProjectItems = await dbClient
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.projectId, targetItem.projectId));

      const completedCount = allProjectItems.filter(
        (i: { status: string }) => i.status !== "pending",
      ).length;

      const newProgress = Math.round(
        (completedCount / allProjectItems.length) * 100,
      );

      await dbClient
        .update(projects)
        .set({ progressPercentage: newProgress })
        .where(eq(projects.id, targetItem.projectId));

      revalidatePath(`/dashboard/${userSlug}`);
    } catch (e) {
      console.error("[FAILED TO SUBMIT MVP PROOF]: ", e);
    }
  }

  // ==========================================
  // RENDER (JSX – fully restored)
  // ==========================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        body {
          background-color: var(--color-theme-bg);
          color: var(--color-theme-text);
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
          background-color: var(--color-theme-surface);
          border: 1px solid var(--color-theme-outline);
        }

        .glass-card:hover {
          border-color: var(--color-theme-primary);
        }

        .lilac-gradient {
          background: linear-gradient(135deg, var(--color-theme-primary) 0%, var(--color-theme-secondary) 100%);
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
          background: radial-gradient(circle, var(--color-theme-primary) 0%, transparent 70%);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-theme-bg);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-theme-outline);
          border-radius: 10px;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.05;
          pointer-events: none;
          background-image: radial-gradient(var(--color-theme-primary) 0.5px, transparent 0.5px);
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
          background-color: var(--theme-surface/75);
          color: var(--color-theme-primary);
          border: 1px solid var(--color-theme-outline);
        }

        .status-paused {
          background-color: var(--color-theme-surface);
          color: var(--color-theme-secondary);
          border: 1px solid var(--color-theme-outline);
        }

        .status-unhealthy {
          background-color: rgb(239 68 68 / 0.1);
          color: rgb(239 68 68);
          border: 1px solid rgb(239 68 68 / 0.2);
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[var(--color-theme-bg)]">
        <SidebarConsole userSlug={user} />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <header className="h-auto min-h-14 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-theme-outline)] sticky top-0 bg-[var(--color-theme-bg)]/90 backdrop-blur-md z-40">
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="headline-lg text-[var(--color-theme-text)] text-sm sm:text-base md:text-lg break-words">
                Systems Engine Operating Matrix
              </h1>
              <p className="label-caps text-[8px] text-[var(--color-theme-muted)] mt-1 opacity-70 hidden md:block">
                Multi-Tenant Scaffolding Cluster Control Panel
              </p>
            </div>

            <div className="glass-card px-2.5 py-1 rounded-full flex items-center gap-2 text-[11px] whitespace-nowrap self-start sm:self-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-theme-secondary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-theme-secondary)]"></span>
              </span>
              <span className="mono-code text-[var(--color-theme-secondary)] text-[10px]">
                Daemon Network Secure Sync Status: Active
              </span>
            </div>

            {isSuperAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                <span className="material-symbols-outlined text-[14px]">
                  admin_panel_settings
                </span>
                Superadmin Mode
              </div>
            )}
          </header>

          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8 md:mb-10">
              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-10 -right-10"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[var(--color-theme-muted)] mb-2 opacity-80">
                    Projects Monitored
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {totalMonitored}
                    </span>
                    <span
                      className="material-symbols-outlined text-[var(--color-theme-primary)] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      monitoring
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[var(--color-theme-primary)]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      {isSuperAdmin
                        ? "Global cluster visibility"
                        : "Running multi-stack operational environments"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -bottom-10 -left-10 opacity-50"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[var(--color-theme-muted)] mb-2 opacity-80">
                    Success Evaluation Metric
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {successRate}%
                    </span>
                    <span
                      className="material-symbols-outlined text-[var(--color-theme-secondary)] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[var(--color-theme-secondary)]/70 text-[11px]">
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
                  <h3 className="label-caps text-[var(--color-theme-muted)] mb-2 opacity-80">
                    Active Core Pools
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {activeThreadsCount}
                    </span>
                    <span
                      className="material-symbols-outlined text-[var(--color-theme-secondary)] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      database
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[var(--color-theme-secondary)]/70 text-[11px]">
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
              <div className="flex items-center gap-2 mb-6">
                <span
                  className="material-symbols-outlined text-[var(--color-theme-primary)] text-base"
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  terminal
                </span>
                <h2 className="headline-sm text-[var(--color-theme-text)] text-base md:text-lg">
                  {isSuperAdmin
                    ? "Global Infrastructure Registries"
                    : "Infrastructure Target Allotment Registries"}
                </h2>
              </div>

              {activeProjectsList.length === 0 && (
                <div className="glass-card rounded-xl p-8 md:p-14 text-center border-dashed relative overflow-hidden">
                  <div className="grid-overlay"></div>
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-theme-surface)]">
                      <span className="material-symbols-outlined text-2xl text-[var(--color-theme-primary)]/30">
                        cloud_off
                      </span>
                    </div>
                    <p className="mono-code text-[var(--color-theme-muted)] text-[11px] max-w-sm mx-auto leading-relaxed opacity-60">
                      No cluster environments initialized. Trigger Project
                      Wizard mapping engine to begin scaffolding new
                      infrastructure nodes.
                    </p>
                  </div>
                </div>
              )}

              {activeProjectsList.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {activeProjectsList.map((project) => {
                    const currentJob = project.jobs?.[0];
                    const isUnhealthy = project.status === "unhealthy";

                    return (
                      <div
                        key={project.id}
                        className="glass-card rounded-2xl p-5 md:p-7 flex flex-col relative transition-all duration-300 hover:shadow-xl group"
                      >
                        {/* TOP ROW: Header & Toolbar */}
                        <div className="flex justify-between items-start gap-4 mb-6">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <Link
                                href={`/dashboard/${user}/projects/${project.slug}`}
                                className="headline-sm text-[var(--color-theme-text)] hover:text-[var(--color-theme-primary)] transition text-lg"
                              >
                                {project.name}
                              </Link>
                              <span className="mono-code bg-[var(--color-theme-bg)] text-[var(--color-theme-muted)] border border-[var(--color-theme-outline)]/50 px-2 py-0.5 rounded text-[10px]">
                                apps/{project.slug}
                              </span>
                              {isSuperAdmin && (
                                <span className="mono-code bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                                  WS: {project.workspaceId}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[var(--color-theme-muted)] font-medium">
                                System Status:
                              </span>
                              <span
                                className={`status-badge ${project.status === "paused" ? "status-paused" : isUnhealthy ? "status-unhealthy" : "status-active"}`}
                              >
                                {project.status}
                              </span>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center gap-1 bg-[var(--color-theme-bg)]/80 p-1 rounded-lg border border-[var(--color-theme-outline)]/30 backdrop-blur-sm shrink-0 shadow-sm">
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
                                className="p-1.5 text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] hover:bg-[var(--color-theme-outline)]/30 rounded-md transition disabled:opacity-50"
                                title={
                                  project.status === "paused"
                                    ? "Resume"
                                    : "Pause"
                                }
                              >
                                <span className="material-symbols-outlined text-[15px]">
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
                                className="p-1.5 text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] hover:bg-[var(--color-theme-outline)]/30 rounded-md transition"
                                title="Sync / Refresh"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  refresh
                                </span>
                              </button>
                            </form>

                            <div className="w-px h-4 bg-[var(--color-theme-outline)]/40 mx-1"></div>

                            <form action={deleteProjectAction}>
                              <input
                                type="hidden"
                                name="id"
                                value={project.id}
                              />
                              <button
                                type="submit"
                                className="p-1.5 text-[var(--color-theme-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition"
                                title="Delete Project"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  delete
                                </span>
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* MIDDLE ROW: Pipeline Metrics Container */}
                        <div className="bg-[var(--color-theme-bg)]/60 rounded-xl p-4 md:p-5 border border-[var(--color-theme-outline)]/30 mb-6 flex flex-col gap-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="label-caps text-[var(--color-theme-muted)] text-[9px] mb-1.5">
                                Pipeline Execution State
                              </div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] label-caps border ${isUnhealthy ? "bg-red-500/10 text-red-500 border-red-500/20" : currentJob?.status === "completed" ? "bg-[var(--color-theme-surface)] text-[var(--color-theme-text)] border-[var(--color-theme-outline)]" : "bg-[var(--color-theme-surface)] text-[var(--color-theme-primary)] border-[var(--color-theme-outline)]"}`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isUnhealthy ? "bg-red-500" : currentJob?.status === "completed" ? "bg-[var(--color-theme-muted)]" : "bg-[var(--color-theme-primary)] animate-pulse"}`}
                                />
                                {isUnhealthy
                                  ? "CRITICAL_FAIL"
                                  : currentJob?.status || "QUEUED"}
                              </span>
                            </div>

                            <SendPortalLinkButton
                              projectId={project.id}
                              clientEmail={project.clientEmail || ""}
                              portalSlug={project.slug}
                              sentCount={project.portalLinkSentCount || 0}
                            />
                          </div>

                          <div className="w-full bg-[var(--color-theme-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--color-theme-outline)]/20">
                            <div
                              className={`h-full transition-all duration-500 ${project.status === "paused" ? "bg-[var(--color-theme-secondary)]" : isUnhealthy ? "bg-red-500" : "bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)]"}`}
                              style={{
                                width: `${project.progressPercentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* BOTTOM ROW: MVP Checklist & Proof Submission */}
                        {project.checklist && project.checklist.length > 0 && (
                          <div className="mt-auto">
                            <h4 className="label-caps text-[var(--color-theme-muted)] mb-3 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">
                                checklist
                              </span>
                              Project Scope & MVP Proofing
                            </h4>

                            <div className="flex flex-col gap-2.5">
                              {project.checklist.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="bg-[var(--color-theme-bg)] border border-[var(--color-theme-outline)]/40 p-3.5 rounded-lg flex flex-col gap-2 transition hover:border-[var(--color-theme-outline)]/80"
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <span className="text-[13px] text-[var(--color-theme-text)] font-medium leading-tight">
                                      {item.title}
                                    </span>
                                    <span
                                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${item.type === "MVP" ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)]" : "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)]"}`}
                                    >
                                      {item.type}
                                    </span>
                                  </div>

                                  {item.status === "pending" ? (
                                    <form
                                      action={submitDevProofAction}
                                      className="flex gap-2 mt-1.5"
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
                                        className="flex-1 bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)] rounded px-3 py-2 text-[11px] text-[var(--color-theme-text)] focus:outline-none focus:border-[var(--color-theme-primary)] placeholder:text-[var(--color-theme-muted)]/50 transition-colors"
                                      />
                                      <button
                                        type="submit"
                                        className="bg-[var(--color-theme-primary)] hover:opacity-90 text-[var(--color-theme-on-primary)] px-4 py-2 rounded text-[11px] font-bold tracking-wide transition shadow-sm"
                                      >
                                        Submit
                                      </button>
                                    </form>
                                  ) : item.status ===
                                    "pending_client_review" ? (
                                    <div className="flex items-center gap-2 mt-1.5 bg-[var(--color-theme-surface)]/50 rounded py-2 px-3 border border-[var(--color-theme-outline)]/30">
                                      <span className="material-symbols-outlined text-amber-500 text-[16px]">
                                        hourglass_empty
                                      </span>
                                      <span className="text-[11px] text-amber-500 font-medium">
                                        Awaiting Client Approval
                                      </span>
                                      <a
                                        href={item.proofUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ml-auto text-[11px] text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] flex items-center gap-1 font-medium"
                                      >
                                        View Proof{" "}
                                        <span className="material-symbols-outlined text-[14px]">
                                          open_in_new
                                        </span>
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 mt-1.5 bg-emerald-500/10 rounded py-2 px-3 border border-emerald-500/20">
                                      <span className="material-symbols-outlined text-emerald-500 text-[16px]">
                                        check_circle
                                      </span>
                                      <span className="text-[11px] text-emerald-500 font-medium">
                                        Approved by Client
                                      </span>
                                      <a
                                        href={item.proofUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ml-auto text-[11px] text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] flex items-center gap-1 font-medium"
                                      >
                                        Archive Link{" "}
                                        <span className="material-symbols-outlined text-[14px]">
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
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
