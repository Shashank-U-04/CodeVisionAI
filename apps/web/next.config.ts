import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@codevision/visualizer-engine'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // credentialless allows loading Pyodide from CDN while still
          // enabling SharedArrayBuffer (required for input() interception).
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
};

export default nextConfig;
