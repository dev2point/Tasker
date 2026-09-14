import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  turbopack: {},
  ...(process.env.DISABLE_HMR === 'true'
    ? {
        webpack: (config: any, { dev }: { dev: boolean }) => {
          if (dev) {
            config.watchOptions = {
              ignored: /.*/,
            };
          }
          return config;
        },
      }
    : {}),
};

export default nextConfig;
