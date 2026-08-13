/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;