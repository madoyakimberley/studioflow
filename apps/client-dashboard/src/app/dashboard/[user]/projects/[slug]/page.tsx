import React from "react";
import Link from "next/link";
import { db, projects, tasks, provisioningJobs } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Code,
  LayoutList,
  TerminalSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailScreen({
  params,
}: {
  params: Promise<{ slug: string; user: string }>;
}) {
  const { slug, user } = await params;

  const projectData = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (!projectData.length) return notFound();
  const project = projectData[0];

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const recentJobs = await db
    .select()
    .from(provisioningJobs)
    .where(eq(provisioningJobs.projectId, project.id))
    .orderBy(desc(provisioningJobs.createdAt))
    .limit(3);

  const completedTasks = projectTasks.filter((t) => t.isCompleted).length;
  const taskProgress =
    projectTasks.length > 0
      ? Math.round((completedTasks / projectTasks.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <Link
            href={`/dashboard/${user}/projects`}
            className="inline-flex items-center gap-2 text-xs text-[#948f9a] hover:text-[#adc6ff] mb-4 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Return to Systems
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-5xl font-black font-['Playfair_Display',_serif] text-white">
                {project.name}
              </h1>
              <p className="text-sm text-[#a078ff] mt-2 font-mono tracking-wider">
                NAMESPACE: apps/{project.slug}
              </p>
            </div>
            <div className="flex gap-3">
              {project.githubRepo && (
                <a
                  href={project.githubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#131b2e] border border-[#2d3449] rounded-xl text-xs hover:bg-[#222a3e] transition"
                >
                  <Code className="w-4 h-4" /> Source Array
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#e364a7] to-[#a078ff] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#a078ff]/20 hover:brightness-110 transition"
                >
                  <ExternalLink className="w-4 h-4" /> Live Node
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 border-b border-[#171f33] pb-4 mb-4">
                <LayoutList className="w-5 h-5 text-[#adc6ff]" />
                <h2 className="text-lg font-bold font-['Playfair_Display',_serif] text-white">
                  Execution Kanban
                </h2>
              </div>
              <div className="space-y-3">
                {projectTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs border border-dashed border-[#171f33] rounded-xl text-[#948f9a]">
                    No directives scheduled in current sprint.
                  </div>
                ) : (
                  projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-4 p-4 bg-[#131b2e] border border-[#2d3449] rounded-xl"
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border ${task.isCompleted ? "bg-[#a078ff] border-[#a078ff]" : "border-[#49454f] bg-[#060d20]"}`}
                      />
                      <div>
                        <div
                          className={`text-sm font-bold ${task.isCompleted ? "text-[#948f9a] line-through" : "text-white"}`}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-[#cac4d0] mt-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center gap-3 border-b border-[#171f33] pb-4 mb-4">
                <TerminalSquare className="w-5 h-5 text-[#e364a7]" />
                <h2 className="text-lg font-bold font-['Playfair_Display',_serif] text-white">
                  Build & Provisioning Logs
                </h2>
              </div>
              <div className="bg-[#060e20] p-4 rounded-xl border border-[#171f33] font-mono text-[11px] text-[#adc6ff] max-h-64 overflow-y-auto space-y-4">
                {recentJobs.length === 0
                  ? "> No pipeline execution data found..."
                  : recentJobs.map((job) => (
                      <div key={job.id}>
                        <div className="text-[#a078ff] mb-1">
                          === JOB #{job.id} | STATUS:{" "}
                          {(job.status || "UNKNOWN").toUpperCase()} |{" "}
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleString()
                            : "N/A"}{" "}
                          ===
                        </div>
                        <pre className="whitespace-pre-wrap">
                          {job.executionLogs ||
                            "No specific terminal output captured."}
                        </pre>
                      </div>
                    ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#e364a7] opacity-10 blur-[50px] rounded-full" />
              <h3 className="text-sm font-mono text-[#948f9a] mb-2 uppercase tracking-widest">
                Global Progress
              </h3>
              <div className="text-5xl font-black font-mono text-white mb-4">
                {taskProgress}%
              </div>
              <div className="w-full bg-[#060d20] h-2 rounded-full overflow-hidden border border-[#171f33]">
                <div
                  className="h-full bg-gradient-to-r from-[#adc6ff] to-[#a078ff]"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
            </div>

            <div className="bg-[#0b1326] border border-[#171f33] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-[#adc6ff]" />
                <h3 className="text-sm font-bold tracking-wide">
                  Security Matrix
                </h3>
              </div>
              <ul className="space-y-4 text-xs font-mono">
                <li className="flex justify-between items-center border-b border-[#171f33] pb-2">
                  <span className="text-[#cac4d0]">SSL/TLS Status</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    VERIFIED
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-[#171f33] pb-2">
                  <span className="text-[#cac4d0]">Environment Variables</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    SECURE
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[#cac4d0]">Database Policy (RLS)</span>
                  <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                    PENDING
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
