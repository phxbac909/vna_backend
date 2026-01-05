import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Experimental features
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
