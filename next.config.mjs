/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false,
    workerThreads: true,
  },
};

export default nextConfig;
