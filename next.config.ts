import type { NextConfig } from "next";
const path = require('path')

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..'),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      canvas$: false,
    };
    return config;
  },
};

export default nextConfig;