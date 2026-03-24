/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://pyvax-backend.up.railway.app https://api.avax-test.network https://api.avax.network",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/classified',
        destination: 'https://classified.pyvax.xyz',
        permanent: false,
      },
      {
        source: '/careers',
        destination: 'https://careers.pyvax.xyz',
        permanent: false,
      },
      {
        source: '/unstop',
        destination: 'https://unstop.com/o/nfj1CVW?lb=TUn3UTaD',
        permanent: false,
      },
      {
        source: '/twitter-share',
        destination: 'https://x.com/intent/tweet?text=%F0%9F%94%B4%20I%20just%20unlocked%20classified%20access%20for%20the%20%40PyVax%20%23SynthesisHackathon%0A%0ABuilding%20an%20autonomous%20on-chain%20agent%20entirely%20in%20Python%20for%20%2475K%20in%20prizes%20%E2%9A%A1%0A%0AGet%20your%20code%20%F0%9F%91%87&url=https%3A%2F%2Fclassified.pyvax.xyz&hashtags=PyVax%2CClassifiedHack%2CAgentEconomy',
        permanent: false,
      },
      {
        source: '/twitter',
        destination: 'https://x.com/PyVax',
        permanent: false,
      },
    ];
  },
}

export default nextConfig
