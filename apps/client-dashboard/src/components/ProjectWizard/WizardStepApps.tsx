import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Plus, Trash2, ShieldAlert } from "lucide-react";
import { RUNTIME_PRESETS, FRAMEWORK_OPTIONS } from "./constants";

interface WizardStepAppsProps {
  formData: any;
  services: any[];
  addBlankService: () => void;
  updateServiceField: (id: string, field: string, value: any) => void;
  deleteService: (id: string) => void;
}

export const WizardStepApps: React.FC<WizardStepAppsProps> = ({
  formData,
  services,
  addBlankService,
  updateServiceField,
  deleteService,
}) => {
  const isFlatFolder = formData.folderStructure === "src_flat";

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-theme-outline">
        <h3 className="text-sm font-bold text-theme-muted flex items-center gap-2">
          <Server className="w-4 h-4 text-theme-primary" /> Your Apps & APIs
        </h3>

        {isFlatFolder ? (
          <div className="flex items-center gap-2 text-theme-secondary bg-theme-secondary/10 border border-theme-secondary/20 px-3 py-1.5 rounded-lg text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Limited to 1 App (Flat Folder Mode)
          </div>
        ) : (
          <button
            onClick={addBlankService}
            className="flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-primary/80 transition-colors bg-theme-primary/10 px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add App
          </button>
        )}
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {services.map((srv) => (
            <motion.div
              key={srv.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-theme-surface border border-theme-outline rounded-2xl p-5 space-y-4 overflow-hidden relative"
            >
              {!isFlatFolder && services.length > 1 && (
                <button
                  onClick={() => deleteService(srv.id)}
                  className="absolute top-4 right-4 text-theme-muted hover:text-theme-secondary transition-colors bg-theme-surface p-1.5 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                  Microservice Route Name
                </label>
                <input
                  type="text"
                  value={srv.name}
                  onChange={(e) =>
                    updateServiceField(
                      srv.id,
                      "name",
                      e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    )
                  }
                  className="w-full bg-theme-surface border border-theme-outline rounded-xl py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors font-mono"
                  placeholder="e.g. backend-api"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                    Core Language
                  </label>
                  <select
                    value={srv.runtime}
                    onChange={(e) =>
                      updateServiceField(srv.id, "runtime", e.target.value)
                    }
                    className="w-full bg-theme-surface border border-theme-outline rounded-xl py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
                  >
                    {RUNTIME_PRESETS.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isFlatFolder && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                      Target Output Directory
                    </label>
                    <input
                      type="text"
                      value={srv.rootDir}
                      onChange={(e) =>
                        updateServiceField(srv.id, "rootDir", e.target.value)
                      }
                      className="w-full bg-theme-surface border border-theme-outline rounded-xl py-2.5 px-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary transition-colors font-mono"
                    />
                  </div>
                )}
              </div>

              {FRAMEWORK_OPTIONS[srv.runtime] && (
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block mb-3">
                    Framework Engine
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {FRAMEWORK_OPTIONS[srv.runtime].map((fw) => (
                      <button
                        key={fw.value}
                        type="button"
                        onClick={() =>
                          updateServiceField(srv.id, "framework", fw.value)
                        }
                        className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${
                          srv.framework === fw.value
                            ? "bg-theme-primary/10 border-theme-primary text-theme-primary shadow-sm shadow-theme-primary/10"
                            : "bg-theme-surface border-theme-outline hover:border-theme-primary hover:bg-theme-surface"
                        }`}
                      >
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider ${srv.framework === fw.value ? "text-theme-primary/70" : "text-theme-muted"}`}
                        >
                          {fw.type}
                        </span>
                        <span
                          className={`text-sm font-semibold ${srv.framework === fw.value ? "text-theme-primary" : "text-theme-muted"}`}
                        >
                          {fw.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
