"use client";
import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Sparkles,
  ChevronRight,
  Layers,
  ShieldCheck,
  X,
  Loader2,
  Lock,
  Mail,
  Briefcase,
  Key,
  User,
  AlertCircle,
  Activity,
  CheckCircle2,
  Circle,
  Eye,
  Workflow,
  Zap,
} from "lucide-react";

import { registerUser, loginUser } from "../auth-actions";
import ThemeSelector from "@/components/ThemeSelector";

export default function WelcomePage() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState("Initializing Pipeline...");
  const [systemError, setSystemError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  const passwordCriteria = {
    minLength: password.length >= 12,
    hasSymbol: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password),
    hasNumber: /[0-9]+/.test(password),
    matches: password !== "" && password === confirmPassword,
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const triggerAuthSequence = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setSystemError(null);
    setIsAuthOpen(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSystemError(null);

    try {
      if (authMode === "signup") {
        if (!isPasswordValid)
          throw new Error("Password does not meet security requirements.");

        setLoadingText("Provisioning Secure Workspace...");
        const res = await registerUser({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          name: name.trim(),
          password,
          workspaceName: workspaceName.trim(),
        });

        if (!res.success)
          throw new Error(res.message || "Registration failed.");

        router.push(res.redirectUrl || "/dashboard");
      } else {
        setLoadingText("Authenticating Secure Key...");
        // Ensure we pass 'identity' as expected by the login API
        const res = await loginUser({ identity: email.trim(), password });

        if (!res.success)
          throw new Error(res.message || "Authentication failed.");

        router.push(res.redirectUrl || "/dashboard");
      }
    } catch (err: any) {
      setSystemError(err.message || "An unexpected system error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text font-sans overflow-hidden flex flex-col items-center transition-colors duration-300">
      {/* THE THEME SELECTOR INJECTED AT TOP RIGHT */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeSelector />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-theme-primary/15 via-theme-bg/0 to-theme-bg/0 pointer-events-none transition-colors duration-300" />

      {/* HERO SECTION */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-theme-surface border border-theme-outline text-theme-primary text-sm font-medium tracking-wide shadow-sm transition-colors duration-300">
            <Sparkles size={16} className="text-theme-primary" />
            <span>StudioFlow Engine v2.0</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-theme-text transition-colors duration-300">
              Engineering <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary transition-colors duration-300">
                At Velocity.
              </span>
            </h1>
            <p className="text-lg text-theme-muted max-w-xl leading-relaxed transition-colors duration-300">
              Deploy isolated multi-tenant environments, sync remote telemetry,
              and manage secure client portals from a single high-performance
              matrix.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => triggerAuthSequence("signup")}
              className="px-8 py-4 bg-theme-primary hover:bg-theme-primary/90 text-theme-on-primary rounded-xl font-bold transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2"
            >
              <Terminal size={20} />
              Initialize Workspace
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => triggerAuthSequence("login")}
              className="px-8 py-4 bg-theme-surface hover:bg-theme-surface/80 border border-theme-outline text-theme-text rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-lg lg:max-w-none mt-10 lg:mt-0">
          <div className="absolute inset-0 bg-theme-primary/20 blur-[100px] rounded-full pointer-events-none transition-colors duration-300" />
          <div className="relative border border-theme-outline bg-theme-surface rounded-2xl p-8 shadow-2xl backdrop-blur-sm space-y-6 transition-colors duration-300">
            <div className="flex items-center gap-4 border-b border-theme-outline pb-6 transition-colors duration-300">
              <div className="p-3 bg-theme-primary/10 rounded-lg transition-colors duration-300">
                <Layers className="text-theme-primary" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-theme-text text-lg transition-colors duration-300">
                  System Architecture
                </h3>
                <p className="text-theme-muted text-sm transition-colors duration-300">
                  Automated node orchestration
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: ShieldCheck,
                  text: "Enterprise-grade isolated tenant matrices",
                },
                {
                  icon: Activity,
                  text: "Real-time edge telemetry ingestion pipeline",
                },
                {
                  icon: Workflow,
                  text: "Synchronized client portal generation",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-xl bg-theme-bg border border-theme-outline transition-colors duration-300"
                >
                  <feature.icon
                    className="text-theme-secondary shrink-0"
                    size={20}
                  />
                  <span className="text-theme-text font-medium transition-colors duration-300">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ✨ NEW CORE FEATURES GRID */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature Card 1 */}
          <div className="bg-theme-surface border border-theme-outline p-8 rounded-2xl shadow-lg flex flex-col transition-colors duration-300 group hover:border-theme-primary/50">
            <div className="w-12 h-12 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-theme-primary" />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-3 leading-snug">
              One-Command Production-Ready Scaffolding
            </h3>
            <p className="text-sm font-semibold text-theme-secondary mb-4 italic">
              "Stop setting up projects. Start coding in 2 minutes."
            </p>
            <ul className="text-sm text-theme-muted space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  Run{" "}
                  <code className="bg-theme-bg px-1.5 py-0.5 rounded text-xs border border-theme-outline">
                    studioflow
                  </code>{" "}
                  → instantly get a clean, opinionated, production-ready
                  project.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  Auto-creates GitHub repo, sets up folder structure, installs
                  dependencies, configures env, and prepares deployment.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  Supports multiple stacks (Next.js, Nuxt, FastAPI, Laravel,
                  etc.)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>This alone saves hours every single project.</span>
              </li>
            </ul>
          </div>

          {/* Feature Card 2 */}
          <div className="bg-theme-surface border border-theme-outline p-8 rounded-2xl shadow-lg flex flex-col transition-colors duration-300 group hover:border-theme-primary/50">
            <div className="w-12 h-12 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center mb-6">
              <Eye className="w-6 h-6 text-theme-primary" />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-3 leading-snug">
              Real-Time Client Transparency Portal
            </h3>
            <p className="text-sm font-semibold text-theme-secondary mb-4 italic">
              "Your client sees everything as you build it — no more surprises."
            </p>
            <ul className="text-sm text-theme-muted space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>Every client gets a private, beautiful dashboard.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  They can watch live previews, view deployed sites, upload
                  brand assets, leave feedback, and approve features.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  Built-in checklists, error alerts, and direct messaging.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  This is the feature that makes clients love working with you
                  and stops painful last-minute revisions.
                </span>
              </li>
            </ul>
          </div>

          {/* Feature Card 3 */}
          <div className="bg-theme-surface border border-theme-outline p-8 rounded-2xl shadow-lg flex flex-col transition-colors duration-300 group hover:border-theme-primary/50">
            <div className="w-12 h-12 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-theme-primary" />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-3 leading-snug">
              Smart One-Click Deployments + Live Monitoring
            </h3>
            <p className="text-sm font-semibold text-theme-secondary mb-4 italic">
              "Push code → Client sees it live instantly. You get alerts if
              anything breaks."
            </p>
            <ul className="text-sm text-theme-muted space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  Automatic deployment to Vercel, Render, or Railway on git
                  push.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>Live site monitoring with error notifications.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>Your client always has the latest working version.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <span>
                  You look extremely professional while doing less manual work.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ✨ NEW BOTTOM CALL TO ACTION */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-24 text-center flex flex-col items-center border-t border-theme-outline/50 mt-10">
        <h2 className="text-4xl md:text-5xl font-bold text-theme-text tracking-tight mb-8 leading-tight">
          Build Better Projects. Faster. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary">
            With Zero Drama.
          </span>
        </h2>
        <button
          onClick={() => triggerAuthSequence("signup")}
          className="px-10 py-5 bg-theme-primary hover:bg-theme-primary/90 text-theme-on-primary rounded-xl font-bold transition-all shadow-xl shadow-theme-primary/20 flex items-center justify-center gap-3 text-lg hover:-translate-y-1"
        >
          <Terminal size={24} />
          Start My First Workspace — It's Free
        </button>
      </section>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-theme-surface border border-theme-outline rounded-2xl shadow-2xl p-8 my-8 transition-colors duration-300"
            >
              <button
                onClick={() => setIsAuthOpen(false)}
                className="absolute top-6 right-6 text-theme-muted hover:text-theme-text transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-theme-text tracking-tight transition-colors duration-300">
                  {authMode === "signup"
                    ? "Initialize Matrix"
                    : "Access Console"}
                </h2>
                <p className="text-theme-muted text-sm mt-2 transition-colors duration-300">
                  {authMode === "signup"
                    ? "Provision your secure master workspace."
                    : "Enter your secure credentials to continue."}
                </p>
              </div>

              {systemError && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm flex items-start gap-3 transition-colors duration-300">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{systemError}</p>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted transition-colors duration-300"
                      size={18}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-theme-bg border border-theme-outline rounded-xl pl-10 pr-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50"
                      placeholder="dev@studioflow.io"
                    />
                  </div>
                </div>

                {authMode === "signup" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                          Username
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted transition-colors duration-300"
                            size={18}
                          />
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full bg-theme-bg border border-theme-outline rounded-xl pl-10 pr-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50"
                            placeholder="sysadmin"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full bg-theme-bg border border-theme-outline rounded-xl px-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50"
                          placeholder="Alice L."
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                        Workspace ID
                      </label>
                      <div className="relative">
                        <Briefcase
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted transition-colors duration-300"
                          size={18}
                        />
                        <input
                          type="text"
                          required
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full bg-theme-bg border border-theme-outline rounded-xl pl-10 pr-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50"
                          placeholder="Acme Corp Engineering"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Key
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted transition-colors duration-300"
                      size={18}
                    />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-theme-bg border border-theme-outline rounded-xl pl-10 pr-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50 tracking-widest"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-theme-muted uppercase tracking-wider ml-1 transition-colors duration-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted transition-colors duration-300"
                        size={18}
                      />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full bg-theme-bg border border-theme-outline rounded-xl pl-10 pr-4 py-3 text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all duration-300 disabled:opacity-50 tracking-widest"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                )}

                {/* ✨ THE PRETTY PASSWORD UI CHECKLIST! */}
                {authMode === "signup" && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 mt-2 rounded-xl bg-theme-bg border border-theme-outline space-y-2 overflow-hidden"
                  >
                    <p className="text-[10px] uppercase tracking-wider font-bold text-theme-muted mb-2">
                      Password Requirements
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <CriteriaRow
                        isValid={passwordCriteria.minLength}
                        text="12+ Characters"
                      />
                      <CriteriaRow
                        isValid={passwordCriteria.hasSymbol}
                        text="1 Special Symbol"
                      />
                      <CriteriaRow
                        isValid={passwordCriteria.hasNumber}
                        text="1 Number"
                      />
                      <CriteriaRow
                        isValid={passwordCriteria.matches}
                        text="Passwords Match"
                      />
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting || (authMode === "signup" && !isPasswordValid)
                  }
                  className="w-full py-3.5 mt-4 bg-theme-primary text-theme-on-primary rounded-xl font-bold shadow-lg shadow-theme-primary/20 hover:shadow-theme-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingText}
                    </>
                  ) : authMode === "signup" ? (
                    "Create Account & Start"
                  ) : (
                    "Sign In to Dashboard"
                  )}
                </button>
              </form>

              {/* Mode Toggle Footer Navigation Link */}
              <div className="mt-6 text-center text-xs text-theme-muted transition-colors duration-300">
                {authMode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => triggerAuthSequence("login")}
                      className="text-theme-secondary hover:underline ml-0.5 font-medium transition-colors duration-300"
                      disabled={isSubmitting}
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => triggerAuthSequence("signup")}
                      className="text-theme-secondary hover:underline ml-0.5 font-medium transition-colors duration-300"
                      disabled={isSubmitting}
                    >
                      Create One
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ✨ Helper Component for the beautiful Password Checklist
function CriteriaRow({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs transition-colors duration-300">
      {isValid ? (
        <CheckCircle2 size={14} className="text-theme-primary" />
      ) : (
        <Circle size={14} className="text-theme-muted opacity-50" />
      )}
      <span
        className={isValid ? "text-theme-text font-medium" : "text-theme-muted"}
      >
        {text}
      </span>
    </div>
  );
}
