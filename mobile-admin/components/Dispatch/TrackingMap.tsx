import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { encode as base64Encode } from 'base-64';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RiderMapLocation extends LatLng {
  heading?: number;
}

interface TrackingMapProps {
  pickup: LatLng;
  dropoff: LatLng;
  riderLocation: RiderMapLocation | null;
  history: LatLng[];
  status: string;
}

// Custom car marker SVG matching web tracking styles
const riderMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#1E293B" d="M256 25c-82 0-103 29-103 88v22c-11 4-18 9-18 16v24c0 4 3 6 7 5l14-5v226c0 57 25 84 100 86 75-2 100-29 100-86V175l14 5c4 1 7-1 7-5v-24c0-7-7-12-18-16v-22C359 54 338 25 256 25Z"/>
  <path fill="#3B82F6" d="M256 39c-72 0-91 24-91 76v34c-16 4-28 10-28 18v14c0 3 2 4 5 3l23-9v223c0 48 20 72 91 74 71-2 91-26 91-74V175l23 9c3 1 5 0 5-3v-14c0-8-12-14-28-18v-34c0-52-19-76-91-76Z"/>
  <path fill="#0f172a" d="M192 162c43-13 85-18 128-5l-10 70c-36-14-72-18-108 0l-10-65Z"/>
  <path fill="#0f172a" d="M187 329c44 14 91 16 138-1l2 61c-49 26-95 27-142 0l2-60Z"/>
  <path fill="#60A5FA" d="M190 279c44 10 88 10 132 0v-46c-41 19-85 19-132 0v-46Z"/>
  <path fill="#93C5FD" d="M178 146c53-20 106-26 156-7l-13 18c-42-14-86-10-130 5l-13-16Z"/>
