function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

// Simulated Drop-off Location (e.g., an office building)
const dropoff = { lat: 14.599512, lng: 120.984219 }; 

// Simulation 1: Rider is blocks away
const farLocation = { lat: 14.601000, lng: 120.984219 }; 
const distance1 = getDistanceInMeters(farLocation.lat, farLocation.lng, dropoff.lat, dropoff.lng);
console.log(`[Rider En Route] Distance: ${distance1.toFixed(2)} meters. Geofence Triggered? ${distance1 <= 50}`);

// Simulation 2: Rider is just down the street (approaching)
const approachingLocation = { lat: 14.600000, lng: 120.984219 };
const distance2 = getDistanceInMeters(approachingLocation.lat, approachingLocation.lng, dropoff.lat, dropoff.lng);
console.log(`[Rider Approaching] Distance: ${distance2.toFixed(2)} meters. Geofence Triggered? ${distance2 <= 50}`);

// Simulation 3: Rider is outside the building (inside 50m radius)
const arrivedLocation = { lat: 14.599800, lng: 120.984219 };
const distance3 = getDistanceInMeters(arrivedLocation.lat, arrivedLocation.lng, dropoff.lat, dropoff.lng);
console.log(`[Rider Arrived] Distance: ${distance3.toFixed(2)} meters. Geofence Triggered? ${distance3 <= 50}`);
