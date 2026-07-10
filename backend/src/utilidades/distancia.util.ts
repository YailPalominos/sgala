/**
 * Calcula la distancia entre dos puntos geográficos usando la Fórmula Haversine.
 *
 * @param lat1 Latitud del primer punto en grados
 * @param lng1 Longitud del primer punto en grados
 * @param lat2 Latitud del segundo punto en grados
 * @param lng2 Longitud del segundo punto en grados
 * @returns Distancia en metros
 */
export function calcularDistanciaHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const RADIO_TIERRA = 6371000; // metros

  const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

  const dLat = aRadianes(lat2 - lat1);
  const dLng = aRadianes(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RADIO_TIERRA * c;
}
