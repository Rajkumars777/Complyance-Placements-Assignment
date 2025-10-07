import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // During local development, proxy /api requests to the Express server on port 4000.
    return process.env.NODE_ENV !== 'production'
      ? [
          {
            source: '/api/:path*',
            destination: 'http://localhost:4000/api/:path*',
          },
        ]
      : [];
  },
};

export default nextConfig;
