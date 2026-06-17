import React from "react";
import {
  verifyPortalAccess,
  addOrEditChecklistItemAction,
} from "../../../../portal-actions";
import {
  db,
  checklistItems,
  provisioningJobs,
  portalMessages,
  clientRequests,
} from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Rocket,
  BadgeCheck,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  GitCommit,
  ArrowRight,
  MessageSquare,
  Activity,
  Lock,
  PlusSquare,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authResult = await verifyPortalAccess(token);

  if (!authResult.success || !authResult.project) {
    notFound();
  }

  const project = authResult.project;

  // --- Inline Server Action to handle the form submission ---
  const handleAddFeature = async (formData: FormData) => {
    "use server";
    const title = formData.get("title") as string;
    if (!title || title.trim() === "") return;

    // The backend automatically determines if this is an MVP or Added Feature based on the 48-hour rule!
    await addOrEditChecklistItemAction(project.id, title);
  };

  const projectChecklist = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, project.id));

  const recentJobs = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, project.id))
    .orderBy(desc(provisioningJobs.createdAt))
    .limit(3);

  const activeRequests = await db
    .select()
    .from(clientRequests)
    .where(eq(clientRequests.projectId, project.id));

  const unreadMessagesCount = await db
    .select()
    .from(portalMessages)
    .where(eq(portalMessages.projectId, project.id))
    .then(
      (msgs) => msgs.filter((m) => m.sender === "admin" && !m.isRead).length,
    );

  const totalTasks = projectChecklist.length;
  const completedTasks = projectChecklist.filter(
    (t) => t.status === "completed",
  );

  const mvpItems = projectChecklist.filter((t) => t.type === "MVP");
  const addedFeatureItems = projectChecklist.filter(
    (t) => t.type === "Added Feature",
  );

  const now = new Date();
  const hoursSinceCreation = project.createdAt
    ? (now.getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60)
    : 0;

  // Controls the UI lock state
  const mvpIsLocked = hoursSinceCreation > 48;

  const overallProgress =
    project.progressPercentage ||
    (totalTasks === 0
      ? 0
      : Math.round((completedTasks.length / totalTasks) * 100));

  const pendingRequestsCount = activeRequests.filter(
    (r) => r.status !== "completed",
  ).length;

  const latestJob = recentJobs[0];
  const isSystemHealthy =
    !latestJob ||
    latestJob.status === "completed" ||
    latestJob.status === "success";
  const isDeploying =
    latestJob?.status === "pending" || latestJob?.status === "running";

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-2 mt-6 px-4 md:px-0">
        <div>
          <h1 className="text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            Mission Control
          </h1>
          <p className="text-[#958ea0] text-lg">
            High-level overview of your project's health, progress, and active
            tasks.
          </p>
        </div>
      </div>

      {/* 2-Day MVP Limit Warning Notice */}
      <div className="mx-4 md:mx-0 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3 shadow-lg shadow-amber-500/5">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-amber-400 tracking-wide uppercase mb-1">
            Action Required: MVP Features Scope
          </h3>
          <p className="text-xs text-amber-400/80 leading-relaxed">
            You have a maximum of <strong>2 days</strong> to add MVP features
            directly to your core project scope. After this period, any
            additional functionality must be submitted through the standard
            feature request pipeline for review.
          </p>
        </div>
      </div>

      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
        {/* Progress Card */}
        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ec4899]/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-[#ec4899]/10" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Project Progress
            </h3>
            <BadgeCheck className="text-[#ec4899] w-5 h-5" />
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-4xl font-serif text-white">
                {overallProgress}%
              </div>
              <span className="text-xs text-[#7a849c] uppercase tracking-wider font-mono">
                Complete
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#171c30] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#ec4899] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {completedTasks.length}{" "}
              of {totalTasks} objectives met
            </p>
          </div>
        </div>

        {/* Client Requests Card */}
        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-[#8b5cf6]/10" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Active Requests
            </h3>
            <Rocket className="text-[#8b5cf6] w-5 h-5" />
          </div>
          <div className="relative z-10">
            <div className="text-4xl font-serif text-white mb-2">
              {pendingRequestsCount.toString().padStart(2, "0")}
            </div>
            <Link
              href={`/portal/${token}/projects`}
              className="text-[11px] text-[#8b5cf6] font-medium hover:text-[#c084fc] flex items-center gap-1 transition-colors w-max"
            >
              Review your requests <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-cyan-400/10" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Environment Status
            </h3>
            {isDeploying ? (
              <RefreshCw className="text-amber-400 w-5 h-5 animate-spin" />
            ) : isSystemHealthy ? (
              <Globe className="text-cyan-400 w-5 h-5" />
            ) : (
              <AlertTriangle className="text-red-400 w-5 h-5" />
            )}
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-serif text-white mb-1">
              {isDeploying
                ? "Deploying..."
                : isSystemHealthy
                  ? "Online & Healthy"
                  : "System Degraded"}
            </div>
            {project.liveUrl ? (
              <a
                href={
                  project.liveUrl.startsWith("http")
                    ? project.liveUrl
                    : `https://${project.liveUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 font-medium hover:text-cyan-300 flex items-center gap-1 transition-colors w-max mt-2"
              >
                Open Production Link <ArrowRight className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-[11px] text-[#7a849c] font-medium mt-2">
                Awaiting initial deployment phase.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
        {/* Dynamic Project Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-2xl font-serif text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#8b5cf6]" />
              Implementation Tracker
            </h2>
            <span className="text-[10px] font-bold text-[#8b5cf6] uppercase tracking-widest bg-[#8b5cf6]/10 px-3 py-1 rounded-full border border-[#8b5cf6]/20">
              {project.status || "In Progress"}
            </span>
          </div>

          {/* INPUT FORM: Client adds to MVP / Scope here */}
          <form
            action={handleAddFeature}
            className="flex items-center gap-3 bg-[#0e1224] p-2 rounded-xl border border-[#1e2338] shadow-inner mb-6"
          >
            <input
              type="text"
              name="title"
              placeholder={
                mvpIsLocked
                  ? "Request a new added feature..."
                  : "Add a core MVP feature..."
              }
              className="flex-1 bg-transparent px-4 py-2 text-sm text-white focus:outline-none placeholder:text-[#7a849c]"
              required
              maxLength={150}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] hover:from-[#9c73f7] hover:to-[#7c3aed] text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-[#8b5cf6]/20"
            >
              <PlusSquare className="w-4 h-4" /> Add to Scope
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core MVP Bucket */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest text-[#7a849c] uppercase flex items-center gap-2 mb-4">
                🚀 Core MVP Bucket{" "}
                {mvpIsLocked && (
                  <span
                    title="MVP Scope is now Locked"
                    className="flex items-center"
                  >
                    <Lock className="w-4 h-4 text-rose-400" />
                  </span>
                )}
              </h3>
              {mvpItems.map((task) => (
                <div
                  key={task.id}
                  className="bg-gradient-to-r from-[#0e1224] to-[#13182b] border border-[#1e2338] rounded-xl p-4 transition-all hover:border-[#2a3048] relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === "completed" ? "bg-emerald-400" : task.status === "pending_client_review" ? "bg-amber-400" : "bg-[#8b5cf6]"}`}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : task.status === "pending_client_review" ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-[#8b5cf6] rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          {task.title}
                        </h4>
                        <p className="text-[10px] text-[#7a849c] uppercase tracking-wider mt-1">
                          {task.status === "pending_client_review"
                            ? "Awaiting Review in Proofs"
                            : "Active Task"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Added Features Bucket */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest text-[#7a849c] uppercase flex items-center gap-2 mb-4">
                ➕ Added Features Bucket
              </h3>
              {addedFeatureItems.length === 0 ? (
                <div className="bg-[#0e1224]/50 border border-dashed border-[#1e2338] p-6 rounded-xl flex flex-col items-center text-center">
                  <PlusSquare className="w-8 h-8 text-[#7a849c] mb-2 opacity-50" />
                  <p className="text-[#7a849c] text-xs">
                    No additional scoped features yet.
                  </p>
                </div>
              ) : (
                addedFeatureItems.map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#0e1224] border border-[#1e2338] rounded-xl p-4 transition-all hover:border-[#2a3048] relative"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : task.status === "pending_client_review" ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-[#1e2338] rounded-full" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-300">
                            {task.title}
                          </h4>
                          <p className="text-[10px] text-[#7a849c] uppercase tracking-wider mt-1">
                            {task.status === "pending_client_review"
                              ? "Awaiting Review in Proofs"
                              : "Active Task"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Infrastructure & Messages */}
        <div className="lg:col-span-1 space-y-8">
          {unreadMessagesCount > 0 && (
            <Link href={`/portal/${token}/messages`} className="block">
              <div className="bg-gradient-to-r from-[#ec4899]/10 to-[#8b5cf6]/10 border border-[#ec4899]/30 rounded-2xl p-5 flex items-center justify-between hover:bg-[#ec4899]/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MessageSquare className="text-[#ec4899] w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center animate-bounce">
                      <span className="w-2 h-2 bg-[#ec4899] rounded-full" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">
                      New Messages
                    </h3>
                    <p className="text-[#ec4899] text-xs">
                      You have {unreadMessagesCount} unread update(s)
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-[#ec4899] w-4 h-4" />
              </div>
            </Link>
          )}

          {/* Infrastructure Activity */}
          <div className="bg-[#0b0e15]/90 border border-[rgba(175,186,255,0.08)] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#e0e2ec] tracking-wide flex items-center gap-2 mb-6 uppercase">
              <GitCommit className="w-4 h-4 text-[#afbaff]" />
              Recent System Activity
            </h2>

            {recentJobs.length === 0 ? (
              <p className="text-xs text-[#7a849c] italic text-center py-4">
                No recent background operations.
              </p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#1e2338] before:to-transparent">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[#1e2338] bg-[#0b0e15] text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div
                        className={`w-2 h-2 rounded-full ${job.status === "completed" || job.status === "success" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : job.status === "failed" ? "bg-red-400" : "bg-cyan-400 animate-pulse"}`}
                      />
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-[#12151d] border border-[rgba(175,186,255,0.05)] shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[9px] text-[#7a849c]">
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recently"}
                        </span>
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${job.status === "completed" || job.status === "success" ? "bg-emerald-400/10 text-emerald-400" : job.status === "failed" ? "bg-red-400/10 text-red-400" : "bg-cyan-400/10 text-cyan-400"}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-slate-300 truncate">
                        System Build Deployment
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
