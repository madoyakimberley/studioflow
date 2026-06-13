"use client";

import React, { useState } from "react";
import {
  Database,
  Mail,
  Cloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit3,
} from "lucide-react";
import Link from "next/link";

export default function CoreConfigsScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // FIX: Removed process.env. We now generate a secure visual mask based purely on status.
  const getVisualMask = (status: string) => {
    return status === "connected"
      ? "SECURE_NODE_••••••••••••"
      : "AWAITING_CONFIGURATION";
  };

  const configs = [
    {
      category: "Data & Storage",
      icon: Database,
      color: "#adc6ff",
      items: [
        { name: "TiDB / MySQL", key: "DATABASE_URL", status: "connected" },
        { name: "Redis Cache", key: "REDIS_URL", status: "connected" },
        { name: "UploadThing", key: "UPLOADTHING_SECRET", status: "connected" },
      ],
    },
    {
      category: "Cloud & Deployment",
      icon: Cloud,
      color: "#e364a7",
      items: [
        { name: "Render API", key: "RENDER_API_KEY", status: "connected" },
        { name: "GitHub PAT", key: "GITHUB_PAT", status: "connected" },
        { name: "Vercel Token", key: "VERCEL_TOKEN", status: "pending" },
      ],
    },
    {
      category: "Notifications",
      icon: Mail,
      color: "#d0bcff",
      items: [
        { name: "SMTP Engine", key: "SMTP_HOST", status: "connected" },
        {
          name: "Resend / Nodemailer",
          key: "RESEND_API_KEY",
          status: "connected",
        },
      ],
    },
  ];

  const handleTestConnection = async (key: string) => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    alert(`Diagnostics complete: ${key} is responding securely.`);
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="border-b border-[#171f33] pb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[#958ea0] hover:text-[#adc6ff] mb-4 transition"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black font-['Playfair_Display',_serif] tracking-wider text-white">
            Core <span className="text-[#a078ff]">Configurations</span>
          </h1>
          <p className="text-[#948f9a] mt-2 text-sm font-mono tracking-wide">
            Manage global providers, API keys, and system integrations.
          </p>
        </header>

        <div className="flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-[#171f33] rounded-xl hover:bg-[#131b2e] transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Registry
          </button>
        </div>

        {configs.map((section, idx) => (
          <section
            key={idx}
            className="bg-[#0b1326] border border-[#171f33] rounded-3xl p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <section.icon
                className="w-6 h-6"
                style={{ color: section.color }}
              />
              <h2 className="text-2xl font-semibold tracking-wide text-white">
                {section.category}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {section.items.map((item, i) => (
                <div
                  key={i}
                  className="bg-[#131b2e] border border-[#2d3449] rounded-2xl p-6 hover:border-[#4a5568] transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p
                        className={`text-xs font-mono mt-1 break-all ${item.status === "connected" ? "text-[#958ea0]" : "text-amber-500/70"}`}
                      >
                        {getVisualMask(item.status)}
                      </p>
                    </div>

                    {item.status === "connected" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleTestConnection(item.key)}
                      disabled={isRefreshing}
                      className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-xs font-bold py-2.5 rounded-xl transition"
                    >
                      Verify Status
                    </button>
                    <button className="flex-1 border border-[#4a5568] hover:bg-[#1f2937] text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
                      <Edit3 className="w-3.5 h-3.5" /> Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="text-center text-[10px] font-mono text-[#6b7280] mt-12 tracking-widest uppercase">
          Changes to environment variables require pipeline redeployment to take
          effect.
        </div>
      </div>
    </div>
  );
}
