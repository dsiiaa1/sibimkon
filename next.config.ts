import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  // ─── HTTP Security Headers ─────────────────────────────────────────────────
  // Lapisan kedua — middleware sudah menangani request dinamis,
  // headers() di sini melapisi termasuk static assets.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control',    value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        stream: false,
        crypto: false,
        buffer: false,
      }
      // Handle node: scheme imports (e.g. node:fs used by pptxgenjs)
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:stream': false,
        'node:crypto': false,
        'node:buffer': false,
        'node:process': false,
        'node:url': false,
        'node:util': false,
      }
    }
    return config
  },
};

export default nextConfig;
