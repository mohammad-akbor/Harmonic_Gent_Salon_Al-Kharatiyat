/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;