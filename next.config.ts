import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Scraped product images come from arbitrary retailer domains we can't
    // predict, so we skip Next's optimizer/proxy and serve them as-is. This
    // allows any external hostname without a remotePatterns allowlist.
    unoptimized: true,
  },
};

export default nextConfig;
