import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Leaderboard JSON is cached at the edge; page itself is static.
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