</svg>`;

export const TrackingMap: React.FC<TrackingMapProps> = ({
  pickup,
  dropoff,
  riderLocation,
  history,
  status
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialCenteredRef = useRef(false);

  const riderMarkerDataUri = useMemo(() => {
    return `data:image/svg+xml;base64,${base64Encode(riderMarkerSvg)}`;
  }, []);

  const mapHtml = useMemo(() => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          #map { height: 100vh; width: 100vw; background: #f8fafc; }
          .marker-pin { width: 28px; height: 28px; border-radius: 50% 50% 50% 0; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -14px 0 0 -14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #fff; }
          .marker-pin::after { content: ''; width: 12px; height: 12px; margin: 6px 0 0 6px; background: #fff; position: absolute; border-radius: 50%; }
          .rider-icon-wrap { position: relative; width: 44px; height: 44px; }
          .rider-icon-body { width: 44px; height: 44px; transform-origin: 50% 50%; transition: transform 0.2s ease-in-out; }
          .rider-icon-body img { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.25)); }
          @keyframes flow {
            from {
              stroke-dashoffset: 24;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .animated-route-trail {
            stroke-dasharray: 8, 12;
            animation: flow 1.5s linear infinite;
            stroke-linejoin: round;
            stroke-linecap: round;
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            maxZoom: 18
          }).setView([0, 0], 2);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
          }).addTo(map);

          let pickupMarker = null;
          let dropoffMarker = null;
          let riderMarker = null;
          let routePolyline = null;
          let routePolylineBg = null;
          let historyPolyline = null;

          function createPinIcon(color) {
            return L.divIcon({ 
              className: 'custom-div-icon', 
              html: \`<div style='background-color:\${color};' class='marker-pin'></div>\`, 
              iconSize: [28, 38], 
              iconAnchor: [14, 38] 
            });
          }

          const pickupIcon = createPinIcon('#10B981'); // Green for Pickup
          const dropoffIcon = createPinIcon('#EF4444'); // Red for Dropoff

          const riderIcon = L.divIcon({
            className: 'rider-map-icon',
            html: \`
              <div class='rider-icon-wrap'>
                <div class='rider-icon-body'>
                  <img src='${riderMarkerDataUri}' alt='' />
                </div>
              </div>
            \`,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          let lastRouteCoords = '';

          function decodePolyline(encoded) {
            const points = [];
            let index = 0, len = encoded.length;
            let lat = 0, lng = 0;
            while (index < len) {
              let b, shift = 0, result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
              lat += dlat;

              shift = 0;
              result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
              lng += dlng;

              points.push([lat / 1e5, lng / 1e5]);
            }
            return points;
          }

          async function fetchRouteLine(startPt, endPt) {
            const coordKey = startPt[1] + ',' + startPt[0] + ';' + endPt[1] + ',' + endPt[0];
            if (lastRouteCoords === coordKey) return;
            lastRouteCoords = coordKey;

            try {
              const url = 'https://router.project-osrm.org/route/v1/driving/' + coordKey + '?overview=full&geometries=polyline';
              const response = await fetch(url);
              if (!response.ok) throw new Error('OSRM error');
              const data = await response.json();
              if (data.code === 'Ok' && data.routes && data.routes[0]) {
                const decoded = decodePolyline(data.routes[0].geometry);
                
                // Draw background track polyline
                if (!routePolylineBg) {
                  routePolylineBg = L.polyline(decoded, {
                    color: '#3B82F6',
                    weight: 6,
                    opacity: 0.25,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }).addTo(map);
                } else {
                  routePolylineBg.setLatLngs(decoded);
                }

                // Draw animated route trail polyline
                if (!routePolyline) {
                  routePolyline = L.polyline(decoded, { 
                    color: '#3B82F6', 
                    weight: 5, 
                    opacity: 0.9,
                    className: 'animated-route-trail',
                    lineCap: 'round',
                    lineJoin: 'round'
                  }).addTo(map);
                } else {
                  routePolyline.setLatLngs(decoded);
                }
              }
            } catch (e) {
              console.warn('Failed to fetch snapped route, falling back to straight line:', e);
              const pts = [startPt, endPt];
              
              if (!routePolylineBg) {
                routePolylineBg = L.polyline(pts, {
                  color: '#3B82F6',
                  weight: 6,
                  opacity: 0.25,
                  lineCap: 'round',
                  lineJoin: 'round'
                }).addTo(map);
              } else {
                routePolylineBg.setLatLngs(pts);
              }

              if (!routePolyline) {
                routePolyline = L.polyline(pts, { 
                  color: '#3B82F6', 
                  weight: 5, 
                  opacity: 0.9,
                  className: 'animated-route-trail',
                  lineCap: 'round',
                  lineJoin: 'round'
                }).addTo(map);
              } else {
                routePolyline.setLatLngs(pts);
              }
            }
          }

          function updateMapData(pickup, dropoff, riderLoc, routeHistory, status, shouldFit) {
            const layers = [];

            // 1. Render Pickup
            if (pickup && pickup.latitude) {
              const pos = [pickup.latitude, pickup.longitude];
              if (!pickupMarker) {
                pickupMarker = L.marker(pos, { icon: pickupIcon }).addTo(map);
              } else {
                pickupMarker.setLatLng(pos);
              }
              layers.push(pickupMarker);
            }

            // 2. Render Dropoff
            if (dropoff && dropoff.latitude) {
              const pos = [dropoff.latitude, dropoff.longitude];
              if (!dropoffMarker) {
                dropoffMarker = L.marker(pos, { icon: dropoffIcon }).addTo(map);
              } else {
                dropoffMarker.setLatLng(pos);
              }
              layers.push(dropoffMarker);
            }

            // 3. Render Rider
            if (riderLoc && riderLoc.latitude) {
              const pos = [riderLoc.latitude, riderLoc.longitude];
              if (!riderMarker) {
                riderMarker = L.marker(pos, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
              } else {
                riderMarker.setLatLng(pos);
              }
              layers.push(riderMarker);

              // Rotate Rider
              const el = riderMarker.getElement();
              if (el) {
                const body = el.querySelector('.rider-icon-body');
                if (body) body.style.transform = 'rotate(' + (riderLoc.heading || 0) + 'deg)';
              }
            } else if (riderMarker) {
              map.removeLayer(riderMarker);
              riderMarker = null;
            }

            // 4. Render History Line (Passed Route)
            if (routeHistory && routeHistory.length > 0) {
              const pts = routeHistory.map(p => [p.latitude, p.longitude]);
              if (!historyPolyline) {
                historyPolyline = L.polyline(pts, { color: '#94A3B8', weight: 4, opacity: 0.6 }).addTo(map);
              } else {
                historyPolyline.setLatLngs(pts);
              }
            } else if (historyPolyline) {
              map.removeLayer(historyPolyline);
              historyPolyline = null;
            }

            // 5. Draw route line between rider and dropoff
            const startPt = riderLoc && riderLoc.latitude ? [riderLoc.latitude, riderLoc.longitude] : (pickup && pickup.latitude ? [pickup.latitude, pickup.longitude] : null);
            if (startPt && dropoff && dropoff.latitude) {
              fetchRouteLine(startPt, [dropoff.latitude, dropoff.longitude]);
            } else {
              if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
              }
              if (routePolylineBg) {
                map.removeLayer(routePolylineBg);
                routePolylineBg = null;
              }
              lastRouteCoords = '';
            }

            // Center bounds
            if (shouldFit && layers.length > 0) {
              const group = new L.featureGroup(layers);
              map.fitBounds(group.getBounds(), { padding: [50, 50], animate: true });
            }
          }

          window.addEventListener('message', (event) => {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data) {
                updateMapData(data.pickup, data.dropoff, data.riderLocation, data.history, data.status, data.shouldFit);
              }
            } catch (e) {
              console.error('Failed to parse map packet:', e);
            }
          });
        </script>
      </body>
    </html>
    `;
  }, [riderMarkerDataUri]);

  // Feed updates via injectJavaScript to keep markers sliding smoothly without reloading
  useEffect(() => {
    if (isLoaded && webViewRef.current) {
      const shouldFit = !initialCenteredRef.current;
      const payload = JSON.stringify({ pickup, dropoff, riderLocation, history, status, shouldFit });
      
      webViewRef.current.injectJavaScript(`
        (function() {
          window.postMessage(${payload}, '*');
        })();
        true;
      `);

      if (shouldFit && (pickup.latitude || dropoff.latitude)) {
        initialCenteredRef.current = true;
      }
    }
  }, [pickup, dropoff, riderLocation, history, status, isLoaded]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        scrollEnabled={false}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onLoad={() => setIsLoaded(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', backgroundColor: '#f8fafc' },
  webView: { flex: 1 },
});
