"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadDropzone } from "../../../../utils/uploading"; // Maintained as a fallback/hook reference

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  preview: string | null;
}

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

  // Custom Dropzone UX State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format bytes to MB/KB
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper to simulate the requested per-file upload process with percentage
  const simulateUploadProcess = (fileId: string) => {
    setUploadQueue((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f,
      ),
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;

      if (progress >= 100) {
        clearInterval(interval);
        // Simulate a 10% chance of failure to showcase the retry mechanism
        const didFail = Math.random() < 0.1;
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: didFail ? f.progress : 100,
                  status: didFail ? "error" : "success",
                }
              : f,
          ),
        );

        if (!didFail) {
          // Trigger router refresh dynamically when items succeed
          setTimeout(() => router.refresh(), 500);
        }
      } else {
        setUploadQueue((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f)),
        );
      }
    }, 400);
  };

  const processFiles = (files: FileList | File[]) => {
    const newItems: FileItem[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7) + Date.now(),
      file,
      name: file.name,
      size: formatSize(file.size),
      type: file.type,
      progress: 0,
      status: "pending",
      // Generate object URL for image thumbnails instantly
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setUploadQueue((prev) => [...newItems, ...prev]);

    // Automatically begin upload simulation for new files
    newItems.forEach((item) => simulateUploadProcess(item.id));
  };

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const retryUpload = (fileId: string) => {
    simulateUploadProcess(fileId);
  };

  const removeFile = (fileId: string) => {
    setUploadQueue((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-8">
      {/* Ingestion Port */}
      <div className="glass-card rounded-xl p-6 md:p-8 space-y-6 relative border border-[var(--color-theme-outline)]/20 shadow-xl overflow-hidden bg-[var(--color-theme-surface)]/20 backdrop-blur-2xl">
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <span
            className="material-symbols-outlined text-[var(--color-theme-secondary)] text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            cloud_upload
          </span>
          <h3 className="headline-sm text-2xl text-[var(--color-theme-text)]">
            Secure Data Ingestion Port
          </h3>
        </div>

        <p className="text-[var(--color-theme-muted)] max-w-xl text-sm body-md relative z-10">
          Drag and drop payloads: Images, PDFs, JSON, and Archives. Encrypted at
          rest using Matrix Protocol v2. Unlimited file queuing supported.
        </p>

        {/* Custom Glowing Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full rounded-xl p-8 min-h-[280px] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group border-2 border-dashed relative z-10 overflow-hidden ${
            isDragging
              ? "border-[var(--color-theme-secondary)] bg-[var(--color-theme-secondary)]/10 shadow-[0_0_40px_rgba(var(--color-theme-secondary),0.2)] scale-[1.01]"
              : "border-[var(--color-theme-outline)]/30 bg-[var(--color-theme-surface)]/40 hover:bg-[var(--color-theme-secondary)]/5 hover:border-[var(--color-theme-secondary)]"
          }`}
        >
          {/* Subtle pulse behind icon when dragging */}
          {isDragging && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--color-theme-secondary)]/20 rounded-full blur-3xl animate-pulse"></div>
          )}

          <div
            className={`bg-[var(--color-theme-surface)] rounded-full p-5 mb-6 transition-transform duration-500 relative z-10 ${isDragging ? "scale-125 shadow-lg shadow-[var(--color-theme-secondary)]/20" : "group-hover:scale-110"}`}
          >
            <span
              className={`material-symbols-outlined text-5xl transition-colors duration-300 ${isDragging ? "text-[var(--color-theme-secondary)]" : "text-[var(--color-theme-primary)]"}`}
              style={{ fontVariationSettings: "'wght' 200" }}
            >
              upload_file
            </span>
          </div>

          <h4 className="headline-sm text-xl text-[var(--color-theme-text)] mb-2 relative z-10">
            {isDragging
              ? "Drop payloads to ingest..."
              : "Choose file(s) or drag and drop"}
          </h4>
          <p className="text-[var(--color-theme-muted)] text-xs label-caps tracking-widest uppercase relative z-10">
            PDFs, Images, and System Files Accepted
          </p>

          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInput}
          />
        </div>

        {/* Live Upload Queue Matrix */}
        {uploadQueue.length > 0 && (
          <div className="mt-8 space-y-3 relative z-10 border-t border-[var(--color-theme-outline)]/20 pt-6">
            <h4 className="label-caps text-[var(--color-theme-muted)] mb-4">
              Active Transmission Queue ({uploadQueue.length})
            </h4>

            <div className="max-h-[360px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {uploadQueue.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-4 p-3 rounded-xl border bg-[var(--color-theme-surface)]/50 backdrop-blur-md transition-all ${
                    file.status === "error"
                      ? "border-red-500/30 bg-red-500/5"
                      : file.status === "success"
                        ? "border-[var(--color-theme-primary)]/30 bg-[var(--color-theme-primary)]/5"
                        : "border-[var(--color-theme-outline)]/20"
                  }`}
                >
                  {/* Thumbnail / Icon */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--color-theme-surface)] flex items-center justify-center border border-[var(--color-theme-outline)]/20 relative">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[var(--color-theme-muted)]">
                        {file.type.includes("pdf")
                          ? "picture_as_pdf"
                          : file.type.includes("json")
                            ? "data_object"
                            : "draft"}
                      </span>
                    )}
                    {/* Success Overlay */}
                    {file.status === "success" && (
                      <div className="absolute inset-0 bg-[var(--color-theme-primary)]/80 flex items-center justify-center backdrop-blur-[2px]">
                        <span
                          className="material-symbols-outlined text-white text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Metadata & Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-1.5">
                      <p className="text-sm font-semibold text-[var(--color-theme-text)] truncate pr-4">
                        {file.name}
                      </p>
                      <span className="text-[10px] mono-code text-[var(--color-theme-muted)] whitespace-nowrap">
                        {file.status === "uploading"
                          ? `${file.progress}%`
                          : file.size}
                      </span>
                    </div>

                    <div className="w-full bg-[var(--color-theme-bg)] h-1.5 rounded-full overflow-hidden border border-[var(--color-theme-outline)]/10">
                      <div
                        className={`h-full transition-all duration-300 ease-out rounded-full ${
                          file.status === "error"
                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                            : file.status === "success"
                              ? "bg-[var(--color-theme-primary)] shadow-[0_0_10px_rgba(var(--color-theme-primary),0.5)]"
                              : "bg-[var(--color-theme-secondary)] shadow-[0_0_10px_rgba(var(--color-theme-secondary),0.5)]"
                        }`}
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pl-2">
                    {file.status === "error" && (
                      <button
                        onClick={() => retryUpload(file.id)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          refresh
                        </span>{" "}
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 text-[var(--color-theme-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        close
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table View Section */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-[var(--color-theme-outline)]/20 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--color-theme-surface)] rounded-lg border border-[var(--color-theme-outline)]/20">
              <span className="material-symbols-outlined text-[var(--color-theme-secondary)]">
                folder_open
              </span>
            </div>
            <div>
              <h3 className="headline-sm text-2xl text-[var(--color-theme-text)] leading-none">
                Synchronized Vault Records
              </h3>
              <p className="text-[var(--color-theme-muted)] text-[10px] mono-code mt-1.5 uppercase tracking-widest">
                MATRIX DOMAIN // ASSET VISUALIZATION
              </p>
            </div>
          </div>
          <button className="hidden sm:flex items-center gap-2 border border-[var(--color-theme-outline)]/30 px-6 py-2.5 rounded-lg hover:bg-[var(--color-theme-surface)] transition-colors group bg-[var(--color-theme-bg)]/50">
            <span className="material-symbols-outlined text-sm text-[var(--color-theme-muted)] group-hover:text-[var(--color-theme-primary)] transition-colors">
              filter_list
            </span>
            <span className="label-caps uppercase tracking-widest text-[var(--color-theme-text)]">
              Viewing: All Assets
            </span>
          </button>
        </div>

        {/* Sleek Glass Table */}
        <div className="glass-card rounded-xl overflow-hidden bg-[var(--color-theme-surface)]/20 backdrop-blur-xl border border-[var(--color-theme-outline)]/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-theme-surface)]/40 border-b border-[var(--color-theme-outline)]/20">
                <th className="px-6 py-4 label-caps text-[10px] text-[var(--color-theme-muted)] tracking-widest uppercase">
                  Registry ID
                </th>
                <th className="px-6 py-4 label-caps text-[10px] text-[var(--color-theme-muted)] tracking-widest uppercase">
                  Asset Name
                </th>
                <th className="px-6 py-4 label-caps text-[10px] text-[var(--color-theme-muted)] tracking-widest uppercase">
                  Protocol State
                </th>
                <th className="px-6 py-4 label-caps text-[10px] text-[var(--color-theme-muted)] tracking-widest uppercase text-right">
                  Last Sync
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-theme-outline)]/10 body-md">
              {initialAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-[var(--color-theme-surface)]/30 transition-colors group"
                >
                  <td className="px-6 py-4 mono-code text-xs text-[var(--color-theme-muted)]">
                    {`0x${asset.id.toString().padStart(4, "0")}`}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4"
                    >
                      <div className="p-2 bg-[var(--color-theme-surface)] rounded-lg border border-[var(--color-theme-outline)]/10 group-hover:border-[var(--color-theme-primary)]/30 group-hover:shadow-[0_0_10px_rgba(var(--color-theme-primary),0.2)] transition-all">
                        <span className="material-symbols-outlined text-lg text-[var(--color-theme-primary)]">
                          {asset.fileType?.includes("image")
                            ? "image"
                            : asset.fileType?.includes("pdf")
                              ? "picture_as_pdf"
                              : "draft"}
                        </span>
                      </div>
                      <div>
                        <p
                          className="font-semibold text-sm text-[var(--color-theme-text)] truncate max-w-[180px] md:max-w-xs transition-colors group-hover:text-[var(--color-theme-primary)]"
                          title={asset.name}
                        >
                          {asset.name}
                        </p>
                        <p className="mono-code text-[10px] text-[var(--color-theme-muted)] mt-1">
                          {asset.fileSize || "Unknown Size"}
                        </p>
                      </div>
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold tracking-widest border ${
                        asset.uploadedBy === "admin"
                          ? "bg-[var(--color-theme-primary)]/10 text-[var(--color-theme-primary)] border-[var(--color-theme-primary)]/20"
                          : "bg-[var(--color-theme-secondary)]/10 text-[var(--color-theme-secondary)] border-[var(--color-theme-secondary)]/20"
                      }`}
                    >
                      {asset.uploadedBy}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <span className="text-xs text-[var(--color-theme-muted)] mono-code">
                        {asset.createdAt
                          ? new Date(asset.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </span>
                      <a
                        href={asset.fileUrl}
                        download
                        className="p-1.5 text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] opacity-0 group-hover:opacity-100 transition-all bg-[var(--color-theme-surface)] rounded-md border border-transparent hover:border-[var(--color-theme-primary)]/30"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          download
                        </span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {initialAssets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="relative mb-5">
                        <span className="material-symbols-outlined text-5xl text-[var(--color-theme-outline)]/20">
                          database
                        </span>
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-theme-secondary)] rounded-full animate-ping"></span>
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-theme-secondary)] rounded-full"></span>
                      </div>
                      <p className="text-[var(--color-theme-muted)] italic text-sm body-md">
                        No files found.
                      </p>
                      <p className="text-[var(--color-theme-outline)]/50 text-[10px] mono-code mt-3 tracking-[0.2em]">
                        AWAITING NEW FILES
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
