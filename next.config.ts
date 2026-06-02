import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  // SVGR — import .svg files as React components.
  // Configured for both Turbopack (dev + prod build in Next 16) and webpack
  // (used if someone falls back to non-turbopack builds).
  turbopack: {
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: true,
              titleProp: false,
              svgProps: { fill: 'currentColor' }
            }
          }
        ],
        as: '*.js'
      }
    }
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: true,
            titleProp: false,
            svgProps: { fill: 'currentColor' }
          }
        }
      ]
    });
    return config;
  }
};

export default nextConfig;
