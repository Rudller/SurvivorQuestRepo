export async function geocodeLocation(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedQuery)}`,
    );
    if (!response.ok) {
      return null;
    }

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const [first] = results as Array<{ lat?: unknown; lon?: unknown }>;
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}
