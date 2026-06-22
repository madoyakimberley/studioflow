"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Sparkles,
  ChevronRight,
  Layers,
  ShieldCheck,
  Activity,
  Workflow,
  Zap,
} from "lucide-react";

import ThemeSelector from "@/components/ThemeSelector";
import WelcomeTourEngine from "./WelcomeTourEngine";
import FormModal from "./FormModal";

export default function WelcomePage() {
  const router = useRouter();

  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    const hasSeenWelcomeTour = localStorage.getItem("studioflow_welcome_tour");
    if (!hasSeenWelcomeTour) {
      setTourActive(true);
    }
  }, []);

  const handleTourComplete = () => {
    setTourActive(false);
    localStorage.setItem("studioflow_welcome_tour", "true");
  };

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const triggerAuthSequence = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-theme-bg text-theme-text font-sans overflow-hidden flex flex-col items-center transition-colors duration-300">
      <WelcomeTourEngine
        tourActive={tourActive}
        onComplete={handleTourComplete}
      />

      <div className="absolute top-6 right-6 z-50 welcome-theme-trigger">
        <ThemeSelector />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-theme-primary/15 via-theme-bg/0 to-theme-bg/0 pointer-events-none transition-colors duration-300" />

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

      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </ul>
          </div>

          <div className="bg-theme-surface border border-theme-outline p-8 rounded-2xl shadow-lg flex flex-col transition-colors duration-300 group hover:border-theme-primary/50">
            <div className="w-12 h-12 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-theme-primary" />
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
            </ul>
          </div>

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
            </ul>
          </div>
        </div>
      </section>

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

      <AnimatePresence mode="wait">
        {isAuthOpen && (
          <FormModal
            onClose={() => setIsAuthOpen(false)}
            initialMode={authMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
