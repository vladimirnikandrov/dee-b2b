/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gsojazybzodouvdmqkvg.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
