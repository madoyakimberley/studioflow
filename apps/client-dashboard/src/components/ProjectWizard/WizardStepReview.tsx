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
      <div className="bg-theme-surface border border-theme-outline rounded-2xl p-6">
        <h3 className="text-lg font-bold text-theme-text flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-5 h-5 text-theme-primary" />
          Ready to Launch
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Project Name</span>
              <span className="font-bold text-theme-text">
                {formData.name || "Unnamed"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Client</span>
              <span className="font-bold text-theme-text">
                {formData.clientName || "None"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Repository</span>
              <span className="font-bold text-theme-text capitalize">
                {formData.gitProvider}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Structure</span>
              <span className="font-bold text-theme-text capitalize">
                {formData.folderStructure}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Cloud Host</span>
              <span className="font-bold text-theme-text capitalize">
                {formData.deploymentTarget}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-theme-outline pb-2">
              <span className="text-theme-muted">Apps Total</span>
              <span className="font-bold text-theme-primary">
                {services.length} Microservices
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-theme-surface rounded-xl p-4 border border-theme-outline overflow-x-auto">
          <pre className="text-[11px] text-theme-muted font-mono leading-relaxed">
            $ cd {formData.workspacePath || "/Users/luna/Sites/work"}
            {"\n"}$ StudioFlow init {formData.name || "unnamed"}
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
