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
  Mail,
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
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    adminAlertEmail: "",
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

    envContentString += `DEPLOYMENT_PROVIDER="${formData.deploymentProvider}"\n`;
    if (formData.deploymentProvider !== "none") {
      envContentString += `RENDER_API_KEY="${formData.deploymentApiKey}"\n`;
      envContentString += `RENDER_OWNER_ID="${formData.deploymentOwnerId}"\n`;
    }

    if (formData.smtpHost)
      envContentString += `SMTP_HOST="${formData.smtpHost}"\n`;
    if (formData.smtpPort)
      envContentString += `SMTP_PORT="${formData.smtpPort}"\n`;
    if (formData.smtpUser)
      envContentString += `SMTP_USER="${formData.smtpUser}"\n`;
    if (formData.smtpPass)
      envContentString += `SMTP_PASS="${formData.smtpPass}"\n`;
    if (formData.adminAlertEmail)
      envContentString += `ADMIN_ALERT_EMAIL="${formData.adminAlertEmail}"\n`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.databaseUrl || !formData.githubToken) {
      toast.error(
        "Please fill in both the Database Connection URL and GitHub Token.",
      );
      setIsSubmitting(false);
      return;
    }

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
              Your database nodes, mail servers, and cloud options are ready.
              Follow these final steps to link your local machine.
            </p>
          </div>

          <div className="bg-[#0b101d] border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Step 1: Install CLI */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  1
                </span>
                Install the StudioFlow CLI Global Engine
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Run this command inside your terminal environment to deploy the
                engine orchestrator binary:
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

            {/* Step 2: Download */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  2
                </span>
                Download Your Keys
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Download the master configuration file pre-configured with all
                your inputs.
              </p>
              <div className="pl-7 pt-2">
                <button
                  onClick={downloadGlobalEnv}
                  className="bg-[#161f33] hover:bg-[#1c2842] border border-slate-700 text-white text-xs font-mono py-2 px-4 rounded-lg transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Configuration File
                </button>
              </div>
            </div>

            {/* Step 3: Rename File */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  3
                </span>
                Fix File Extension
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                If your browser saved the download as{" "}
                <code className="text-amber-400 text-[11px]">env.txt</code>,
                rename it to a hidden system file inside your terminal:
              </p>
              <div className="pl-7 relative">
                <div className="bg-black border border-slate-800 rounded-lg p-3 flex justify-between items-center group">
                  <code className="text-amber-400 text-[11px] font-mono">
                    mv env.txt .env
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "mv env.txt .env",
                        "Rename command copied!",
                      )
                    }
                    className="text-slate-500 hover:text-white transition"
                    title="Copy rename command"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Placement */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  4
                </span>
                Place it in Headquarters
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Move the renamed{" "}
                <code className="text-cyan-400 text-[11px]">.env</code> file
                directly into your chosen workspace projects directory:
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

            {/* Step 5: Boot */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#dac5ff] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#dac5ff]/20 flex items-center justify-center text-[#dac5ff]">
                  5
                </span>
                Boot the Engine Daemon
              </h3>
              <p className="text-xs text-slate-400 font-mono pl-7">
                Navigate to your chosen directory headquarters and initialize
                background synchronization pipelines:
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
                Configure your workspace pipeline integration connections, email
                routing engines, and execution paths.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-12">
          {/* SECTION 1: Local Execution Paths */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <FolderSync className="w-4 h-4" /> 1. CLI Target Output Node
              Location
            </h2>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">
                Local Scaffolding Core Directory Path
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
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
                  <FolderSearch className="w-4 h-4" /> Browse Folder
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 font-mono">
                Determines where the local background tracking daemon will
                scaffold your custom application codebases.
              </p>
            </div>
          </section>

          {/* SECTION 2: Databases */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <Database className="w-4 h-4" /> 2. Primary Datastores & Cache
              Layers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  Primary Database Connection URL String
                </label>
                <input
                  type="text"
                  required
                  value={formData.databaseUrl}
                  onChange={(e) => handleUpdate("databaseUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="mysql://user:pass@host:3306/db"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  Redis URL Connection Key (Optional for PubSub/Queues)
                </label>
                <input
                  type="text"
                  value={formData.redisUrl}
                  onChange={(e) => handleUpdate("redisUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="redis://127.0.0.1:6379"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Version Control */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <Code className="w-4 h-4" /> 3. Version Control Repository Gateway
            </h2>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                spellCheck="false"
                autoCorrect="off"
                value={formData.githubToken}
                onChange={(e) => handleUpdate("githubToken", e.target.value)}
                className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-[10px] text-slate-600 mt-2 font-mono">
                Grants permission to automatic repository creation engines for
                launching new private templates seamlessly.
              </p>
            </div>
          </section>

          {/* SECTION 4: SMTP Infrastructure Configurations */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[#dac5ff] uppercase flex items-center gap-2">
              <Mail className="w-4 h-4" /> 4. Outbound Notification Mail
              Pipeline Server (SMTP)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  SMTP Server Host Address
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => handleUpdate("smtpHost", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="smtp.mailtrap.io"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  SMTP Port Connection
                </label>
                <input
                  type="text"
                  value={formData.smtpPort}
                  onChange={(e) => handleUpdate("smtpPort", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  System Pipeline Notification Email
                </label>
                <input
                  type="email"
                  value={formData.adminAlertEmail}
                  onChange={(e) =>
                    handleUpdate("adminAlertEmail", e.target.value)
                  }
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="alerts@studioflow.dev"
                />
              </div>
              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  SMTP Server Connection Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUser}
                  onChange={(e) => handleUpdate("smtpUser", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="SMTP Username Account Token"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">
                  SMTP Secure Auth Password Key
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  spellCheck="false"
                  autoCorrect="off"
                  value={formData.smtpPass}
                  onChange={(e) => handleUpdate("smtpPass", e.target.value)}
                  className="w-full bg-transparent border-b border-[#161f33] pb-3 text-sm text-white font-mono focus:outline-none focus:border-[#dac5ff] transition"
                  placeholder="SMTP Authentication Key Pass"
                />
              </div>
            </div>
          </section>

          {/* SECTION 5: Cloud Deployment Platform Targets */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-white uppercase flex items-center gap-2">
              <Cloud className="w-4 h-4" /> 5. Automated Target Production Cloud
              Integration Nodes
            </h2>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-4">
                Select Active Deployment Hosting Infrastructure Provider
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Local Card Target */}
                <div
                  onClick={() => handleUpdate("deploymentProvider", "none")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "none"
                      ? "border-[#dac5ff] bg-[#121526]"
                      : "border-[#161f33] bg-[#0a0f1d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    {/* <img src="" alt="" className="hidden" /> */}
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
                    No Cloud Architecture Configured
                  </p>
                </div>

                {/* Render Platform Card */}
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
                    Managed Cluster Pipeline Provisioner
                  </p>
                </div>

                {/* Railway Platform Card */}
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
                    Scalable Core Provision Engine Nodes
                  </p>
                </div>

                {/* Vercel Edge Card */}
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
                    Edge Optimization Infrastructure Nodes
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
                    <Key className="w-3.5 h-3.5 text-slate-500" /> Platform
                    Deployment API Secret Key
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck="false"
                    autoCorrect="off"
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
                    <User className="w-3.5 h-3.5 text-slate-500" /> Target
                    Account / Organization Group Tenant ID
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

          {/* Footer Interactive Actions */}
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
                  Pipeline Architecture...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Setup Configuration
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
