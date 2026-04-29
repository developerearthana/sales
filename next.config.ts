import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["twilio", "@hubspot/api-client"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
