/** @type {import('next').NextConfig} */
const nextConfig = {};

// Vadidate environment variables before start
if (!process.env.CRYPTO_KEY) {
    throw new Error('CRYPTO_KEY environment variable is required');
}

export default nextConfig;