"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Cloud,
  FolderSync,
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
  ArrowLeft,
  Copy,
  Lock,
  Info,
} from "lucide-react";
import {
  saveWorkspaceEnvironment,
  getCurrentWorkspaceId,
} from "../../environment-actions";
import { toast } from "sonner";

function EnvironmentSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUser = searchParams.get("user") || "admin";

  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [generatedCliToken, setGeneratedCliToken] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [showRedisInfo, setShowRedisInfo] = useState(false);

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

  useEffect(() => {
    async function resolveWorkspaceContext() {
      try {
        const result = await getCurrentWorkspaceId();
        if (result.success && result.workspaceId) {
          setWorkspaceId(result.workspaceId);
        } else {
          toast.error(
            "Security authorization missing. Workspace could not be mapped.",
          );
        }
      } catch (err) {
        console.error("Workspace verification error:", err);
        toast.error("Network interface degraded. Workspace mapping failed.");
      } finally {
        setLoadingWorkspace(false);
      }
    }
    resolveWorkspaceContext();
  }, []);

  const handleUpdate = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrowseClick = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        handleUpdate("targetOutputDir", `~/${dirHandle.name}`);
        toast.success(`Target mapped to folder: ${dirHandle.name}.`);
      } else {
        toast.info(
          "Browser security sandboxes prevent web apps from extracting absolute folder paths. Select the folder in Finder and press ⌥ + ⌘ + C, then paste it here.",
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (!workspaceId) {
      toast.error("Workspace ID not loaded. Please refresh the page.");
      return;
    }

    if (!formData.databaseUrl || !formData.githubToken) {
      toast.error("Database Connection URL and GitHub Token are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await saveWorkspaceEnvironment({
        workspaceId,
        ...formData,
      });

      if (res && res.success) {
        setGeneratedCliToken(
          res.cliToken ||
            `sf_pat_${Math.random().toString(36).substring(2, 15)}`,
        );
        setSetupComplete(true);
      } else {
        toast.error(res?.message || "Failed to finalize environment setup.");
      }
    } catch (error: any) {
      console.error("Error during submission:", error);
      toast.error(error?.message || "A critical error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.targetOutputDir) {
      toast.error("Please provide a local directory path.");
      return;
    }
    if (currentStep === 2 && !formData.databaseUrl) {
      toast.error("Database connection string is required.");
      return;
    }
    if (currentStep === 3 && !formData.githubToken) {
      toast.error("A GitHub Personal Access Token is required.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const stepData = {
    1: {
      tag: "MODULE 01 / 04",
      title: "Aetheric\nFoundry",
      desc: "Initiating the Environment Scaffolding protocol.",
      necessity:
        "Without a defined local scaffolding directory, the CLI daemon cannot isolate your project files.",
      nextLabel: "Initialize CLI Path",
    },
    2: {
      tag: "ARCHITECTURAL LAYER 02",
      title: "Data Persistence\nStrategy",
      desc: "Define the backbone of your application's memory.",
      necessity:
        "Your data layer defines application velocity. Selecting the right engine and an optimized ORM ensures optimal latency.",
      nextLabel: "Commit Strategy",
    },
    3: {
      tag: "STEP 03: SECURE CONNECTIVITY",
      title: "Integrated Pipeline\nSecurity",
      desc: "Establish a fortified connection between your local environment and the global repository network.",
      necessity:
        "We require authenticated tokens and outbound mail relays to wire up your CI/CD pipelines.",
      nextLabel: "Initialize Sync",
    },
    4: {
      tag: "STAGING 04 / GATED",
      title: "Ready for\nDeployment.",
      desc: "All system parameters are locked. Architecture integrity verified across nodes.",
      necessity:
        "This final handshake connects your local scaffold to the global edge network.",
      nextLabel: "Initialize Environment",
    },
  };

  const currentContext = stepData[currentStep as keyof typeof stepData];
  const progressPercentage = (currentStep / 4) * 100;

  if (loadingWorkspace) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        <span className="ml-4 text-theme-muted font-mono">
          Loading workspace...
        </span>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
        <div className="bg-theme-surface/80 border border-rose-500/20 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-theme-text">
            Workspace Not Found
          </h2>
          <p className="text-theme-muted mt-2">
            Could not determine your workspace. Please log out and try again.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 bg-theme-primary hover:brightness-110 text-theme-on-primary px-6 py-2 rounded-xl text-sm font-bold"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-theme-bg flex justify-center items-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-theme-surface/20 backdrop-blur-md border border-theme-outline/30 rounded-2xl shadow-2xl p-10 space-y-10 relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-primary to-theme-secondary" />
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-theme-primary/10 flex items-center justify-center mx-auto border border-theme-primary/20 shadow-[0_0_40px_var(--color-theme-primary)]/20">
              <CheckCircle className="w-10 h-10 text-theme-primary" />
            </div>
            <h1 className="text-4xl font-serif text-theme-text">
              Environment Locked.
            </h1>
            <p className="text-sm text-theme-muted font-mono max-w-md mx-auto">
              Your database nodes, mail servers, and cloud options are ready.
            </p>
          </div>

          <div className="bg-theme-bg/50 border border-theme-outline/20 rounded-xl p-6 space-y-8">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-theme-primary/20 flex items-center justify-center text-theme-primary">
                  1
                </span>
                Install the StudioFlow CLI
              </h3>
              <div className="pl-9">
                <div className="bg-theme-surface/50 border border-theme-outline/30 rounded-lg p-4 flex justify-between items-center">
                  <code className="text-theme-text text-[13px] font-mono">
                    npm install -g studioflow-cli
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "npm install -g studioflow-cli",
                        "Command copied!",
                      )
                    }
                    className="text-theme-muted hover:text-theme-primary"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-theme-primary/20 flex items-center justify-center text-theme-primary">
                  2
                </span>
                Authenticate Local Engine
              </h3>
              <div className="pl-9 space-y-3">
                <div className="bg-theme-surface/50 border border-theme-outline/30 rounded-lg p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Lock className="w-4 h-4 text-theme-primary shrink-0" />
                    <code className="text-theme-text text-[13px] font-mono truncate">
                      {generatedCliToken}
                    </code>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(generatedCliToken, "Token copied!")
                    }
                    className="text-theme-muted hover:text-theme-primary"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-theme-surface/50 border border-theme-outline/30 rounded-lg p-4 flex justify-between items-center">
                  <code className="text-theme-text text-[13px] font-mono">
                    studioflow login
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "studioflow login",
                        "Login command copied!",
                      )
                    }
                    className="text-theme-muted hover:text-theme-primary"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-theme-primary/20 flex items-center justify-center text-theme-primary">
                  3
                </span>
                Boot the Engine Daemon
              </h3>
              <div className="pl-9">
                <div className="bg-theme-surface/50 border border-theme-outline/30 rounded-lg p-4 flex justify-between items-center">
                  <code className="text-theme-primary text-[13px] font-mono font-bold">
                    studioflow
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard("studioflow", "Boot command copied!")
                    }
                    className="text-theme-muted hover:text-theme-primary"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/dashboard/${targetUser}`)}
            className="w-full bg-theme-primary hover:brightness-110 text-theme-on-primary text-sm font-bold py-5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Finalize Synchronization <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg font-sans text-theme-text flex overflow-hidden selection:bg-theme-primary/30">
      <div className="hidden lg:flex w-[40%] xl:w-[35%] bg-theme-surface border-r border-theme-outline/10 flex-col justify-between z-10 text-theme-text relative h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              opacity: [0.1, 0.15, 0.1],
              scale: [1, 1.05, 1],
              x: currentStep === 4 ? 50 : 0,
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-theme-primary/20 to-transparent blur-[120px]"
          />
        </div>

        <div className="p-12 xl:p-16 flex-1 flex flex-col justify-center z-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`context-${currentStep}`}
              initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <p className="text-theme-primary font-bold tracking-[0.2em] text-[10px] uppercase mb-6">
                {currentContext.tag}
              </p>
              <h1 className="text-5xl xl:text-6xl font-serif mb-6 tracking-tight leading-[1.1] whitespace-pre-line">
                {currentContext.title}
              </h1>
              <p className="text-theme-outline text-sm leading-relaxed max-w-sm mb-12">
                {currentContext.desc}
              </p>

              <div className="p-5 rounded-2xl border border-theme-outline/20 bg-theme-surface/20 backdrop-blur-md max-w-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-theme-primary/50" />
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-theme-text mb-2">
                  <Info className="w-4 h-4 text-theme-secondary" /> Why is this
                  necessary?
                </h4>
                <p className="text-[12px] text-theme-muted leading-relaxed">
                  {currentContext.necessity}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-12 xl:p-16 z-10">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((dot) => (
              <div
                key={dot}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  currentStep === dot
                    ? "w-8 bg-theme-primary"
                    : "w-2 bg-theme-outline/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[60%] xl:w-[65%] h-screen bg-theme-bg flex flex-col relative overflow-hidden">
        <div className="w-full bg-theme-bg/95 backdrop-blur-md border-b border-theme-outline/10 px-8 pt-8 pb-5 sm:px-12 lg:px-20 z-20 shrink-0">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">
              Configuration Progress
            </span>
            <span className="text-[11px] font-mono text-theme-text">
              {progressPercentage}% Complete
            </span>
          </div>
          <div className="w-full h-1 bg-theme-surface/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-theme-primary to-theme-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.6, ease: "circOut" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-12 px-8 sm:px-12 lg:px-20 custom-scrollbar">
          <div className="max-w-2xl mx-auto pb-12">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.section
                  key="step-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-3xl font-serif text-theme-text mb-3">
                      Project Identity
                    </h2>
                    <p className="text-sm text-theme-muted">
                      Define the foundational parameters for the new workspace.
                    </p>
                  </div>
                  <div className="space-y-4 pt-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                      Local Scaffolding Directory
                    </label>
                    <div className="relative flex items-center group">
                      <input
                        type="text"
                        required
                        value={formData.targetOutputDir}
                        onChange={(e) =>
                          handleUpdate("targetOutputDir", e.target.value)
                        }
                        className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-muted font-mono focus:outline-none focus:border-theme-primary transition pr-12"
                        placeholder="~/Documents/StudioFlow"
                      />
                      <button
                        onClick={handleBrowseClick}
                        type="button"
                        className="absolute right-0 top-0 bottom-4 px-3 flex items-center text-theme-muted hover:text-theme-primary"
                      >
                        <FolderSearch className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 pt-6">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                      Admin Alert Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.adminAlertEmail}
                      onChange={(e) =>
                        handleUpdate("adminAlertEmail", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition"
                      placeholder="admin@studioflow.dev"
                    />
                  </div>
                </motion.section>
              )}

              {currentStep === 2 && (
                <motion.section
                  key="step-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-10"
                >
                  <div className="space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text flex items-center gap-2">
                      <Server className="w-4 h-4" /> Database Engine
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {["postgresql", "mysql", "sqlite", "mongodb"].map(
                        (db) => (
                          <div
                            key={db}
                            onClick={() => handleUpdate("databaseEngine", db)}
                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-3 ${
                              formData.databaseEngine === db
                                ? "border-theme-primary bg-theme-primary/10"
                                : "border-theme-outline/20 hover:border-theme-outline/50 bg-theme-surface/30"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <Database
                                className={`w-5 h-5 ${formData.databaseEngine === db ? "text-theme-primary" : "text-theme-muted"}`}
                              />
                              {formData.databaseEngine === db && (
                                <CheckCircle className="w-4 h-4 text-theme-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-theme-text capitalize">
                                {db}
                              </h4>
                              <p className="text-[11px] text-theme-muted mt-0.5">
                                {db === "postgresql" &&
                                  "Relational with robust ACID compliance."}
                                {db === "mysql" &&
                                  "High reliability multi-threaded SQL."}
                                {db === "sqlite" &&
                                  "Lightweight, file-based embedded SQL."}
                                {db === "mongodb" &&
                                  "Scalable NoSQL document database."}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text flex items-center gap-2">
                      <Database className="w-4 h-4" /> Database ORM
                    </label>
                    <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-2">
                      {[
                        "drizzle",
                        "prisma",
                        "mongoose",
                        "sqlalchemy",
                        "django_orm",
                        "eloquent",
                        "hibernate",
                        "entity_framework",
                      ].map((orm) => (
                        <div
                          key={orm}
                          onClick={() => handleUpdate("databaseOrm", orm)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                            formData.databaseOrm === orm
                              ? "border-theme-primary bg-theme-primary/10"
                              : "border-theme-outline/20 hover:border-theme-outline/50 bg-theme-surface/30"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.databaseOrm === orm ? "border-theme-primary" : "border-theme-outline/40"}`}
                          >
                            {formData.databaseOrm === orm && (
                              <div className="w-2 h-2 rounded-full bg-theme-primary" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-theme-text capitalize">
                              {orm.replace("_", " ")}
                            </h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                      Connection URL Matrix
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={formData.databaseUrl}
                      onChange={(e) =>
                        handleUpdate("databaseUrl", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                      placeholder="postgresql://user:password@aws-host.com:5432/main"
                    />
                  </div>
                </motion.section>
              )}

              {currentStep === 3 && (
                <motion.section
                  key="step-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text flex items-center gap-2">
                      <Cloud className="w-4 h-4" /> Cloud Deployment Matrix
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: "render", name: "Render" },
                        { id: "vercel", name: "Vercel" },
                        { id: "railway", name: "Railway" },
                        { id: "none", name: "Bypass / Manual" },
                      ].map((provider) => (
                        <div
                          key={provider.id}
                          onClick={() =>
                            handleUpdate("deploymentProvider", provider.id)
                          }
                          className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${
                            formData.deploymentProvider === provider.id
                              ? "border-theme-primary bg-theme-primary/10 text-theme-primary"
                              : "border-theme-outline/20 hover:border-theme-outline/50 bg-theme-surface/30 text-theme-muted"
                          }`}
                        >
                          <span className="text-[13px] font-bold">
                            {provider.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="space-y-4">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text flex items-center gap-2">
                        <Key className="w-4 h-4" /> GitHub Personal Access Token
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={formData.githubToken}
                        onChange={(e) =>
                          handleUpdate("githubToken", e.target.value)
                        }
                        className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                        placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      />
                    </div>

                    {formData.deploymentProvider !== "none" && (
                      <>
                        <div className="space-y-4 pt-4">
                          <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                            Cloud Host API Key
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={formData.deploymentApiKey}
                            onChange={(e) =>
                              handleUpdate("deploymentApiKey", e.target.value)
                            }
                            className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                            placeholder={`e.g. rnd_xxxxx or vercel_xxxxx`}
                          />
                        </div>
                        <div className="space-y-4 pt-4">
                          <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                            Cloud Host Owner ID
                          </label>
                          <input
                            type="text"
                            value={formData.deploymentOwnerId}
                            onChange={(e) =>
                              handleUpdate("deploymentOwnerId", e.target.value)
                            }
                            className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                            placeholder="usr_xxxxx or team_xxxxx"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </motion.section>
              )}

              {currentStep === 4 && (
                <motion.section
                  key="step-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text flex items-center gap-2">
                        <Monitor className="w-4 h-4" /> Redis Pipeline Cache URL
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRedisInfo(!showRedisInfo)}
                        className="text-theme-muted hover:text-theme-primary transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showRedisInfo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-theme-surface/50 border border-theme-outline/20 rounded-xl p-4 text-[12px] text-theme-muted leading-relaxed"
                        >
                          Redis is used for high-velocity logging, job tracking,
                          and websocket pub/sub. If omitted, the engine defaults
                          to database polling—which operates safely but with
                          increased latency.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input
                      type="password"
                      autoComplete="new-password"
                      value={formData.redisUrl}
                      onChange={(e) => handleUpdate("redisUrl", e.target.value)}
                      className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                      placeholder="redis://:password@host:port"
                    />
                  </div>

                  <div className="pt-6 border-t border-theme-outline/10 space-y-8">
                    <h3 className="text-sm font-serif text-theme-text flex items-center gap-2">
                      <Mail className="w-4 h-4 text-theme-primary" /> SMTP Email
                      Relay
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={formData.smtpHost}
                          onChange={(e) =>
                            handleUpdate("smtpHost", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                          placeholder="smtp.mailgun.org"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                          SMTP Port
                        </label>
                        <input
                          type="text"
                          value={formData.smtpPort}
                          onChange={(e) =>
                            handleUpdate("smtpPort", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                          SMTP Username
                        </label>
                        <input
                          type="text"
                          value={formData.smtpUser}
                          onChange={(e) =>
                            handleUpdate("smtpUser", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                          placeholder="postmaster@yourdomain.com"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-theme-text">
                          SMTP Password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={formData.smtpPass}
                          onChange={(e) =>
                            handleUpdate("smtpPass", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-theme-outline/30 pb-4 text-sm text-theme-text font-mono focus:outline-none focus:border-theme-primary transition"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-theme-bg/95 backdrop-blur-md border-t border-theme-outline/10 p-6 sm:px-12 lg:px-20 z-20 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              className={`text-theme-muted hover:text-theme-text font-bold text-sm px-4 py-2 transition-opacity flex items-center gap-2 ${
                currentStep === 1
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-4">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-theme-surface hover:bg-theme-outline/10 text-theme-text border border-theme-outline/20 px-8 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  {currentContext.nextLabel}{" "}
                  <ArrowRight className="w-4 h-4 text-theme-muted" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || !workspaceId}
                  onClick={handleSubmit}
                  className={`px-8 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    isSubmitting || !workspaceId
                      ? "bg-theme-surface text-theme-muted cursor-not-allowed"
                      : "bg-theme-primary hover:brightness-110 text-theme-on-primary shadow-[0_0_20px_var(--color-theme-primary)]/30"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Finalizing
                      Matrix...
                    </>
                  ) : (
                    <>
                      {currentContext.nextLabel} <Globe className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-theme-bg flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
        </div>
      }
    >
      <EnvironmentSetupForm />
    </Suspense>
  );
}
