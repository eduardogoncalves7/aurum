import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera uma build "standalone" (server + apenas os arquivos necessários),
  // essencial para uma imagem Docker enxuta.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          {
            // Next App Router emits inline RSC/bootstrap scripts. Keeping
            // unsafe-inline here preserves hydration while the edge rule
            // applies the same policy to Cloudflare-generated responses.
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
