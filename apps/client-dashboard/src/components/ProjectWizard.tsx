"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Shield,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Activity,
  Zap,
  Radio,
  Database,
  HelpCircle,
} from "lucide-react";
import {
  queueProjectProvisioning,
  ProjectManifestPayload,
} from "../app/action";
import { toast } from "sonner";

export default function ProjectWizard() {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State collection machines
  const [formData, setFormData] = useState<ProjectManifestPayload>({
    name: "",
    clientName: "",
    brief: "",
    database: "Supabase",
    auth: "Clerk",
    storage: "UploadThing",
    features: ["User Dashboard", "Payment Integration", "Email Notifications"],
    priority: "PRIORITY",
  });

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const executeSystemLaunch = async () => {
    setIsSubmitting(true);
    const result = await queueProjectProvisioning(formData);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        `Project ${formData.name} successfully injected into pipeline.`,
      );
      // Reset the wizard to Step 1 and clear the form for the next project
      setStep(1);
      setFormData({
        name: "",
        clientName: "",
        brief: "",
        database: "Supabase",
        auth: "Clerk",
        storage: "UploadThing",
        features: [
          "User Dashboard",
          "Payment Integration",
          "Email Notifications",
        ],
        priority: "PRIORITY",
      });
    } else {
      toast.error(`Infrastructure setup dropped: ${result.error}`);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[75vh] flex flex-col font-sans text-slate-200 select-none bg-[#090a0f] p-8 rounded-2xl border border-slate-900 shadow-2xl">
      {/* Dynamic Navigation Progress Bar */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-6 mb-8 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-8">
          <span
            className={`flex items-center gap-2 ${step >= 1 ? "text-cyan-400" : ""}`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${step > 1 ? "fill-cyan-400/10 text-cyan-400" : ""}`}
            />{" "}
            Identity
          </span>
          <span
            className={`flex items-center gap-2 ${step >= 2 ? "text-cyan-400" : ""}`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${step > 2 ? "fill-cyan-400/10 text-cyan-400" : ""}`}
            />{" "}
            Tech Stack
          </span>
          <span
            className={`flex items-center gap-2 ${step >= 3 ? "text-cyan-400" : ""}`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${step > 3 ? "fill-cyan-400/10 text-cyan-400" : ""}`}
            />{" "}
            Scope
          </span>
          <span
            className={`flex items-center gap-2 ${step === 4 ? "text-cyan-400" : ""}`}
          >
            <CheckCircle2 className="w-4 h-4" /> Review
          </span>
        </div>
        <div className="text-slate-400 text-sm font-mono">
          Step 0{step} / 04
        </div>
      </div>

      {/* Dynamic Form Router */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              key="step1"
              className="space-y-6 max-w-xl"
            >
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Project Identity
                </h1>
                <p className="text-slate-400 mt-2 text-sm">
                  Define the descriptive parameters for this orchestrator
                  instantiation.
                </p>
              </div>
              <div className="space-y-4 pt-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Neon Horizon"
                    className="bg-[#11131c] border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-medium transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Client / Organization
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    placeholder="e.g., Internal Studio"
                    className="bg-[#11131c] border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-medium transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Project Brief{" "}
                    <span className="text-slate-600">(Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.brief}
                    onChange={(e) =>
                      setFormData({ ...formData, brief: e.target.value })
                    }
                    placeholder="Describe the core vision and goals of the project..."
                    className="bg-[#11131c] border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 font-medium transition resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              key="step2"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">
                    Define Technical Foundation
                  </h1>
                  <p className="text-slate-400 mt-2 text-sm">
                    Select foundational external platforms. The engine will
                    pre-inject connection vectors and setup parameters
                    automatically.
                  </p>
                </div>

                {/* Database Infrastructure Setup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-400">
                    <Database className="w-4 h-4" /> Database
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Supabase", "PostgreSQL", "MySQL"].map((dbOpt) => (
                      <div
                        key={dbOpt}
                        onClick={() =>
                          setFormData({ ...formData, database: dbOpt })
                        }
                        className={`p-4 rounded-xl border text-left cursor-pointer transition ${formData.database === dbOpt ? "bg-[#121b24] border-cyan-500/50 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "bg-[#11131c] border-slate-800 hover:border-slate-700"}`}
                      >
                        <div className="text-sm font-bold text-white">
                          {dbOpt}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {dbOpt === "Supabase"
                            ? "PostgreSQL & Auth"
                            : "Classic Engine"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authentication Setup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-400">
                    <Shield className="w-4 h-4" /> Authentication
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Auth0", "Clerk", "NextAuth"].map((authOpt) => (
                      <div
                        key={authOpt}
                        onClick={() =>
                          setFormData({ ...formData, auth: authOpt })
                        }
                        className={`p-4 rounded-xl border text-left cursor-pointer transition ${formData.auth === authOpt ? "bg-[#1b1424] border-fuchsia-500/50 text-white shadow-[0_0_15px_rgba(217,70,239,0.1)]" : "bg-[#11131c] border-slate-800 hover:border-slate-700"}`}
                      >
                        <div className="text-sm font-bold text-white">
                          {authOpt}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {authOpt === "Clerk"
                            ? "Dev-First Managed"
                            : "Self-Hosted SDK"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storage Engine Routing */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-400">
                    <HardDrive className="w-4 h-4" /> Object Storage
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["UploadThing", "Cloudinary", "S3"].map((stOpt) => (
                      <div
                        key={stOpt}
                        onClick={() =>
                          setFormData({ ...formData, storage: stOpt })
                        }
                        className={`p-4 rounded-xl border text-left cursor-pointer transition ${formData.storage === stOpt ? "bg-[#121b24] border-cyan-500/50 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "bg-[#11131c] border-slate-800 hover:border-slate-700"}`}
                      >
                        <div className="text-sm font-bold text-white">
                          {stOpt}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {stOpt === "S3"
                            ? "Enterprise Standard"
                            : "Modern Pipeline"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Live Preview Metrics */}
              <div className="bg-[#0f111a] border border-slate-900 rounded-xl p-6 self-start space-y-6">
                <div>
                  <div className="text-cyan-400 font-mono tracking-widest text-[11px] uppercase font-bold">
                    Stack Core Insights
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    High Performance Blueprint
                  </h3>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <Radio className="w-4 h-4 text-fuchsia-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-200">
                        Real-time Ready Core
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {formData.database} hooks enable instantaneous
                        subscription layers across views.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Layers className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-200">
                        Verified Secure Handshakes
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {formData.auth} isolation blocks unverified requests
                        cleanly inside layout roots.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-900">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">
                      Scaffold Generation Speed
                    </span>
                    <span className="text-cyan-400 font-bold">~45s</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 h-full w-[80%]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              key="step3"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">
                    Define Project Scope
                  </h1>
                  <p className="text-slate-400 mt-2 text-sm">
                    Select core modules and execution priority metrics to
                    calibrate file templates.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Feature Selection
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        name: "User Dashboard",
                        desc: "Comprehensive dashboard UI layouts.",
                      },
                      {
                        name: "Payment Integration",
                        desc: "Stripe secure hooks and webhook handling scripts.",
                      },
                      {
                        name: "Analytics API",
                        desc: "Time-series data aggregation framework.",
                      },
                      {
                        name: "Email Notifications",
                        desc: "Nodemailer core transaction routers.",
                      },
                      {
                        name: "SEO Optimization",
                        desc: "Metadata matrices and structural schema maps.",
                      },
                    ].map((feat) => {
                      const active = formData.features.includes(feat.name);
                      return (
                        <div
                          key={feat.name}
                          onClick={() => toggleFeature(feat.name)}
                          className={`p-4 rounded-xl border text-left cursor-pointer flex justify-between items-start transition ${active ? "bg-[#1b1220] border-fuchsia-500/40 text-white" : "bg-[#11131c] border-slate-800"}`}
                        >
                          <div>
                            <div className="text-sm font-bold text-white">
                              {feat.name}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {feat.desc}
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${active ? "border-fuchsia-400 bg-fuchsia-500" : "border-slate-700"}`}
                          >
                            {active && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Priority Levels
                  </div>
                  <div className="flex gap-3">
                    {(["STANDARD", "PRIORITY", "CRITICAL"] as const).map(
                      (pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, priority: pr })
                          }
                          className={`px-5 py-2.5 text-xs font-bold tracking-widest rounded-lg border transition ${formData.priority === pr ? "border-fuchsia-500 text-fuchsia-400 bg-fuchsia-500/5 shadow-[0_0_15px_rgba(217,70,239,0.1)]" : "border-slate-800 text-slate-400 bg-[#11131c]"}`}
                        >
                          {pr}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Matrix Manifest Preview */}
              <div className="bg-[#0f111a] border border-slate-900 rounded-xl p-6 self-start space-y-6">
                <div>
                  <div className="text-cyan-400 font-mono tracking-widest text-[11px] uppercase font-bold">
                    Project Pulse
                  </div>
                  <div className="bg-[#121622] border border-slate-800 p-4 rounded-lg mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Estimated Delivery Target
                      </div>
                      <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                        T-Minus 48 Hours
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-xs border-t border-slate-900 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Features</span>
                    <span className="text-white font-bold">
                      {formData.features.length} Items
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine Throttle</span>
                    <span className="text-fuchsia-400 font-bold">
                      {formData.priority === "CRITICAL"
                        ? "Max Overdrive"
                        : "High Velocity"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              key="step4"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">
                    Final Review
                  </h1>
                  <p className="text-slate-400 mt-2 text-sm">
                    Verify configuration vectors before releasing payload to the
                    background runtime pipeline.
                  </p>
                </div>

                <div className="bg-[#0f111a] border border-slate-900 rounded-xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Configuration Summary
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-cyan-400 hover:underline"
                    >
                      Edit Configurations
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Identity Matrix
                      </div>
                      <div className="text-white font-bold mt-1">
                        {formData.name || "Untitled App"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formData.clientName || "Default Workspace"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Technical Infrastructure
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          "Next.js 15",
                          "TypeScript",
                          "Tailwind",
                          formData.database,
                          formData.auth,
                        ].map((t) => (
                          <span
                            key={t}
                            className="bg-[#1b1424] text-fuchsia-400 border border-fuchsia-900/30 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 border-t border-slate-900 pt-4">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                        Scope Integration Index
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.features.map((f) => (
                          <span
                            key={f}
                            className="bg-[#121920] text-cyan-400 border border-cyan-900/30 text-xs px-2.5 py-1 rounded-lg font-medium"
                          >
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Execution Checkpoints */}
              <div className="bg-[#0f111a] border border-slate-900 rounded-xl p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-cyan-400" />{" "}
                    Pre-Flight Verification
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />{" "}
                      Manifest structural integrity verified.
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />{" "}
                      Environment space is structurally ready.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !formData.name}
                  onClick={executeSystemLaunch}
                  className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/10 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    "Provisioning Database Task..."
                  ) : (
                    <>
                      Launch Project Engine{" "}
                      <Zap className="w-4 h-4 fill-white" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions Frame */}
      {step < 4 && (
        <div className="flex justify-between border-t border-slate-900 pt-6 mt-8">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((p) => p - 1)}
            className="px-5 py-2.5 rounded-lg border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-[#11131c] transition flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" /> Back To Tech Stack
          </button>
          <button
            type="button"
            disabled={step === 1 && !formData.name}
            onClick={() => setStep((p) => p + 1)}
            className="px-6 py-2.5 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            Next Section <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
