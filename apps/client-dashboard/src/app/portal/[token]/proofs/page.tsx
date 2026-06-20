import React from "react";
import {
  verifyPortalAccess,
  approveChecklistItemAction,
} from "../../../../app/portal-actions";
import { db, checklistItems } from "@studioflow/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Eye, CheckCircle2, Link as LinkIcon, Activity } from "lucide-react";

export default async function ProofOfProgressPage({
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

  // Fetch only items that have a proof URL attached
  const proofs = await db
    .select()
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.projectId, project.id),
        isNotNull(checklistItems.proofUrl),
      ),
    );

  const pendingProofs = proofs.filter(
    (p) => p.status === "pending_client_review",
  );
  const approvedProofs = proofs.filter((p) => p.status === "completed");

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700 mt-6 px-4 md:px-0">
      <div>
        <h1 className="text-5xl font-serif font-bold text-theme-text mb-3 tracking-tight flex items-center gap-4">
          <Activity className="w-10 h-10 text-cyan-400" /> Proof of Progress
        </h1>
        <p className="text-[var(--text-muted)] text-lg">
          Review deployed features, GitHub commits, or developer screenshots
          waiting for your final approval.
        </p>
      </div>

      {pendingProofs.length === 0 && approvedProofs.length === 0 && (
        <div className="bg-[var(--bg-main)]/50 border border-dashed border-[var(--bg-surface)] p-12 rounded-2xl flex flex-col items-center text-center">
          <Eye className="w-12 h-12 text-[var(--text-muted)] mb-4 opacity-50" />
          <h3 className="text-theme-text font-medium mb-1">
            No proofs uploaded yet
          </h3>
          <p className="text-[var(--text-muted)] text-sm max-w-md">
            When developers attach links or screenshots to completed features,
            they will appear here for you to review and approve.
          </p>
        </div>
      )}

      {pendingProofs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2 mb-4">
            Awaiting Your Approval
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingProofs.map((task) => (
              <div
                key={task.id}
                className="bg-[var(--bg-surface)] border border-amber-500/30 rounded-xl p-5 relative overflow-hidden shadow-lg"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                <h4 className="text-theme-text font-medium mb-1">{task.title}</h4>
                <p className="text-[11px] text-[var(--text-muted)] mb-4">{task.type}</p>

                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--bg-surface)]">
                  <a
                    href={task.proofUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex justify-center items-center gap-2 text-xs bg-[var(--bg-surface)] hover:bg-[#2a3048] text-theme-text py-2 px-4 rounded-lg transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> View Developer Proof
                  </a>
                  <form
                    action={async () => {
                      "use server";
                      await approveChecklistItemAction(task.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="flex-1 flex justify-center items-center gap-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-theme-text py-2 px-4 rounded-lg transition-colors font-medium shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Feature
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedProofs.length > 0 && (
        <div className="space-y-4 mt-12">
          <h3 className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase flex items-center gap-2 mb-4">
            Previously Approved
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity">
            {approvedProofs.map((task) => (
              <div
                key={task.id}
                className="bg-[var(--bg-surface)] border border-[var(--bg-surface)] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-theme-muted text-sm font-medium">
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
                      Approved
                    </span>
                  </div>
                </div>
                <a
                  href={task.proofUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--text-muted)] hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  Archive Link <LinkIcon className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
