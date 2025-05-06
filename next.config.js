/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure static export
  output: 'export',

  // Add a trailing slash to ensure Firebase finds index.html in subdirs
  trailingSlash: true,

  // Disable image optimization for static export
  images: {
    unoptimized: true
  }, // ✅ This comma was missing!

  // Add other Next.js config options here if needed
};

module.exports = nextConfig;
