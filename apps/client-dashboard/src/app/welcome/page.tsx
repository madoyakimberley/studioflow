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
} from "lucide-react";

import { registerUser, loginUser } from "../auth-actions";

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
    hasSymbol: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    hasNumber: /[0-9]/.test(password),
    caseSensitive: /[a-z]/.test(password) && /[A-Z]/.test(password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const triggerAuthSequence = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setSystemError(null);
    setPassword("");
    setConfirmPassword("");
    setIsAuthOpen(true);
  };

  const handleAuthenticationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSystemError(null);

    if (authMode === "signup") {
      if (!isPasswordValid) {
        setSystemError(
          "Password metrics criteria not met. Please follow safety enforcement matrix.",
        );
        return;
      }
      if (password !== confirmPassword) {
        setSystemError(
          "Handshake failure: Password keys do not match validation mirror.",
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (authMode === "signup") {
        setLoadingText("Provisioning Tenant Node Matrix...");

        const response = await registerUser({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password: password,
          workspaceName: workspaceName.trim(),
        });

        if (!response.success) {
          throw new Error(response.message);
        }

        setLoadingText("Routing to Ingress Security Portals...");
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (response.redirectUrl) {
          router.push(response.redirectUrl);
        } else {
          router.push("/dashboard");
        }
      } else {
        setLoadingText("Validating Credentials Pass-Through...");

        const response = await loginUser({
          identity: email.trim(),
          password: password,
        });

        if (!response.success) {
          throw new Error(response.message);
        }

        setLoadingText("Spawning Cluster Shell Session...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (response.redirectUrl) {
          router.push(response.redirectUrl);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("🔒 [INGRESS SECURITY CONTROL EXCEPTION]:", error);
      setSystemError(
        error.message || "An unexpected validation exception was thrown.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] font-sans text-slate-300 relative overflow-hidden selection:bg-[#c3c2ff]/30">
      {/* Background radial soft light gradient effect matching Screenshot 2026-06-15 at 23.02.31.jpg */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] bg-gradient-to-b from-[#3b368c]/15 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Global Navigation Bar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#a078ff] to-[#e364a7] flex items-center justify-center shadow-lg shadow-[#a078ff]/20 overflow-hidden">
            <Image
              src="/images/logo.jpg"
              alt="StudioFlow Logo"
              width={32}
              height={32}
              className="object-cover"
              priority
            />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            StudioFlow{" "}
            <span className="text-xs font-mono text-[#a5a1f6] ml-1">v2.0</span>
          </span>
        </div>
        <button
          onClick={() => triggerAuthSequence("login")}
          className="text-sm font-medium text-slate-300 bg-[#0f172a] hover:bg-[#1e293b] px-5 py-2 rounded-full transition-all border border-slate-800 shadow-md"
        >
          Developer Portal Login
        </button>
      </nav>

      {/* Main Container Layout */}
      <main className="relative z-10 flex flex-col items-center text-center pt-20 pb-32 px-6 max-w-7xl mx-auto">
        {/* Top Pill Early Access Badge */}
        <div className="inline-flex items-center gap-2 border border-[#2e2a75] bg-[#11132e] px-4 py-1.5 rounded-full text-xs font-medium text-[#c3c2ff] mb-8 shadow-sm">
          <span className="text-xs">
            ✨ v2.0 Now Live — Ship Better, Faster
          </span>
        </div>

        {/* Elegant Serif Typographic Headers matching Screenshot 2026-06-15 at 23.02.31.jpg */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white tracking-tight mb-6 max-w-5xl leading-[1.15]">
          Build with your client. <br />
          <span className="text-slate-400">Not for them.</span>
        </h1>

        <p className="text-[#8e93a6] text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Stop the silence. Stop the confusion. Give clients a live view of your
          work as it unfolds. Real-time collaboration that ends back-and-forth
          forever.
        </p>

        {/* Hero Actions Button Section */}
        <div className="flex flex-row justify-center items-center gap-4 mb-24">
          <button
            onClick={() => triggerAuthSequence("signup")}
            className="bg-[#c3c2ff] text-[#030712] font-semibold px-6 py-2.5 rounded-md hover:bg-[#b0adfc] transition duration-200 text-sm shadow-md"
          >
            Start Free, No Card
          </button>
          <button
            onClick={() => triggerAuthSequence("login")}
            className="bg-transparent text-slate-300 border border-slate-800 px-6 py-2.5 rounded-md hover:bg-slate-900/50 transition duration-200 text-sm"
          >
            Sign In
          </button>
        </div>

        {/* Architectural Logic Engine Terminal Box Container */}
        <div className="w-full max-w-5xl bg-[#090d16] rounded-xl border border-[#161f33] shadow-2xl overflow-hidden text-left mb-32">
          <div className="flex items-center px-4 py-3 bg-[#050810] border-b border-[#111827]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
          </div>
          <div className="h-[420px] flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-transparent flex items-center justify-center">
              {/* Dynamic cluster logic node SVG structure */}
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                className="text-slate-600 animate-pulse"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="6" cy="6" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="6" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
                <line x1="8" y1="8" x2="10" y2="10" />
                <line x1="16" y1="8" x2="14" y2="10" />
                <line x1="8" y1="18" x2="10" y2="14" />
                <line x1="16" y1="18" x2="14" y2="14" />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-slate-200 tracking-wide">
              Live Development Feed
            </h3>
            <p className="text-xs font-mono text-slate-600">
              Client dashboard syncing in real-time... Ready to deploy
            </p>
          </div>
        </div>

        {/* Feature Split Header Row Section */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-start justify-between text-left gap-6 mb-16 border-t border-slate-900 pt-16">
          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight max-w-md leading-tight">
            Three problems. One solution.
          </h2>
          <p className="text-[#8e93a6] text-sm max-w-sm leading-relaxed md:pt-2">
            Built by developers who've lost clients to miscommunication. Never
            again.
          </p>
        </div>

        {/* Three Columns Foundry Features Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-5xl mb-36">
          {/* Card 1: Live Build Feed */}
          <div className="bg-[#070b14] border border-[#121929] p-6 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-[#13192e] flex items-center justify-center border border-[#1e2645] mb-5">
                <Eye className="w-4 h-4 text-[#a5a1f6]" />
              </div>
              <h3 className="text-white font-semibold text-base mb-3">
                See It As It Builds
              </h3>
              <p className="text-[#8e93a6] text-sm leading-relaxed mb-6">
                Your client watches the blank canvas become reality. No
                surprises at delivery. No "this isn't what I wanted."
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-900/60 font-mono text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> Live
                project feed
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />{" "}
                Instant deployment preview
              </div>
            </div>
          </div>

          {/* Card 2: Instant Communication */}
          <div className="bg-[#070b14] border border-[#121929] p-6 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-[#13192e] flex items-center justify-center border border-[#1e2645] mb-5">
                <Sparkles className="w-4 h-4 text-[#a5a1f6]" />
              </div>
              <h3 className="text-white font-semibold text-base mb-3">
                Talk Without Waiting
              </h3>
              <p className="text-[#8e93a6] text-sm leading-relaxed mb-6">
                In-app chat, live requests, real-time feedback. No more 2-week
                silences. No more blocked work.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-900/60 font-mono text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />{" "}
                Built-in messaging
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> Zero
                waiting game
              </div>
            </div>
          </div>

          {/* Card 3: Assets & Brand */}
          <div className="bg-[#070b14] border border-[#121929] p-6 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded bg-[#13192e] flex items-center justify-center border border-[#1e2645] mb-5">
                <Layers className="w-4 h-4 text-[#a5a1f6]" />
              </div>
              <h3 className="text-white font-semibold text-base mb-3">
                All Assets In One Place
              </h3>
              <p className="text-[#8e93a6] text-sm leading-relaxed mb-6">
                Logos, fonts, colors, brand guidelines. Everything shared from
                day one. No hunting emails for assets.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-900/60 font-mono text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />{" "}
                Centralized brand hub
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />{" "}
                Project starts on day one
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Row Segment: Orchestrate with elegance section */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left mb-36">
          {/* Left Monitor Telemetry Representation Block */}
          <div className="bg-[#070b14] rounded-xl border border-[#121929] p-4 aspect-[4/3] relative overflow-hidden flex flex-col justify-between shadow-lg">
            <div className="grid grid-cols-3 gap-2 h-full w-full opacity-40">
              <div className="border border-slate-900 rounded p-2 space-y-1">
                <div className="h-1 w-8 bg-slate-800 rounded" />
                <div className="h-10 w-full bg-slate-950 rounded animate-pulse" />
              </div>
              <div className="border border-slate-900 rounded p-2 space-y-1">
                <div className="h-1 w-12 bg-slate-800 rounded" />
                <div className="h-16 w-full bg-slate-950 rounded" />
              </div>
              <div className="border border-slate-900 rounded p-2 space-y-1">
                <div className="h-1 w-6 bg-slate-800 rounded" />
                <div className="h-12 w-full bg-slate-950 rounded animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-4 right-4 bg-[#0a0f1d] border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-500">
              client_dashboard_live
            </div>
          </div>

          {/* Right Text Row Information */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight leading-tight">
              One dashboard for everything.
            </h2>
            <p className="text-[#8e93a6] text-sm leading-relaxed">
              StudioFlow gives you and your client a shared space. Project
              structure auto-generated. Deployment handled. Live collaboration
              baked in. One link. That's it.
            </p>

            <div className="space-y-4 pt-4 border-t border-slate-900">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Activity className="w-4 h-4 text-[#a5a1f6]" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    Auto Project Setup
                  </h4>
                  <p className="text-[#8e93a6] text-xs leading-relaxed mt-0.5">
                    Folder structure, .env files, dependencies. Ready to code on
                    minute one.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Sparkles className="w-4 h-4 text-[#a5a1f6]" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    Deploy & Share
                  </h4>
                  <p className="text-[#8e93a6] text-xs leading-relaxed mt-0.5">
                    Client gets a live link instantly. Watch builds happen.
                    React in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer End Block Section Call to Action */}
        <div className="w-full max-w-5xl text-center py-16 border-t border-slate-900 flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white tracking-tight mb-4">
            End the guessing game.
          </h2>
          <p className="text-[#8e93a6] text-sm max-w-md mb-8 leading-relaxed">
            Developers and clients on the same page. Finally. Join teams
            building without the drama.
          </p>
          <div className="flex flex-row gap-3">
            <button
              onClick={() => triggerAuthSequence("signup")}
              className="bg-[#c3c2ff] text-[#030712] font-semibold px-5 py-2 rounded-md hover:bg-[#b0adfc] transition text-xs"
            >
              Start Building Today
            </button>
            <button
              onClick={() => triggerAuthSequence("login")}
              className="bg-transparent text-slate-400 border border-slate-800 px-5 py-2 rounded-md hover:bg-slate-950 transition text-xs"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>

      {/* Authentication Modal Node System Container matching Screenshot 2026-06-15 at 22.56.53.png */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030407]/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-[#070b14] border border-[#161f33] rounded-xl shadow-2xl p-8 relative my-8"
            >
              {/* Close Window Command Icon */}
              <button
                onClick={() => setIsAuthOpen(false)}
                className="absolute top-5 right-5 text-slate-500 hover:text-white transition"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Cluster Node Squircle Branding Element */}
              <div className="mb-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#c3c2ff] flex items-center justify-center mb-4 shadow-sm">
                  {/* Universal hub connector node SVG icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#030712]"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="6" cy="6" r="1.5" />
                    <circle cx="18" cy="6" r="1.5" />
                    <circle cx="6" cy="18" r="1.5" />
                    <circle cx="18" cy="18" r="1.5" />
                    <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
                    <line x1="16.5" y1="7.5" x2="13.5" y2="10.5" />
                    <line x1="7.5" y1="18" x2="10.5" y2="14" />
                    <line x1="16.5" y1="18" x2="13.5" y2="14" />
                  </svg>
                </div>
                <h2 className="text-2xl font-serif text-white tracking-wide">
                  {authMode === "signup" ? "Join StudioFlow" : "Welcome Back"}
                </h2>
                <p className="text-xs text-[#6b7280] max-w-xs mt-2 leading-relaxed">
                  {authMode === "signup"
                    ? "Create your account and start building with your clients today."
                    : "Access your projects and continue collaborating."}
                </p>
              </div>

              {systemError && (
                <div className="mb-5 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-2.5 text-xs font-mono text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>{systemError}</div>
                </div>
              )}

              {/* Exact Form Input Setup matching Screenshot 2026-06-15 at 22.56.53.png */}
              <form onSubmit={handleAuthenticationSubmit} className="space-y-4">
                {authMode === "signup" ? (
                  <>
                    {/* First Row Side-by-Side Splits */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition font-sans"
                          placeholder="Kimberley Msimbi"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                          Username
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition font-sans"
                          placeholder="kimmadoya"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Primary Cluster Node Full Width block */}
                    <div>
                      <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        required
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition font-sans"
                        placeholder="My Projects"
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                ) : null}

                {/* Email Access Node block */}
                <div>
                  <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition font-sans"
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Password Fields Layout */}
                {authMode === "signup" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white tracking-widest placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition"
                        placeholder="••••••••••••"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white tracking-widest placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition"
                        placeholder="••••••••••••"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-sans text-slate-400 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-[#161f33] rounded-md px-3 py-2 text-xs text-white tracking-widest placeholder-slate-700 focus:outline-none focus:border-[#c3c2ff] transition"
                      placeholder="••••••••••••"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Protocol Requirements Section Box */}
                {authMode === "signup" && (
                  <div className="p-4 bg-[#050810] rounded-lg border border-[#111827] mt-4">
                    <span className="block text-[9px] font-bold text-slate-500 tracking-wider mb-3">
                      PASSWORD REQUIREMENTS
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        {passwordCriteria.minLength ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 fill-slate-800" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        <span>At least 12 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordCriteria.hasSymbol ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 fill-slate-800" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        <span>One symbol (@#$%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordCriteria.hasNumber ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 fill-slate-800" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        <span>At least one number</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordCriteria.caseSensitive ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 fill-slate-800" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        <span>Upper & lowercase</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Core Event Execution Action Controller Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-[#c3c2ff] hover:opacity-95 text-[#030712] text-xs font-bold py-3.5 rounded-md tracking-wider uppercase transition shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
              <div className="mt-6 text-center text-xs text-slate-500">
                {authMode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => triggerAuthSequence("login")}
                      className="text-[#e364a7] hover:underline ml-0.5 font-medium"
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
                      className="text-[#e364a7] hover:underline ml-0.5 font-medium"
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
