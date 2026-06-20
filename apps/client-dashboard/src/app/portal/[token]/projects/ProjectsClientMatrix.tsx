"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getLiveProjectStatus } from "../../../portal-actions";
import {
  Download,
  CheckCircle,
  ExternalLink,
  Globe,
  GitPullRequest,
  AlertCircle,
  Activity,
  Terminal,
  UserCheck,
  Radio,
  RefreshCw,
} from "lucide-react";

interface LiveDataPayload {
  project: any;
  checklist: any[]; // FIXED: Was 'tasks'
  requests: any[];
  activeJob: any;
  presence: any;
  nodeStatus: any;
}

interface ProjectsClientMatrixProps {
  projectId: number;
  liveUrl: string | null;
  initialData: LiveDataPayload;
}

export default function ProjectsClientMatrix({
  projectId,
  liveUrl,
  initialData,
}: ProjectsClientMatrixProps) {
  const [data, setData] = useState<LiveDataPayload>(initialData);
  const [isSyncing, setIsSyncing] = useState(false);

  // Background Polling Engine
  useEffect(() => {
    const syncPipeline = async () => {
      setIsSyncing(true);
      const res = await getLiveProjectStatus(projectId);
      if (res.success && res.data) {
        setData(res.data);
      }
      setIsSyncing(false);
    };

    const heartbeat = setInterval(syncPipeline, 4000); // 4-second real-time sweep
    return () => clearInterval(heartbeat);
  }, [projectId]);

  const triggerManualSync = async () => {
    setIsSyncing(true);
    const res = await getLiveProjectStatus(projectId);
    if (res.success && res.data) {
      setData(res.data);
      toast.success("Matrix synchronized successfully.", {
        icon: "🔄",
        style: {
          background: "var(--bg-surface)",
          color: "var(--color-theme-secondary)",
          border: "1px solid rgba(210,167,255,0.2)",
        },
      });
    }
    setIsSyncing(false);
  };

  const { project, checklist, requests, activeJob, presence, nodeStatus } =
    data;

  // FIXED: Using checklist and checking string status instead of isCompleted boolean
  const pendingTasks = checklist
    ? checklist.filter((t) => t.status !== "completed")
    : [];
  const completedTasks = checklist
    ? checklist.filter((t) => t.status === "completed")
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* HEADER MATRIX */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-5xl font-serif font-bold text-theme-text tracking-tight">
              Project Matrix
            </h1>
            <button
              onClick={triggerManualSync}
              className="mt-2 p-2 rounded-full hover:bg-[rgba(175,186,255,0.1)] transition-colors group"
              title="Force Database Sync"
            >
              <RefreshCw
                className={`w-4 h-4 text-[var(--color-theme-primary)] ${isSyncing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
              />
            </button>
          </div>
          <p className="text-[var(--text-muted)] text-lg">
            Live pipeline tracking, engineering milestones, and your requests.
          </p>
        </div>

        {liveUrl && (
          <a
            href={liveUrl.startsWith("http") ? liveUrl : `https://${liveUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-[var(--bg-main)] border border-[var(--bg-surface)] hover:border-[var(--color-theme-primary)]/50 px-5 py-3 rounded-xl transition-all shadow-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[#2a3048] flex items-center justify-center group-hover:bg-[var(--color-theme-primary)]/10 transition-colors relative overflow-hidden">
              <span className="absolute inset-0 bg-[var(--color-theme-primary)]/20 animate-pulse" />
              <Globe className="w-4 h-4 text-[var(--color-theme-primary)] group-hover:text-[var(--color-theme-secondary)] relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />{" "}
                Production Environment
              </span>
              <span className="text-sm font-medium text-theme-text flex items-center gap-1.5">
                View Live Site
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-theme-text transition-colors" />
              </span>
            </div>
          </a>
        )}
      </div>

      {/* ROW 1: LIVE HEALTH STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-surface)]/90 border border-[rgba(175,186,255,0.08)] rounded-xl p-5 shadow-lg">
          <span className="text-xs text-theme-muted flex items-center gap-2 mb-3 font-semibold uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-[var(--color-theme-secondary)]" />
            Developer Status
          </span>
          <span
            className={`inline-flex text-xs px-3 py-1 rounded-full font-mono font-bold ${
              presence?.adminTyping
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-slate-800 text-theme-muted border border-slate-700"
            }`}
          >
            {presence?.adminTyping ? "● Active in Workspace" : "Offline / Idle"}
          </span>
        </div>

        <div className="bg-[var(--bg-surface)]/90 border border-[rgba(175,186,255,0.08)] rounded-xl p-5 shadow-lg">
          <span className="text-xs text-theme-muted flex items-center gap-2 mb-3 font-semibold uppercase tracking-wider">
            <Radio className="w-4 h-4 text-cyan-400" />
            Node Connection
          </span>
          <span
            className={`inline-flex text-xs px-3 py-1 rounded-full font-mono font-bold ${
              nodeStatus?.isUp
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {nodeStatus?.isUp
              ? `ONLINE (${nodeStatus.responseTimeMs}ms ping)`
              : "Provisioning..."}
          </span>
        </div>

        <div className="bg-[var(--bg-surface)]/90 border border-[rgba(175,186,255,0.08)] rounded-xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              Build Progress
            </span>
            <span className="text-lg font-bold text-theme-text tracking-tight">
              {project?.progressPercentage || 0}%
            </span>
          </div>
          <div className="w-full bg-[#161a23] h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] transition-all duration-1000 ease-out"
              style={{ width: `${project?.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ROW 2: CLIENT REQUESTS */}
      <div className="space-y-6">
        <h2 className="text-2xl font-serif text-theme-text flex items-center gap-3">
          <GitPullRequest className="w-6 h-6 text-[var(--color-theme-secondary)]" />
          Your Requests
        </h2>

        {requests.length === 0 ? (
          <div className="bg-[var(--bg-main)]/50 border border-dashed border-[var(--bg-surface)] rounded-2xl p-8 flex items-center gap-4 text-[var(--text-muted)]">
            <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[#2a3048]">
              <AlertCircle className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                No requests submitted.
              </p>
              <p className="text-xs">
                Use the sidebar to request new features or design changes.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-gradient-to-br from-[var(--bg-main)] to-[#0a0d18] border border-[var(--bg-surface)] p-5 rounded-2xl hover:border-[var(--color-theme-primary)]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        req.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : req.status === "in_progress"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {req.status?.replace("_", " ") || "Pending"}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-theme-text mb-2 line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {req.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-[var(--bg-surface)]" />

      {/* ROW 3: AUTOMATION & PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Engineering */}
        <div className="space-y-6 lg:col-span-1">
          <h2 className="text-xl font-serif text-theme-text flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-theme-secondary)]" />
            Pipeline
          </h2>
          {pendingTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--bg-surface)] rounded-2xl flex flex-col items-center text-center p-6 bg-[var(--bg-main)]/30">
              <span className="text-sm text-[var(--text-muted)] font-serif italic">
                No active objectives
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[var(--bg-main)] border border-[var(--bg-surface)] p-4 rounded-xl shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-theme-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-secondary)] border border-[var(--color-theme-primary)]/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[var(--color-theme-secondary)] rounded-full animate-pulse" />{" "}
                      Active
                    </span>
                  </div>
                  <h3 className="text-sm font-serif text-theme-text mb-1">
                    {task.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {task.type} Scope{" "}
                    {/* Replaced non-existent description with MVP Type */}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolved Deliverables */}
        <div className="space-y-6 lg:col-span-1">
          <h2 className="text-xl font-serif text-theme-text flex items-center gap-2 opacity-80">
            <Download className="w-5 h-5 text-[var(--text-muted)]" />
            Resolved
          </h2>
          {completedTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--bg-surface)] rounded-2xl flex flex-col items-center text-center p-6 bg-gradient-to-b from-transparent to-[var(--bg-main)]/50">
              <span className="text-sm text-[var(--text-muted)] font-serif italic">
                Awaiting completion
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[var(--bg-main)]/30 border border-[var(--bg-surface)]/40 p-3 rounded-xl flex items-start gap-3"
                >
                  <CheckCircle className="text-emerald-500/50 w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-medium text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/30">
                      {task.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Terminal */}
        <div className="space-y-6 lg:col-span-1 flex flex-col h-full">
          <h2 className="text-xl font-serif text-theme-text flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Live Logs
          </h2>
          <div className="flex-grow bg-[#05070c] rounded-xl border border-slate-900 p-4 font-mono text-[10px] leading-relaxed flex flex-col justify-between min-h-[250px] shadow-inner">
            <div className="space-y-2 text-theme-muted max-h-[180px] overflow-y-auto scrollbar-thin">
              {activeJob ? (
                <>
                  <div className="text-cyan-400/90 flex items-center justify-between">
                    <span>$ job --id={activeJob.id}</span>
                    <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 rounded font-sans font-bold">
                      {activeJob.status}
                    </span>
                  </div>
                  <div className="text-theme-muted bg-black/40 p-2 rounded border border-slate-900 whitespace-pre-wrap line-clamp-6">
                    {activeJob.executionLogs || "Awaiting stream buffers..."}
                  </div>
                </>
              ) : (
                <div className="text-slate-600 italic">
                  No automated builds running.
                </div>
              )}
            </div>
            <div className="border-t border-slate-900/60 pt-2 mt-2 flex items-center justify-between text-[9px] text-slate-500">
              <span>CONSOLE: READY</span>
              <span className="animate-pulse text-cyan-400">
                ● STREAM ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
