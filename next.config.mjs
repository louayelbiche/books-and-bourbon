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
  transpilePackages: ['@runwell/concierge-shared', '@runwell/agent-core'],
}

export default nextConfig
