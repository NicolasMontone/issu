import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // In a monorepo, pin Turbopack's root to the repo root so module
  // resolution (workspace packages, hoisted deps) works reliably.
  turbopack: {
    root: resolve(__dirname, '..', '..'),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
