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
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://picsum.photos https://*.googleusercontent.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.run.app wss: ws:",
              "worker-src 'self' blob:",
              "frame-ancestors 'self' https://*.google.com https://*.aistudio.google.com https://ai.studio https://*.run.app",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
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
