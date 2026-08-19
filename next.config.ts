import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./lib/email/assets/edudeca-logo.png"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "32kb",
    },
  },
};

export default nextConfig;
