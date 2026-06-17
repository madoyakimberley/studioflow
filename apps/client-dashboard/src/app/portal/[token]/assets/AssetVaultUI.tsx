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
      <div className="bg-[#0b1326] border border-[#212d4a] border-dashed rounded-2xl p-6">
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
          className="ut-button:bg-[#4361ee] ut-button:ut-readying:bg-[#4361ee]/50 ut-label:text-[#4361ee] ut-allowed-content:text-[#958ea0]"
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
              className="bg-[#0b1326] border border-[#212d4a] rounded-2xl p-5 hover:border-[#9d4edd] transition-colors group cursor-pointer block"
            >
              <div className="w-12 h-12 rounded-xl bg-[#131b2e] border border-[#171f33] flex items-center justify-center text-[#dae2fd] mb-4 group-hover:text-[#9d4edd] group-hover:border-[#9d4edd]/50 overflow-hidden transition-all relative">
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
                className="text-white font-medium mb-1 truncate"
                title={asset.name}
              >
                {asset.name}
              </h3>
              <div className="flex justify-between items-center text-xs text-[#958ea0]">
                <span>
                  {asset.fileSize} •{" "}
                  {asset.createdAt
                    ? new Date(asset.createdAt).toLocaleDateString()
                    : "Unknown date"}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    asset.uploadedBy === "admin"
                      ? "bg-[#4361ee]/10 text-[#4361ee]"
                      : "bg-[#9d4edd]/10 text-[#9d4edd]"
                  }`}
                >
                  {asset.uploadedBy}
                </span>
                <button className="text-[#4361ee] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowDownToLine size={16} />
                </button>
              </div>
            </a>
          );
        })}

        {initialAssets.length === 0 && (
          <div className="col-span-1 md:col-span-3 text-center py-12 text-[#958ea0] border border-[#212d4a] border-dashed rounded-2xl">
            No assets found in the vault yet. Upload some files above!
          </div>
        )}
      </div>
    </>
  );
}
