"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Zap,
  Terminal,
  FolderTree,
  Server,
  Plus,
  Trash2,
  Package,
  Code,
  CheckCircle2,
  AlertCircle,
  Box,
  Mail,
  User,
  Info,
} from "lucide-react";
import {
  queueProjectProvisioning,
  UniversalServiceConfig,
} from "../app/action";
import { toast } from "sonner";

interface ProjectWizardProps {
  onClose?: () => void;
}

// Tooltip Component to deeply explain configurations
const DeepTooltip = ({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) => {
  return (
    <div className="group relative flex items-center w-full">
      {children}
      <div className="absolute left-0 bottom-full mb-2 hidden w-72 p-3 text-xs text-slate-200 bg-[#0f111a] border border-indigo-500/30 rounded-xl shadow-2xl shadow-indigo-900/20 group-hover:block z-50 transition-all duration-200">
        <div className="flex gap-2 items-start">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
};

const RUNTIME_PRESETS = [
  { value: "node", label: "NodeJS (JavaScript/TypeScript)" },
  { value: "python", label: "Python (Pip/Uv Matrix)" },
  { value: "go", label: "Go (Golang Modules)" },
  { value: "rust", label: "Rust (Cargo Core)" },
  { value: "static", label: "Static HTML/SPA Hosting" },
];

const POPULAR_DEPENDENCIES: Record<
  string,
  Array<{ name: string; version: string; desc: string }>
> = {
  node: [
    {
      name: "express",
      version: "^4.19.2",
      desc: "Tools for building websites",
    },
    { name: "zod", version: "^3.23.8", desc: "Data validation tool" },
    {
      name: "cors",
      version: "^2.8.5",
      desc: "Allows requests from other sites",
    },
    {
      name: "dotenv",
      version: "^16.4.5",
      desc: "Manages secret configuration settings",
    },
  ],
  python: [
    {
      name: "fastapi",
      version: "^0.111.0",
      desc: "Fast tool for building web services",
    },
    { name: "uvicorn", version: "^0.30.1", desc: "Web server" },
    { name: "gunicorn", version: "^22.0.0", desc: "Production web server" },
    {
      name: "requests",
      version: "^2.32.3",
      desc: "Tool to fetch web resources",
    },
  ],
  go: [
    {
      name: "github.com/gin-gonic/gin",
      version: "v1.10.0",
      desc: "Web traffic manager",
    },
    {
      name: "github.com/joho/godotenv",
      version: "v1.5.1",
      desc: "Configuration manager",
    },
  ],
  rust: [
    { name: "tokio", version: "1.38", desc: "Background processor" },
    { name: "serde", version: "1.0", desc: "Data conversion helper" },
  ],
};

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State Architecture
  const [formData, setFormData] = useState({
    workspaceId: 1,
    name: "",
    clientName: "",
    clientEmail: "",
    brief: "",
    gitProvider: "github" as "github" | "gitlab",
    folderStructure: "monorepo" as "monorepo" | "src_flat",
    deploymentTarget: "vercel" as "vercel" | "render" | "railway" | "none",
    nodePackageManager: "pnpm" as "npm" | "pnpm" | "yarn" | "bun",
  });

  // Services State Matrix
  const [services, setServices] = useState<UniversalServiceConfig[]>([
    {
      id: "srv-1",
      name: "frontend-web",
      type: "web",
      runtime: "node",
      rootDir: "apps/frontend-web",
      buildCommand: "pnpm install && pnpm run build",
      startCommand: "pnpm run start",
      dependencies: [{ name: "zod", version: "^3.23.8" }],
    },
    {
      id: "srv-2",
      name: "api-core",
      type: "web",
      runtime: "python",
      rootDir: "apps/api-core",
      buildCommand: "pip install -r requirements.txt",
      startCommand:
        "python -m gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT",
      dependencies: [
        { name: "fastapi", version: "^0.111.0" },
        { name: "gunicorn", version: "^22.0.0" },
      ],
    },
  ]);

  // Custom Input State for Add Dependency Row
  const [customDep, setCustomDep] = useState({
    srvId: "",
    name: "",
    version: "",
  });

  const handlePackageManagerChange = (pm: "npm" | "pnpm" | "yarn" | "bun") => {
    setFormData((prev) => ({ ...prev, nodePackageManager: pm }));

    setServices((currentServices) =>
      currentServices.map((srv) => {
        if (srv.runtime !== "node") return srv;

        let newBuild = srv.buildCommand;
        let newStart = srv.startCommand;

        const pmRegex = /npm|pnpm|yarn|bun/g;
        newBuild = newBuild.replace(pmRegex, pm);
        newStart = newStart.replace(pmRegex, pm);

        if (pm === "yarn") {
          newBuild = newBuild.replace("yarn install", "yarn");
        } else if (srv.buildCommand?.includes("yarn")) {
          newBuild = newBuild.replace(`${pm} &&`, `${pm} install &&`);
        }

        return { ...srv, buildCommand: newBuild, startCommand: newStart };
      }),
    );
  };

  const addBlankService = () => {
    const nextId = `srv-${Date.now()}`;
    const pm = formData.nodePackageManager;
    const installCmd = pm === "yarn" ? "yarn" : `${pm} install`;
    const runCmd = pm === "npm" || pm === "bun" ? `${pm} run` : pm;

    setServices([
      ...services,
      {
        id: nextId,
        name: `service-node-${services.length + 1}`,
        type: "web",
        runtime: "node",
        rootDir:
          formData.folderStructure === "monorepo"
            ? `apps/service-${services.length + 1}`
            : ".",
        buildCommand: `${installCmd} && ${runCmd} build`,
        startCommand: `${runCmd} start`,
        dependencies: [],
      },
    ]);
  };

  const updateServiceField = (
    id: string,
    field: keyof UniversalServiceConfig,
    value: any,
  ) => {
    setServices(
      services.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "runtime") {
          if (value === "python") {
            updated.buildCommand = "pip install -r requirements.txt";
            updated.startCommand =
              "python -m gunicorn main:app --bind 0.0.0.0:$PORT";
          } else if (value === "node") {
            const pm = formData.nodePackageManager;
            const installCmd = pm === "yarn" ? "yarn" : `${pm} install`;
            const runCmd = pm === "npm" || pm === "bun" ? `${pm} run` : pm;
            updated.buildCommand = `${installCmd} && ${runCmd} build`;
            updated.startCommand = `${runCmd} start`;
          }
        }
        return updated;
      }),
    );
  };

  const deleteService = (id: string) => {
    if (services.length <= 1) {
      toast.error(
        "Your project must have at least one application or service.",
      );
      return;
    }
    setServices(services.filter((s) => s.id !== id));
  };

  const addDependencyToService = (
    srvId: string,
    name: string,
    version: string,
  ) => {
    if (!name.trim()) return;
    setServices(
      services.map((s) => {
        if (s.id !== srvId) return s;
        if (
          s.dependencies.some(
            (d) => d.name.toLowerCase() === name.toLowerCase(),
          )
        ) {
          toast.warning("This package is already added.");
          return s;
        }
        return {
          ...s,
          dependencies: [...s.dependencies, { name, version }],
        };
      }),
    );
  };

  const handleSubmitPipeline = async () => {
    setIsSubmitting(true);
    try {
      const res = await queueProjectProvisioning({
        workspaceId: formData.workspaceId,
        name: formData.name,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        brief: formData.brief,
        gitProvider: formData.gitProvider,
        folderStructure: formData.folderStructure,
        deploymentTarget: formData.deploymentTarget,
        nodePackageManager: formData.nodePackageManager,
        services: services,
        blueprintYaml: "",
      });

      if (res.success) {
        toast.success("Project setup completed successfully!");
        if (onClose) onClose();
      } else {
        toast.error(res.error || "Failed to configure project.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-100">
      <div className="bg-[#12141c] w-full max-w-5xl h-[85vh] rounded-3xl border border-[#32353d] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Header */}
        <div className="p-6 border-b border-[#32353d] flex justify-between items-center bg-[#161924]">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-200 to-purple-300 bg-clip-text text-transparent flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" /> Project Setup
              Wizard
            </h2>
            <div className="mt-auto pt-8">
              <p className="text-xs text-slate-400">
                Fill out your project information, add applications, and
                configure settings.
              </p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: "Project Details" },
              { num: 2, label: "Services & Apps" },
              { num: 3, label: "Required Packages" },
              { num: 4, label: "Review & Launch" },
            ].map((sNode) => (
              <div key={sNode.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === sNode.num
                      ? "bg-indigo-600 text-white"
                      : step > sNode.num
                        ? "bg-emerald-600 text-white"
                        : "bg-[#1d212f] text-slate-400 border border-[#32353d]"
                  }`}
                >
                  {step > sNode.num ? "✓" : sNode.num}
                </div>
                <span
                  className={`text-xs font-medium hidden md:inline ${
                    step === sNode.num ? "text-indigo-400" : "text-slate-400"
                  }`}
                >
                  {sNode.label}
                </span>
                {sNode.num < 4 && (
                  <div className="w-4 h-[1px] bg-[#32353d] hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content Steps Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: PROJECT DETAILS */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help">
                    Project Name
                  </label>
                  <DeepTooltip text=" Use lowercase letters and hyphens .">
                    <div className="relative w-full">
                      <FolderTree className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g. online-store"
                        className="w-full bg-[#171a25] border border-[#32353d] py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </DeepTooltip>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Client Name
                  </label>
                  <DeepTooltip text=" This is logged in your workspace CRM.">
                    <div className="relative w-full">
                      <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            clientName: e.target.value,
                          })
                        }
                        placeholder="e.g. John Doe"
                        className="w-full bg-[#171a25] border border-[#32353d] py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </DeepTooltip>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Client Email
                  </label>
                  <DeepTooltip text="For client dashboard portal .">
                    <div className="relative w-full">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            clientEmail: e.target.value,
                          })
                        }
                        placeholder="e.g. client@company.com"
                        className="w-full bg-[#171a25] border border-[#32353d] py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </DeepTooltip>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Project Description
                </label>
                <textarea
                  rows={2}
                  value={formData.brief}
                  onChange={(e) =>
                    setFormData({ ...formData, brief: e.target.value })
                  }
                  placeholder="Describe the main goals and requirements of the project..."
                  className="w-full bg-[#171a25] border border-[#32353d] p-3 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-[#32353d]">
                {/* Git Provider */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Git Provider
                  </label>
                  <DeepTooltip text="Selects the version control system. StudioFlow will use your configured Personal Access Token (PAT) to automatically provision a private repository here and push the initial commit.">
                    <div className="flex gap-2 w-full">
                      {["github", "gitlab"].map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              gitProvider: prov as "github" | "gitlab",
                            })
                          }
                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                            formData.gitProvider === prov
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/10"
                              : "bg-[#171a25] border-[#32353d] text-slate-400 hover:border-slate-600 hover:bg-[#1b1f2c]"
                          }`}
                        >
                          {prov === "github" ? "GitHub" : "GitLab"}
                        </button>
                      ))}
                    </div>
                  </DeepTooltip>
                </div>

                {/* Package Manager */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Package Manager
                  </label>
                  <DeepTooltip text="Dictates how Node.js dependencies are installed and managed. pnpm is recommended for speed and disk-space efficiency in monorepo structures.">
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {(["npm", "pnpm", "yarn", "bun"] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => handlePackageManagerChange(pm)}
                          className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                            formData.nodePackageManager === pm
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/10"
                              : "bg-[#171a25] border-[#32353d] text-slate-400 hover:border-slate-600 hover:bg-[#1b1f2c]"
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </DeepTooltip>
                </div>

                {/* Project Layout */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Project Layout
                  </label>
                  <DeepTooltip text="Monorepo creates a master folder containing sub-folders for each app (e.g. apps/web, apps/api). Flat Structure drops everything into the root folder (best for single-app projects).">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      {[
                        {
                          val: "monorepo",
                          title: "Monorepo",
                          desc: "Multiple sub-folders",
                        },
                        {
                          val: "src_flat",
                          title: "Flat Structure",
                          desc: "Single root folder",
                        },
                      ].map((item) => (
                        <div
                          key={item.val}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              folderStructure: item.val as
                                | "monorepo"
                                | "src_flat",
                            })
                          }
                          className={`cursor-pointer p-4 rounded-xl border transition-all ${
                            formData.folderStructure === item.val
                              ? "bg-indigo-500/20 border-indigo-500 shadow-sm shadow-indigo-500/10"
                              : "bg-[#171a25] border-[#32353d] hover:border-slate-600 hover:bg-[#1b1f2c]"
                          }`}
                        >
                          <div
                            className={`text-sm font-bold ${
                              formData.folderStructure === item.val
                                ? "text-indigo-300"
                                : "text-slate-300"
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DeepTooltip>
                </div>

                {/* Deployment Target */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Deployment Target
                  </label>
                  <DeepTooltip text="Vercel is optimal for Next.js/Frontend. Render and Railway are great for full-stack Node/Python backends and databases. Choosing an option here will automatically provision the necessary cloud project via API upon creation.">
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {[
                        { val: "vercel", label: "Vercel" },
                        { val: "render", label: "Render" },
                        { val: "railway", label: "Railway" },
                        { val: "none", label: "Local Only" },
                      ].map((target) => (
                        <button
                          key={target.val}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              deploymentTarget: target.val as
                                | "vercel"
                                | "render"
                                | "railway"
                                | "none",
                            })
                          }
                          className={`py-3 px-2 rounded-xl border text-[11px] font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                            formData.deploymentTarget === target.val
                              ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/10"
                              : "bg-[#171a25] border-[#32353d] text-slate-400 hover:border-slate-600 hover:bg-[#1b1f2c]"
                          }`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </DeepTooltip>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SERVICES CONFIGURATION */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
                  Project Services ({services.length} Active)
                </h3>
                <button
                  type="button"
                  onClick={addBlankService}
                  className="bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> Add Service
                </button>
              </div>

              <div className="space-y-4">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-[#151822] border border-[#2b2e38] rounded-2xl p-4 space-y-5 relative"
                  >
                    <div className="absolute right-4 top-4 z-10">
                      <button
                        type="button"
                        onClick={() => deleteService(srv.id)}
                        className="text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Service Name
                        </label>
                        <DeepTooltip text="The logical identifier for this app. If deploying to Render/Vercel, this dictates the project name suffix on the dashboard.">
                          <input
                            type="text"
                            value={srv.name}
                            onChange={(e) =>
                              updateServiceField(srv.id, "name", e.target.value)
                            }
                            className="w-full bg-[#1d212f] border border-[#32353d] p-2.5 rounded-lg text-xs text-slate-200"
                          />
                        </DeepTooltip>
                      </div>

                      <div className="space-y-1.5 pr-8">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Folder Path
                        </label>
                        <DeepTooltip text="The local filesystem directory where this service's source code will reside (e.g. apps/web or packages/ui).">
                          <input
                            type="text"
                            value={srv.rootDir}
                            onChange={(e) =>
                              updateServiceField(
                                srv.id,
                                "rootDir",
                                e.target.value,
                              )
                            }
                            className="w-full bg-[#1d212f] border border-[#32353d] p-2.5 rounded-lg text-xs text-slate-200"
                          />
                        </DeepTooltip>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Service Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { val: "web", label: "Web App" },
                            { val: "worker", label: "Worker" },
                            { val: "private", label: "Private" },
                            { val: "cron", label: "Cron" },
                          ].map((t) => (
                            <button
                              key={t.val}
                              type="button"
                              onClick={() =>
                                updateServiceField(srv.id, "type", t.val)
                              }
                              className={`py-2 px-1 rounded-lg border text-[10px] font-semibold transition-all ${
                                srv.type === t.val
                                  ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                  : "bg-[#1d212f] border-[#32353d] text-slate-400 hover:border-[#4b4e58]"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Language / Runtime
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {RUNTIME_PRESETS.map((p) => {
                            const shortLabel =
                              p.value === "static"
                                ? "Static HTML"
                                : p.label.split(" ")[0];
                            return (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() =>
                                  updateServiceField(srv.id, "runtime", p.value)
                                }
                                className={`py-2 px-3 rounded-lg border text-[10px] font-semibold transition-all flex-1 min-w-[70px] ${
                                  srv.runtime === p.value
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                    : "bg-[#1d212f] border-[#32353d] text-slate-400 hover:border-[#4b4e58]"
                                }`}
                              >
                                {shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#2b2e38] pt-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 cursor-help">
                          Cloud Build Command
                        </label>
                        <DeepTooltip text="The exact terminal command the cloud provider (Render/Vercel) will run to install packages and compile your app. Example: 'pnpm install && next build'.">
                          <input
                            type="text"
                            value={srv.buildCommand}
                            onChange={(e) =>
                              updateServiceField(
                                srv.id,
                                "buildCommand",
                                e.target.value,
                              )
                            }
                            className="w-full bg-[#1d212f] border border-[#32353d] p-2.5 rounded-lg text-xs text-slate-300 font-mono"
                          />
                        </DeepTooltip>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Start Command
                        </label>
                        <DeepTooltip text="The exact terminal command the cloud provider will execute to start your web server. For Node, often 'pnpm run start' or 'node dist/index.js'.">
                          <input
                            type="text"
                            value={srv.startCommand}
                            onChange={(e) =>
                              updateServiceField(
                                srv.id,
                                "startCommand",
                                e.target.value,
                              )
                            }
                            className="w-full bg-[#1d212f] border border-[#32353d] p-2.5 rounded-lg text-xs text-slate-300 font-mono"
                            placeholder="e.g. node dist/server.js"
                          />
                        </DeepTooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: PACKAGES AND TOOLS */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Package & Tool Settings
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="bg-[#151822] border border-[#2b2e38] rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-[#2b2e38] pb-2">
                      <span className="text-sm font-bold text-indigo-400">
                        {s.name} ({s.runtime})
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {s.dependencies.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          No custom packages added yet.
                        </p>
                      ) : (
                        s.dependencies.map((d) => (
                          <div
                            key={d.name}
                            className="flex justify-between items-center bg-[#1d212f]/50 px-3 py-1.5 rounded-lg border border-slate-800"
                          >
                            <span className="text-xs font-mono text-slate-300">
                              {d.name}{" "}
                              <span className="text-slate-500">
                                ({d.version})
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setServices(
                                  services.map((ser) => {
                                    if (ser.id !== s.id) return ser;
                                    return {
                                      ...ser,
                                      dependencies: ser.dependencies.filter(
                                        (dep) => dep.name !== d.name,
                                      ),
                                    };
                                  }),
                                );
                              }}
                              className="text-slate-500 hover:text-rose-400 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Package Name"
                        value={customDep.srvId === s.id ? customDep.name : ""}
                        onChange={(e) =>
                          setCustomDep({
                            srvId: s.id,
                            name: e.target.value,
                            version:
                              customDep.srvId === s.id ? customDep.version : "",
                          })
                        }
                        className="col-span-2 bg-[#171a25] border border-[#32353d] p-2 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            customDep.srvId === s.id &&
                            customDep.name.trim()
                          ) {
                            addDependencyToService(
                              s.id,
                              customDep.name,
                              customDep.version || "latest",
                            );
                            setCustomDep({ srvId: "", name: "", version: "" });
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                      >
                        Add
                      </button>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Recommended Options
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {POPULAR_DEPENDENCIES[s.runtime]?.map((p) => (
                          <div
                            key={p.name}
                            onClick={() =>
                              addDependencyToService(s.id, p.name, p.version)
                            }
                            className="bg-[#1b1e2a]/50 border border-slate-800 p-2 rounded-xl cursor-pointer hover:border-indigo-500/40 hover:bg-[#1b1e2a] transition group text-left"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-indigo-400 transition">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {p.version}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              {p.name === "express"
                                ? "Tools for building websites"
                                : p.name === "zod"
                                  ? "Data validation tool"
                                  : p.name === "cors"
                                    ? "Allows requests from other sites"
                                    : p.name === "dotenv"
                                      ? "Manages secret configuration settings"
                                      : p.name === "fastapi"
                                        ? "Fast tool for building web services"
                                        : p.name === "uvicorn"
                                          ? "Web server"
                                          : p.name === "gunicorn"
                                            ? "Production web server"
                                            : p.name === "requests"
                                              ? "Tool to fetch web resources"
                                              : p.name ===
                                                  "github.com/gin-gonic/gin"
                                                ? "Web traffic manager"
                                                : p.name ===
                                                    "github.com/joho/godotenv"
                                                  ? "Configuration manager"
                                                  : p.name === "tokio"
                                                    ? "Background processor"
                                                    : p.name === "serde"
                                                      ? "Data conversion helper"
                                                      : p.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 4: CONFIGURATION REVIEW */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                  Review Project Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Please check your configuration choices before creating the
                  project.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Configuration Preview
                </label>
                <textarea
                  readOnly
                  value={JSON.stringify(
                    { project: formData, services },
                    null,
                    2,
                  )}
                  className="w-full text-xs font-mono leading-relaxed bg-[#0b0d14] p-4 rounded-xl border border-[#32353d] focus:ring-1 focus:ring-slate-800"
                  rows={12}
                />
              </div>
              <div className="bg-[#191512] border border-amber-900/40 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-400">
                    Important Note
                  </h4>
                  <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                    Clicking launch will initialize the repository setup,
                    configure folder layouts, and create the client access
                    portal. This process takes a few moments.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions Panel */}
        <div className="p-6 border-t border-[#32353d] bg-[#161924] flex justify-between items-center">
          <button
            type="button"
            disabled={step === 1 || isSubmitting}
            onClick={() => setStep((p) => p - 1)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-[#32353d] hover:bg-[#1d212f] transition disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (
                  step === 1 &&
                  (!formData.name.trim() ||
                    !formData.clientName.trim() ||
                    !formData.clientEmail.trim())
                ) {
                  toast.error(
                    "Please provide a project name, client name, and client email.",
                  );
                  return;
                }
                setStep((p) => p + 1);
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 shadow-lg flex items-center gap-1 active:scale-95 transition"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitPipeline}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:brightness-110 shadow-xl flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Create
              Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
