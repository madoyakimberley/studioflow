import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // This removes all console.logs in production, but keeps them in development
    removeConsole: process.env.NODE_ENV === "production" ? true : false,
  },
};

export default nextConfig;
