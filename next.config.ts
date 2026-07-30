import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
