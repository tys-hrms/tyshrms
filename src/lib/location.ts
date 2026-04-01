/**
 * Utility for Geofencing and coordinate extraction from Google Maps
 */

export const STORE_LOCATION = {
  lat: 18.942714466561878,
  lng: 72.82600590921075
};

/**
 * Calculates distance between two points in meters using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * Extracts Latitude and Longitude from a Google Maps embed iframe code (src or full tag)
 * Pattern: !2d[lng]!3d[lat]
 */
export function extractCoordsFromIframe(html: string): { lat: number; lng: number } | null {
  // Use regex to find the !2d (longitude) and !3d (latitude) parameters
  const lngMatch = html.match(/!2d(-?\d+\.\d+)/);
  const latMatch = html.match(/!3d(-?\d+\.\d+)/);

  if (latMatch && lngMatch) {
    return {
      lat: parseFloat(latMatch[1]),
      lng: parseFloat(lngMatch[1]),
    };
  }
  return null;
}

/**
 * Gets the current geolocation of the browser
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve your location';
        if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
