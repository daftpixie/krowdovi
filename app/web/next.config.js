/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wayfind/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudflarestream.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
