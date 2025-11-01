import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Proxy API calls to Express backend
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: '/webhook/:path*',
        destination: `${backendUrl}/webhook/:path*`,
      },
      {
        source: '/oauth/:path*',
        destination: `${backendUrl}/oauth/:path*`,
      },
      {
        source: '/login',
        destination: `${backendUrl}/login`,
      },
      {
        source: '/whoami',
        destination: `${backendUrl}/whoami`,
      },
    ];
  },
};

export default nextConfig;
