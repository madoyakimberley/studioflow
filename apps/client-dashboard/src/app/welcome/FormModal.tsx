"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  RefreshCw,
  Mail,
  User,
  Briefcase,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Server,
  ChevronRight,
  X,
} from "lucide-react";

type FormValues = {
  username: string;
  fullName: string;
  workspaceId: string;
  email: string;
  masterPassword?: string;
  confirmPassword?: string;
  isOAuth: boolean;
  oauthProvider?: string;
};

interface FormModalProps {
  onClose: () => void;
  initialMode: "login" | "signup";
}

export default function FormModal({ onClose, initialMode }: FormModalProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    getValues, // Added to retrieve current values for localStorage caching
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      username: "",
      fullName: "",
      workspaceId: "",
      email: "",
      masterPassword: "",
      confirmPassword: "",
      isOAuth: false,
      oauthProvider: "",
    },
  });

  const watchedWorkspaceId = watch("workspaceId");
  const watchedUsername = watch("username");
  const watchedMasterPassword = watch("masterPassword") || "";
  const watchedConfirmPassword = watch("confirmPassword") || "";

  // Password validation criteria monitoring
  const criteria = {
    minLength: watchedMasterPassword.length >= 12,
    hasSymbol: /[^A-Za-z0-9]/.test(watchedMasterPassword),
    hasNumber: /[0-9]/.test(watchedMasterPassword),
    matches:
      watchedMasterPassword === watchedConfirmPassword &&
      watchedMasterPassword.length > 0,
  };

  // Handle Next-Auth session bindings if OAuth completes
  useEffect(() => {
    if (session?.user) {
      setValue("email", session.user.email || "");
      setValue("fullName", session.user.name || "");
      setValue("isOAuth", true);
      if (step === 2) {
        setStep(4); // Advance to confirmation summary if OAuth populates basic profile data
      }
    }
  }, [session, setValue, step]);

  const handleOAuthInitiation = async (provider: "google" | "github") => {
    setIsProcessing(true);
    setFormError(null);
    try {
      setValue("oauthProvider", provider);

      // Cache form state to localStorage before OAuth redirection as expected by E2E test
      const currentValues = getValues();
      localStorage.setItem(
        "studioflow_oauth_cache",
        JSON.stringify({
          username: currentValues.username,
          fullName: currentValues.fullName,
          workspaceId: currentValues.workspaceId,
          oauthProvider: provider,
        }),
      );

      await signIn(provider, { callbackUrl: window.location.origin });
    } catch (err: any) {
      setFormError(
        err.message ||
          "An error occurred initializing external identity provider.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const nextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["workspaceId", "fullName", "username"]);
    } else if (step === 2) {
      isValid = await trigger(["email"]);
    } else if (step === 3) {
      isValid = await trigger(["masterPassword", "confirmPassword"]);
    }

    if (isValid) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const prevStep = () => {
    setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
  };

  const onSubmit = async (data: FormValues) => {
    setIsProcessing(true);
    setFormError(null);

    try {
      if (mode === "login") {
        console.log(
          "Processing existing session verification metrics...",
          data,
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const targetedWorkspace = data.workspaceId || "default-matrix";
        router.push(`/workspace/${targetedWorkspace}/setup`);
        onClose();
      } else {
        console.log("Provisioning brand new tenant resources...", data);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const targetWorkspaceId = data.workspaceId.toLowerCase().trim();
        router.push(`/workspace/${targetWorkspaceId}/setup`);
        onClose();
      }
    } catch (err: any) {
      setFormError(
        err.message || "An infrastructure sync validation anomaly occurred.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="relative w-full max-w-7xl h-[90vh] md:h-[80vh] bg-theme-bg border border-theme-outline/30 rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 text-theme-muted hover:text-theme-text transition-colors bg-theme-surface p-2 rounded-full"
        >
          <X size={20} />
        </button>

        {/* LEFT COLUMN: BRANDING & INFO PANEL */}
        <div className="hidden lg:flex lg:col-span-5 lg:w-[40%] bg-theme-surface border-r border-theme-outline/20 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(107,56,212,0.1),transparent_50%)]" />

          <div className="relative z-10">
            <div className="text-xs uppercase tracking-widest font-mono text-theme-primary mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse" />
              {mode === "login" ? "Authentication" : "Getting Started"}
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div
                  key="panel-login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h1 className="text-4xl xl:text-5xl font-sans text-theme-text font-normal tracking-tight leading-none">
                    Welcome <br />
                    <span className="italic font-light">Back</span>
                  </h1>
                  <p className="text-sm text-theme-muted max-w-xs leading-relaxed pt-4">
                    Sign in to pick up right where you left off. Your workspace
                    is ready for you.
                  </p>
                </motion.div>
              )}

              {mode === "signup" && step === 1 && (
                <motion.div
                  key="panel-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h1 className="text-4xl xl:text-5xl font-sans text-theme-text font-normal tracking-tight leading-none">
                    Welcome to <br />
                    <span className="italic font-light">StudioFlow</span>
                  </h1>
                  <div className="space-y-4 pt-6 max-w-sm">
                    <div className="flex gap-4 items-start">
                      <div className="p-2 rounded-lg bg-theme-bg border border-theme-outline/30 text-theme-primary">
                        <Shield size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-theme-text">
                          Safe & Secure
                        </h4>
                        <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                          Top-notch security to keep all your work safe, sound,
                          and private.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="p-2 rounded-lg bg-theme-bg border border-theme-outline/30 text-theme-secondary">
                        <RefreshCw size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-theme-text">
                          Always in Sync
                        </h4>
                        <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                          Lightning-fast syncing across all your devices so you
                          never miss a beat.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {mode === "signup" && step === 2 && (
                <motion.div
                  key="panel-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <h1 className="text-4xl xl:text-5xl font-sans text-theme-text font-normal tracking-tight leading-tight">
                    Connect <br />
                    <span className="italic">Your Account</span>
                  </h1>
                  <p className="text-sm text-theme-muted max-w-xs leading-relaxed pt-2">
                    Let's link your email so you can safely access your
                    workspace from anywhere.
                  </p>
                </motion.div>
              )}

              {mode === "signup" && step === 3 && (
                <motion.div
                  key="panel-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="text-xs font-mono text-theme-muted mb-2">
                    StudioFlow
                  </div>
                  <h1 className="text-4xl xl:text-5xl font-sans text-theme-text font-normal tracking-tight leading-tight">
                    Secure <br />
                    <span className="italic">Your Profile</span>
                  </h1>
                  <p className="text-sm text-theme-muted max-w-xs leading-relaxed pt-2">
                    Create a strong password to keep your account locked down
                    and secure.
                  </p>
                </motion.div>
              )}

              {mode === "signup" && step === 4 && (
                <motion.div
                  key="panel-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h1 className="text-4xl xl:text-5xl font-sans text-theme-text font-normal tracking-tight leading-tight">
                    You're <br />
                    <span className="italic">All Set!</span>
                  </h1>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        size={18}
                        className="text-theme-primary shrink-0"
                      />
                      <div className="text-xs font-mono text-theme-text uppercase">
                        Account Secured
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        size={18}
                        className="text-theme-primary shrink-0"
                      />
                      <div className="text-xs font-mono text-theme-text uppercase">
                        Details Confirmed
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 relative z-10 bg-theme-bg border border-theme-outline/20 rounded-xl p-5 font-mono text-xs text-theme-muted/80 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-theme-text border-b border-theme-outline/10 pb-2">
              <Terminal size={14} className="text-theme-primary" />
              <span>
                Status:{" "}
                {mode === "login" ? "Ready for connection" : "Looking good!"}
              </span>
            </div>
            <div className="space-y-1 text-[11px] leading-relaxed">
              {mode === "login" ? (
                <>
                  <p>&gt; waiting for credentials...</p>
                  <p className="text-theme-primary">&gt; secure channel open</p>
                </>
              ) : (
                <>
                  <p className="text-theme-primary/80">
                    &gt; getting things ready...
                  </p>
                  <p>&gt; workspace created...</p>
                  <p>
                    &gt; workspace url:{" "}
                    <span className="text-theme-secondary">
                      {watchedWorkspaceId
                        ? `${watchedWorkspaceId.toLowerCase().trim()}.studioflow.io`
                        : "workspace.studioflow.io"}
                    </span>
                  </p>
                  <p className="text-theme-primary">&gt; finishing up...</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FORMS */}
        <div className="flex-1 bg-theme-surface/30 p-8 lg:p-24 overflow-y-auto flex flex-col justify-center relative">
          <div className="max-w-xl w-full mx-auto">
            {/* Functional global error rendering layout banner */}
            {formError && (
              <div className="mb-6 p-4 bg-theme-secondary/10 border border-theme-secondary/30 rounded-xl text-xs font-mono text-theme-secondary shadow-sm">
                ⚠️ [Sync Anomaly]: {formError}
              </div>
            )}

            {/* LOGIN FORM (SINGLE VIEW) */}
            {mode === "login" ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="mb-10">
                  <h2 className="text-2xl font-sans font-medium text-theme-text tracking-tight">
                    Sign in to your account
                  </h2>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="you@example.com"
                        {...register("email", {
                          required: true,
                          pattern: /^\S+@\S+$/i,
                        })}
                        className={`w-full bg-theme-bg/60 border ${errors.email ? "border-theme-secondary" : "border-theme-outline/30"} rounded-xl px-4 py-3.5 pr-10 text-theme-text text-sm placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary transition-all`}
                      />
                      <Mail
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        {...register("masterPassword", { required: true })}
                        className="w-full bg-theme-bg/80 border border-theme-outline/30 rounded-xl px-4 py-3.5 pr-12 text-theme-text font-mono text-sm tracking-widest focus:outline-none focus:border-theme-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-4 bg-theme-primary hover:bg-theme-primary/90 text-theme-on-primary font-bold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-theme-primary/20 disabled:opacity-50"
                  >
                    {isProcessing ? "Logging in..." : "Log In"}
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </form>

                <div className="relative my-8 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-theme-outline/10" />
                  </div>
                  <span className="relative px-3 bg-theme-surface/30 text-[10px] uppercase tracking-widest text-theme-muted font-mono">
                    Or sign in with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleOAuthInitiation("google")}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center p-4 bg-theme-bg border border-theme-outline/20 rounded-xl hover:border-theme-primary hover:bg-theme-bg/80 transition-all gap-2 group disabled:opacity-50"
                  >
                    <svg
                      className="w-5 h-5 text-theme-text group-hover:scale-105 transition-transform"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="text-xs font-mono font-medium">
                      Google
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthInitiation("github")}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center p-4 bg-theme-bg border border-theme-outline/20 rounded-xl hover:border-theme-primary hover:bg-theme-bg/80 transition-all gap-2 group disabled:opacity-50"
                  >
                    <svg
                      className="w-5 h-5 text-theme-text group-hover:scale-105 transition-transform"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span className="text-xs font-mono font-medium">
                      GitHub
                    </span>
                  </button>
                </div>

                <p className="text-center text-xs text-theme-muted mt-8">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-theme-primary hover:underline font-medium"
                  >
                    Create one
                  </button>
                </p>
              </motion.div>
            ) : (
              /* SIGNUP FORM (MULTI-STEP WIZARD) */
              <>
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <span className="text-xs font-mono tracking-wider text-theme-primary uppercase block mb-1">
                      Step {step} of 4
                    </span>
                    <h2 className="text-2xl font-sans font-medium text-theme-text tracking-tight">
                      {step === 1 && "Tell us about yourself"}
                      {step === 2 && "Connect your email"}
                      {step === 3 && "Create a password"}
                      {step === 4 && "Review your details"}
                    </h2>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          step === i
                            ? "w-8 bg-theme-primary"
                            : "w-4 bg-theme-outline/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-5"
                      >
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                            Username
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="e.g. cool_creator"
                              {...register("username", { required: true })}
                              className={`w-full bg-theme-bg/60 border ${errors.username ? "border-theme-secondary" : "border-theme-outline/30"} rounded-xl px-4 py-3.5 pr-10 text-theme-text font-mono text-sm placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary transition-all`}
                            />
                            <User
                              size={16}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted/60"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                            Full Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Julian Vane"
                              {...register("fullName", { required: true })}
                              className={`w-full bg-theme-bg/60 border ${errors.fullName ? "border-theme-secondary" : "border-theme-outline/30"} rounded-xl px-4 py-3.5 pr-10 text-theme-text text-sm placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary transition-all`}
                            />
                            <Briefcase
                              size={16}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted/60"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                            Workspace Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="my-awesome-workspace"
                              {...register("workspaceId", { required: true })}
                              className={`w-full bg-theme-bg/60 border ${errors.workspaceId ? "border-theme-secondary" : "border-theme-outline/30"} rounded-xl px-4 py-3.5 pr-10 text-theme-text font-mono text-sm placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary transition-all`}
                            />
                            <Server
                              size={16}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted/60"
                            />
                          </div>
                          <span className="text-[11px] font-mono text-theme-muted block mt-1 px-1 opacity-70">
                            URL: https://studioflow.io/s/
                            {watchedWorkspaceId || "workspace"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={nextStep}
                          className="w-full mt-4 bg-theme-bg border border-theme-primary/40 hover:border-theme-primary text-theme-text font-medium py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-sm"
                        >
                          Next Step
                          <ArrowRight
                            size={16}
                            className="text-theme-primary group-hover:translate-x-1 transition-transform"
                          />
                        </button>
                      </motion.div>
                    )}

                    {/* STEP 2: Email */}
                    {step === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-6"
                      >
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                            Email Address
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              placeholder="you@example.com"
                              {...register("email", {
                                required: true,
                                pattern: /^\S+@\S+$/i,
                              })}
                              className={`w-full bg-theme-bg/60 border ${errors.email ? "border-theme-secondary" : "border-theme-outline/30"} rounded-xl px-4 py-3.5 pr-10 text-theme-text text-sm placeholder-theme-muted/50 focus:outline-none focus:border-theme-primary transition-all`}
                            />
                            <Mail
                              size={16}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted/60"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={nextStep}
                          className="w-full bg-gradient-to-r from-theme-primary/80 to-theme-primary hover:from-theme-primary hover:to-theme-primary text-theme-on-primary font-semibold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-theme-primary/10"
                        >
                          Continue
                          <ArrowRight size={16} />
                        </button>

                        <div className="relative my-8 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-theme-outline/10" />
                          </div>
                          <span className="relative px-3 bg-theme-surface/30 text-[10px] uppercase tracking-widest text-theme-muted font-mono">
                            Or sign up with
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleOAuthInitiation("google")}
                            disabled={isProcessing}
                            className="flex flex-col items-center justify-center p-4 bg-theme-bg border border-theme-outline/20 rounded-xl hover:border-theme-primary hover:bg-theme-bg/80 transition-all gap-2 group disabled:opacity-50"
                          >
                            <svg
                              className="w-5 h-5 text-theme-text group-hover:scale-105 transition-transform"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                              />
                              <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                              />
                              <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                fill="#FBBC05"
                              />
                              <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                              />
                            </svg>
                            <span className="text-xs font-mono font-medium">
                              Google
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOAuthInitiation("github")}
                            disabled={isProcessing}
                            className="flex flex-col items-center justify-center p-4 bg-theme-bg border border-theme-outline/20 rounded-xl hover:border-theme-primary hover:bg-theme-bg/80 transition-all gap-2 group disabled:opacity-50"
                          >
                            <svg
                              className="w-5 h-5 text-theme-text group-hover:scale-105 transition-transform"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"
                              />
                            </svg>
                            <span className="text-xs font-mono font-medium">
                              GitHub
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: Password */}
                    {step === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-5"
                      >
                        <div className="bg-theme-bg/40 border border-theme-outline/20 rounded-2xl p-6 space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                              Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••••••••••"
                                {...register("masterPassword", {
                                  required: true,
                                })}
                                className="w-full bg-theme-bg/80 border border-theme-outline/30 rounded-xl px-4 py-3.5 pr-12 text-theme-text font-mono text-sm tracking-widest focus:outline-none focus:border-theme-primary transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-mono uppercase text-theme-muted tracking-wider">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••••••••••"
                                {...register("confirmPassword", {
                                  required: true,
                                })}
                                className="w-full bg-theme-bg/80 border border-theme-outline/30 rounded-xl px-4 py-3.5 pr-12 text-theme-text font-mono text-sm tracking-widest focus:outline-none focus:border-theme-primary transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] font-mono border-t border-theme-outline/10 mt-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${criteria.minLength ? "bg-theme-primary/10 border-theme-primary text-theme-primary" : "border-theme-outline/30 text-theme-muted"}`}
                              >
                                ✓
                              </div>
                              <span
                                className={
                                  criteria.minLength
                                    ? "text-theme-text"
                                    : "text-theme-muted"
                                }
                              >
                                Min. 12 characters
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${criteria.hasSymbol ? "bg-theme-primary/10 border-theme-primary text-theme-primary" : "border-theme-outline/30 text-theme-muted"}`}
                              >
                                ✓
                              </div>
                              <span
                                className={
                                  criteria.hasSymbol
                                    ? "text-theme-text"
                                    : "text-theme-muted"
                                }
                              >
                                Special symbol
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${criteria.hasNumber ? "bg-theme-primary/10 border-theme-primary text-theme-primary" : "border-theme-outline/30 text-theme-muted"}`}
                              >
                                ✓
                              </div>
                              <span
                                className={
                                  criteria.hasNumber
                                    ? "text-theme-text"
                                    : "text-theme-muted"
                                }
                              >
                                Numeric digit
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${criteria.matches ? "bg-theme-primary/10 border-theme-primary text-theme-primary" : "border-theme-outline/30 text-theme-muted"}`}
                              >
                                ✓
                              </div>
                              <span
                                className={
                                  criteria.matches
                                    ? "text-theme-text"
                                    : "text-theme-muted"
                                }
                              >
                                Passwords match
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                          <button
                            type="button"
                            onClick={prevStep}
                            className="text-xs font-mono uppercase text-theme-muted hover:text-theme-text flex items-center gap-2 transition-colors"
                          >
                            <ArrowLeft size={14} /> Back to Email
                          </button>
                          <button
                            type="button"
                            onClick={nextStep}
                            disabled={
                              !criteria.minLength ||
                              !criteria.hasNumber ||
                              !criteria.hasSymbol ||
                              !criteria.matches
                            }
                            className="bg-theme-text hover:bg-theme-text/90 text-theme-bg font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next Step <ChevronRight size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4: Review */}
                    {step === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-6"
                      >
                        <div className="text-xs text-theme-muted mb-4 font-mono leading-relaxed">
                          Give everything a quick look before we wrap up. You
                          can always update your profile later!
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-theme-bg border border-theme-outline/20 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono uppercase text-theme-muted flex items-center gap-1.5">
                              <Server
                                size={10}
                                className="text-theme-primary"
                              />{" "}
                              Workspace Name
                            </span>
                            <div className="text-base font-mono font-bold tracking-tight text-theme-text uppercase">
                              {watchedWorkspaceId}
                            </div>
                            <span className="text-[9px] font-mono text-theme-muted block opacity-60">
                              STATUS: Ready to go
                            </span>
                          </div>

                          <div className="p-4 bg-theme-bg border border-theme-outline/20 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono uppercase text-theme-muted flex items-center gap-1.5">
                              <User
                                size={10}
                                className="text-theme-secondary"
                              />{" "}
                              Username
                            </span>
                            <div className="text-base font-sans text-theme-text truncate">
                              @{watchedUsername}
                            </div>
                            <span className="text-[9px] font-mono text-theme-primary block">
                              {watch("isOAuth")
                                ? `VERIFIED VIA OAUTH`
                                : "Secured with a password"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4">
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-theme-primary text-theme-on-primary font-bold py-4 px-6 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-theme-primary/20 hover:scale-[1.01] disabled:opacity-50"
                          >
                            <span className="flex items-center gap-2 text-base">
                              {isProcessing
                                ? "Creating Account..."
                                : "Let's Go!"}
                              <ArrowRight size={18} />
                            </span>
                            <span className="text-[10px] font-mono font-normal opacity-70 uppercase tracking-widest">
                              Welcome aboard!
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={prevStep}
                            className="w-full text-center text-xs font-mono uppercase text-theme-muted hover:text-theme-text pt-2 transition-colors block mx-auto"
                          >
                            ↩ Back to Password
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                <p className="text-center text-xs text-theme-muted mt-8">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-theme-primary hover:underline font-medium"
                  >
                    Log in
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
