import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera uma build "standalone" (server + apenas os arquivos necessários),
  // essencial para uma imagem Docker enxuta.
  output: "standalone",
};

export default nextConfig;
