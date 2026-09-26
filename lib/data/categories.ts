import { ServiceCategoryInfo } from "@/types";

export const serviceCategories: ServiceCategoryInfo[] = [
  {
    id: "combos",
    label: "Combos",
    description: "Pacotes fechados combinando vários serviços com um preço único.",
  },
  {
    id: "protecao",
    label: "Proteções",
    description: "Revestimento cerâmico e PPF para blindar o brilho por anos.",
  },
  {
    id: "polimento",
    label: "Polimento",
    description: "Correção de pintura, do retoque ao brilho espelhado.",
  },
  {
    id: "limpeza_carro",
    label: "Limpezas",
    description: "Lavagem técnica por dentro e por fora, em três níveis.",
  },
  {
    id: "higienizacao",
    label: "Higienização",
    description: "Ar, bancos, carpete e tratamentos internos específicos.",
  },
  {
    id: "limpeza_moto",
    label: "Limpeza de Motos",
    description: "Detalhamento dedicado para motocicletas.",
  },
  {
    id: "especiais",
    label: "Serviços Especiais",
    description: "Undercar e motor, com avaliação de valor sob demanda.",
  },
  {
    id: "cristalizacao",
    label: "Cristalização de Vidros",
    description:
      "Remove marcas de contaminação e chuva ácida, melhora a visibilidade em dias de chuva e facilita o desprendimento de sujidades.",
  },
];

export function getCategoryLabel(id: string): string {
  return serviceCategories.find((c) => c.id === id)?.label ?? id;
}
