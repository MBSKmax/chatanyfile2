import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'pdf-parse',
    'mammoth', 
    'xlsx',
    'jszip'
  ],
  allowedDevOrigins: ['172.22.0.1'],
}

export default nextConfig