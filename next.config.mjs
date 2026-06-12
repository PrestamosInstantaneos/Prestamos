/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Añadido para permitir solicitudes cross-origin en desarrollo
  allowedDevOrigins: ['172.16.0.13'],
}

export default nextConfig