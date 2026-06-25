import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // This removes all console.logs in production, but keeps them in development
    removeConsole: process.env.NODE_ENV === "production" ? true : false,
  },
  // 👇 ADDED THIS BLOCK TO UNBLOCK RENDER 👇
  experimental: {
    serverActions: {
      // Whitelist your Render domains so Next.js doesn't block the Server Action
      allowedOrigins: [
        "*.onrender.com",
        "localhost:3000",
        "studioflow-dashboard.onrender.com",
      ],
    },
  },
};

export default nextConfig;
