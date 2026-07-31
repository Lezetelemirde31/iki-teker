import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Only when building the container image. Standalone emits a self-contained
  // server carrying just the files it imports, which is what the Dockerfile
  // copies — but the current deployment builds the normal way, and this is not
  // the moment to change how the live site is produced.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  images: {
    // Mock data references remote placeholder imagery only; everything else is local SVG/gradient art.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
  },
  // PGlite loads its own WebAssembly and data files at runtime. Bundling it
  // rewrites those paths into URL objects that Node's fs rejects, which shows
  // up as a 500 on every page that touches the database.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
