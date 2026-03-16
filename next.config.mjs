/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/classified',
        destination: 'https://classified.pyvax.xyz',
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
