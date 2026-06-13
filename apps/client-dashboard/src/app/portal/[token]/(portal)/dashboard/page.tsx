import React from "react";
import { verifyPortalAccess } from "../../../../portal-actions";
import { db, tasks, provisioningJobs, portalMessages } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Rocket,
  BadgeCheck,
  MessageSquareWarning,
  CloudUpload,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

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

  // 1. Fetch Real Data
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const recentJobs = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, project.id))
    .orderBy(desc(provisioningJobs.createdAt))
    .limit(5);

  const projectMessages = await db
    .select()
    .from(portalMessages)
    .where(eq(portalMessages.projectId, project.id));

  // 2. Compute Dynamic Metrics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.isCompleted);
  const activeTasks = projectTasks.filter((t) => !t.isCompleted);
  const overallProgress =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks.length / totalTasks) * 100);

  // Calculate job success rate based on recent jobs
  const successfulJobs = recentJobs.filter(
    (j) => j.status === "success" || j.status === "completed",
  ).length;
  const jobSuccessRate =
    recentJobs.length === 0
      ? 100
      : Math.round((successfulJobs / recentJobs.length) * 100);

  // Determine global system health from the latest job
  const latestJob = recentJobs[0];
  const isSystemHealthy = !latestJob || latestJob.status !== "failed";

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-5xl font-serif font-bold text-white mb-3 tracking-tight">
          Overview
        </h1>
        <p className="text-[#958ea0] text-lg">
          Monitor your creative ecosystem and technical pulse.
        </p>
      </div>

      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Active Tasks
            </h3>
            <Rocket className="text-[#8b5cf6] w-5 h-5" />
          </div>
          <div>
            <div className="text-4xl font-serif text-white mb-2">
              {activeTasks.length.toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <span className="text-lg leading-none mb-1">↗</span> Pipeline
              moving
            </p>
          </div>
        </div>

        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Overall Progress
            </h3>
            <BadgeCheck className="text-[#ec4899] w-5 h-5" />
          </div>
          <div>
            <div className="text-4xl font-serif text-white mb-2">
              {overallProgress}%
            </div>
            <p className="text-xs text-[#ec4899] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {completedTasks.length}{" "}
              objectives met
            </p>
          </div>
        </div>

        <div className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold tracking-widest text-[#7a849c] uppercase">
              Communication
            </h3>
            <MessageSquareWarning className="text-[#8b5cf6] w-5 h-5" />
          </div>
          <div>
            <div className="text-4xl font-serif text-white mb-2">
              {projectMessages.length.toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-[#8b5cf6] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-2 border-[#8b5cf6]" />{" "}
              Total threads
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Dynamic Project Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-serif text-white">Project Pipeline</h2>
            <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest bg-[#8b5cf6]/10 px-3 py-1 rounded-full">
              {project.status || "In Progress"}
            </span>
          </div>

          <div className="space-y-4">
            {projectTasks.length === 0 ? (
              <p className="text-[#7a849c] text-sm bg-[#0e1224] border border-[#1e2338] p-6 rounded-2xl">
                No tasks have been scheduled for this project yet.
              </p>
            ) : (
              projectTasks.slice(0, 4).map((task, i) => {
                const isActive = !task.isCompleted;
                // Alternate UI styles purely for visual hierarchy if there are multiple active tasks
                const useNeonStyle = isActive && i % 2 === 0;

                return (
                  <div
                    key={task.id}
                    className="bg-[#0e1224] border border-[#1e2338] rounded-2xl p-6 transition-all hover:border-[#2a3048]"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#171c30] rounded-xl flex items-center justify-center border border-[#2a3048]">
                          {isActive ? (
                            <div className="w-5 h-5 border-2 border-[#7a849c] rounded-full grid grid-cols-2 gap-0.5 p-[1px]">
                              <div className="bg-[#7a849c] rounded-sm"></div>
                              <div className="bg-[#7a849c] rounded-sm"></div>
                              <div className="bg-[#7a849c] rounded-sm"></div>
                              <div className="bg-[#7a849c] rounded-sm"></div>
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-[#ec4899]/20 flex items-center justify-center rounded">
                              <div className="w-3 h-2 border-[1.5px] border-[#ec4899] rounded-[2px]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-serif text-white">
                            {task.title}
                          </h3>
                          <p className="text-xs text-[#7a849c] mt-0.5 truncate max-w-[250px]">
                            {task.description || "Engineering phase"}
                          </p>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="bg-[#8b5cf6]/20 text-[#c084fc] text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border border-[#8b5cf6]/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#c084fc] rounded-full animate-pulse" />{" "}
                          In Progress
                        </span>
                      ) : (
                        <span className="bg-[#171c30] text-[#7a849c] text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border border-[#2a3048]">
                          Completed
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="h-1.5 w-full bg-[#171c30] rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${isActive ? (useNeonStyle ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899]" : "bg-[#3b82f6]") : "bg-emerald-400"}`}
                          style={{ width: isActive ? "65%" : "100%" }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-[#7a849c] uppercase tracking-wider">
                        <span>
                          {isActive ? "Active Development" : "Resolved"}
                        </span>
                        <span
                          className={
                            isActive ? "text-white" : "text-emerald-400"
                          }
                        >
                          {isActive ? "65% Complete" : "100% Complete"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
