"use client";

import React, { useState } from "react";
import { saveSmtpConfig } from "../app/smtp-actions";

export default function SmtpConfigForm({
  config,
  workspaceId,
}: {
  config: any;
  workspaceId: number;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg("");

    const formData = new FormData(e.currentTarget);
    const res = await saveSmtpConfig(workspaceId, formData);

    setIsSaving(false);
    if (res.success) {
      setMsg("✓ Configuration Matrix updated cleanly.");
    } else {
      setMsg(`❌ Error: ${res.error}`);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-5 text-sm">
      <div className="bg-[var(--bg-surface)] p-5 rounded-xl space-y-4">
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            SMTP GATEWAY HOST
          </label>
          <input
            name="smtpHost"
            defaultValue={config?.smtpHost || ""}
            placeholder="smtp.gmail.com"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-outline)] px-3 py-2 rounded-lg text-theme-text font-mono focus:outline-none focus:border-pink-500"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            ACTIVE PORT VECTOR
          </label>
          <input
            name="smtpPort"
            defaultValue={config?.smtpPort || ""}
            placeholder="465"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-outline)] px-3 py-2 rounded-lg text-theme-text font-mono focus:outline-none focus:border-pink-500"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            SMTP USER AUTH
          </label>
          <input
            name="smtpUser"
            defaultValue={config?.smtpUser || ""}
            placeholder="user@gmail.com"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-outline)] px-3 py-2 rounded-lg text-theme-text font-mono focus:outline-none focus:border-pink-500"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            SMTP PASS VECTOR
          </label>
          <input
            name="smtpPass"
            type="password"
            defaultValue={config?.smtpPass ? "••••••••••••" : ""}
            placeholder="Enter Account Secret Key Token"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-outline)] px-3 py-2 rounded-lg text-theme-text font-mono focus:outline-none focus:border-pink-500"
            required
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">
            TARGET ADMIN RECEIVER
          </label>
          <input
            name="adminAlertEmail"
            defaultValue={config?.adminAlertEmail || ""}
            placeholder="kimmadoya@gmail.com"
            className="w-full bg-[var(--bg-main)] border border-[var(--border-outline)] px-3 py-2 rounded-lg text-[var(--color-theme-secondary)] font-mono focus:outline-none focus:border-pink-500"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-2 bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded-xl text-xs font-semibold transition tracking-wider"
      >
        {isSaving
          ? "MUTATING INSTANCE TOPOLOGY..."
          : "SAVE APPLICATION CONFIGURATION MATRIX"}
      </button>
      {msg && (
        <p className="text-center text-xs mt-2 font-mono text-theme-muted">
          {msg}
        </p>
      )}
    </form>
  );
}
