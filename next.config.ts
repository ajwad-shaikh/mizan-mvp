import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Convex source lives under convex/ and is compiled by the Convex CLI,
  // not by the Next.js build. Keep it out of the app bundle.
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
