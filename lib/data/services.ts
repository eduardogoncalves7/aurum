import { Service, VehicleType } from "@/types";

// ---------------------------------------------------------------------------
// Catálogo centralizado. Preços e descrições vêm diretamente da especificação
// do protótipo — nada aqui foi inventado. Trocar `image` pelas fotos
// definitivas quando disponíveis; por ora usamos referências de placeholder.
// ---------------------------------------------------------------------------

export const serviceImages = {
  ceramic: "/images/services/ceramic.jpg",
  ppf: "/images/services/ppf.jpg",
  undercar: "/images/services/undercar.jpg",
  engine: "/images/services/engine.jpg",
  motorcycleCleaning: "/images/services/motorcycle.jpg",
  polishing: "/images/services/polishing.jpg",
  carCleaning: "/images/services/car-cleaning.jpg",
  sanitization: "/images/services/sanitization.jpg",
};

export const services: Service[] = [
  // ---------------------------------------------------------------- PROTEÇÃO
  {
    id: "revestimento-ceramico",
    category: "protecao",
    vehicleTypes: ["car"],
    name: "Revestimento Cerâmico",
    shortDescription: "Proteção de 1 a 4 anos com brilho molhado e duradouro.",
    description:
      "Camada cerâmica de alta resistência que protege a pintura contra sujeira, raios UV e desgaste, com brilho molhado por anos.",
    image: serviceImages.ceramic,
    pricingType: "vehicle_category",
    vehicleDimension: "size",
    featured: true,
    benefits: [
      "Veículo com capacidade de sujar até 70% menos",
      "Diminui o desgaste do verniz pela exposição ao sol e chuva",
      "Facilidade em limpar",
      "Brilho molhado",
      "Brilho duradouro",
      "Proteção UV",
      "3 a 5x mais resistência que o próprio verniz",
    ],
    includes: [
      "Limpeza detalhada interna",
      "Descontaminação",
      "Preparação da pintura",
      "Polimento técnico",
      "Revitalização de plásticos",
      "Revitalização de borrachas",
      "Revitalização de pneus",
      "Revitalização da caixa de roda",
    ],
    note: "Todos os pacotes incluem lavagem técnica premium interna e polimento técnico.",
    variants: [
      {
        id: "1-ano",
        label: "Proteção de 1 ano",
        prices: { small: 1500, medium: 1700, large: 1900 },
        gift: ["Descontaminação dos vidros"],
      },
      {
        id: "2-anos",
        label: "Proteção de 2 anos",
        prices: { small: 1700, medium: 1900, large: 2100 },
        gift: ["Descontaminação dos vidros", "Proteção dos vidros"],
      },
      {
        id: "3-anos",
        label: "Proteção de 3 anos",
        prices: { small: 2200, medium: 2400, large: 2600 },
        gift: [
          "Descontaminação dos vidros",
          "Proteção",
          "Revitalização dos faróis",
        ],
      },
      {
        id: "4-anos",
        label: "Proteção de 4 anos",
        prices: { small: 2700, medium: 2900, large: 3100 },
        gift: [
          "Descontaminação dos vidros",
          "Proteção",
          "Revitalização dos faróis",
          "Vitrificação das rodas",
        ],
      },
    ],
  },
  {
    id: "ppf-moto",
    category: "protecao",
    vehicleTypes: ["motorcycle"],
    name: "PPF em Motos",
    shortDescription: "Película de proteção contra riscos e impactos, credenciado ALTA.",
    description:
      "Película transparente de alta resistência aplicada sobre a pintura do veículo para protegê-la contra riscos, impactos de pedras, arranhões leves, manchas e ação do tempo, preservando o brilho e a aparência original por muito mais tempo. Serviço credenciado ALTA.",
    image: serviceImages.ppf,
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 2390,
    benefits: ["Proteção por até 10 anos"],
    note: "Consulte condições.",
  },

  // -------------------------------------------------------------- POLIMENTO
  {
    id: "polimento-comercial",
    category: "polimento",
    vehicleTypes: ["car"],
    name: "Polimento Comercial",
    shortDescription: "Remoção de riscos leves e encardido, com aprofundamento do brilho.",
    description:
      "Serviço voltado para correção de pequenas marcas e defeitos na superfície do verniz, remoção de riscos leves, remoção de encardido e aprofundamento do brilho. Inclui lavagem técnica interna para o cliente.",
    image: serviceImages.polishing,
    pricingType: "vehicle_category",
    vehicleDimension: "size",
    prices: { small: 600, medium: 700, large: 800 },
    includes: ["Lavagem técnica interna"],
  },
  {
    id: "polimento-tecnico",
    category: "polimento",
    vehicleTypes: ["car"],
    name: "Polimento Técnico",
    shortDescription: "Correção técnica da pintura com brilho espelhado e molhado.",
    description:
      "Serviço voltado para correção de pintura, correção técnica dos defeitos possíveis sem desgastar excessivamente o verniz, brilho espelhado e molhado. Pode corrigir até 90% dos defeitos presentes, dependendo das condições da pintura. Inclui lavagem técnica premium para o cliente.",
    image: serviceImages.polishing,
    pricingType: "vehicle_category",
    vehicleDimension: "size",
    prices: { small: 1000, medium: 1100, large: 1200 },
    includes: ["Lavagem técnica premium interna"],
    note: "Pinturas com retoque precisam ser avaliadas presencialmente para orçamento.",
    featured: true,
  },

  // ------------------------------------------------------------ LIMPEZA CARRO
  {
    id: "limpeza-manutencao",
    category: "limpeza_carro",
    vehicleTypes: ["car"],
    name: "Limpeza Manutenção",
    shortDescription: "Lavagem rápida por dentro e por fora, snow foam e aspiração.",
    description:
      "Limpeza simples do painel e portas, limpeza dos cantos de porta, aspiração, limpeza dos vidros, limpeza das rodas e caixas de roda, lavagem da pintura pelo método snow foam e pretinho.",
    image: serviceImages.carCleaning,
    pricingType: "vehicle_category",
    vehicleDimension: "body",
    prices: { hatch_sedan: 120, suv: 140, pickup: 170 },
  },
  {
    id: "limpeza-tecnica",
    category: "limpeza_carro",
    vehicleTypes: ["car"],
    name: "Limpeza Técnica",
    shortDescription: "Lavagem completa com revitalização de plásticos e enceramento.",
    description:
      "Limpeza das portas e painel, limpeza dos cantos de porta, aspiração, limpeza das pestanas e dos vidros, limpeza das rodas e caixas de roda, lavagem externa pelo método snow foam, revitalização dos plásticos e borrachas internos e externos, enceramento da pintura e selante nos pneus.",
    image: serviceImages.carCleaning,
    pricingType: "vehicle_category",
    vehicleDimension: "body",
    prices: { hatch_sedan: 200, suv: 240, pickup: 300 },
  },
  {
    id: "limpeza-premium",
    category: "limpeza_carro",
    vehicleTypes: ["car"],
    name: "Limpeza Premium",
    shortDescription: "Detalhamento completo com descontaminação e enceramento premium.",
    description:
      "Limpeza detalhada das portas e painel, cantos de porta, aspiração completa, limpeza das pestanas e canaletas de vidro, dos vidros, dos trilhos dos bancos, lavagem externa pelo método snow foam, descontaminação de pintura e emblemas, limpeza das rodas e caixas de roda, revitalização de plásticos e borrachas, enceramento premium, selante nos pneus e envernizamento das caixas de roda.",
    image: serviceImages.carCleaning,
    pricingType: "vehicle_category",
    vehicleDimension: "body",
    prices: { hatch_sedan: 300, suv: 350, pickup: 400 },
    featured: true,
  },

  // ---------------------------------------------------------------- ESPECIAIS
  {
    id: "undercar",
    category: "especiais",
    vehicleTypes: ["car"],
    name: "Detalhamento Undercar",
    shortDescription: "Limpeza do chassi, remoção de contaminantes e lubrificação.",
    description:
      "Limpeza do chassi, remoção de sujeira e contaminantes, proteção e lubrificação completa.",
    image: serviceImages.undercar,
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 250,
    note: "Os valores podem variar conforme o estado do veículo, o nível de sujeira e as necessidades específicas.",
  },
  {
    id: "undercar-premium",
    category: "especiais",
    vehicleTypes: ["car"],
    name: "Detalhamento Undercar Premium",
    shortDescription: "Desmontagem de rodas e pneus para um detalhamento mais profundo.",
    description:
      "Desmontagem das rodas e pneus, detalhamento mais profundo, limpeza, proteção e lubrificação completa.",
    image: serviceImages.undercar,
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 500,
    includes: [
      "Lubrificação de algumas peças",
      "Proteção antioxidante da parte inferior completa",
    ],
    note: "Os valores podem variar conforme o estado do veículo, o nível de sujeira e as necessidades específicas.",
  },
  {
    id: "limpeza-motor",
    category: "especiais",
    vehicleTypes: ["car"],
    name: "Limpeza de Motor",
    shortDescription: "Limpeza profissional sem agressão aos componentes do motor.",
    description:
      "Processo de limpeza sem agressão aos componentes do motor, utilizando produtos profissionais e procedimento especializado.",
    image: serviceImages.engine,
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 250,
    includes: [
      "Limpeza completa",
      "Proteção antioxidante",
      "Hidratação para altas temperaturas em plásticos e borrachas",
    ],
    note: "O valor pode variar conforme o estado do veículo, nível de sujeira e proteção escolhida.",
  },

  // ------------------------------------------------------------ LIMPEZA MOTO
  {
    id: "limpeza-moto-ouro",
    category: "limpeza_moto",
    vehicleTypes: ["motorcycle"],
    name: "Limpeza Ouro",
    shortDescription: "Lavagem detalhada com proteção antioxidante e cera premium.",
    description:
      "Lavagem detalhada do motor, roda, caixa de roda e da motocicleta, com proteção do motor e rodas com verniz antioxidante.",
    image: serviceImages.motorcycleCleaning,
    pricingType: "starting_at",
    vehicleDimension: "motorcycle",
    startingPrice: 150,
    includes: [
      "Cera super premium",
      "Revitalização dos plásticos",
      "Hidratação do banco",
      "Pretinho",
      "Condicionamento na caixa de roda",
    ],
  },
  {
    id: "limpeza-moto-premium",
    category: "limpeza_moto",
    vehicleTypes: ["motorcycle"],
    name: "Limpeza Premium",
    shortDescription: "Desmontagem completa para detalhamento profundo da moto.",
    description:
      "Desmontagem das carenagens, dos bancos e do pião para um detalhamento completo: tanque, carenagens, motor, chassi, plásticos e borrachas.",
    image: serviceImages.motorcycleCleaning,
    pricingType: "starting_at",
    vehicleDimension: "motorcycle",
    startingPrice: 250,
    includes: [
      "Limpeza detalhada de toda a motocicleta",
      "Lavagem da pintura",
      "Proteção premium completa",
      "Lubrificação da corrente",
      "Selante nos pneus",
    ],
  },

  // ------------------------------------------------------------ HIGIENIZAÇÃO
  {
    id: "higienizacao-cintos",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização de Cintos de Segurança",
    shortDescription: "Limpeza específica dos cintos de segurança.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 100,
  },
  {
    id: "higienizacao-teto",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização de Teto e Coluna",
    shortDescription: "Limpeza do forro de teto e das colunas internas.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 120,
  },
  {
    id: "higienizacao-ar",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização do Ar com Ozônio",
    shortDescription: "Tratamento com ozônio e troca do filtro de ar.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 200,
    includes: ["Troca de filtro de ar"],
  },
  {
    id: "higienizacao-carpete",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização de Carpete e Porta-malas",
    shortDescription: "Limpeza completa do carpete e do porta-malas.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 300,
  },
  {
    id: "higienizacao-bancos",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização de Bancos e Forros de Porta",
    shortDescription: "Limpeza profunda de bancos e forros das portas.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 300,
  },
  {
    id: "higienizacao-completa",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização Interna Completa",
    shortDescription: "Todo o interior higienizado — e ganhe a limpeza externa de brinde.",
    image: serviceImages.sanitization,
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 1000,
    gift: ["Limpeza externa"],
    featured: true,
  },
];

export function getServiceById(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}

/** Um serviço sem `vehicleTypes` vale para qualquer veículo; os demais só
 * aparecem para o(s) tipo(s) declarado(s). */
export function isServiceAvailableForVehicleType(
  service: Service,
  vehicleType: VehicleType
): boolean {
  return !service.vehicleTypes || service.vehicleTypes.includes(vehicleType);
}
