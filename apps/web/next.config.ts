import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { NextConfig } from 'next'

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: false })

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@inkwell/core', '@inkwell/db', '@inkwell/shared'],
  serverExternalPackages: ['pg', 'pino', 'pino-pretty'],
}

export default nextConfig
