"use client";

import React, { useState } from "react";
import { UploadDropzone } from "../utils/uploading"; // Adjust import path based on your setup
import { saveProjectAsset } from "../app/asset-actions"; // Adjust import path based on your setup
import { useRouter } from "next/navigation";

interface Asset {
  id: number;
  projectId: number;
  uploadedBy: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: string | null;
  createdAt: Date | null;
}

export default function AssetVaultClient({
  initialAssets,
  projectId,
  userRole = "admin",
}: {
  initialAssets: Asset[];
  projectId: number;
  userRole?: "admin" | "client";
}) {
  const router = useRouter();
  const [filterClientOnly, setFilterClientOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter logic
  const displayedAssets = filterClientOnly
    ? initialAssets.filter((a) => a.uploadedBy === "client")
    : initialAssets;

  const getIconForType = (type: string) => {
    if (type.includes("image")) return "image";
    if (type.includes("pdf")) return "picture_as_pdf";
    if (type.includes("json") || type.includes("code") || type.includes("text"))
      return "data_object";
    return "folder_zip";
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Upload Zone */}
      <div className="glass-card rounded-xl p-6 relative overflow-hidden group border-dashed">
        <div className="grid-overlay"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="headline-sm text-[#e0e2ec] text-base">
                Secure Data Ingestion Port
              </h3>
              <p className="body-md text-[#94a3b8] text-[11px] mt-1">
                Supported payloads: Images, PDFs, JSON, and Archives (Max 16MB)
              </p>
            </div>
            {isUploading && (
              <div className="glass-card px-3 py-1 rounded-full flex items-center gap-2 text-[10px]">
                <span className="material-symbols-outlined text-[12px] animate-spin text-[#e8b3ff]">
                  sync
                </span>
                <span className="mono-code text-[#e8b3ff]">Uploading...</span>
              </div>
            )}
          </div>

          <div className="bg-[#0b0e15]/50 border border-[rgba(175,186,255,0.05)] rounded-lg p-2">
            <UploadDropzone
              endpoint="projectAssetUploader"
              onUploadBegin={() => setIsUploading(true)}
              onClientUploadComplete={async (res: string | any[]) => {
                if (res && res.length > 0) {
                  for (const file of res) {
                    await saveProjectAsset({
                      projectId: projectId,
                      uploadedBy: userRole,
                      name: file.name,
                      fileUrl: file.url,
                      fileType: file.type,
                      fileSize: file.size,
                    });
                  }
                  setIsUploading(false);
                  router.refresh(); // Automatically fetches the fresh DB data
                }
              }}
              onUploadError={(error: Error) => {
                setIsUploading(false);
                alert(`Upload Failed: ${error.message}`);
              }}
              appearance={{
                button:
                  "bg-[#272a32] text-[#d3d7ff] border border-[#32353d] hover:bg-[#32353d] transition-all font-sans text-sm label-caps px-4 py-2 rounded-md",
                container: "border-0 p-4",
                label: "text-[#94a3b8] hover:text-[#d3d7ff] transition-colors",
                allowedContent: "text-[#94a3b8]/50 text-[10px] mono-code mt-2",
              }}
            />
          </div>
        </div>
      </div>

      {/* Asset Grid Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#d3d7ff] text-base"
              style={{ fontVariationSettings: "'wght' 200" }}
            >
              folder_open
            </span>
            <h2 className="headline-sm text-[#e0e2ec] text-base md:text-lg">
              Synchronized Vault Records
            </h2>
          </div>

          {/* Dev Filter Toggle */}
          <button
            onClick={() => setFilterClientOnly(!filterClientOnly)}
            className={`px-3 py-1.5 rounded-md text-[10px] label-caps transition-all border ${
              filterClientOnly
                ? "bg-[rgba(210,167,255,0.15)] border-[rgba(210,167,255,0.3)] text-[#e8b3ff]"
                : "bg-[#1d2027] border-[#32353d] text-[#c6c5d1] hover:bg-[#272a32]"
            }`}
          >
            {filterClientOnly ? "Viewing: Client Only" : "Viewing: All Assets"}
          </button>
        </div>

        {displayedAssets.length === 0 ? (
          <div className="glass-card rounded-xl p-8 md:p-14 text-center border-dashed relative overflow-hidden">
            <div className="grid-overlay"></div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#272a32]">
                <span className="material-symbols-outlined text-2xl text-[#d3d7ff]/30">
                  find_in_page
                </span>
              </div>
              <p className="mono-code text-[#c6c5d1] text-[11px] max-w-sm mx-auto leading-relaxed opacity-60">
                No matching assets found in the matrix. Upload a file above to
                initialize the storage grid.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayedAssets.map((asset) => (
              <div
                key={asset.id}
                className="glass-card p-4 rounded-xl flex flex-col group relative overflow-hidden transition-all hover:bg-[rgba(175,186,255,0.03)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1d2027] border border-[#32353d] flex items-center justify-center text-[#d3d7ff] group-hover:bg-[rgba(210,167,255,0.1)] group-hover:text-[#e8b3ff] group-hover:border-[rgba(210,167,255,0.2)] transition-all">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {getIconForType(asset.fileType)}
                    </span>
                  </div>

                  <span
                    className={`status-badge ${
                      asset.uploadedBy === "client"
                        ? "status-paused" // Reusing your pink hue for client
                        : "status-active" // Reusing your blue hue for admin
                    }`}
                  >
                    {asset.uploadedBy}
                  </span>
                </div>

                <h3
                  className="headline-sm text-sm text-[#e0e2ec] mb-1 truncate"
                  title={asset.name}
                >
                  {asset.name}
                </h3>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[rgba(175,186,255,0.05)]">
                  <div className="mono-code text-[9px] text-[#94a3b8] flex flex-col space-y-0.5">
                    <span>{asset.fileSize || "Unknown size"}</span>
                    <span>
                      {asset.createdAt
                        ? new Date(asset.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </span>
                  </div>

                  <a
                    href={asset.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-[#1d2027] border border-[#32353d] text-[#c6c5d1] rounded hover:text-[#e8b3ff] hover:bg-[rgba(210,167,255,0.1)] hover:border-[rgba(210,167,255,0.2)] transition-all flex items-center justify-center"
                    title="Download Asset"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      download
                    </span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
