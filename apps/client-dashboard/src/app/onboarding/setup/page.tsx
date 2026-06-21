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
  CheckCircle,
  ArrowRight,
  Copy,
  Lock,
} from "lucide-react";
import { saveWorkspaceEnvironment } from "../../environment-actions";
import { toast } from "sonner";

function EnvironmentSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUser = searchParams.get("user") || "admin";

  const currentWorkspaceId = Number(searchParams.get("workspaceId")) || 1;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [generatedCliToken, setGeneratedCliToken] = useState("");

  const [formData, setFormData] = useState({
    databaseUrl: "",
    databaseEngine: "postgresql",
    databaseOrm: "drizzle",
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
      setGeneratedCliToken(
        res.cliToken || `sf_pat_${Math.random().toString(36).substring(2, 15)}`,
      );
      setSetupComplete(true);
      setIsSubmitting(false);
    } else {
      toast.error(res.message);
      setIsSubmitting(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-[var(--color-theme-bg)] font-sans text-[var(--color-theme-muted)] flex justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[var(--color-theme-primary)]/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)] rounded-xl shadow-2xl overflow-hidden p-8 space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-serif text-[var(--color-theme-text)] tracking-wide">
              Environment Saved & Locked
            </h1>
            <p className="text-sm text-[var(--color-theme-muted)] font-mono">
              Your database nodes, mail servers, and cloud options are ready.
              Connect your CLI engine to sync these keys directly.
            </p>
          </div>

          <div className="bg-[var(--color-theme-bg)] border border-[var(--color-theme-outline)]/50 rounded-xl p-6 space-y-8">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-theme-primary)] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  1
                </span>
                Install the StudioFlow CLI
              </h3>
              <p className="text-xs text-[var(--color-theme-muted)] font-mono pl-7">
                Deploy the engine orchestrator binary globally on your machine:
              </p>
              <div className="pl-7 relative">
                <div className="bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)]/50 rounded-lg p-3 flex justify-between items-center group">
                  <code className="text-[var(--color-theme-secondary)] text-[11px] font-mono font-bold">
                    npm install -g studioflow-cli
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "npm install -g studioflow-cli",
                        "Install command copied!",
                      )
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-theme-primary)] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  2
                </span>
                Authenticate Local Engine
              </h3>
              <p className="text-xs text-[var(--color-theme-muted)] font-mono pl-7">
                Copy your PAT mapping. You'll be prompted for this key
                instantly:
              </p>
              <div className="pl-7 space-y-3">
                <div className="bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)] rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Lock className="w-4 h-4 text-[var(--color-theme-primary)] shrink-0" />
                    <code className="text-[var(--color-theme-text)] text-[11px] font-mono truncate">
                      {generatedCliToken}
                    </code>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        generatedCliToken,
                        "Token copied securely to clipboard!",
                      )
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] transition pl-3"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)]/50 rounded-lg p-3 flex justify-between items-center group">
                  <code className="text-[var(--color-theme-primary)] text-[11px] font-mono font-bold">
                    studioflow login
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "studioflow login",
                        "Login command copied!",
                      )
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--color-theme-primary)] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  3
                </span>
                Boot the Engine Daemon
              </h3>
              <p className="text-xs text-[var(--color-theme-muted)] font-mono pl-7">
                Start the engine.
              </p>
              <div className="pl-7 relative">
                <div className="bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)]/50 rounded-lg p-3 flex justify-between items-center group">
                  <code className="text-emerald-500 text-[11px] font-mono font-bold">
                    studioflow
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard("studioflow", "Boot command copied!")
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)] transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/dashboard/${targetUser}`)}
            className="w-full bg-[var(--color-theme-primary)] hover:opacity-90 text-[var(--color-theme-on-primary)] text-sm font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-[var(--color-theme-primary)]/10"
          >
            I've Connected My CLI <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-theme-bg)] font-sans text-[var(--color-theme-muted)] flex justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[var(--color-theme-primary)]/30">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-[var(--color-theme-surface)] border border-[var(--color-theme-outline)] rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-[var(--color-theme-outline)]/50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-theme-primary)] flex items-center justify-center shadow-lg shadow-[var(--color-theme-primary)]/10">
              <Terminal className="w-6 h-6 text-[var(--color-theme-on-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-[var(--color-theme-text)] tracking-wide">
                Environment Architecture Setup
              </h1>
              <p className="text-xs text-[var(--color-theme-muted)] font-mono mt-1 tracking-tight">
                Configure your workspace pipeline integration connections, email
                routing engines, and execution paths.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-12">
          {/* SECTION 1: Local Execution Paths */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--color-theme-primary)] uppercase flex items-center gap-2">
              <FolderSync className="w-4 h-4" /> 1. CLI Target Output Node
            </h2>
            <div>
              <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
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
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="/Users/username/Sites/work"
                />
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-[var(--color-theme-bg)] border border-[var(--color-theme-outline)] hover:border-[var(--color-theme-primary)] rounded-lg text-xs font-mono text-[var(--color-theme-text)] transition flex items-center gap-2 whitespace-nowrap"
                >
                  <FolderSearch className="w-4 h-4" /> Browse Folder
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2: Databases */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--color-theme-primary)] uppercase flex items-center gap-2">
              <Database className="w-4 h-4" /> 2. Primary Datastores & Cache
            </h2>
            <div className="grid grid-cols-1 gap-8">
              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  Primary Database Connection URL
                </label>
                <input
                  type="text"
                  required
                  value={formData.databaseUrl}
                  onChange={(e) => handleUpdate("databaseUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="mysql://user:pass@host:3306/db"
                />
              </div>

              {/* CARD BASED DATABASE ENGINE SELECTION */}
              <div className="space-y-3">
                <label className="block text-xs font-mono text-[var(--color-theme-muted)]">
                  Database Engine
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "postgresql", label: "PostgreSQL" },
                    { id: "mysql", label: "MySQL" },
                    { id: "mongodb", label: "MongoDB" },
                    { id: "sqlite", label: "SQLite" },
                  ].map((db) => (
                    <div
                      key={db.id}
                      onClick={() => handleUpdate("databaseEngine", db.id)}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition-all duration-200 ${
                        formData.databaseEngine === db.id
                          ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)] shadow-sm shadow-[var(--color-theme-primary)]/10"
                          : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)] text-[var(--color-theme-muted)]"
                      }`}
                    >
                      <span className="text-sm font-bold font-mono">
                        {db.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD BASED DATABASE ORM SELECTION */}
              <div className="space-y-3">
                <label className="block text-xs font-mono text-[var(--color-theme-muted)]">
                  Database ORM Engine
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[
                    { id: "drizzle", label: "Drizzle ORM" },
                    { id: "prisma", label: "Prisma" },
                    { id: "mongoose", label: "Mongoose" },
                    { id: "sqlalchemy", label: "SQLAlchemy" },
                    { id: "django_orm", label: "Django ORM" },
                    { id: "eloquent", label: "Eloquent" },
                    { id: "hibernate", label: "Hibernate" },
                    { id: "entity_framework", label: "EF Core" },
                    { id: "active_record", label: "ActiveRecord" },
                  ].map((orm) => (
                    <div
                      key={orm.id}
                      onClick={() => handleUpdate("databaseOrm", orm.id)}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition-all duration-200 ${
                        formData.databaseOrm === orm.id
                          ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)] shadow-sm shadow-[var(--color-theme-primary)]/10"
                          : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)] text-[var(--color-theme-muted)]"
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">
                        {orm.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  Redis URL Connection Key (Optional)
                </label>
                <input
                  type="text"
                  value={formData.redisUrl}
                  onChange={(e) => handleUpdate("redisUrl", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="redis://127.0.0.1:6379"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Version Control */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--color-theme-primary)] uppercase flex items-center gap-2">
              <Code className="w-4 h-4" /> 3. Version Control Gateway
            </h2>
            <div>
              <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
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
                className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </section>

          {/* SECTION 4: SMTP Infrastructure Configurations */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--color-theme-primary)] uppercase flex items-center gap-2">
              <Mail className="w-4 h-4" /> 4. Outbound Notification Mail
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={(e) => handleUpdate("smtpHost", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="smtp.mailtrap.io"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  value={formData.smtpPort}
                  onChange={(e) => handleUpdate("smtpPort", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  System Pipeline Alert Email
                </label>
                <input
                  type="email"
                  value={formData.adminAlertEmail}
                  onChange={(e) =>
                    handleUpdate("adminAlertEmail", e.target.value)
                  }
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="alerts@studioflow.dev"
                />
              </div>
              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  SMTP Connection Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUser}
                  onChange={(e) => handleUpdate("smtpUser", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="Username Token"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2">
                  SMTP Secure Auth Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  spellCheck="false"
                  autoCorrect="off"
                  value={formData.smtpPass}
                  onChange={(e) => handleUpdate("smtpPass", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                  placeholder="Auth Key Pass"
                />
              </div>
            </div>
          </section>

          {/* SECTION 5: Cloud Target Integrations */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--color-theme-primary)] uppercase flex items-center gap-2">
              <Cloud className="w-4 h-4" /> 5. Target Production Cloud Provider
            </h2>

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  onClick={() => handleUpdate("deploymentProvider", "none")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "none"
                      ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)]"
                      : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Monitor
                      className={`w-5 h-5 ${
                        formData.deploymentProvider === "none"
                          ? "text-[var(--color-theme-on-primary)]"
                          : "text-[var(--color-theme-muted)]"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-bold mb-1 font-mono ${
                      formData.deploymentProvider === "none"
                        ? "text-[var(--color-theme-on-primary)]"
                        : "text-[var(--color-theme-text)]"
                    }`}
                  >
                    Local Only
                  </h3>
                  <p
                    className={`text-[10px] font-mono ${
                      formData.deploymentProvider === "none"
                        ? "text-[var(--color-theme-on-primary)]/80"
                        : "text-[var(--color-theme-muted)]"
                    }`}
                  >
                    No Cloud Architecture
                  </p>
                </div>

                <div
                  onClick={() => handleUpdate("deploymentProvider", "render")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "render"
                      ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)]"
                      : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Server
                      className={`w-5 h-5 ${
                        formData.deploymentProvider === "render"
                          ? "text-[var(--color-theme-on-primary)]"
                          : "text-[var(--color-theme-muted)]"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-bold mb-1 font-mono ${
                      formData.deploymentProvider === "render"
                        ? "text-[var(--color-theme-on-primary)]"
                        : "text-[var(--color-theme-text)]"
                    }`}
                  >
                    Render API
                  </h3>
                  <p
                    className={`text-[10px] font-mono ${
                      formData.deploymentProvider === "render"
                        ? "text-[var(--color-theme-on-primary)]/80"
                        : "text-[var(--color-theme-muted)]"
                    }`}
                  >
                    Managed Cluster Pipeline
                  </p>
                </div>

                <div
                  onClick={() => handleUpdate("deploymentProvider", "railway")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "railway"
                      ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)]"
                      : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Cpu
                      className={`w-5 h-5 ${
                        formData.deploymentProvider === "railway"
                          ? "text-[var(--color-theme-on-primary)]"
                          : "text-[var(--color-theme-muted)]"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-bold mb-1 font-mono ${
                      formData.deploymentProvider === "railway"
                        ? "text-[var(--color-theme-on-primary)]"
                        : "text-[var(--color-theme-text)]"
                    }`}
                  >
                    Railway
                  </h3>
                  <p
                    className={`text-[10px] font-mono ${
                      formData.deploymentProvider === "railway"
                        ? "text-[var(--color-theme-on-primary)]/80"
                        : "text-[var(--color-theme-muted)]"
                    }`}
                  >
                    Scalable Provision Engine
                  </p>
                </div>

                <div
                  onClick={() => handleUpdate("deploymentProvider", "vercel")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    formData.deploymentProvider === "vercel"
                      ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)]"
                      : "border-[var(--color-theme-outline)] bg-[var(--color-theme-bg)] hover:border-[var(--color-theme-primary)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Globe
                      className={`w-5 h-5 ${
                        formData.deploymentProvider === "vercel"
                          ? "text-[var(--color-theme-on-primary)]"
                          : "text-[var(--color-theme-muted)]"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-bold mb-1 font-mono ${
                      formData.deploymentProvider === "vercel"
                        ? "text-[var(--color-theme-on-primary)]"
                        : "text-[var(--color-theme-text)]"
                    }`}
                  >
                    Vercel
                  </h3>
                  <p
                    className={`text-[10px] font-mono ${
                      formData.deploymentProvider === "vercel"
                        ? "text-[var(--color-theme-on-primary)]/80"
                        : "text-[var(--color-theme-muted)]"
                    }`}
                  >
                    Edge Optimization Nodes
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
                  <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[var(--color-theme-muted)]" />{" "}
                    Platform Deployment API Secret Key
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
                    className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                    placeholder="rnd_xxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--color-theme-muted)] mb-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--color-theme-muted)]" />{" "}
                    Target Account Group / Tenant ID
                  </label>
                  <input
                    type="text"
                    value={formData.deploymentOwnerId}
                    onChange={(e) =>
                      handleUpdate("deploymentOwnerId", e.target.value)
                    }
                    className="w-full bg-transparent border-b border-[var(--color-theme-outline)] pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                    placeholder="usr_xxxxxxxxxxxxxxx"
                  />
                </div>
              </motion.div>
            )}
          </section>

          <div className="pt-10 flex flex-col sm:flex-row items-center justify-end gap-4 relative">
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[var(--color-theme-primary)]/5 blur-3xl pointer-events-none rounded-full" />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide z-10 ${
                isSubmitting
                  ? "bg-[var(--color-theme-outline)]/50 text-[var(--color-theme-muted)] cursor-not-allowed"
                  : "bg-[var(--color-theme-primary)] hover:opacity-90 text-[var(--color-theme-on-primary)] shadow-lg shadow-[var(--color-theme-primary)]/10"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating API
                  Token...
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
        <div className="min-h-screen bg-[var(--color-theme-bg)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--color-theme-primary)] animate-spin" />
        </div>
      }
    >
      <EnvironmentSetupForm />
    </Suspense>
  );
}
