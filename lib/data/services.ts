import { Service, VehicleType } from "@/types";

// ---------------------------------------------------------------------------
// Catálogo centralizado. Preços e descrições vêm diretamente da especificação
// do protótipo — nada aqui foi inventado. Trocar `image` pelas fotos
// definitivas quando disponíveis; por ora usamos referências de placeholder.
// ---------------------------------------------------------------------------

export const services: Service[] = [
  // ---------------------------------------------------------------- PROTEÇÃO
  {
    id: "revestimento-ceramico",
    category: "protecao",
    vehicleTypes: ["car"],
    name: "Revestimento Cerâmico",
    shortDescription: "Proteção de 1 ou 3 anos com brilho molhado e duradouro.",
    description:
      "Camada cerâmica de alta resistência que protege a pintura contra sujeira, raios UV e desgaste, com brilho molhado por anos.",
    image: "/images/services/revestimento-ceramico.jpg",
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
        id: "3-anos",
        label: "Proteção de 3 anos",
        prices: { small: 2500, medium: 2700, large: 3000 },
        gift: [
          "Descontaminação dos vidros",
          "Proteção",
          "Proteção nas rodas e caixas de roda",
        ],
      },
    ],
  },
  // As duas opções abaixo são as mesmas do card "vitrine" acima, só que
  // como serviços reais e independentes — usadas apenas dentro do fluxo de
  // orçamento (RevestimentoGroupCard), nunca soltas no catálogo público.
  {
    id: "revestimento-1-ano",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "Revestimento Cerâmico — 1 ano",
    shortDescription: "Proteção de 1 ano com brilho molhado e duradouro.",
    description:
      "Camada cerâmica de alta resistência que protege a pintura contra sujeira, raios UV e desgaste, com brilho molhado por 1 ano.",
    image: "/images/services/revestimento-ceramico.jpg",
    pricingType: "vehicle_category",
    vehicleDimension: "size",
    prices: { small: 1500, medium: 1700, large: 1900 },
    gift: ["Descontaminação dos vidros"],
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
  },
  {
    id: "revestimento-3-anos",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "Revestimento Cerâmico — 3 anos",
    shortDescription: "Proteção de 3 anos com brilho molhado e duradouro.",
    description:
      "Camada cerâmica de alta resistência que protege a pintura contra sujeira, raios UV e desgaste, com brilho molhado por 3 anos.",
    image: "/images/services/revestimento-ceramico.jpg",
    pricingType: "vehicle_category",
    vehicleDimension: "size",
    prices: { small: 2500, medium: 2700, large: 3000 },
    gift: [
      "Descontaminação dos vidros",
      "Proteção",
      "Proteção nas rodas e caixas de roda",
    ],
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
  },
  {
    id: "ppf-moto",
    category: "protecao",
    vehicleTypes: ["motorcycle"],
    name: "PPF em Motos",
    shortDescription: "Película de proteção contra riscos e impactos, credenciado ALTA.",
    description:
      "Película transparente de alta resistência aplicada sobre a pintura do veículo para protegê-la contra riscos, impactos de pedras, arranhões leves, manchas e ação do tempo, preservando o brilho e a aparência original por muito mais tempo. Serviço credenciado ALTA.",
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 2390,
    benefits: ["Proteção por até 10 anos"],
    note: "Consulte condições.",
  },
  {
    id: "ppf-carro",
    category: "protecao",
    vehicleTypes: ["car"],
    name: "PPF em Carro",
    shortDescription: "Película de proteção contra riscos e impactos, credenciado ALTA.",
    description:
      "Película transparente de alta resistência aplicada sobre a pintura do veículo para protegê-la contra riscos, impactos de pedras, arranhões leves, manchas e ação do tempo, preservando o brilho e a aparência original por muito mais tempo. Serviço credenciado ALTA.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 4390,
    benefits: ["Proteção por até 10 anos"],
    note: "Consulte condições.",
    priceBreakdown: [
      {
        title: "Kits",
        items: [
          { name: "Para-choque", price: 1490 },
          { name: "Capô", price: 1390 },
          { name: "Colunas em Black Piano", price: 600 },
          { name: "Farol", price: 550 },
          { name: "Quinas e conchas de maçaneta", price: 500 },
          { name: "Soleiras de portas", price: 500 },
        ],
      },
      {
        title: "PPF Completos",
        items: [
          { name: "PPF Full", price: 14990, isEstimate: true },
          { name: "Proteção Híbrida", price: 5990, isEstimate: true },
          { name: "Frontal", price: 4390, isEstimate: true },
        ],
      },
    ],
  },
  // As opções abaixo são as mesmas do card "vitrine" acima, só que como
  // serviços reais e independentes — usadas apenas dentro do fluxo de
  // orçamento (PpfCarroGroupCard), nunca soltas no catálogo público.
  {
    id: "ppf-carro-parachoque",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Para-choque",
    shortDescription: "Kit de PPF para o para-choque dianteiro.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 1490,
  },
  {
    id: "ppf-carro-capo",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Capô",
    shortDescription: "Kit de PPF para o capô.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 1390,
  },
  {
    id: "ppf-carro-colunas",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Colunas em Black Piano",
    shortDescription: "Kit de PPF para as colunas em black piano.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 600,
  },
  {
    id: "ppf-carro-farol",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Farol",
    shortDescription: "Kit de PPF para os faróis.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 550,
  },
  {
    id: "ppf-carro-macanetas",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Quinas e Conchas de Maçaneta",
    shortDescription: "Kit de PPF para quinas e conchas de maçaneta.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 500,
  },
  {
    id: "ppf-carro-soleiras",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF — Soleiras de Portas",
    shortDescription: "Kit de PPF para soleiras de portas.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 500,
  },
  {
    id: "ppf-carro-full",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF Full",
    shortDescription:
      "Capô, parachoque dianteiro e traseiro, para-lamas, laterais, tampa, porta-malas, teto, colunas, retrovisores e farol.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 14990,
    note: "Consulte condições.",
  },
  {
    id: "ppf-carro-hibrida",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "Proteção Híbrida",
    shortDescription: "Kit frontal + vitrificação no restante do veículo.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 5990,
    note: "Consulte condições.",
  },
  {
    id: "ppf-carro-frontal",
    category: "protecao",
    vehicleTypes: ["car"],
    hiddenFromCatalog: true,
    name: "PPF Frontal",
    shortDescription: "Capô, parachoque dianteiro, para-lamas dianteiros e par de faróis.",
    image: "/images/services/ppf-carro.jpg",
    pricingType: "starting_at",
    vehicleDimension: "none",
    startingPrice: 4390,
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
    pricingType: "starting_at",
    vehicleDimension: "motorcycle",
    startingPrice: 300,
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
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 200,
  },
  {
    id: "higienizacao-ar",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização do Ar com Ozônio",
    shortDescription: "Tratamento com ozônio e troca do filtro de ar.",
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
    pricingType: "fixed",
    vehicleDimension: "none",
    fixedPrice: 350,
  },
  {
    id: "higienizacao-completa",
    category: "higienizacao",
    vehicleTypes: ["car"],
    name: "Higienização Interna Completa",
    shortDescription: "Todo o interior higienizado — e ganhe a limpeza externa de brinde.",
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

/** Convenção de arquivo: uma imagem por serviço em /public/images/services/,
 * nomeada exatamente como o id do serviço (ex: revestimento-ceramico.jpg).
 * Os componentes que exibem a imagem já fazem fallback para um placeholder
 * caso o arquivo não exista. */
export function getServiceImagePath(service: Service): string {
  return service.image ?? `/images/services/${service.id}.jpg`;
}

/** As 3 opções de Limpeza (carro) — no fluxo de orçamento aparecem
 * agrupadas sob um único item "Limpeza" que expande pra escolher o tipo,
 * em vez de 3 linhas separadas na lista principal. */
export const limpezaTierServiceIds = [
  "limpeza-manutencao",
  "limpeza-tecnica",
  "limpeza-premium",
];

/** As 2 opções de Revestimento Cerâmico (carro) — agrupadas sob um único
 * item "Revestimento Cerâmico" no fluxo de orçamento, igual à Limpeza. */
export const revestimentoTierServiceIds = [
  "revestimento-1-ano",
  "revestimento-3-anos",
];

/** Undercar — só fica disponível como adicional dentro da escolha de
 * Limpeza (carro), não aparece solto na lista principal. */
export const limpezaAddonServiceIds = ["undercar", "undercar-premium"];

/** As 6 Higienizações — no fluxo de orçamento aparecem agrupadas sob um
 * único item "Higienização" (categoria própria, separada da Limpeza) que
 * expande pra marcar quantas quiser. */
export const higienizacaoServiceIds = [
  "higienizacao-cintos",
  "higienizacao-teto",
  "higienizacao-ar",
  "higienizacao-carpete",
  "higienizacao-bancos",
  "higienizacao-completa",
];

/** Kits avulsos de PPF em Carro — multi-seleção dentro do card "PPF em
 * Carro", em ordem decrescente de valor. */
export const ppfCarroKitServiceIds = [
  "ppf-carro-parachoque",
  "ppf-carro-capo",
  "ppf-carro-colunas",
  "ppf-carro-farol",
  "ppf-carro-macanetas",
  "ppf-carro-soleiras",
];

/** Pacotes completos de PPF em Carro — seleção única (são níveis que se
 * substituem), em ordem decrescente de valor. */
export const ppfCarroCompletoServiceIds = [
  "ppf-carro-full",
  "ppf-carro-hibrida",
  "ppf-carro-frontal",
];

/** Serviços "vitrine": existem só pra exibição no catálogo público (têm
 * `variants` ou `priceBreakdown` em vez de preço direto) — nunca aparecem
 * como item selecionável solto no fluxo de orçamento; lá quem entra são os
 * serviços reais listados nos grupos acima. */
export const catalogOnlyServiceIds = ["revestimento-ceramico", "ppf-carro"];

/** Um serviço sem `vehicleTypes` vale para qualquer veículo; os demais só
 * aparecem para o(s) tipo(s) declarado(s). */
export function isServiceAvailableForVehicleType(
  service: Service,
  vehicleType: VehicleType
): boolean {
  return !service.vehicleTypes || service.vehicleTypes.includes(vehicleType);
}
