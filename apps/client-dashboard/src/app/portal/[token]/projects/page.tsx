import React from "react";
import { verifyPortalAccess } from "../../../portal-actions";
import { db } from "@studioflow/db";
import { tasks } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { CheckCircle2, Circle } from "lucide-react";
import { notFound } from "next/navigation"; // <-- 1. Import notFound

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authResult = await verifyPortalAccess(token);

  // <-- 2. Add the TypeScript Guard
  if (!authResult.success || !authResult.project) {
    notFound();
  }

  const project = authResult.project;

  // Now TypeScript is happy because it knows project.id absolutely exists
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const pendingTasks = projectTasks.filter((t) => !t.isCompleted);
  const completedTasks = projectTasks.filter((t) => t.isCompleted);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Project Canvas
        </h1>
        <p className="text-[#958ea0]">
          Active deliverables, milestones, and completed features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Tasks */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#e364a7] uppercase tracking-wider mb-4 border-b border-[#171f33] pb-2">
            Active Engineering
          </h2>
          {pendingTasks.length === 0 && (
            <p className="text-[#958ea0] text-sm">All tasks are completed.</p>
          )}
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#0b1326] border border-[#212d4a] p-4 rounded-xl flex items-start gap-3 shadow-lg"
            >
              <Circle className="w-5 h-5 text-[#4361ee] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-[#958ea0] mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completed Tasks */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#9d4edd] uppercase tracking-wider mb-4 border-b border-[#171f33] pb-2">
            Resolved Artifacts
          </h2>
          {completedTasks.length === 0 && (
            <p className="text-[#958ea0] text-sm">No tasks completed yet.</p>
          )}
          {completedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#0b1326]/50 border border-[#171f33] p-4 rounded-xl flex items-start gap-3 opacity-70"
            >
              <CheckCircle2 className="w-5 h-5 text-[#9d4edd] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[#dae2fd] font-medium line-through">
                  {task.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
