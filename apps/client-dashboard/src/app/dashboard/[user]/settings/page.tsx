import React from "react";
import Link from "next/link";
import SidebarConsole from "@/components/SidebarConsole";
import { DownloadEnvButton, CliSetupCard } from "./ClientConfigActions";

export const dynamic = "force-dynamic";

export default async function CoreConfigsPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  return (
    <div className="flex h-screen bg-[#0c0f16] overflow-hidden">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#d3d7ff] mb-6 transition-colors"
          >
            ← Back to Dashboard
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="headline-lg lilac-gradient">
                Core <span className="text-[#e8b3ff]">Configurations</span>
              </h1>
              <p className="text-[#c6c5d1] mt-2 max-w-xl">
                Manage global providers, API keys, and system integrations for
                the StudioFlow orchestrator.
              </p>
            </div>

            <DownloadEnvButton />
          </div>

          {/* Command Line Interface Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[#d3d7ff]">
                code_blocks
              </span>
              <h2 className="headline-sm">Command Line Interface</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CliSetupCard />
            </div>
          </section>

          {/* Data & Storage Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[#d3d7ff]">
                database
              </span>
              <h2 className="headline-sm">Data & Storage</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "TiDB / MySQL", key: "SECURE_NODE_••••••••••••" },
                { title: "Redis Cache", key: "SECURE_NODE_••••••••••••" },
                { title: "UploadThing", key: "SECURE_NODE_••••••••••••" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-8 group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mono-code text-sm text-[#94a3b8] mt-1">
                        {item.key}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">
                      check_circle
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cloud & Deployment Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[#d3d7ff]">
                cloud
              </span>
              <h2 className="headline-sm">Cloud & Deployment</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Render API", status: "good" },
                { title: "GitHub PAT", status: "good" },
                { title: "Vercel Token", status: "warning" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`glass-card rounded-2xl p-8 group relative overflow-hidden ${
                    item.status === "warning" ? "border-rose-500/30" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mono-code text-sm text-[#94a3b8] mt-1">
                        SECURE_NODE_••••••••••••
                      </p>
                    </div>
                    {item.status === "good" ? (
                      <span className="material-symbols-outlined text-emerald-400 text-3xl">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-amber-400 text-3xl">
                        warning
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notifications Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[#d3d7ff]">
                mail
              </span>
              <h2 className="headline-sm">Notifications</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["SMTP Engine", "Resend / Nodemailer"].map((title, i) => (
                <div key={i} className="glass-card rounded-2xl p-8 group">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {title}
                      </h3>
                      <p className="mono-code text-sm text-[#94a3b8] mt-1">
                        SECURE_NODE_••••••••••••
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">
                      check_circle
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-xs label-caps border border-[#32353d] hover:bg-white/5 rounded-xl transition flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
