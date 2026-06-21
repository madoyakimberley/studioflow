import React from "react";
import { motion } from "framer-motion";
import {
  FolderTree,
  User,
  Mail,
  FolderGit2,
  FolderArchive,
} from "lucide-react";
import { DeepTooltip } from "./DeepTooltip";

interface WizardStepDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  handleFolderStructureChange: (structure: "monorepo" | "src_flat") => void;
  handlePackageManagerChange: (pm: "npm" | "pnpm" | "yarn" | "bun") => void;
}

export const WizardStepDetails: React.FC<WizardStepDetailsProps> = ({
  formData,
  setFormData,
  handleFolderStructureChange,
  handlePackageManagerChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Project Name
          </label>
          <DeepTooltip text="Use small letters and dashes only.">
            <div className="relative w-full">
              <FolderTree className="absolute left-3 top-3.5 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. online-store"
                className="w-full bg-theme-surface border border-theme-outline rounded-xl py-3 pl-10 pr-4 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Client Name
          </label>
          <DeepTooltip text="Used for dashboard labels.">
            <div className="relative w-full">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                placeholder="e.g. Acme Corp"
                className="w-full bg-theme-surface border border-theme-outline rounded-xl py-3 pl-10 pr-4 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Client Email
          </label>
          <DeepTooltip text="Used for sending secure portal PINs.">
            <div className="relative w-full">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-theme-muted" />
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) =>
                  setFormData({ ...formData, clientEmail: e.target.value })
                }
                placeholder="e.g. client@acme.com"
                className="w-full bg-theme-surface border border-theme-outline rounded-xl py-3 pl-10 pr-4 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-xs font-semibold text-theme-muted uppercase">
          Project Brief / MVP Goals
        </label>
        <textarea
          value={formData.brief}
          onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
          placeholder="What is the core functionality?"
          className="w-full bg-theme-surface border border-theme-outline rounded-xl py-3 px-4 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors h-24 resize-none custom-scrollbar"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        <div className="space-y-3">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Structure Strategy
          </label>
          <div className="grid grid-cols-1 gap-3 w-full">
            <button
              type="button"
              onClick={() => handleFolderStructureChange("monorepo")}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 text-left ${
                formData.folderStructure === "monorepo"
                  ? "bg-theme-primary/20 border-theme-primary shadow-sm shadow-theme-primary/10"
                  : "bg-theme-surface border-theme-outline hover:border-theme-primary hover:bg-theme-surface"
              }`}
            >
              <FolderGit2
                className={`w-5 h-5 shrink-0 mt-0.5 ${formData.folderStructure === "monorepo" ? "text-theme-primary" : "text-theme-muted"}`}
              />
              <div>
                <span
                  className={`block font-bold text-sm ${formData.folderStructure === "monorepo" ? "text-theme-primary" : "text-theme-muted"}`}
                >
                  Monorepo
                </span>
                <span className="block text-[11px] text-theme-muted font-normal mt-1 leading-tight">
                  Best for Fullstack. Supports multiple languages &
                  microservices in one repo.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFolderStructureChange("src_flat")}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 text-left ${
                formData.folderStructure === "src_flat"
                  ? "bg-theme-secondary/20 border-theme-secondary shadow-sm shadow-theme-secondary/10"
                  : "bg-theme-surface border-theme-outline hover:border-theme-primary hover:bg-theme-surface"
              }`}
            >
              <FolderArchive
                className={`w-5 h-5 shrink-0 mt-0.5 ${formData.folderStructure === "src_flat" ? "text-theme-secondary" : "text-theme-muted"}`}
              />
              <div>
                <span
                  className={`block font-bold text-sm ${formData.folderStructure === "src_flat" ? "text-theme-secondary" : "text-theme-muted"}`}
                >
                  Flat Folder
                </span>
                <span className="block text-[11px] text-theme-muted font-normal mt-1 leading-tight">
                  Standard repository. Strictly limits you to 1 primary language
                  / single app.
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Package Manager
          </label>
          <DeepTooltip text="Fastest is pnpm or bun. Default is npm.">
            <div className="grid grid-cols-2 gap-2 w-full">
              {["npm", "pnpm", "yarn", "bun"].map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => handlePackageManagerChange(pm as any)}
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                    formData.nodePackageManager === pm
                      ? "bg-theme-primary/20 border-theme-primary text-theme-primary shadow-sm shadow-theme-primary/10"
                      : "bg-theme-surface border-theme-outline text-theme-muted hover:border-theme-primary hover:bg-theme-surface"
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </DeepTooltip>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-theme-muted uppercase">
            Where to launch it (Cloud)
          </label>
          <DeepTooltip text="Choose where you want the website to live.">
            <div className="grid grid-cols-2 gap-2 w-full">
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
                    setFormData({ ...formData, deploymentTarget: target.val })
                  }
                  className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                    formData.deploymentTarget === target.val
                      ? "bg-theme-primary/20 border-theme-primary text-theme-primary shadow-sm shadow-theme-primary/10"
                      : "bg-theme-surface border-theme-outline text-theme-muted hover:border-theme-primary hover:bg-theme-surface"
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
  );
};
