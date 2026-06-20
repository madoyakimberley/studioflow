"use client";

import React, { useState } from "react";
import { Terminal, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import {
  queueProjectProvisioning,
  UniversalServiceConfig,
} from "../../app/action";
import { toast } from "sonner";
import { FRAMEWORK_OPTIONS } from "./constants";

import { WizardStepDetails } from "./WizardStepDetails";
import { WizardStepApps } from "./WizardStepApps";
import { WizardStepPackages } from "./WizardStepPackages";
import { WizardStepReview } from "./WizardStepReview";

interface ProjectWizardProps {
  onClose?: () => void;
}

export default function ProjectWizard({ onClose }: ProjectWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const [services, setServices] = useState<
    (UniversalServiceConfig & {
      framework?: string;
      database?: string;
      orm?: string;
    })[]
  >([
    {
      id: "srv-1",
      name: "web-api",
      type: "web",
      runtime: "javascript",
      framework: "express",
      database: "postgresql",
      orm: "drizzle",
      rootDir: "apps/web-api",
      buildCommand: "pnpm install && pnpm run build",
      startCommand: "pnpm run start",
      dependencies: [],
    },
  ]);

  const handlePackageManagerChange = (pm: "npm" | "pnpm" | "yarn" | "bun") => {
    setFormData((prev) => ({ ...prev, nodePackageManager: pm }));
    setServices((currentServices) =>
      currentServices.map((srv) => {
        if (srv.runtime !== "javascript") return srv;
        let newBuild = (srv.buildCommand || "").replace(
          /npm|pnpm|yarn|bun/g,
          pm,
        );
        let newStart = (srv.startCommand || "").replace(
          /npm|pnpm|yarn|bun/g,
          pm,
        );
        if (pm === "yarn") newBuild = newBuild.replace("yarn install", "yarn");
        return { ...srv, buildCommand: newBuild, startCommand: newStart };
      }),
    );
  };

  const handleFolderStructureChange = (structure: "monorepo" | "src_flat") => {
    setFormData((prev) => ({ ...prev, folderStructure: structure }));
    if (structure === "src_flat" && services.length > 1) {
      toast.info(
        "Flat folder selected. A flat repository is strictly limited to 1 primary app. Extra microservices removed.",
      );
      setServices([services[0]]);
    }
  };

  const addBlankService = () => {
    if (formData.folderStructure === "src_flat") {
      return toast.error(
        "Flat folders cannot contain multiple apps. Switch to Monorepo in Step 1.",
      );
    }

    const nextId = `srv-${Date.now()}`;
    const pm = formData.nodePackageManager;
    const installCmd = pm === "yarn" ? "yarn" : `${pm} install`;
    const runCmd = pm === "npm" || pm === "bun" ? `${pm} run` : pm;

    setServices([
      ...services,
      {
        id: nextId,
        name: `app-${services.length + 1}`,
        type: "web",
        runtime: "javascript",
        framework: "express",
        database: "postgresql",
        orm: "drizzle",
        rootDir: `apps/app-${services.length + 1}`,
        buildCommand: `${installCmd} && ${runCmd} build`,
        startCommand: `${runCmd} start`,
        dependencies: [],
      },
    ]);
  };

  const updateServiceField = (id: string, field: string, value: any) => {
    setServices(
      services.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };

        if (field === "runtime") {
          updated.framework = FRAMEWORK_OPTIONS[value]?.[0]?.value || "";
          updated.dependencies = []; // Clear packages if runtime changes

          if (value === "python") {
            updated.buildCommand = "pip install -r requirements.txt";
            updated.startCommand = "python main.py";
          } else if (value === "javascript") {
            const pm = formData.nodePackageManager;
            const runCmd = pm === "npm" || pm === "bun" ? `${pm} run` : pm;
            updated.buildCommand =
              pm === "yarn"
                ? `yarn && yarn build`
                : `${pm} install && ${runCmd} build`;
            updated.startCommand = `${runCmd} start`;
          } else {
            updated.buildCommand = "echo 'No build command'";
            updated.startCommand = "echo 'No start command'";
          }
        }
        return updated;
      }),
    );
  };

  const deleteService = (id: string) => {
    if (services.length <= 1)
      return toast.error("You need at least one app here.");
    setServices(services.filter((s) => s.id !== id));
  };

  const handleSubmitPipeline = async () => {
    setIsSubmitting(true);
    try {
      const res = await queueProjectProvisioning({
        ...formData,
        services,
        blueprintYaml: "",
      });
      if (res.success) {
        toast.success("Project created successfully with Zero-Trust Security!");
        if (onClose) onClose();
      } else {
        toast.error(res.error || "Failed to create project.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-100">
      <div className="bg-[#12141c] w-full max-w-5xl h-[85vh] rounded-3xl border border-[#32353d] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-[#32353d] flex justify-between items-center bg-[#161924]">
          <div>
            <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" /> Create New
              Project
            </h2>
            <div className="mt-auto pt-8">
              <p className="text-xs text-slate-400">
                Configure your project apps, packages, and deployments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { num: 1, label: "Details" },
              { num: 2, label: "Apps" },
              { num: 3, label: "Packages" },
              { num: 4, label: "Review" },
            ].map((sNode) => (
              <div key={sNode.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === sNode.num ? "bg-indigo-600 text-white" : step > sNode.num ? "bg-emerald-600 text-white" : "bg-[#1d212f] text-slate-400 border border-[#32353d]"}`}
                >
                  {step > sNode.num ? "✓" : sNode.num}
                </div>
                <span
                  className={`text-xs font-medium hidden md:inline ${step === sNode.num ? "text-indigo-400" : "text-slate-400"}`}
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

        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
          {step === 1 && (
            <WizardStepDetails
              formData={formData}
              setFormData={setFormData}
              handleFolderStructureChange={handleFolderStructureChange}
              handlePackageManagerChange={handlePackageManagerChange}
            />
          )}
          {step === 2 && (
            <WizardStepApps
              formData={formData}
              services={services}
              addBlankService={addBlankService}
              updateServiceField={updateServiceField}
              deleteService={deleteService}
            />
          )}
          {step === 3 && (
            <WizardStepPackages services={services} setServices={setServices} />
          )}
          {step === 4 && (
            <WizardStepReview formData={formData} services={services} />
          )}
        </div>

        <div className="p-4 border-t border-[#32353d] bg-[#161924] flex justify-between items-center rounded-b-3xl">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (onClose) onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-slate-400 text-xs font-bold hover:text-white hover:bg-[#1d212f] transition"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                onClick={() => setStep((p) => p - 1)}
                className="px-4 py-2.5 rounded-xl text-slate-300 text-xs font-bold hover:bg-[#1d212f] border border-transparent hover:border-[#32353d] flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          {step < 4 ? (
            <button
              onClick={() => {
                if (
                  step === 1 &&
                  (!formData.name.trim() ||
                    !formData.clientName.trim() ||
                    !formData.clientEmail.trim())
                ) {
                  return toast.error(
                    "Please fill in the project name, client name, and client email.",
                  );
                }
                setStep((p) => p + 1);
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold hover:brightness-110 shadow-lg flex items-center gap-1 active:scale-95 transition"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitPipeline}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold hover:brightness-110 shadow-xl flex items-center gap-1.5 transition disabled:opacity-40"
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />{" "}
                  Create Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
