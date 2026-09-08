import { CarBodyCategory, CarSizeCategory, Vehicle, VehicleChatChoice } from "@/types";

/**
 * Etapa única "Qual veículo vamos cuidar?" — cobre carros com uma pergunta
 * só. "Moto" é uma adição nossa fora do CLAUDE.md (que não cobre motos),
 * necessária porque o catálogo tem serviços exclusivos para motocicletas.
 */
export const vehicleOptions: { id: VehicleChatChoice | "moto"; label: string }[] = [
  { id: "hatch", label: "Hatch" },
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV" },
  { id: "pickup", label: "Pickup" },
  { id: "moto", label: "Moto" },
  { id: "outro", label: "Outro" },
];

/**
 * Mapeia a escolha única do cliente para as duas dimensões de preço
 * internas (porte e carroceria), já que alguns serviços dependem de uma,
 * outros da outra. Regra de negócio definida: "Outro" (veículo não
 * identificado) cai no mesmo tratamento de SUV.
 */
export function resolveVehicleCategories(
  choice: VehicleChatChoice
): { size: CarSizeCategory; body: CarBodyCategory } {
  switch (choice) {
    case "hatch":
      return { size: "small", body: "hatch_sedan" };
    case "sedan":
      return { size: "medium", body: "hatch_sedan" };
    case "suv":
      return { size: "medium", body: "suv" };
    case "pickup":
      return { size: "large", body: "pickup" };
    case "outro":
    default:
      return { size: "medium", body: "suv" };
  }
}

export function vehicleChoiceLabel(choice?: VehicleChatChoice): string {
  return vehicleOptions.find((o) => o.id === choice)?.label ?? "";
}

export function vehicleSummaryLabel(vehicle: Vehicle | null): string {
  if (!vehicle) return "Não informado";
  if (vehicle.type === "motorcycle") return "Moto";
  return vehicle.chatChoice ? vehicleChoiceLabel(vehicle.chatChoice) : "Carro";
}
