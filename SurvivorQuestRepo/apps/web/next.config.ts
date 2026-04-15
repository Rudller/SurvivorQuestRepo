import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/admin/:path*",
        destination: "http://localhost:3100/admin/:path*",
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
