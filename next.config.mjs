/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  trailingSlash: true,
  poweredByHeader: false,
  transpilePackages: [
    '@runwell/pidgie-shared',
    '@runwell/agent-core',
    '@runwell/pidgie-core',
    '@runwell/bot-memory',
    '@runwell/cms-snapshot',
    '@runwell/card-system',
    '@runwell/error-handling',
    '@runwell/health',
    '@runwell/logger',
    '@runwell/i18n',
    '@runwell/capitalv-brand-kit',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
