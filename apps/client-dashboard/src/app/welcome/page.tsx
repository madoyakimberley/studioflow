"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Sparkles,
  ChevronRight,
  Layers,
  Workflow,
  ShieldCheck,
} from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  const handleDevLogin = () => {
    // Redirects to the auth gate using the bypass token for testing
    router.push("/?token=dev_99");
  };

  return (
    <div className="min-h-screen bg-[#060e20] font-sans text-slate-300 relative overflow-hidden selection:bg-[#a078ff]/30">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-[#a078ff]/10 via-[#e364a7]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#a078ff] to-[#e364a7] flex items-center justify-center shadow-lg shadow-[#a078ff]/20">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            StudioFlow
          </span>
        </div>
        <button
          onClick={handleDevLogin}
          className="text-sm font-medium text-white bg-[#171f33] hover:bg-[#1f2942] px-5 py-2.5 rounded-full transition-all border border-slate-800"
        >
          Developer Login
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center text-center pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 border border-[#a078ff]/30 bg-[#a078ff]/10 px-4 py-1.5 rounded-full text-xs font-mono text-[#a078ff] tracking-widest uppercase mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Multi-Tenant Orchestration Engine Live
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight font-serif mb-8 leading-tight">
          Automate your architecture. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a078ff] to-[#e364a7]">
            Scale your workspaces.
          </span>
        </h1>

        <p className="text-[#948f9a] text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          The ultimate monorepo orchestration tool and background CLI daemon.
          Provision Next.js apps, integrate APIs, and manage client deployments
          without leaving your terminal.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <button
            onClick={handleDevLogin}
            className="flex items-center justify-center gap-2 bg-white text-[#060e20] font-bold px-8 py-3.5 rounded-full hover:scale-105 transition-transform duration-200"
          >
            Start Free Trial <ChevronRight className="w-5 h-5" />
          </button>
          <button className="flex items-center justify-center gap-2 bg-[#171f33] text-white border border-slate-700 font-medium px-8 py-3.5 rounded-full hover:bg-[#1f2942] transition-colors duration-200">
            Read Documentation
          </button>
        </div>

        {/* macOS Terminal Mockup */}
        <div className="w-full max-w-3xl bg-[#0b1326] rounded-xl border border-[#171f33] shadow-2xl overflow-hidden text-left">
          <div className="flex items-center px-4 py-3 bg-[#0f172a] border-b border-[#171f33]">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="flex-1 text-center flex justify-center items-center gap-2 text-xs font-mono text-slate-500">
              <Terminal className="w-3.5 h-3.5" />
              luna@macbook-pro:~
            </div>
          </div>
          <div className="p-6 font-mono text-sm text-slate-300 space-y-4">
            <div>
              <span className="text-[#e364a7]">~</span>{" "}
              <span className="text-emerald-400">❯</span> pip install
              studioflow-cli
              <br />
              <span className="text-slate-500">
                Successfully installed studioflow-cli-1.1.0
              </span>
            </div>
            <div>
              <span className="text-[#e364a7]">~</span>{" "}
              <span className="text-emerald-400">❯</span> studioflow login
              <br />
              <span className="text-cyan-400">✔</span> Authenticated securely as
              Developer.
            </div>
            <div>
              <span className="text-[#e364a7]">~</span>{" "}
              <span className="text-emerald-400">❯</span> studioflow init --dir
              ~/work
              <br />
              <span className="text-cyan-400">✔</span> Provisioning engine
              started. Directing workspace to /work...
              <br />
              <span className="text-cyan-400">✔</span> Generating Next.js
              platform blueprint...
              <br />
              <span className="text-slate-500">
                Orchestration complete. Ready for development.
              </span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full max-w-5xl">
          <div className="bg-[#0b1326] border border-[#171f33] p-6 rounded-2xl">
            <Layers className="w-8 h-8 text-[#a078ff] mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">
              Monorepo Ready
            </h3>
            <p className="text-[#948f9a] text-sm leading-relaxed">
              Seamlessly handles complex architectures across Python cores and
              Next.js frontends out of the box.
            </p>
          </div>
          <div className="bg-[#0b1326] border border-[#171f33] p-6 rounded-2xl">
            <Terminal className="w-8 h-8 text-[#e364a7] mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">CLI Daemon</h3>
            <p className="text-[#948f9a] text-sm leading-relaxed">
              Background queue processing handles the heavy lifting of project
              generation and deployment.
            </p>
          </div>
          <div className="bg-[#0b1326] border border-[#171f33] p-6 rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">
              Multi-Tenant Vaults
            </h3>
            <p className="text-[#948f9a] text-sm leading-relaxed">
              Strict database isolation guarantees client data and workspace
              secrets never cross-pollinate.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
