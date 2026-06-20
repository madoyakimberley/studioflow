import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface WizardStepReviewProps {
  formData: any;
  services: any[];
}

export const WizardStepReview: React.FC<WizardStepReviewProps> = ({
  formData,
  services,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="space-y-6"
    >
      <div className="bg-[#171a25] border border-[#32353d] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Ready to Launch
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Project Name</span>
              <span className="font-bold text-slate-200">
                {formData.name || "Unnamed"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Client</span>
              <span className="font-bold text-slate-200">
                {formData.clientName || "None"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Repository</span>
              <span className="font-bold text-slate-200 capitalize">
                {formData.gitProvider}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Structure</span>
              <span className="font-bold text-slate-200 capitalize">
                {formData.folderStructure}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Cloud Host</span>
              <span className="font-bold text-slate-200 capitalize">
                {formData.deploymentTarget}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#32353d] pb-2">
              <span className="text-slate-400">Apps Total</span>
              <span className="font-bold text-indigo-400">
                {services.length} Microservices
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-[#0f111a] rounded-xl p-4 border border-[#32353d] overflow-x-auto">
          <pre className="text-[11px] text-slate-400 font-mono leading-relaxed">
            $ StudioFlow init {formData.name || "unnamed"}
            {"\n"}$ Setting up {formData.gitProvider} repository...
            {"\n"}$ Configuring {formData.folderStructure} layout...
            {services.map(
              (s) =>
                `\n$ Scaffolding [${s.name}] using ${s.runtime} (${s.framework})`,
            )}
            {"\n"}$ Generating CI/CD pipelines for {formData.deploymentTarget}
            ...
          </pre>
        </div>
      </div>
    </motion.div>
  );
};
