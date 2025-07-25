/** @type {import('next').NextConfig} */
const nextConfig = {

     async rewrites() {
    return [
      {
        source: '/:path*',
        destination: process.env.NEXT_PUBLIC_BACK+':path*', // Flask backend URL
      },
    ]
  },
};

export default nextConfig;
