/** Link de busca do Google Maps para um endereço em texto — funciona tanto
 * no app (mobile) quanto no navegador (desktop), sem precisar de API key. */
export function buildMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
