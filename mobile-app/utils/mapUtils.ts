import polyline from 'polyline';

/**
 * --- OSRM ROAD SNAPPER ---
 * Fetches the actual road geometry between two points using 
 * the free Open Source Routing Machine API.
 */
export async function getRoadSnappedPath(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=polyline`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`OSRM HTTP error! status: ${response.status}`);
      return [
        { latitude: start.lat, longitude: start.lng },
        { latitude: end.lat, longitude: end.lng }
      ];
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn('OSRM returned non-JSON response!');
      return [
        { latitude: start.lat, longitude: start.lng },
        { latitude: end.lat, longitude: end.lng }
      ];
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM could not find road path, falling back to straight line');
      return [
        { latitude: start.lat, longitude: start.lng },
        { latitude: end.lat, longitude: end.lng }
      ];
    }

    // Decode the OSRM Polyline into lat/lng array
    const points = polyline.decode(data.routes[0].geometry);
    
    return points.map(point => ({
      latitude: point[0],
      longitude: point[1]
    }));
  } catch (error) {
    console.error('OSRM Fetch Error:', error);
    return [
      { latitude: start.lat, longitude: start.lng },
      { latitude: end.lat, longitude: end.lng }
    ];
  }
}

/**
 * --- POINT-TO-PATH SNAPPER ---
 * Finds the nearest point on a polyline for a given coordinate.
 * This keeps the bike icon perfectly on the road.
 */
export function snapPointToPath(point: { latitude: number, longitude: number }, path: { latitude: number, longitude: number }[]) {
  if (!path || path.length === 0) return point;

  let minDistance = Infinity;
  let snappedPoint = path[0];

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    // Simple Euclidean distance for snapping
    const distance = Math.sqrt(
      Math.pow(p.latitude - point.latitude, 2) + 
      Math.pow(p.longitude - point.longitude, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      snappedPoint = p;
    }
  }

  // Use the snapped point only if we are relatively close to the route
  // to avoid "warping" if the rider takes a completely different road.
  return minDistance < 0.001 ? snappedPoint : point;
}
