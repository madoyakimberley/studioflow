"use client";

import React from "react";
import { toast } from "sonner"; // Assuming you have sonner installed for toasts

export function DownloadEnvButton() {
  const handleDownloadEnv = () => {
    const envContent = `# =============================================
# STUDIOFLOW GLOBAL ENVIRONMENT CONFIG
# Generated on ${new Date().toISOString()}
# =============================================

# === DATABASE & CACHE ===
DATABASE_URL="mysql://user:password@localhost:3306/studioflow"
REDIS_URL="redis://localhost:6379"

# === VERSION CONTROL ===
GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# === DEPLOYMENT PLATFORMS ===
RENDER_API_KEY="rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VERCEL_TOKEN="vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RAILWAY_TOKEN=""

# === NOTIFICATIONS / SMTP ===
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
ADMIN_ALERT_EMAIL="kimmadoya@gmail.com"

# === FILE UPLOADS ===
UPLOADTHING_SECRET="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# === OTHER ===
TARGET_OUTPUT_DIR="~/StudioFlow/projects"
`;

    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Global .env file downloaded!");
  };

  return (
    <button
      onClick={handleDownloadEnv}
      className="bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] px-6 py-3 rounded-2xl flex items-center gap-2 text-[13px] tracking-wider uppercase font-bold mt-6 md:mt-0 text-[var(--color-theme-on-primary)] transition-all hover:opacity-90 shadow-[0_0_15px_color-mix(in_srgb,var(--color-theme-outline)_20%,transparent)] font-['Plus_Jakarta_Sans',_sans-serif]"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Download .env
    </button>
  );
}

export function CliSetupCard() {
  const installCommand = "npm install -g studioflow-cli";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    toast.success("CLI install command copied to clipboard!");
  };

  return (
    <div className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-xl rounded-2xl p-8 group relative overflow-hidden font-['Plus_Jakarta_Sans',_sans-serif]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-theme-text)]">
            StudioFlow CLI
          </h3>
          <p className="text-sm text-[var(--color-theme-muted)] mt-1 max-w-sm leading-relaxed">
            Install the global daemon to provision architectures and sync
            environments directly from your local terminal.
          </p>
        </div>
        <span className="material-symbols-outlined text-[var(--color-theme-primary)] text-3xl">
          terminal
        </span>
      </div>

      <div className="bg-[var(--color-theme-bg)]/50 border border-[var(--color-theme-outline)]/20 rounded-xl p-4 flex justify-between items-center group-hover:border-[var(--color-theme-primary)]/40 transition-colors">
        <code className="text-[var(--color-theme-primary)] text-sm font-['JetBrains_Mono',_monospace] font-bold">
          {installCommand}
        </code>
        <button
          onClick={handleCopy}
          className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] transition p-2 rounded-lg hover:bg-[var(--color-theme-surface)]/50 flex items-center justify-center border border-transparent hover:border-[var(--color-theme-outline)]/20"
          title="Copy to clipboard"
        >
          <span className="material-symbols-outlined text-[18px]">
            content_copy
          </span>
        </button>
      </div>
    </div>
  );
}
