import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Note: CORS is now handled per-request in API routes for better security
  // This allows us to validate origins properly and avoid wildcard CORS
};

export default nextConfig;
