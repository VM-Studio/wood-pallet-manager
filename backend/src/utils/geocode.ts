/**
 * Geocodificación server-side usando la Directions API de Google Maps.
 * La Directions API está habilitada en la clave de este proyecto y funciona
 * desde el servidor (sin restricciones de HTTP Referer).
 * Truco: enviamos origen == destino → obtenemos start_location como lat/lng.
 */

interface GeoResult {
  lat: number;
  lng: number;
}

interface DirectionsResponse {
  status: string;
  routes: Array<{
    legs: Array<{
      start_location: { lat: number; lng: number };
    }>;
  }>;
  error_message?: string;
}

/**
 * Convierte una dirección de texto en coordenadas lat/lng.
 * Usa la Directions API (habilitada) con origin == destination como truco de geocodificación.
 * @returns { lat, lng } o null si falla
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn('[geocode] GOOGLE_MAPS_API_KEY no configurada en .env');
    return null;
  }
  if (!address || address.trim() === '' || address === 'Sin destino') {
    return null;
  }

  // Añadir ", Argentina" si no hay país explícito
  const query = address.toLowerCase().includes('argentina')
    ? address
    : `${address}, Argentina`;

  const encoded = encodeURIComponent(query);

  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${encoded}&destination=${encoded}` +
      `&region=ar&key=${key}`;

    const response = await fetch(url);
    const data = (await response.json()) as DirectionsResponse;

    if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]?.start_location) {
      const { lat, lng } = data.routes[0].legs[0].start_location;
      return { lat, lng };
    }

    if (data.status === 'NOT_FOUND' || data.status === 'ZERO_RESULTS') {
      // Intentar sin ", Argentina" por si el usuario ya lo escribió distinto
      return null;
    }

    console.warn(`[geocode] Status inesperado: ${data.status}`, data.error_message ?? '');
    return null;
  } catch (err) {
    console.error('[geocode] Error llamando Directions API:', err);
    return null;
  }
}
