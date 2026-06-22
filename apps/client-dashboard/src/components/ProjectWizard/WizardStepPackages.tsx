import React from "react";
import { motion } from "framer-motion";
import { Package, ShieldCheck } from "lucide-react";
import { ESSENTIAL_DEPENDENCIES } from "./constants";

interface WizardStepPackagesProps {
  services: any[];
  setServices: (services: any[]) => void;
}

export const WizardStepPackages: React.FC<WizardStepPackagesProps> = ({
  services,
  setServices,
}) => {
  const toggleDependency = (srvId: string, pkgName: string) => {
    setServices(
      services.map((s) => {
        if (s.id !== srvId) return s;

        const isSelected = s.dependencies.some((d: any) => d.name === pkgName);
        if (isSelected) {
          // Remove it
          return {
            ...s,
            dependencies: s.dependencies.filter((d: any) => d.name !== pkgName),
          };
        } else {
          // Add it
          return {
            ...s,
            dependencies: [
              ...s.dependencies,
              { name: pkgName, version: "latest" },
            ],
          };
        }
      }),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="space-y-6"
    >
      <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-theme-primary shrink-0 mt-0.5" />
        <p className="text-xs text-theme-text leading-relaxed">
          <strong>Opinionated Infrastructure:</strong> We have bypassed standard
          packages (like React or Express) which are included automatically.
          Below are the battle-tested, enterprise-grade tools used by senior
          engineers to build production systems. Select the ones you need.
        </p>
      </div>

      <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        {services.map((srv) => {
          const suggestions = ESSENTIAL_DEPENDENCIES[srv.runtime] || [];

          if (suggestions.length === 0) return null;

          return (
            <div
              key={srv.id}
              className="bg-theme-surface border border-theme-outline rounded-2xl p-5 space-y-4"
            >
              <h3 className="text-sm font-bold text-theme-muted flex items-center gap-2 border-b border-theme-outline pb-3">
                <Package className="w-4 h-4 text-theme-primary" />
                Enterprise Arsenal for {srv.name} ({srv.runtime})
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
                {suggestions.map((dep, idx) => {
                  const isSelected = srv.dependencies.some(
                    (d: any) => d.name === dep.name,
                  );

                  return (
                    <button
                      key={idx}
                      onClick={() => toggleDependency(srv.id, dep.name)}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-theme-primary/10 border-theme-primary/50 shadow-sm shadow-theme-primary/10"
                          : "bg-theme-surface border-theme-outline hover:border-theme-primary"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <code
                          className={`text-[11px] font-bold font-mono ${isSelected ? "text-theme-primary" : "text-theme-muted"}`}
                        >
                          {dep.name}
                        </code>
                        <div
                          className={`w-3 h-3 rounded-full border ${isSelected ? "bg-theme-primary border-theme-primary" : "border-theme-outline"}`}
                        />
                      </div>
                      <span className="text-[10px] text-theme-muted leading-snug">
                        {dep.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
