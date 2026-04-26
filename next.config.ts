
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Autorise les origines Cloud Workstations pour éviter les erreurs CORS internes sur les ressources Next.js
    allowedDevOrigins: [
      '6000-firebase-studio-1773819444911.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev',
      '*.cloudworkstations.dev',
      '*.googleusercontent.com',
      'localhost:9002',
      '0.0.0.0:9002'
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
