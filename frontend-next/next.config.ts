import type { NextConfig } from "next";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const nextConfig: NextConfig = {
  turbopack: {},
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };

      // Bundle Monaco Editor workers locally instead of relying on CDN
      config.plugins.push(
        new MonacoWebpackPlugin({
          // Only include languages you actually use to reduce bundle size
          languages: ["python", "cpp", "javascript", "typescript"],
          filename: "static/[name].worker.js",
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
