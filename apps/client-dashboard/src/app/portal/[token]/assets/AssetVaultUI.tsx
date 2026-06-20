"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FileImage,
  FileCode,
  FolderArchive,
  ArrowDownToLine,
  FileText,
} from "lucide-react";
import { UploadDropzone } from "../../../../utils/uploading"; // Adjust path if needed

const getIconForType = (type: string) => {
  if (!type) return FolderArchive;
  if (type.includes("image")) return FileImage;
  if (type.includes("pdf")) return FileText;
  if (type.includes("json") || type.includes("code")) return FileCode;
  return FolderArchive;
};

interface AssetVaultUIProps {
  projectId: number;
  initialAssets: any[];
  userRole: "admin" | "client";
}

export default function AssetVaultUI({
  projectId,
  initialAssets,
  userRole,
}: AssetVaultUIProps) {
  const router = useRouter();

  return (
    <>
      {/* Upload Area */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-outline)] border-dashed rounded-2xl p-6">
        <UploadDropzone
          endpoint="projectAssetUploader"
          input={{ projectId: projectId, uploadedBy: userRole }}
          onClientUploadComplete={(res: any[]) => {
            if (res && res.length > 0) {
              // ✅ INSTANT REFRESH: Tells Next.js to update the server component UI
              router.refresh();
            }
          }}
          onUploadError={(error: Error) => {
            alert(`ERROR! ${error.message}`);
          }}
          className="ut-button:bg-[var(--color-theme-primary)] ut-button:ut-readying:bg-[var(--color-theme-primary)]/50 ut-label:text-[var(--color-theme-primary)] ut-allowed-content:text-[var(--text-muted)]"
        />
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {initialAssets.map((asset) => {
          const Icon = getIconForType(asset.fileType);
          const isImage = asset.fileType?.includes("image");

          return (
            <a
              href={asset.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              key={asset.id}
              className="bg-[var(--bg-surface)] border border-[var(--border-outline)] rounded-2xl p-5 hover:border-[var(--color-theme-primary)] transition-colors group cursor-pointer block"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-outline)] flex items-center justify-center text-[var(--text-main)] mb-4 group-hover:text-[var(--color-theme-primary)] group-hover:border-[var(--color-theme-primary)]/50 overflow-hidden transition-all relative">
                {isImage ? (
                  <img
                    src={asset.fileUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon size={24} />
                )}
              </div>

              <h3
                className="text-theme-text font-medium mb-1 truncate"
                title={asset.name}
              >
                {asset.name}
              </h3>
              <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                <span>
                  {asset.fileSize} •{" "}
                  {asset.createdAt
                    ? new Date(asset.createdAt).toLocaleDateString()
                    : "Unknown date"}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    asset.uploadedBy === "admin"
                      ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)]"
                      : "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)]"
                  }`}
                >
                  {asset.uploadedBy}
                </span>
                <button className="text-[var(--color-theme-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowDownToLine size={16} />
                </button>
              </div>
            </a>
          );
        })}

        {initialAssets.length === 0 && (
          <div className="col-span-1 md:col-span-3 text-center py-12 text-[var(--text-muted)] border border-[var(--border-outline)] border-dashed rounded-2xl">
            No assets found in the vault yet. Upload some files above!
          </div>
        )}
      </div>
    </>
  );
}
