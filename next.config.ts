import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    // Workaround: skip tracing manifest untuk route group (dashboard)
    "/(dashboard)": ["**/*"],
  },
};

export default nextConfig;
