import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The embedded demo database ships WebAssembly files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations run on startup, so make sure the SQL files are deployed with the server.
  outputFileTracingIncludes: { "/**": ["./drizzle/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
