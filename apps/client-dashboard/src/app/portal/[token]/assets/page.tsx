import React from "react";
import {
  FileImage,
  FileCode,
  FolderArchive,
  ArrowDownToLine,
} from "lucide-react";

export default function AssetsPage() {
  const assets = [
    {
      name: "Brand_Guidelines_v2.pdf",
      type: "document",
      size: "4.2 MB",
      date: "2 days ago",
      icon: FolderArchive,
    },
    {
      name: "Hero_Render_Final.png",
      type: "image",
      size: "12.8 MB",
      date: "5 days ago",
      icon: FileImage,
    },
    {
      name: "API_Schema_Export.json",
      type: "code",
      size: "156 KB",
      date: "1 week ago",
      icon: FileCode,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-white mb-2">
          Asset Vault
        </h1>
        <p className="text-[#958ea0]">
          Securely access your raw files, database exports, and brand assets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assets.map((asset, idx) => {
          const Icon = asset.icon;
          return (
            <div
              key={idx}
              className="bg-[#0b1326] border border-[#212d4a] rounded-2xl p-5 hover:border-[#9d4edd] transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-[#131b2e] border border-[#171f33] flex items-center justify-center text-[#dae2fd] mb-4 group-hover:text-[#9d4edd] group-hover:bg-[#9d4edd]/10 transition-all">
                <Icon size={24} />
              </div>
              <h3 className="text-white font-medium mb-1 truncate">
                {asset.name}
              </h3>
              <div className="flex justify-between items-center text-xs text-[#958ea0]">
                <span>
                  {asset.size} • {asset.date}
                </span>
                <button className="text-[#4361ee] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowDownToLine size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
