import { createUploadthing, type FileRouter } from "uploadthing/next";
import { db, projectAssets } from "@studioflow/db";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  projectAssetUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    // Expect an explicit runtime input schema specifying the target environment boundary
    .input(
      z.object({
        projectId: z.number(),
        uploadedBy: z.enum(["admin", "client"]),
      }),
    )
    .middleware(async ({ input }) => {
      return {
        projectId: input.projectId,
        uploadedBy: input.uploadedBy,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        // Calculate readable byte metrics cleanly
        const formattedSize =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`;

        // Direct persistence write straight into the Drizzle database mapping layer
        await db.insert(projectAssets).values({
          projectId: metadata.projectId,
          uploadedBy: metadata.uploadedBy,
          name: file.name,
          fileUrl: file.url,
          fileType: file.type || "application/octet-stream",
          fileSize: formattedSize,
        });

        console.log(
          `✅ [ASSET PERSISTENCE SUCCESS]: Synced file ${file.name} to project ID ${metadata.projectId}`,
        );

        return {
          url: file.url,
          name: file.name,
        };
      } catch (err) {
        console.error(
          "❌ [DATABASE WRITE CRASH INSIDE UPLOADTHING ROUTER]:",
          err,
        );
        throw new Error("Failed to write vault asset entry rows.");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
