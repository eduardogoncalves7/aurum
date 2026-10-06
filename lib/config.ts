// Valores iniciais enquanto /api/config carrega, e fallback se o banco
// estiver indisponível. As configurações salvas no /admin têm prioridade.
// NEXT_PUBLIC_ define os defaults dos componentes cliente durante o build.

export interface PublicConfig {
  whatsappDestination: string; // apenas dígitos, com DDI
  address: string;
  instagram: string;
  phone: string;
  hours: string;
}

const defaults: PublicConfig = {
  whatsappDestination: "553186506463",
  address: "Rua Itaparica, 1494, Giovanini, Coronel Fabriciano - MG, 35170-101",
  instagram: "@aurumdetailing",
  phone: "(31) 8650-6463",
  hours: "Seg a Sáb, 08h às 18h",
};

export function getPublicConfig(): PublicConfig {
  return {
    whatsappDestination:
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || defaults.whatsappDestination,
    address: process.env.NEXT_PUBLIC_ADDRESS || defaults.address,
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM || defaults.instagram,
    phone: process.env.NEXT_PUBLIC_PHONE || defaults.phone,
    hours: process.env.NEXT_PUBLIC_HOURS || defaults.hours,
  };
}
