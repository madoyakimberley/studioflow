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
      className="lilac-pink-btn px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold mt-6 md:mt-0"
    >
      <span className="material-symbols-outlined">download</span>
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
    <div className="glass-card rounded-2xl p-8 group relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">StudioFlow CLI</h3>
          <p className="text-sm text-[#94a3b8] mt-1 max-w-sm">
            Install the global daemon to provision architectures and sync
            environments directly from your local terminal.
          </p>
        </div>
        <span className="material-symbols-outlined text-[#d3d7ff] text-3xl">
          terminal
        </span>
      </div>

      <div className="bg-black/40 border border-[#32353d] rounded-xl p-4 flex justify-between items-center group-hover:border-[#5a617a] transition-colors">
        <code className="text-[#e8b3ff] text-sm font-mono">
          {installCommand}
        </code>
        <button
          onClick={handleCopy}
          className="text-[#94a3b8] hover:text-white transition p-2 rounded-lg hover:bg-white/10 flex items-center justify-center"
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
