"use client";

import React, { useEffect, useState } from "react";
import {
  FileImage,
  FileCode,
  FolderArchive,
  ArrowDownToLine,
  FileText,
  Loader2,
} from "lucide-react";
import { UploadDropzone } from "../../../../utils/uploading";
import { getProjectAssets, saveProjectAsset } from "../../../asset-actions";

// Adjust icon based on file type string from UploadThing
const getIconForType = (type: string) => {
  if (type.includes("image")) return FileImage;
  if (type.includes("pdf")) return FileText;
  if (type.includes("json") || type.includes("code")) return FileCode;
  return FolderArchive;
};

export default function AssetsPage({
  projectId,
  userRole = "admin", // Pass "client" if this is the client portal view
}: {
  projectId: number;
  userRole?: "admin" | "client";
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    setLoading(true);
    const res = await getProjectAssets(projectId);
    if (res.success) {
      setAssets(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, [projectId]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Asset Vault
        </h1>
        <p className="text-[#958ea0]">
          Securely access your raw files, brand assets, and uploads.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-[#0b1326] border border-[#212d4a] border-dashed rounded-2xl p-6">
        <UploadDropzone
          endpoint="projectAssetUploader"
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
              // Refresh the list after saving to DB
              fetchAssets();
            }
          }}
          onUploadError={(error: Error) => {
            alert(`ERROR! ${error.message}`);
          }}
          className="ut-button:bg-[#4361ee] ut-button:ut-readying:bg-[#4361ee]/50 ut-label:text-[#4361ee] ut-allowed-content:text-[#958ea0]"
        />
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="flex justify-center py-12 text-[#4361ee]">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const Icon = getIconForType(asset.fileType);
            return (
              <a
                href={asset.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                key={asset.id}
                className="bg-[#0b1326] border border-[#212d4a] rounded-2xl p-5 hover:border-[#9d4edd] transition-colors group cursor-pointer block"
              >
                <div className="w-12 h-12 rounded-xl bg-[#131b2e] border border-[#171f33] flex items-center justify-center text-[#dae2fd] mb-4 group-hover:text-[#9d4edd] group-hover:bg-[#9d4edd]/10 transition-all">
                  <Icon size={24} />
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
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                  {/* Visual indicator of who uploaded it */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${asset.uploadedBy === "admin" ? "bg-[#4361ee]/10 text-[#4361ee]" : "bg-[#9d4edd]/10 text-[#9d4edd]"}`}
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
          {assets.length === 0 && (
            <div className="col-span-1 md:col-span-3 text-center py-12 text-[#958ea0] border border-[#212d4a] border-dashed rounded-2xl">
              No assets found in the vault yet. Upload some files above!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
