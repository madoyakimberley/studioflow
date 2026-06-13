import React from "react";
import { verifyPortalAccess } from "../../../portal-actions";
import { db, tasks } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Download,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
} from "lucide-react";

export default async function ProjectsPage({
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

  // Fetch real data
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  // Strictly dynamic filtering based on the 'isCompleted' boolean in your schema
  const pendingTasks = projectTasks.filter((t) => !t.isCompleted);
  const completedTasks = projectTasks.filter((t) => t.isCompleted);

  // Schema only has liveUrl, removed the undefined 'domain' reference
  const liveProjectUrl = project.liveUrl;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header Section with Live Link */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-6">
        <div>
          <h1 className="text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            Project Canvas
          </h1>
          <p className="text-[#958ea0] text-lg">
            Active deliverables, milestones, and completed features.
          </p>
        </div>

        {/* Dynamic Live URL Button */}
        {liveProjectUrl && (
          <a
            href={
              liveProjectUrl.startsWith("http")
                ? liveProjectUrl
                : `https://${liveProjectUrl}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-[#0e1224] border border-[#1e2338] hover:border-[#8b5cf6]/50 px-5 py-3 rounded-xl transition-all shadow-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-[#171c30] border border-[#2a3048] flex items-center justify-center group-hover:bg-[#8b5cf6]/10 transition-colors">
              <Globe className="w-4 h-4 text-[#8b5cf6] group-hover:text-[#c084fc]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#7a849c] uppercase tracking-widest group-hover:text-cyan-400 transition-colors">
                Production Environment
              </span>
              <span className="text-sm font-medium text-white flex items-center gap-1.5">
                View Live Site
                <ExternalLink className="w-3.5 h-3.5 text-[#5c657a] group-hover:text-white transition-colors" />
              </span>
            </div>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Active Engineering */}
        <div className="space-y-6">
          <h2 className="text-2xl font-serif text-white flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[#ec4899] rounded-full shadow-[0_0_10px_#ec4899]" />
            Active Engineering
          </h2>

          {pendingTasks.length === 0 ? (
            <div className="h-[400px] border border-dashed border-[#1e2338] rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-[#0e1224]/30">
              <div className="w-16 h-16 bg-[#171c30] rounded-2xl border border-[#2a3048] flex items-center justify-center mb-6 text-[#7a849c]">
                <Clock size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg text-[#7a849c] font-serif italic mb-2">
                No active objectives
              </h3>
              <p className="text-xs text-[#5c657a] max-w-[200px] leading-relaxed">
                The engineering pipeline is currently clear. New milestones will
                appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => {
                // Since 'status' doesn't exist in your schema, all active tasks are "In Progress"
                const pillClasses =
                  "bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30";

                return (
                  <div
                    key={task.id}
                    className="bg-[#0e1224] border border-[#1e2338] p-6 rounded-2xl shadow-lg hover:border-[#2a3048] transition-colors"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span
                        className={`text-[10px] font-bold px-3 py-1 rounded-full ${pillClasses}`}
                      >
                        In Progress
                      </span>

                      {/* Since 'due' doesn't exist, we render the 'createdAt' date from the schema instead */}
                      {task.createdAt && (
                        <span className="text-xs font-medium text-[#7a849c]">
                          Added {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-serif text-white mb-2">
                      {task.title}
                    </h3>
                    <p className="text-sm text-[#7a849c] leading-relaxed mb-6">
                      {task.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#171c30] border border-[#2a3048] overflow-hidden flex-shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.id}dev`}
                          alt="Developer Avatar"
                        />
                      </div>
                      <span className="text-xs font-medium text-[#5c657a]">
                        Assigned Developer
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolved Artifacts */}
        <div className="space-y-6">
          <h2 className="text-2xl font-serif text-white flex items-center gap-3 opacity-80">
            <span className="w-1.5 h-1.5 bg-[#7a849c] rounded-full" />
            Resolved Artifacts
          </h2>

          {completedTasks.length === 0 ? (
            <div className="h-[400px] border border-dashed border-[#1e2338] rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-gradient-to-b from-transparent to-[#0e1224]/50">
              <div className="w-16 h-16 bg-[#171c30] rounded-2xl border border-[#2a3048] flex items-center justify-center mb-6 text-[#7a849c]">
                <Download size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg text-[#7a849c] font-serif italic mb-2">
                No tasks completed yet
              </h3>
              <p className="text-xs text-[#5c657a] max-w-[200px] leading-relaxed">
                Archive deliverables will appear here once they pass through the
                engineering cycle.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#0e1224]/50 border border-[#1e2338]/50 p-6 rounded-2xl flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-md font-serif text-[#7a849c] line-through decoration-[#7a849c]/50">
                      {task.title}
                    </h3>
                    <CheckCircle className="text-emerald-500/50 w-5 h-5 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-[#5c657a] line-clamp-2">
                    {task.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
