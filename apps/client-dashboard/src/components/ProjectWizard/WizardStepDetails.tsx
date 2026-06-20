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
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Project Name
          </label>
          <DeepTooltip text="Use small letters and dashes only.">
            <div className="relative w-full">
              <FolderTree className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. online-store"
                className="w-full bg-[#171a25] border border-[#32353d] rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Client Name
          </label>
          <DeepTooltip text="Used for dashboard labels.">
            <div className="relative w-full">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                placeholder="e.g. Acme Corp"
                className="w-full bg-[#171a25] border border-[#32353d] rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Client Email
          </label>
          <DeepTooltip text="Used for sending secure portal PINs.">
            <div className="relative w-full">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) =>
                  setFormData({ ...formData, clientEmail: e.target.value })
                }
                placeholder="e.g. client@acme.com"
                className="w-full bg-[#171a25] border border-[#32353d] rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </DeepTooltip>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-xs font-semibold text-slate-400 uppercase">
          Project Brief / MVP Goals
        </label>
        <textarea
          value={formData.brief}
          onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
          placeholder="What is the core functionality?"
          className="w-full bg-[#171a25] border border-[#32353d] rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none custom-scrollbar"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Structure Strategy
          </label>
          <div className="grid grid-cols-1 gap-3 w-full">
            <button
              type="button"
              onClick={() => handleFolderStructureChange("monorepo")}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 text-left ${
                formData.folderStructure === "monorepo"
                  ? "bg-indigo-500/20 border-indigo-500 shadow-sm shadow-indigo-500/10"
                  : "bg-[#171a25] border-[#32353d] hover:border-slate-600 hover:bg-[#1b1f2c]"
              }`}
            >
              <FolderGit2
                className={`w-5 h-5 shrink-0 mt-0.5 ${formData.folderStructure === "monorepo" ? "text-indigo-400" : "text-slate-500"}`}
              />
              <div>
                <span
                  className={`block font-bold text-sm ${formData.folderStructure === "monorepo" ? "text-indigo-200" : "text-slate-300"}`}
                >
                  Monorepo
                </span>
                <span className="block text-[11px] text-slate-500 font-normal mt-1 leading-tight">
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
                  ? "bg-amber-500/20 border-amber-500 shadow-sm shadow-amber-500/10"
                  : "bg-[#171a25] border-[#32353d] hover:border-slate-600 hover:bg-[#1b1f2c]"
              }`}
            >
              <FolderArchive
                className={`w-5 h-5 shrink-0 mt-0.5 ${formData.folderStructure === "src_flat" ? "text-amber-400" : "text-slate-500"}`}
              />
              <div>
                <span
                  className={`block font-bold text-sm ${formData.folderStructure === "src_flat" ? "text-amber-200" : "text-slate-300"}`}
                >
                  Flat Folder
                </span>
                <span className="block text-[11px] text-slate-500 font-normal mt-1 leading-tight">
                  Standard repository. Strictly limits you to 1 primary language
                  / single app.
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">
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

        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">
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
  );
};
