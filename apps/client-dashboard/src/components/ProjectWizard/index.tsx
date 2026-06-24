"use client";

import React, { useState } from "react";
import { Terminal, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
  queueProjectProvisioning,
  UniversalServiceConfig,
  UniversalManifestPayload,
} from "../../app/action";
import { toast } from "sonner";
import { FRAMEWORK_OPTIONS } from "./constants";

import { WizardStepDetails } from "./WizardStepDetails";
import { WizardStepApps } from "./WizardStepApps";
import { WizardStepPackages } from "./WizardStepPackages";
import { WizardStepReview } from "./WizardStepReview";

interface ProjectWizardProps {
  onClose?: () => void;
  workspaceId?: number; // Added to allow dynamic injection from parent
}

export default function ProjectWizard({
  onClose,
  workspaceId,
}: ProjectWizardProps) {
  const router = useRouter();
  const params = useParams();

  // Clean dynamic parameter resolution
  const currentUser = (params?.user as string) || "admin";

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    workspaceId: workspaceId || 1, // Satisfies table constraints cleanly if prop omitted
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
          updated.dependencies = [];

          if (value === "python") {
            updated.buildCommand = "uv run pip install -r requirements.txt";
            updated.startCommand = "uv run main.py";
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
      const finalServices =
        formData.folderStructure === "src_flat" ? [services[0]] : services;

      const payload: UniversalManifestPayload = {
        workspaceId: formData.workspaceId,
        name: formData.name.trim(),
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim(),
        brief: formData.brief,
        gitProvider: formData.gitProvider,
        folderStructure: formData.folderStructure,
        deploymentTarget: formData.deploymentTarget,
        nodePackageManager: formData.nodePackageManager,
        blueprintYaml: "",
        services: finalServices.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type as "web" | "worker" | "private" | "cron",
          runtime: s.runtime,
          rootDir: s.rootDir,
          buildCommand: s.buildCommand,
          startCommand: s.startCommand,
          dependencies: s.dependencies,
        })),
      };

      const res = await queueProjectProvisioning(payload);

      if (res.success && res.slug) {
        toast.success("Project created successfully with Zero-Trust Security!");
        router.push(`/dashboard/${currentUser}/projects/${res.slug}`);
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
    <div className="fixed inset-0 bg-theme-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-theme-text">
      <div className="bg-theme-surface w-full max-w-5xl h-[85vh] rounded-3xl border border-theme-outline flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-theme-outline flex justify-between items-center bg-theme-surface">
          <div>
            <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
              <Terminal className="w-5 h-5 text-theme-primary" /> Create New
              Project
            </h2>
            <div className="mt-auto pt-8">
              <p className="text-xs text-theme-muted">
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === sNode.num ? "bg-theme-primary text-theme-on-primary" : step > sNode.num ? "bg-theme-secondary text-theme-text" : "bg-theme-surface text-theme-muted border border-theme-outline"}`}
                >
                  {step > sNode.num ? "✓" : sNode.num}
                </div>
                <span
                  className={`text-xs font-medium hidden md:inline ${step === sNode.num ? "text-theme-primary" : "text-theme-muted"}`}
                >
                  {sNode.label}
                </span>
                {sNode.num < 4 && (
                  <div className="w-4 h-[1px] bg-theme-outline hidden md:block" />
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

        <div className="p-4 border-t border-theme-outline bg-theme-surface flex justify-between items-center rounded-b-3xl">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (onClose) onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-theme-muted text-xs font-bold hover:text-theme-text hover:bg-theme-surface transition"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                onClick={() => setStep((p) => p - 1)}
                className="wizard-back-btn px-4 py-2.5 rounded-xl text-theme-muted text-xs font-bold hover:bg-theme-surface border border-transparent hover:border-theme-outline flex items-center gap-1 transition"
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
              className="wizard-continue-btn px-6 py-2.5 rounded-xl bg-theme-primary text-theme-on-primary text-xs font-bold hover:brightness-110 shadow-lg flex items-center gap-1 active:scale-95 transition"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitPipeline}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-theme-primary text-theme-on-primary text-xs font-bold hover:brightness-110 shadow-xl flex items-center gap-1.5 transition disabled:opacity-40"
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Zap className="w-4 h-4 text-theme-on-primary fill-theme-on-primary" />{" "}
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
