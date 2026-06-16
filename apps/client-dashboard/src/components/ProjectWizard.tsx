"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Database,
  Terminal,
  FolderTree,
  Server,
  Box,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  queueProjectProvisioning,
  UniversalManifestPayload,
} from "../app/action";
import { toast } from "sonner";

interface ProjectWizardProps {
  onClose?: () => void;
}

// ✅ FIXED: Wrapped in React.memo to prevent massive re-rendering lags on every state change
const SelectionCard = React.memo(
  ({ title, description, icon: Icon, selected, onClick }: any) => (
    <div
      onClick={onClick}
      className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-3 group h-full ${
        selected
          ? "border-[#d3d7ff] bg-[#1b2131]/90 shadow-[0_0_20px_rgba(211,215,255,0.1)]"
          : "hover:border-[#d3d7ff]/30 hover:bg-[#1b2131]/60 border-[#32353d]"
      }`}
    >
      <div
        className={`p-2.5 rounded-xl w-fit transition-colors ${
          selected ? "bg-[#d3d7ff]/10" : "bg-[#272a32] group-hover:bg-[#32353d]"
        }`}
      >
        <Icon
          className={`w-5 h-5 transition-colors ${
            selected
              ? "text-[#d3d7ff]"
              : "text-[#94a3b8] group-hover:text-[#d3d7ff]"
          }`}
        />
      </div>
      <div className="flex-1">
        <h4
          className={`font-medium text-base transition-colors ${
            selected ? "text-white" : "text-[#e0e2ec] group-hover:text-white"
          }`}
        >
          {title}
        </h4>
        <p className="text-xs text-[#c6c5d1] mt-1 leading-tight line-clamp-2">
          {description}
        </p>
      </div>
      {selected && (
        <div className="flex justify-end">
          <CheckCircle2 className="w-4 h-4 text-[#d3d7ff]" />
        </div>
      )}
    </div>
  ),
);

SelectionCard.displayName = "SelectionCard";

export default function ProjectWizard({ onClose }: ProjectWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [envDownloaded, setEnvDownloaded] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: "",
    clientName: "",
    brief: "",
    gitProvider: "github",
    frontendFramework: "nextjs",
    backendFramework: "express",
    database: "postgres",
    auth: "clerk",
    folderStructure: "monorepo",
    deploymentTarget: "vercel",
    features: ["Core Analytics Dashboard", "Structured Logging Guard"],
    priority: "STANDARD",
  });

  const triggerInBrowserEnvDownload = useCallback(() => {
    if (!formData.name) {
      toast.error("Project name is required");
      return;
    }
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    let envContentString = `# =========================================================================\n`;
    envContentString += `# PROJECT: ${slug}\n`;
    envContentString += `# Generated locally - Zero server exposure\n`;
    envContentString += `# =========================================================================\n\n`;
    envContentString += `NODE_ENV="development"\n`;
    envContentString += `PROJECT_SLUG="${slug}"\n`;
    envContentString += `ENGINE_VCS_PROVIDER="${formData.gitProvider}"\n`;

    // Core architectural choices to the downloaded .env
    envContentString += `ENGINE_FRONTEND_FRAMEWORK="${formData.frontendFramework}"\n`;
    envContentString += `ENGINE_BACKEND_FRAMEWORK="${formData.backendFramework}"\n`;
    envContentString += `ENGINE_FOLDER_STRUCTURE="${formData.folderStructure}"\n`;
    envContentString += `ENGINE_DEPLOYMENT_TARGET="${formData.deploymentTarget}"\n\n`;

    switch (formData.database) {
      case "postgres":
        envContentString += `DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/${slug}_db"\n`;
        break;
      case "mysql":
        envContentString += `DATABASE_URL="mysql://root:password@127.0.0.1:3306/${slug}_db"\n`;
        break;
      case "sqlite":
        envContentString += `DATABASE_URL="file:./local.db"\n`;
        break;
      default:
        envContentString += `# No database configured\n`;
    }

    const blob = new Blob([envContentString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${slug}.local`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setEnvDownloaded(true);
    toast.success("Local .env manifest downloaded");
  }, [formData]);

  const handleFormSubmissionLaunch = async () => {
    if (!formData.name || !formData.clientName) {
      toast.error("Project name and client are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        workspaceId: 1,
      };

      const response = await queueProjectProvisioning(payload as any);
      if (response.success) {
        toast.success("Project scaffolding queued successfully");
        if (onClose) onClose();
      } else {
        toast.error(response.error || "Submission failed");
      }
    } catch (err) {
      toast.error("Failed to initialize workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ FIXED: Quick update handlers to prevent inline function recreation lag
  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="fixed inset-0 bg-[#030407]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto transform-gpu">
      <div className="bg-[#0c0f16] border border-[#1f232e] w-full max-w-lg sm:max-w-2xl rounded-3xl p-5 sm:p-8 relative shadow-2xl max-h-[95vh] overflow-hidden flex flex-col transform-gpu">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#32353d] pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight lilac-gradient">
              New Project
            </h2>
            <p className="text-[#c6c5d1] text-sm mt-1">Configure your stack</p>
          </div>
          <div className="text-xs font-mono bg-[#1d2027] px-3 py-1 rounded-full border border-[#32353d] shrink-0">
            {step} / 4
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }} // ✅ FIXED: Sped up animation timing
              className="flex-1 py-6 space-y-6 overflow-y-auto"
            >
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#94a3b8]">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Portal"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full bg-[#1d2027] border border-[#32353d] focus:border-[#d3d7ff] rounded-2xl px-5 py-3.5 text-base placeholder:text-[#94a3b8]/60 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-[#94a3b8]">
                  Client / Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={formData.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  className="w-full bg-[#1d2027] border border-[#32353d] focus:border-[#d3d7ff] rounded-2xl px-5 py-3.5 text-base placeholder:text-[#94a3b8]/60 focus:outline-none transition-colors"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }} // ✅ FIXED: Sped up animation timing
              className="flex-1 py-6 space-y-8 overflow-y-auto"
            >
              <div>
                <label className="label-caps text-[#94a3b8] mb-4 block">
                  Frontend
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectionCard
                    title="Next.js"
                    description="App Router + Server Components"
                    icon={Box}
                    selected={formData.frontendFramework === "nextjs"}
                    onClick={() => updateField("frontendFramework", "nextjs")}
                  />
                  <SelectionCard
                    title="React SPA"
                    description="Vite + React Router"
                    icon={Layers}
                    selected={formData.frontendFramework === "react"}
                    onClick={() => updateField("frontendFramework", "react")}
                  />
                </div>
              </div>

              <div>
                <label className="label-caps text-[#94a3b8] mb-4 block">
                  Backend
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectionCard
                    title="Express"
                    description="Node.js REST API"
                    icon={Server}
                    selected={formData.backendFramework === "express"}
                    onClick={() => updateField("backendFramework", "express")}
                  />
                  <SelectionCard
                    title="FastAPI"
                    description="Python async API"
                    icon={Terminal}
                    selected={formData.backendFramework === "fastapi"}
                    onClick={() => updateField("backendFramework", "fastapi")}
                  />
                  <SelectionCard
                    title="Flask"
                    description="Lightweight Python"
                    icon={Terminal}
                    selected={formData.backendFramework === "flask"}
                    onClick={() => updateField("backendFramework", "flask")}
                  />
                  <SelectionCard
                    title="None"
                    description="Frontend only"
                    icon={Box}
                    selected={formData.backendFramework === "none"}
                    onClick={() => updateField("backendFramework", "none")}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }} // ✅ FIXED: Sped up animation timing
              className="flex-1 py-6 space-y-8 overflow-y-auto"
            >
              <div>
                <label className="label-caps text-[#94a3b8] mb-4 block">
                  Database
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SelectionCard
                    title="PostgreSQL"
                    description="Relational"
                    icon={Database}
                    selected={formData.database === "postgres"}
                    onClick={() => updateField("database", "postgres")}
                  />
                  <SelectionCard
                    title="MySQL"
                    description="Relational"
                    icon={Database}
                    selected={formData.database === "mysql"}
                    onClick={() => updateField("database", "mysql")}
                  />
                  <SelectionCard
                    title="SQLite"
                    description="Local file"
                    icon={Database}
                    selected={formData.database === "sqlite"}
                    onClick={() => updateField("database", "sqlite")}
                  />
                  <SelectionCard
                    title="None"
                    description="No DB"
                    icon={Box}
                    selected={formData.database === "none"}
                    onClick={() => updateField("database", "none")}
                  />
                </div>
              </div>

              <div>
                <label className="label-caps text-[#94a3b8] mb-4 block">
                  Structure
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectionCard
                    title="Monorepo"
                    description="Turborepo"
                    icon={FolderTree}
                    selected={formData.folderStructure === "monorepo"}
                    onClick={() => updateField("folderStructure", "monorepo")}
                  />
                  <SelectionCard
                    title="Flat"
                    description="Standard layout"
                    icon={Box}
                    selected={formData.folderStructure === "src_flat"}
                    onClick={() => updateField("folderStructure", "src_flat")}
                  />
                </div>
              </div>

              <div>
                <label className="label-caps text-[#94a3b8] mb-4 block">
                  Deploy Target
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <SelectionCard
                    title="Vercel"
                    description="Next.js optimized"
                    icon={Server}
                    selected={formData.deploymentTarget === "vercel"}
                    onClick={() => updateField("deploymentTarget", "vercel")}
                  />
                  <SelectionCard
                    title="Render"
                    description="Full stack"
                    icon={Server}
                    selected={formData.deploymentTarget === "render"}
                    onClick={() => updateField("deploymentTarget", "render")}
                  />
                  <SelectionCard
                    title="Railway"
                    description="Containers"
                    icon={Layers}
                    selected={formData.deploymentTarget === "railway"}
                    onClick={() => updateField("deploymentTarget", "railway")}
                  />
                  <SelectionCard
                    title="None"
                    description="Local only"
                    icon={Terminal}
                    selected={formData.deploymentTarget === "none"}
                    onClick={() => updateField("deploymentTarget", "none")}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }} // ✅ FIXED: Sped up animation timing
              className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d3d7ff] to-[#e8b3ff] flex items-center justify-center mb-6">
                <CheckCircle2 className="w-9 h-9 text-[#0c0f16]" />
              </div>

              <h3 className="text-2xl font-semibold text-white">
                Ready to Launch
              </h3>
              <p className="text-[#c6c5d1] mt-2 max-w-xs">
                Your project configuration is complete.
              </p>

              <div className="glass-card p-5 mt-8 w-full border border-[#ffb4ab]/30 bg-[#1d2027]/80 text-left">
                <div className="flex gap-3 text-amber-400 mb-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm font-medium">Client-Side Only</div>
                </div>
                <p className="text-xs text-[#c6c5d1]">
                  All secrets remain in your browser.
                </p>
              </div>

              <div className="w-full mt-8 space-y-3">
                <button
                  onClick={triggerInBrowserEnvDownload}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ffb347] to-[#ff8c00] text-black font-semibold flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.985] transition"
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD .ENV
                </button>

                <button
                  onClick={handleFormSubmissionLaunch}
                  disabled={isSubmitting || !envDownloaded}
                  className="w-full py-4 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 disabled:opacity-60 hover:bg-[#d3d7ff] active:scale-[0.985] transition"
                >
                  {isSubmitting ? "Provisioning..." : "INITIALIZE PROJECT"}
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between pt-6 border-t border-[#32353d] mt-auto">
            <button
              onClick={() => setStep((p) => Math.max(1, p - 1))}
              disabled={step === 1}
              className="px-6 py-3 rounded-2xl border border-[#32353d] hover:bg-[#1d2027] flex items-center gap-2 text-sm disabled:opacity-40 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={() => setStep((p) => p + 1)}
              disabled={
                (step === 1 &&
                  (!formData.name?.trim() || !formData.clientName?.trim())) ||
                isSubmitting
              }
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#d3d7ff] to-[#e8b3ff] text-black font-semibold flex items-center gap-2 hover:brightness-110 active:scale-[0.985] transition disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94a3b8] hover:text-white text-xl leading-none transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
