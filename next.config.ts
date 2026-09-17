import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    'ais-dev-wylqvmmuj6n76lbzaix44l-172335989960.europe-west2.run.app',
    'ais-pre-wylqvmmuj6n76lbzaix44l-172335989960.europe-west2.run.app',
    '*.run.app',
    '*.europe-west2.run.app',
    'localhost:3000',
    '127.0.0.1:3000',
    'mails-leadership-sending-will.trycloudflare.com',
  ],
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
