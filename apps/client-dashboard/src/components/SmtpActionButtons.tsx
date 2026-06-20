"use client";

import React, { useState } from "react";
import { testSmtpDispatch, getLiveTelemetryLogs } from "../app/smtp-actions";

export default function SmtpActionButtons({
  workspaceId,
}: {
  workspaceId: number;
}) {
  const [testing, setTesting] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [activeLogs, setActiveLogs] = useState<any[] | null>(null);

  const runTest = async () => {
    setTesting(true);
    const res = await testSmtpDispatch(workspaceId);
    setTesting(false);
    alert(
      res.success
        ? "✓ Dispatch hit network successfully! Check your configured target inbox."
        : `🚨 System Dispatch Failure: ${res.error}`,
    );
  };

  const readLogs = async () => {
    setLogLoading(true);
    const res = await getLiveTelemetryLogs(workspaceId);
    setLogLoading(false);
    if (res.success) {
      setActiveLogs(res.logs);
    } else {
      alert(`Could not pull tracking registry streams: ${res.error}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mt-8 flex gap-3">
        <button
          onClick={runTest}
          disabled={testing}
          className="flex-1 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-[var(--border-outline)] disabled:opacity-40 text-theme-text rounded-xl text-sm transition font-medium"
        >
          {testing ? "Testing Pipeline..." : "Test Dispatch"}
        </button>
        <button
          onClick={readLogs}
          disabled={logLoading}
          className="flex-1 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-[var(--border-outline)] disabled:opacity-40 text-theme-text rounded-xl text-sm transition font-medium"
        >
          {logLoading ? "Streaming..." : "View Logs"}
        </button>
      </div>

      {activeLogs && (
        <div className="bg-black/60 border border-[var(--border-outline)] rounded-xl p-4 mt-4 max-h-60 overflow-y-auto font-mono text-xs text-theme-muted space-y-2">
          <div className="flex justify-between border-b border-[var(--border-outline)] pb-2 text-[var(--text-muted)]">
            <span>TIMESTAMP</span>
            <span>STATUS</span>
          </div>
          {activeLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              No runtime log entries registered yet.
            </p>
          ) : (
            activeLogs.map((lg: any) => (
              <div
                key={lg.id}
                className="flex justify-between py-1 border-b border-white/5 last:border-0"
              >
                <span className="text-theme-muted">
                  {new Date(lg.checkedAt).toLocaleTimeString()}
                </span>
                <span className={lg.isUp ? "text-emerald-400" : "text-red-400"}>
                  {lg.isUp
                    ? `ONLINE (200)`
                    : `OUTAGE (${lg.statusCode || "ERR"})`}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
