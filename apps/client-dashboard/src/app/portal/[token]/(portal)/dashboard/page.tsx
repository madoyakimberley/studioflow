import React from "react";
import { verifyPortalAccess } from "../../../../portal-actions";
import { db } from "@studioflow/db";
import { tasks, provisioningJobs } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { notFound } from "next/navigation"; // <-- Fix 1: Import notFound

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authResult = await verifyPortalAccess(token);

  // <-- Fix 2: TypeScript Guard. This proves to TS that 'project' exists.
  if (!authResult.success || !authResult.project) {
    notFound();
  }

  const project = authResult.project;

  // 1. Fetch real tasks for the pipeline (Now TS knows project.id is safe)
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((t) => t.isCompleted).length;
  const overallProgress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // 2. Fetch recent activity (Jobs) for the Technical Pulse
  const recentJobs = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, project.id))
    .orderBy(desc(provisioningJobs.createdAt))
    .limit(4);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-[#958ea0]">
          A sophisticated overview of your project's health, timeline, and
          recent technical activities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Pipeline */}
        <div className="lg:col-span-2 bg-[#0b1326] border border-[#171f33] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white">Project Pipeline</h2>
            <span className="px-3 py-1 bg-[#9d4edd]/20 text-[#d050c2] text-xs font-semibold rounded-full border border-[#9d4edd]/30">
              {/* Fix 3: Safe string fallback before uppercase */}
              Active Phase: {String(project.status || "planning").toUpperCase()}
            </span>
          </div>

          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#dae2fd]">Overall Completion</span>
                <span className="text-white">{overallProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#171f33] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-[#e364a7] to-[#9d4edd] transition-all duration-1000"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Dynamic Task List */}
            <div className="pt-4 border-t border-[#171f33] space-y-3">
              <h3 className="text-sm font-semibold text-[#958ea0] mb-3">
                Current Objectives
              </h3>
              {projectTasks.length === 0 ? (
                <p className="text-xs text-[#958ea0]">No tasks defined yet.</p>
              ) : (
                projectTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${task.isCompleted ? "bg-[#9d4edd]" : "bg-[#171f33]"}`}
                    />
                    <span
                      className={`text-sm ${task.isCompleted ? "text-[#958ea0] line-through" : "text-[#dae2fd]"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Technical Pulse */}
        <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6">
          <h2 className="text-xl font-serif text-white mb-6 flex items-center gap-2">
            <span className="text-[#e364a7]">⑂</span> Technical Pulse
          </h2>
          <div className="space-y-6 border-l border-[#171f33] ml-2 pl-4">
            {recentJobs.length === 0 ? (
              <p className="text-sm text-[#958ea0]">
                No recent infrastructure activity.
              </p>
            ) : (
              recentJobs.map((job, i) => {
                const colors = [
                  "bg-[#9d4edd]",
                  "bg-[#e364a7]",
                  "bg-[#4361ee]",
                  "bg-cyan-400",
                ];
                const dotColor = colors[i % colors.length];

                return (
                  <div key={job.id} className="relative">
                    <div
                      className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ${dotColor}`}
                    />
                    <p className="text-xs text-[#958ea0] mb-1">
                      {job.createdAt
                        ? formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })
                        : "Recently"}
                    </p>
                    <p className="text-sm text-[#dae2fd]">
                      Job #{job.id} Status:{" "}
                      <span className="capitalize">{job.status}</span>
                    </p>
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
