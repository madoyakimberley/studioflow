import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  projectAssetUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 5 }, // For JSON, MD, etc.
  })
    .middleware(async ({ req }) => {
      // You can add auth verification here if needed later
      return { uploadedAt: new Date() };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for url:", file.url);
      return {
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
