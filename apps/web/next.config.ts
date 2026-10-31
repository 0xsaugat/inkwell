import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { NextConfig } from 'next'

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: false })

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@inkwell/core', '@inkwell/db', '@inkwell/shared'],
  serverExternalPackages: [
    '@node-rs/argon2',
    'nodemailer',
    'pg',
    'pino',
    'pino-pretty',
  ],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
