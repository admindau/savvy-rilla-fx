/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {},
  },
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
