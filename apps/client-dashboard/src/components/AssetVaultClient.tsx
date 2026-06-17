"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core"; // Adjust import path based on your setup

const UploadDropzone = generateUploadDropzone<OurFileRouter>();

interface Asset {
  id: number;
  projectId: number;
  uploadedBy: "admin" | "client";
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: string | null;
  createdAt: string | Date | null;
}

interface AssetVaultClientProps {
  initialAssets: Asset[];
  projectId: number;
  userRole?: "admin" | "client";
}

export default function AssetVaultClient({
  initialAssets,
  projectId,
  userRole = "admin",
}: AssetVaultClientProps) {
  const router = useRouter();
  const [filterClientOnly, setFilterClientOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter matrix dataset evaluation
  const displayedAssets = filterClientOnly
    ? initialAssets.filter((a) => a.uploadedBy === "client")
    : initialAssets;

  // Resolve font symbols matching typography maps
  const getIconForType = (type: string) => {
    if (!type) return "folder_zip";
    const t = type.toLowerCase();
    if (t.includes("pdf")) return "picture_as_pdf";
    if (t.includes("json") || t.includes("code") || t.includes("text"))
      return "data_object";
    if (t.includes("video")) return "movie";
    if (t.includes("audio")) return "audio_file";
    return "draft";
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Upload Zone Ingestion Matrix */}
      <div className="glass-card rounded-2xl p-1 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(210,167,255,0.05)] to-transparent pointer-events-none"></div>
        <div className="grid-overlay"></div>

        <div className="bg-[#0b0e15]/90 rounded-xl p-6 relative z-10 border border-[rgba(175,186,255,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="headline-sm text-[#e0e2ec] text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e8b3ff]">
                  cloud_upload
                </span>
                Secure Data Ingestion Port
              </h3>
              <p className="body-md text-[#94a3b8] text-[12px] mt-1">
                Drag and drop payloads: Images, PDFs, JSON, and Archives (Max
                16MB)
              </p>
            </div>
            {isUploading && (
              <div className="px-4 py-1.5 rounded-full flex items-center gap-2 text-[11px] bg-[rgba(232,179,255,0.1)] border border-[rgba(232,179,255,0.2)]">
                <span className="material-symbols-outlined text-[14px] animate-spin text-[#e8b3ff]">
                  sync
                </span>
                <span className="mono-code text-[#e8b3ff]">
                  Processing Payload...
                </span>
              </div>
            )}
          </div>

          <div className="relative group">
            <UploadDropzone
              endpoint="projectAssetUploader"
              input={{ projectId: Number(projectId), uploadedBy: userRole }}
              onUploadBegin={() => setIsUploading(true)}
              onClientUploadComplete={(res) => {
                console.log("Upload execution sync finished:", res);
                setIsUploading(false);
                // Slight delay to ensure DB transaction is fully committed before Next.js refreshes
                setTimeout(() => {
                  router.refresh();
                }, 500);
              }}
              onUploadError={(error: Error) => {
                setIsUploading(false);
                alert(`Upload system halted: ${error.message}`);
              }}
              className="
                ut-button:bg-[rgba(175,186,255,0.1)] ut-button:text-[#d3d7ff] ut-button:border ut-button:border-[rgba(175,186,255,0.2)] 
                ut-button:transition-all ut-button:hover:bg-[rgba(210,167,255,0.2)] ut-button:hover:text-[#fff]
                ut-label:text-[#afbaff] ut-label:font-medium ut-allowed-content:text-[#94a3b8] 
                w-full border-2 border-dashed border-[rgba(175,186,255,0.15)] hover:border-[rgba(210,167,255,0.4)] 
                rounded-xl bg-[rgba(12,15,22,0.4)] transition-all py-8 cursor-pointer
              "
            />
          </div>
        </div>
      </div>

      {/* Asset Display Matrix Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[rgba(175,186,255,0.1)] pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[rgba(175,186,255,0.08)] p-2 rounded-lg">
              <span
                className="material-symbols-outlined text-[#afbaff] text-xl"
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                folder_open
              </span>
            </div>
            <div>
              <h2 className="headline-sm text-[#e0e2ec] text-lg">
                Synchronized Vault Records
              </h2>
              <p className="mono-code text-[10px] text-[#94a3b8] mt-0.5">
                MATRIX DOMAIN // ASSET VISUALIZATION
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterClientOnly(!filterClientOnly)}
            className={`px-4 py-2 rounded-lg text-[11px] label-caps transition-all border cursor-pointer flex items-center gap-2 ${
              filterClientOnly
                ? "bg-[rgba(210,167,255,0.15)] border-[rgba(210,167,255,0.3)] text-[#e8b3ff] shadow-[0_0_15px_rgba(210,167,255,0.1)]"
                : "bg-[#1d2027] border-[#32353d] text-[#c6c5d1] hover:bg-[#272a32] hover:border-[#4a4e5a]"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {filterClientOnly ? "filter_alt" : "filter_list"}
            </span>
            {filterClientOnly ? "Viewing: Client Drops" : "Viewing: All Assets"}
          </button>
        </div>

        {displayedAssets.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 md:p-16 text-center border-dashed relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="grid-overlay"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(175,186,255,0.05)] border border-[rgba(175,186,255,0.1)]">
                <span className="material-symbols-outlined text-3xl text-[#afbaff]/50">
                  find_in_page
                </span>
              </div>
              <h4 className="headline-sm text-[#e0e2ec] mb-2">Vault Empty</h4>
              <p className="body-md text-[#94a3b8] max-w-sm text-center leading-relaxed opacity-80">
                No matching assets found in the matrix. Upload a file via the
                ingestion port above to initialize the storage grid.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedAssets.map((asset) => (
              <div
                key={asset.id}
                className="glass-card rounded-xl flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-[rgba(210,167,255,0.3)]"
              >
                {/* Visual Preview / Thumbnail Area */}
                <div className="h-40 w-full bg-[#12151d] relative overflow-hidden border-b border-[rgba(175,186,255,0.05)] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f16] to-transparent opacity-60 z-10"></div>

                  {asset.fileType?.toLowerCase().includes("image") ? (
                    // REAL IMAGE THUMBNAIL
                    <img
                      src={asset.fileUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // ICON FALLBACK
                    <span
                      className="material-symbols-outlined text-5xl text-[#d3d7ff]/20 group-hover:text-[#e8b3ff]/40 transition-colors duration-300"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {getIconForType(asset.fileType)}
                    </span>
                  )}

                  {/* Status Badge Overlaid on Thumbnail */}
                  <div className="absolute top-3 right-3 z-20">
                    <span
                      className={`status-badge shadow-lg backdrop-blur-md ${
                        asset.uploadedBy === "client"
                          ? "status-paused border border-[rgba(255,202,245,0.2)]"
                          : "status-active border border-[rgba(210,167,255,0.2)]"
                      }`}
                    >
                      {asset.uploadedBy}
                    </span>
                  </div>
                </div>

                {/* Card Details Area */}
                <div className="p-4 flex flex-col flex-grow bg-gradient-to-b from-transparent to-[#0a0d13]">
                  <h3
                    className="headline-sm text-[15px] text-[#e0e2ec] mb-3 truncate group-hover:text-[#d3d7ff] transition-colors"
                    title={asset.name}
                  >
                    {asset.name}
                  </h3>

                  <div className="mt-auto flex items-end justify-between pt-3 border-t border-[rgba(175,186,255,0.08)]">
                    <div className="flex flex-col space-y-1">
                      <span className="mono-code text-[10px] text-[#afbaff]/80">
                        {asset.fileSize || "Unknown size"}
                      </span>
                      <span className="mono-code text-[9px] text-[#94a3b8]">
                        {asset.createdAt
                          ? new Date(asset.createdAt).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "Unknown date"}
                      </span>
                    </div>

                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 rounded-lg bg-[rgba(175,186,255,0.05)] border border-[rgba(175,186,255,0.1)] text-[#c6c5d1] flex items-center justify-center hover:text-[#0c0f16] hover:bg-gradient-to-r hover:from-[#d3d7ff] hover:to-[#e8b3ff] hover:border-transparent transition-all shadow-lg"
                      title="Open Secure Link"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        download
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
