import React from "react";
import { getProjectAssets, getProjectIdBySlug } from "../../../asset-actions"; // Adjust path based on your hierarchy
import AssetVaultUI from "./AssetVaultUI";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ projectId?: string; id?: string; token?: string }>;
}) {
  // 1. Await params because Next.js 16 treats dynamic segments as a Promise
  const resolvedParams = await params;

  // 2. Safely compute the numeric project ID
  let projectId = Number(resolvedParams.projectId || resolvedParams.id);

  // If projectId is NaN, resolve the text slug (token) from the client portal URL
  if (isNaN(projectId) && resolvedParams.token) {
    const tokenAsNumber = Number(resolvedParams.token);
    if (!isNaN(tokenAsNumber)) {
      projectId = tokenAsNumber;
    } else {
      const lookedUpId = await getProjectIdBySlug(resolvedParams.token);
      if (lookedUpId) {
        projectId = lookedUpId;
      }
    }
  }

  // 3. Query records using verified numerical ID
  const initialAssets =
    !isNaN(projectId) && projectId > 0
      ? (await getProjectAssets(projectId)).data
      : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-serif font-bold text-theme-text mb-2">
          Asset Vault
        </h1>
        <p className="text-[var(--text-muted)]">
          Securely access your raw files, brand assets, and uploads.
        </p>
      </div>

      {!isNaN(projectId) && projectId > 0 ? (
        <AssetVaultUI
          projectId={projectId}
          initialAssets={initialAssets}
          userRole="client"
        />
      ) : (
        <div className="text-center py-12 text-red-400 border border-red-900/30 bg-red-950/20 rounded-2xl">
          Invalid or unauthorized project portal domain.
        </div>
      )}
    </div>
  );
}
