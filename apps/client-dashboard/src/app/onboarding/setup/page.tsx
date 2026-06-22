"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowLeft,
  Copy,
  Lock,
  Info,
  HelpCircle,
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    console.log("🚀 handleSubmit function triggered!");

    if (e) e.preventDefault();

    if (!formData.databaseUrl || !formData.githubToken) {
      toast.error(
        "Please ensure Database Connection URL and GitHub Token are provided in previous steps.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 Calling saveWorkspaceEnvironment API...");
      const res = await saveWorkspaceEnvironment({
        workspaceId: currentWorkspaceId,
        ...formData,
      });
      console.log("🚀 Response received:", res);

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
      console.error("🔥 Error during submission:", error);
      toast.error(
        error?.message || "A critical error occurred while saving the matrix.",
      );
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

  // --- Step Context Data ---
  const stepData = {
    1: {
      tag: "MODULE 01 / 04",
      title: "Aetheric\nFoundry",
      desc: "Initiating the Environment Scaffolding protocol. This process establishes the digital bedrock of your enterprise architecture, ensuring every node and matrix aligns with rigorous performance standards.",
      necessity:
        "Without a defined local scaffolding directory, the CLI daemon cannot isolate your project files or generate the necessary repository structures on your host machine.",
      nextLabel: "Initialize CLI Path",
    },
    2: {
      tag: "ARCHITECTURAL LAYER 02",
      title: "Data Persistence\nStrategy",
      desc: "Define the backbone of your application's memory. Our persistence engine ensures ACID compliance, high-availability replication, and seamless migration workflows.",
      necessity:
        "Your data layer defines application velocity. Selecting the right engine and an optimized ORM ensures your microservices communicate with optimal latency and strict type safety.",
      nextLabel: "Commit Strategy",
    },
    3: {
      tag: "STEP 03: SECURE CONNECTIVITY",
      title: "Integrated Pipeline\nSecurity",
      desc: "Establish a fortified connection between your local environment and the global repository network. Our automated security protocols ensure your tokens are encrypted at rest and during transit.",
      necessity:
        "We require authenticated tokens and outbound mail relays to wire up your CI/CD pipelines, trigger deployment hooks, and dispatch critical systemic alerts.",
      nextLabel: "Initialize Sync",
    },
    4: {
      tag: "STAGING 04 / GATED",
      title: "Ready for\nDeployment.",
      desc: "All system parameters are locked. Architecture integrity verified across nodes. Finalize your target production cloud provider to initialize the environment.",
      necessity:
        "This final handshake connects your local scaffold to the global edge network. Selecting a target provider provisions the exact serverless or container orchestration you need.",
      nextLabel: "Initialize Environment",
    },
  };

  const currentContext = stepData[currentStep as keyof typeof stepData];
  const progressPercentage = (currentStep / 4) * 100;

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-[var(--color-theme-bg)] font-sans text-[var(--color-theme-text)] flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[var(--color-theme-primary)]/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/30 rounded-2xl shadow-2xl overflow-hidden p-10 space-y-10 relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)]" />

          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[var(--color-theme-primary)]/10 flex items-center justify-center mx-auto border border-[var(--color-theme-primary)]/20 shadow-[0_0_40px_var(--color-theme-primary)]/20">
              <CheckCircle className="w-10 h-10 text-[var(--color-theme-primary)]" />
            </div>
            <h1 className="text-4xl font-serif text-[var(--color-theme-text)] tracking-tight">
              Environment Locked.
            </h1>
            <p className="text-sm text-[var(--color-theme-muted)] font-mono max-w-md mx-auto">
              Your database nodes, mail servers, and cloud options are ready.
              Connect your CLI engine to sync these keys directly.
            </p>
          </div>

          <div className="bg-[var(--color-theme-bg)]/50 border border-[var(--color-theme-outline)]/20 rounded-xl p-6 space-y-8 shadow-inner">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-theme-text)] uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  1
                </span>
                Install the StudioFlow CLI
              </h3>
              <div className="pl-9 relative">
                <div className="bg-[var(--color-theme-surface)]/50 border border-[var(--color-theme-outline)]/30 rounded-lg p-4 flex justify-between items-center group hover:border-[var(--color-theme-primary)]/50 transition">
                  <code className="text-[var(--color-theme-text)] text-[13px] font-mono">
                    npm install -g studioflow-cli
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "npm install -g studioflow-cli",
                        "Install command copied!",
                      )
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] transition"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-theme-text)] uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  2
                </span>
                Authenticate Local Engine
              </h3>
              <div className="pl-9 space-y-3">
                <div className="bg-[var(--color-theme-surface)]/50 border border-[var(--color-theme-outline)]/30 rounded-lg p-4 flex justify-between items-center hover:border-[var(--color-theme-primary)]/50 transition">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Lock className="w-4 h-4 text-[var(--color-theme-primary)] shrink-0" />
                    <code className="text-[var(--color-theme-text)] text-[13px] font-mono truncate opacity-80">
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
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] transition pl-3"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[var(--color-theme-surface)]/50 border border-[var(--color-theme-outline)]/30 rounded-lg p-4 flex justify-between items-center group hover:border-[var(--color-theme-primary)]/50 transition">
                  <code className="text-[var(--color-theme-text)] text-[13px] font-mono">
                    studioflow login
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "studioflow login",
                        "Login command copied!",
                      )
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] transition"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-theme-text)] uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-[var(--color-theme-primary)]/20 flex items-center justify-center text-[var(--color-theme-primary)]">
                  3
                </span>
                Boot the Engine Daemon
              </h3>
              <div className="pl-9 relative">
                <div className="bg-[var(--color-theme-surface)]/50 border border-[var(--color-theme-outline)]/30 rounded-lg p-4 flex justify-between items-center group hover:border-[var(--color-theme-primary)]/50 transition">
                  <code className="text-[var(--color-theme-primary)] text-[13px] font-mono font-bold">
                    studioflow
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard("studioflow", "Boot command copied!")
                    }
                    className="text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] transition"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/dashboard/${targetUser}`)}
            className="w-full bg-[var(--color-theme-primary)] hover:brightness-110 text-[var(--color-theme-on-primary)] text-sm font-bold py-5 rounded-xl transition-all flex items-center justify-center gap-2 tracking-wide shadow-[0_0_20px_var(--color-theme-primary)]/30"
          >
            Finalize Synchronization <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-theme-bg)] font-sans text-[var(--color-theme-text)] flex overflow-hidden selection:bg-[var(--color-theme-primary)]/30">
      {/* LEFT PANE: Dynamic Context */}
      <div className="hidden lg:flex w-[40%] xl:w-[35%] bg-[var(--color-theme-surface)] border-r border-[var(--color-theme-outline)]/10 flex-col justify-between z-10 text-[var(--color-theme-text)] relative h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              opacity: [0.1, 0.15, 0.1],
              scale: [1, 1.05, 1],
              x: currentStep === 4 ? 50 : 0,
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[var(--color-theme-primary)]/20 to-transparent blur-[120px]"
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
              <p className="text-[var(--color-theme-primary)] font-bold tracking-[0.2em] text-[10px] uppercase mb-6 drop-shadow-md">
                {currentContext.tag}
              </p>
              <h1 className="text-5xl xl:text-6xl font-serif mb-6 tracking-tight leading-[1.1] whitespace-pre-line">
                {currentContext.title}
              </h1>
              <p className="text-[var(--color-theme-outline)] text-sm leading-relaxed max-w-sm mb-12">
                {currentContext.desc}
              </p>

              <div className="p-5 rounded-2xl border border-[var(--color-theme-outline)]/20 bg-[var(--color-theme-surface)]/20 backdrop-blur-md max-w-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-theme-primary)]/50" />
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)] mb-2">
                  <Info className="w-4 h-4 text-[var(--color-theme-secondary)]" />{" "}
                  Why is this necessary?
                </h4>
                <p className="text-[12px] text-[var(--color-theme-muted)] leading-relaxed">
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
                    ? "w-8 bg-[var(--color-theme-primary)]"
                    : "w-2 bg-[var(--color-theme-outline)]/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Wizard Action Area */}
      <div className="w-full lg:w-[60%] xl:w-[65%] h-screen bg-[var(--color-theme-bg)] flex flex-col relative overflow-hidden">
        {/* Fixed Progress Bar Header */}
        <div className="w-full bg-[var(--color-theme-bg)]/95 backdrop-blur-md border-b border-[var(--color-theme-outline)]/10 px-8 pt-8 pb-5 sm:px-12 lg:px-20 z-20 shrink-0">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
              Configuration Progress
            </span>
            <span className="text-[11px] font-mono text-[var(--color-theme-text)]">
              {progressPercentage}% Complete
            </span>
          </div>
          <div className="w-full h-1 bg-[var(--color-theme-surface)]/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] shadow-[0_0_10px_var(--color-theme-primary)]/50"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.6, ease: "circOut" }}
            />
          </div>
        </div>

        {/* Scrolling Action Form Section */}
        <div className="flex-1 overflow-y-auto py-12 px-8 sm:px-12 lg:px-20 custom-scrollbar">
          <div className="max-w-2xl mx-auto pb-12">
            <AnimatePresence mode="wait">
              {/* STEP 1 */}
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
                    <h2 className="text-3xl font-serif text-[var(--color-theme-text)] mb-3 tracking-tight">
                      Project Identity
                    </h2>
                    <p className="text-sm text-[var(--color-theme-muted)]">
                      Define the foundational parameters for the new workspace.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)]">
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
                        className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-4 text-sm text-[var(--color-theme-muted)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition pr-12"
                        placeholder="/users/admin/foundry/projects/..."
                      />
                      <button
                        type="button"
                        onClick={handleBrowseClick}
                        className="absolute right-0 bottom-4 text-[var(--color-theme-outline)] group-hover:text-[var(--color-theme-text)] hover:!text-[var(--color-theme-primary)] transition"
                      >
                        <FolderSearch className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <motion.section
                  key="step-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-12"
                >
                  <div className="space-y-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)]">
                      Primary Database Connection URL
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.databaseUrl}
                      onChange={(e) =>
                        handleUpdate("databaseUrl", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-4 text-sm text-[var(--color-theme-muted)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                      placeholder="mysql://user:pass@host:3306/db"
                    />
                  </div>

                  <div className="space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)] flex items-center gap-2">
                      <Code className="w-4 h-4" /> Database Engine
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "postgresql",
                          label: "PostgreSQL",
                          desc: "Advanced relational engine.",
                          icon: Database,
                        },
                        {
                          id: "mysql",
                          label: "MySQL",
                          desc: "Reliable web-standard.",
                          icon: Database,
                        },
                        {
                          id: "mongodb",
                          label: "MongoDB",
                          desc: "Scalable NoSQL cluster.",
                          icon: Database,
                        },
                        {
                          id: "sqlite",
                          label: "SQLite",
                          desc: "Local light-weight file.",
                          icon: Database,
                        },
                      ].map((db) => (
                        <div
                          key={db.id}
                          onClick={() => handleUpdate("databaseEngine", db.id)}
                          className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 flex flex-col gap-3 ${
                            formData.databaseEngine === db.id
                              ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]/5"
                              : "border-[var(--color-theme-outline)]/20 bg-[var(--color-theme-surface)]/20 hover:border-[var(--color-theme-outline)]/50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div
                              className={`p-2 rounded-xl ${formData.databaseEngine === db.id ? "bg-[var(--color-theme-primary)]/20" : "bg-[var(--color-theme-surface)]/50"}`}
                            >
                              <db.icon
                                className={`w-4 h-4 ${formData.databaseEngine === db.id ? "text-[var(--color-theme-primary)]" : "text-[var(--color-theme-muted)]"}`}
                              />
                            </div>
                            {formData.databaseEngine === db.id && (
                              <CheckCircle className="w-4 h-4 text-[var(--color-theme-primary)]" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-[var(--color-theme-text)]">
                              {db.label}
                            </h4>
                            <p className="text-[11px] text-[var(--color-theme-muted)] mt-0.5">
                              {db.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)] flex items-center gap-2">
                      <Database className="w-4 h-4" /> Database ORM
                    </label>
                    <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        {
                          id: "drizzle",
                          label: "Drizzle ORM",
                          desc: "TypeScript-first performance, zero-overhead SQL mapping.",
                        },
                        {
                          id: "prisma",
                          label: "Prisma",
                          desc: "Type-safe Node.js & TypeScript client with rich auto-migrations.",
                        },
                        {
                          id: "mongoose",
                          label: "Mongoose",
                          desc: "Elegant asynchronous MongoDB object modeling schemas.",
                        },
                        {
                          id: "sqlalchemy",
                          label: "SQLAlchemy",
                          desc: "The enterprise-standard relational Python SQL toolkit mapper.",
                        },
                        {
                          id: "django_orm",
                          label: "Django ORM",
                          desc: "Robust, fully-integrated battery framework backend persistence.",
                        },
                        {
                          id: "eloquent",
                          label: "Eloquent",
                          desc: "Expressive ActiveRecord implementation for highly efficient setups.",
                        },
                        {
                          id: "hibernate",
                          label: "Hibernate",
                          desc: "High-performance object/relational persistence architecture for Java.",
                        },
                        {
                          id: "entity_framework",
                          label: "EF Core",
                          desc: "Lightweight, extensible multi-platform data mapper for .NET systems.",
                        },
                        {
                          id: "active_record",
                          label: "ActiveRecord",
                          desc: "Legendary convention-over-configuration data store connector.",
                        },
                      ].map((orm) => (
                        <div
                          key={orm.id}
                          onClick={() => handleUpdate("databaseOrm", orm.id)}
                          className={`cursor-pointer rounded-xl border p-3 flex items-center gap-4 transition-all duration-300 ${
                            formData.databaseOrm === orm.id
                              ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]/5"
                              : "border-[var(--color-theme-outline)]/20 bg-[var(--color-theme-surface)]/20 hover:border-[var(--color-theme-outline)]/50"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${formData.databaseOrm === orm.id ? "bg-[var(--color-theme-primary)]/20" : "bg-[var(--color-theme-surface)]/50"}`}
                          >
                            <Code
                              className={`w-4 h-4 ${formData.databaseOrm === orm.id ? "text-[var(--color-theme-primary)]" : "text-[var(--color-theme-muted)]"}`}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[13px] font-bold text-[var(--color-theme-text)]">
                              {orm.label}
                            </h4>
                            <p className="text-[11px] text-[var(--color-theme-muted)] mt-0.5">
                              {orm.desc}
                            </p>
                          </div>
                          {formData.databaseOrm === orm.id && (
                            <div className="pr-2">
                              <CheckCircle className="w-4 h-4 text-[var(--color-theme-primary)]" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Redis Field with interactive Explainer info button */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)]">
                        Redis URL Connection Key (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRedisInfo(!showRedisInfo)}
                        className={`transition-colors p-0.5 rounded focus:outline-none ${
                          showRedisInfo
                            ? "text-[var(--color-theme-primary)]"
                            : "text-[var(--color-theme-outline)] hover:text-[var(--color-theme-text)]"
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showRedisInfo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 rounded-xl border border-[var(--color-theme-primary)]/20 bg-[var(--color-theme-primary)]/5 text-xs text-[var(--color-theme-muted)] leading-relaxed space-y-2">
                            <p>
                              Redis is{" "}
                              <strong className="text-[var(--color-theme-text)]">
                                optional but highly recommended
                              </strong>
                              . If you want to experience the full features of
                              your application infrastructure (including
                              real-time websocket coordination, message queues,
                              and execution caching layers), setting up a Redis
                              engine is important.
                            </p>
                            <p>
                              To test it out instantly with zero local overhead,
                              you can create an instance on the{" "}
                              <a
                                href="https://upstash.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--color-theme-primary)] underline font-bold hover:text-[var(--color-theme-secondary)] transition"
                              >
                                Upstash free tier
                              </a>{" "}
                              and paste the provided connection string right
                              here.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input
                      type="text"
                      value={formData.redisUrl}
                      onChange={(e) => handleUpdate("redisUrl", e.target.value)}
                      className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-4 text-sm text-[var(--color-theme-muted)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                      placeholder="redis://127.0.0.1:6379"
                    />
                  </div>
                </motion.section>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <motion.section
                  key="step-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-12"
                >
                  <div className="space-y-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)] flex items-center gap-2">
                      <FolderSync className="w-4 h-4" /> Version Control
                      Interface
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      spellCheck="false"
                      autoCorrect="off"
                      value={formData.githubToken}
                      onChange={(e) =>
                        handleUpdate("githubToken", e.target.value)
                      }
                      className="w-full bg-[var(--color-theme-surface)]/20 border border-[var(--color-theme-outline)]/30 rounded-xl p-4 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition placeholder:text-[var(--color-theme-outline)]/50"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-[10px] text-[var(--color-theme-muted)] pl-1">
                      Tokens are hashed instantly and never stored as plaintext.
                    </p>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-[var(--color-theme-outline)]/10">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)] flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Outbound Notification Mail
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={formData.smtpHost}
                          onChange={(e) =>
                            handleUpdate("smtpHost", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="smtp.mailtrap.io"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
                          Port
                        </label>
                        <input
                          type="text"
                          value={formData.smtpPort}
                          onChange={(e) =>
                            handleUpdate("smtpPort", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="587"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
                        Critical Alert Email
                      </label>
                      <input
                        type="email"
                        value={formData.adminAlertEmail}
                        onChange={(e) =>
                          handleUpdate("adminAlertEmail", e.target.value)
                        }
                        className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                        placeholder="admin@enterprise-studio.dev"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
                          SMTP Username
                        </label>
                        <input
                          type="text"
                          value={formData.smtpUser}
                          onChange={(e) =>
                            handleUpdate("smtpUser", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="Username Token"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)]">
                          SMTP Password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          spellCheck="false"
                          autoCorrect="off"
                          value={formData.smtpPass}
                          onChange={(e) =>
                            handleUpdate("smtpPass", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* STEP 4 */}
              {currentStep === 4 && (
                <motion.section
                  key="step-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--color-theme-text)]">
                      Target Production Cloud Provider
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: "none",
                          label: "Local Only",
                          desc: "Infrastructure sandboxed to private particulate nodes.",
                          icon: Monitor,
                        },
                        {
                          id: "render",
                          label: "Render API",
                          desc: "Native automatic build v2 workers global edge network.",
                          icon: Cloud,
                        },
                        {
                          id: "railway",
                          label: "Railway",
                          desc: "Ephemerals scaling with high availability persistent volume.",
                          icon: Cpu,
                        },
                        {
                          id: "vercel",
                          label: "Vercel",
                          desc: "Optimized serverless functions & global CDN delivery.",
                          icon: Server,
                        },
                      ].map((provider) => (
                        <div
                          key={provider.id}
                          onClick={() =>
                            handleUpdate("deploymentProvider", provider.id)
                          }
                          className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 flex flex-col gap-4 ${
                            formData.deploymentProvider === provider.id
                              ? "border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]/5"
                              : "border-[var(--color-theme-outline)]/20 bg-[var(--color-theme-surface)]/20 hover:border-[var(--color-theme-outline)]/50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div
                              className={`p-2.5 rounded-xl ${formData.deploymentProvider === provider.id ? "bg-[var(--color-theme-primary)]/20" : "bg-[var(--color-theme-surface)]/50"}`}
                            >
                              <provider.icon
                                className={`w-5 h-5 ${formData.deploymentProvider === provider.id ? "text-[var(--color-theme-primary)]" : "text-[var(--color-theme-muted)]"}`}
                              />
                            </div>
                            {formData.deploymentProvider === provider.id && (
                              <CheckCircle className="w-5 h-5 text-[var(--color-theme-primary)]" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-[var(--color-theme-text)]">
                              {provider.label}
                            </h4>
                            <p className="text-[12px] text-[var(--color-theme-muted)] mt-1 leading-snug">
                              {provider.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.deploymentProvider !== "none" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
                    >
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)] flex items-center gap-2">
                          <Key className="w-3.5 h-3.5" /> Platform Deployment
                          API Key
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
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="rnd_xxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-theme-muted)] flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> Target Account Group
                          ID
                        </label>
                        <input
                          type="text"
                          value={formData.deploymentOwnerId}
                          onChange={(e) =>
                            handleUpdate("deploymentOwnerId", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-[var(--color-theme-outline)]/30 pb-3 text-sm text-[var(--color-theme-text)] font-mono focus:outline-none focus:border-[var(--color-theme-primary)] transition"
                          placeholder="usr_xxxxxxxxxxxxxxx"
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full bg-[var(--color-theme-bg)] border-t border-[var(--color-theme-outline)]/10 p-6 px-8 sm:px-12 lg:px-20 z-20 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Previous Button */}
            <button
              type="button"
              onClick={prevStep}
              className={`flex items-center gap-2 text-sm font-bold tracking-wide transition-all ${
                currentStep === 1
                  ? "opacity-0 pointer-events-none"
                  : "text-[var(--color-theme-muted)] hover:text-[var(--color-theme-text)]"
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>

            {/* Action Buttons Wrapper */}
            <div className="flex items-center gap-4">
              {/* NEXT BUTTON - Only shows on steps 1-3 */}
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3.5 rounded-xl bg-[var(--color-theme-primary)]/10 hover:bg-[var(--color-theme-primary)]/20 text-[var(--color-theme-primary)] text-sm font-bold transition-all flex items-center gap-2 tracking-wide"
                >
                  {currentContext.nextLabel} <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* SUBMIT BUTTON - Only shows on step 4 */}
              {currentStep === 4 && (
                <button
                  type="button" // Kept as "button" since we're handling the click manually without a true <form> tag
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className={`px-8 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 tracking-wide ${
                    isSubmitting
                      ? "bg-[var(--color-theme-surface)] text-[var(--color-theme-muted)] cursor-not-allowed"
                      : "bg-[var(--color-theme-primary)] hover:brightness-110 text-[var(--color-theme-on-primary)] shadow-[0_0_20px_var(--color-theme-primary)]/30"
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
        <div className="min-h-screen bg-[var(--color-theme-bg)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--color-theme-primary)] animate-spin" />
        </div>
      }
    >
      <EnvironmentSetupForm />
    </Suspense>
  );
}
