"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Database,
  Code,
  Cloud,
  FolderSync,
  Terminal,
  Save,
  Loader2,
  Key,
  User,
  Monitor,
  Server,
  Cpu,
  Globe,
  FolderSearch,
  Download,
  CheckCircle,
  ArrowRight,
  Copy,
} from "lucide-react";
import { saveWorkspaceEnvironment } from "../../environment-actions";
import { toast } from "sonner";

function EnvironmentSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUser = searchParams.get("user") || "admin";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [cliDownloaded, setCliDownloaded] = useState(false);

  // Hardcoded for current multi-tenant session context
  const currentWorkspaceId = 1;

  const [formData, setFormData] = useState({
    databaseUrl: "",
    targetOutputDir: "~/StudioFlow/projects",
    githubToken: "",
    deploymentProvider: "none",
    deploymentApiKey: "",
    deploymentOwnerId: "",
    redisUrl: "",
  });

  const handleUpdate = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrowseClick = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        // Use modern File System Access API to spawn native OS folder picker
        const dirHandle = await (window as any).showDirectoryPicker();
        handleUpdate("targetOutputDir", `~/${dirHandle.name}`);
        toast.success(
          `Target mapped to folder: ${dirHandle.name}. Ensure absolute paths if running daemon outside root.`,
        );
      } else {
        toast.info(
          "Browser security sandboxes prevent web apps from extracting absolute folder paths. To get your path easily, select the folder in Finder and press ⌥ + ⌘ + C, then paste it here.",
          { duration: 8000 },
        );
      }
    } catch (err) {
      console.log("Directory selection aborted.");
    }
  };

  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };

  const downloadGlobalEnv = () => {
    let envContentString = `# =========================================================================\n`;
    envContentString += `# STUDIOFLOW GLOBAL DAEMON ENVIRONMENT HQ\n`;
    envContentString += `# Place this file in: ${formData.targetOutputDir}\n`;
    envContentString += `# =========================================================================\n\n`;

    envContentString += `DATABASE_URL="${formData.databaseUrl}"\n`;
    if (formData.redisUrl)
      envContentString += `REDIS_URL="${formData.redisUrl}"\n`;
    if (formData.githubToken)
      envContentString += `GITHUB_PAT="${formData.githubToken}"\n`;

    if (formData.deploymentProvider !== "none") {
      envContentString += `RENDER_API_KEY="${formData.deploymentApiKey}"\n`;
      envContentString += `RENDER_OWNER_ID="${formData.deploymentOwnerId}"\n`;
    }

    envContentString += `TARGET_OUTPUT_DIR="${formData.targetOutputDir}"\n`;

    const memoryBlobFilePayload = new Blob([envContentString], {
      type: "text/plain;charset=utf-8;",
    });
    const localVirtualDomDownloadAnchor = document.createElement("a");
    const browserUrlMappingReference = URL.createObjectURL(
      memoryBlobFilePayload,
    );

    localVirtualDomDownloadAnchor.href = browserUrlMappingReference;
    localVirtualDomDownloadAnchor.setAttribute("download", ".env");
    document.body.appendChild(localVirtualDomDownloadAnchor);
    localVirtualDomDownloadAnchor.click();

    document.body.removeChild(localVirtualDomDownloadAnchor);
    URL.revokeObjectURL(browserUrlMappingReference);

    toast.success("Global Vault Manifest Downloaded!");
  };

  const handleSetupCli = () => {
    downloadGlobalEnv();
    setCliDownloaded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await saveWorkspaceEnvironment({
      workspaceId: currentWorkspaceId,
      ...formData,
    });

    if (res.success) {
      setSetupComplete(true);
      setIsSubmitting(false);
    } else {
      toast.error(res.message);
      setIsSubmitting(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-[#030712] font-sans text-slate-300 flex justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#dac5ff]/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-[#070b14] border border-[#161f33] rounded-xl shadow-2xl overflow-hidden p-8 space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-serif text-white tracking-wide">
              Environment Saved & Locked
            </h1>
            <p className="text-sm text-slate-400 font-mono">
              Your database and cloud nodes are ready. Follow these final steps
              to link your local machine.
            </p>
          </div>

          <div className="bg-[#0b101d] border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Step 1: Download */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  1
                </span>
                Download Your Keys
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Download the master `.env` file generated from your inputs.
              </p>
              <div className="pl-7 pt-2">
                <button
                  onClick={downloadGlobalEnv}
                  className="bg-[#161f33] hover:bg-[#1c2842] border border-slate-700 text-white text-xs font-mono py-2 px-4 rounded-lg transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download .env File
                </button>
              </div>
            </div>

            {/* Step 2: Placement */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  2
                </span>
                Place it in Headquarters
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Move the downloaded `.env` file into your chosen target
                directory:
              </p>
              <div className="pl-7 relative">
                <div className="bg-black border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                  <code className="text-cyan-400 text-[11px] font-mono">
                    {formData.targetOutputDir || "~/StudioFlow/projects"}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        formData.targetOutputDir || "~/StudioFlow/projects",
                        "Directory path copied!",
                      )
                    }
                    className="text-slate-500 hover:text-white transition"
                    title="Copy path"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Install CLI */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  3
                </span>
                Install the StudioFlow CLI
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Run this command in your terminal to install the engine globally
                on your machine.
              </p>
              <div className="pl-7 relative">
                <div className="bg-black border border-slate-800 rounded-lg p-3 flex justify-between items-center group">
                  <code className="text-fuchsia-400 text-[11px] font-mono">
                    npm install -g studioflow-cli
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "npm install -g studioflow-cli",
                        "Install command copied!",
                      )
                    }
                    className="text-slate-500 hover:text-white transition"
                    title="Copy install command"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Boot */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  4
                </span>
                Boot the Engine
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Navigate to your headquarters and start the provisioning daemon.
              </p>
              <div className="pl-7 relative">
                <div className="bg-black border border-slate-800 rounded-lg p-3 flex justify-between items-start group">
                  <code className="text-emerald-400 text-[11px] font-mono leading-relaxed">
                    cd {formData.targetOutputDir || "~/StudioFlow/projects"}{" "}
                    <br />
                    studioflow
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `cd ${formData.targetOutputDir || "~/StudioFlow/projects"} && studioflow`,
                        "Boot command copied!",
                      )
                    }
                    className="text-slate-500 hover:text-white transition mt-1"
                    title="Copy boot command"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/dashboard/${targetUser}`)}
            className="w-full bg-[#dac5ff] hover:bg-[#cbb1fb] text-[#030712] text-sm font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-[#dac5ff]/10"
          >
            I've Completed These Steps <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] font-sans text-slate-300 flex justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#dac5ff]/30">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#070b14] border border-[#161f33] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-8 border-b border-slate-900/80">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-[#dac5ff] flex items-center justify-center shadow-lg shadow-[#dac5ff]/10">
              <Terminal className="w-6 h-6 text-[#030712]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-white tracking-wide">
                Environment Architecture Setup
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1 tracking-tight">
                Configure your workspace pipeline connections.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-12">
          {/* SECTION: Local Execution */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <FolderSync className="w-4 h-4" /> CLI Target Output
            </h2>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">
                Local Scaffolding Directory
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formData.targetOutputDir}
                  onChange={(e) =>
                    handleUpdate("targetOutputDir", e.target.value)
                  }
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="/Users/username/Sites/work"
                />
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-[#121526] border border-[#161f33] hover:border-slate-500 rounded-lg text-xs font-mono text-slate-300 transition flex items-center gap-2 whitespace-nowrap"
                >
                  <FolderSearch className="w-4 h-4" /> Browse
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 font-mono">
                Where the CLI will generate your new application codebases
                locally.
              </p>
            </div>
          </section>

          {/* SECTION: Databases */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <Database className="w-4 h-4" /> Primary Datastores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  Primary DB Connection String (URL)
                </label>
                <input
                  type="password"
                  required
                  value={formData.databaseUrl}
                  onChange={(e) => handleUpdate("databaseUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="mysql://user:pass@host:3306/db"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  Redis URL (Optional for PubSub)
                </label>
                <input
                  type="password"
                  value={formData.redisUrl}
                  onChange={(e) => handleUpdate("redisUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="redis://127.0.0.1:6379"
                />
              </div>
            </div>
          </section>

          {/* SECTION: Version Control */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <Code className="w-4 h-4" /> Version Control Gateway
            </h2>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={formData.githubToken}
                onChange={(e) => handleUpdate("githubToken", e.target.value)}
                className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-[10px] text-slate-600 mt-2 font-mono">
                Required for the CLI to automatically create private repos and
                push initial commits.
              </p>
            </div>
          </section>

          {/* SECTION: Cloud Deployment (Card Selection replacing Dropdown) */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-white uppercase flex items-center gap-2">
              <Cloud className="w-4 h-4" /> Automated Cloud Target
            </h2>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-4">
                Deployment Platform
              </label>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Local Card */}
                <div
                  onClick={() => handleUpdate("deploymentProvider", "none")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "none"
                      ? "border-[#dac5ff] bg-[#121526]"
                      : "border-[#161f33] bg-[#0a0f1d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Monitor
                      className={`w-5 h-5 ${formData.deploymentProvider === "none" ? "text-[#dac5ff]" : "text-slate-400"}`}
                    />
                    {formData.deploymentProvider === "none" && (
                      <div className="w-3 h-3 rounded-full border-2 border-[#dac5ff] bg-[#dac5ff]/20 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#dac5ff] rounded-full" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 font-mono">
                    Local Only
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    No Cloud Config
                  </p>
                </div>

                {/* Render Card */}
                <div
                  onClick={() => handleUpdate("deploymentProvider", "render")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "render"
                      ? "border-[#dac5ff] bg-[#121526]"
                      : "border-[#161f33] bg-[#0a0f1d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Server
                      className={`w-5 h-5 ${formData.deploymentProvider === "render" ? "text-[#dac5ff]" : "text-slate-400"}`}
                    />
                    {formData.deploymentProvider === "render" && (
                      <div className="w-3 h-3 rounded-full border-2 border-[#dac5ff] bg-[#dac5ff]/20 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#dac5ff] rounded-full" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 font-mono">
                    Render API
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Managed Pipeline
                  </p>
                </div>

                {/* Railway Card */}
                <div
                  onClick={() => handleUpdate("deploymentProvider", "railway")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "railway"
                      ? "border-[#dac5ff] bg-[#121526]"
                      : "border-[#161f33] bg-[#0a0f1d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Cpu
                      className={`w-5 h-5 ${formData.deploymentProvider === "railway" ? "text-[#dac5ff]" : "text-slate-400"}`}
                    />
                    {formData.deploymentProvider === "railway" && (
                      <div className="w-3 h-3 rounded-full border-2 border-[#dac5ff] bg-[#dac5ff]/20 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#dac5ff] rounded-full" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 font-mono">
                    Railway
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Serverless Engine
                  </p>
                </div>

                {/* Vercel Card */}
                <div
                  onClick={() => handleUpdate("deploymentProvider", "vercel")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "vercel"
                      ? "border-[#dac5ff] bg-[#121526]"
                      : "border-[#161f33] bg-[#0a0f1d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Globe
                      className={`w-5 h-5 ${formData.deploymentProvider === "vercel" ? "text-[#dac5ff]" : "text-slate-400"}`}
                    />
                    {formData.deploymentProvider === "vercel" && (
                      <div className="w-3 h-3 rounded-full border-2 border-[#dac5ff] bg-[#dac5ff]/20 flex items-center justify-center">
                        <div className="w-1 h-1 bg-[#dac5ff] rounded-full" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 font-mono">
                    Vercel
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Edge Network
                  </p>
                </div>
              </div>
            </div>

            {formData.deploymentProvider !== "none" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
              >
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-500" /> API Key
                  </label>
                  <input
                    type="password"
                    value={formData.deploymentApiKey}
                    onChange={(e) =>
                      handleUpdate("deploymentApiKey", e.target.value)
                    }
                    className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                    placeholder="rnd_xxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Owner / Team
                    ID
                  </label>
                  <input
                    type="text"
                    value={formData.deploymentOwnerId}
                    onChange={(e) =>
                      handleUpdate("deploymentOwnerId", e.target.value)
                    }
                    className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                    placeholder="usr_xxxxxxxxxxxxxxx"
                  />
                </div>
              </motion.div>
            )}
          </section>

          {/* Footer Action */}
          <div className="pt-10 flex flex-col sm:flex-row items-center justify-end gap-4 relative">
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[#dac5ff]/5 blur-3xl pointer-events-none rounded-full" />

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide z-10 ${
                isSubmitting
                  ? "bg-[#161f33]/50 text-slate-500 cursor-not-allowed"
                  : "bg-[#dac5ff] hover:bg-[#cbb1fb] text-[#030712] shadow-lg shadow-[#dac5ff]/10"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Committing
                  Pipeline...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> 2. Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function EnvironmentSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030712] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#dac5ff] animate-spin" />
        </div>
      }
    >
      <EnvironmentSetupForm />
    </Suspense>
  );
}
