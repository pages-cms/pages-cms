import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // When BUNNY_BUILD=true, export as static HTML for edge deployment
  ...(process.env.BUNNY_BUILD === 'true' ? { output: 'export' } : {}),
};

export default withBundleAnalyzer(nextConfig);