import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { encode as base64Encode } from 'base-64';

export interface FleetRider {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  name: string;
}

export interface FleetLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface FleetJob {
  pickup_location: FleetLocation;
  dropoff_location: FleetLocation;
}

interface FleetPulseMapProps {
  riders: FleetRider[];
  activeJobs: FleetJob[];
}

// Optimization: Moved carMarkerSvg outside the component to prevent re-allocation
const carMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#073f5a" d="M256 25c-82 0-103 29-103 88v22c-11 4-18 9-18 16v24c0 4 3 6 7 5l14-5v226c0 57 25 84 100 86 75-2 100-29 100-86V175l14 5c4 1 7-1 7-5v-24c0-7-7-12-18-16v-22C359 54 338 25 256 25Z"/>
  <path fill="#3aa3d9" d="M256 39c-72 0-91 24-91 76v34c-16 4-28 10-28 18v14c0 3 2 4 5 3l23-9v223c0 48 20 72 91 74 71-2 91-26 91-74V175l23 9c3 1 5 0 5-3v-14c0-8-12-14-28-18v-34c0-52-19-76-91-76Z"/>
  <path fill="#053d56" d="M192 162c43-13 85-18 128-5l-10 70c-36-14-72-18-108 0l-10-65Z"/>
  <path fill="#053d56" d="M187 329c44 14 91 16 138-1l2 61c-49 26-95 27-142 0l2-60Z"/>
  <path fill="#053d56" opacity=".72" d="M169 175l10 53v100l-18 58V184l8-9Z"/>
  <path fill="#053d56" opacity=".72" d="M343 175l-10 53v100l18 58V184l-8-9Z"/>
  <path fill="#134f68" d="M188 371c44 26 90 26 136 0l3 18c-49 27-95 27-142 0l3-18Z"/>
  <path fill="#64bee9" d="M190 279c44 10 88 10 132 0v46c-41 19-85 19-132 0v-46Z"/>
  <path fill="#64bee9" d="M178 146c53-20 106-26 156-7l-13 18c-42-14-86-10-130 5l-13-16Z"/>
  <path fill="#b7d6f5" d="M176 62c17-11 39-13 50-6 4 3 3 7-1 9l-36 14c-9 4-17-8-13-17Z"/>
  <path fill="#d1e5ff" opacity=".9" d="M178 64c8-6 17-9 28-10-10 8-19 16-28 25-5-3-6-10 0-15Z"/>
  <path fill="#b7d6f5" d="M336 62c-17-11-39-13-50-6-4 3-3 7 1 9l36 14c9 4 17-8 13-17Z"/>
  <path fill="#d1e5ff" opacity=".9" d="M334 64c-8-6-17-9-28-10 10 8 19 16 28 25-5-3-6-10 0-15Z"/>
  <path fill="#b7d6f5" d="M176 450c17 11 39 13 50 6 4-3 3-7-1-9l-36-14c-9-4-17 8-13 17Z"/>
  <path fill="#d1e5ff" opacity=".9" d="M178 448c8 6 17 9 28 10-10-8-19-16-28-25-5 3-6 10 0 15Z"/>
  <path fill="#b7d6f5" d="M336 450c-17 11-39 13-50 6-4-3-3-7-1-9l36-14c9-4 17 8 13 17Z"/>
  <path fill="#d1e5ff" opacity=".9" d="M334 448c-8 6-17 9-28 10-10-8-19-16-28-25-5 3-6 10 0 15Z"/>
  <path fill="#0a5977" d="M160 275h18v5h-18z"/>
  <path fill="#0a5977" d="M334 275h18v5h-18z"/>
  <path fill="#197aa5" opacity=".35" d="M256 39c-72 0-91 24-91 76v34c-10 3-19 6-24 10 54-19 132-32 206-10v-34c0-52-19-76-91-76Z"/>
</svg>`;

/**
 * FleetPulseMap Component
 * A reusable dashboard component that displays multiple riders and active jobs on a single map.
 * Optimized for real-time overview with dynamic updates.
 */
export const FleetPulseMap: React.FC<FleetPulseMapProps> = ({
  riders,
  activeJobs
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialBoundsSet = useRef(false);

  const carMarkerDataUri = useMemo(() => {
    return `data:image/svg+xml;base64,${base64Encode(carMarkerSvg)}`;
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
          .marker-pin { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -15px 0 0 -15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .marker-pin::after { content: ''; width: 24px; height: 24px; margin: 3px 0 0 3px; background: #fff; position: absolute; border-radius: 50%; }
          .rider-car-icon { background: transparent; border: 0; z-index: 1000 !important; }
          .rider-car-wrap { position: relative; width: 48px; height: 48px; }
          .rider-car-body { width: 48px; height: 48px; transform-origin: 50% 50%; transition: transform 0.3s ease; }
          .rider-car-body img { width: 48px; height: 48px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); }
          .rider-label { background: rgba(15, 23, 42, 0.85); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-family: system-ui, sans-serif; font-weight: 700; position: absolute; top: -24px; left: 50%; transform: translateX(-50%); white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
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
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          const riderMarkers = {};
          let jobMarkers = [];

          function createRiderIcon(name) {
            return L.divIcon({ 
              className: 'rider-car-icon', 
              html: \`
                <div class='rider-car-wrap'>
                  <div class='rider-label'>\${name}</div>
                  <div class='rider-car-body'>
                    <img src='${carMarkerDataUri}' alt='' />
                  </div>
                </div>
              \`, 
              iconSize: [48, 48], 
              iconAnchor: [24, 24] 
            });
          }

          function createPinIcon(color) {
            return L.divIcon({ 
              className: 'custom-div-icon', 
              html: \`<div style='background-color:\${color};' class='marker-pin'></div>\`, 
              iconSize: [30, 42], 
              iconAnchor: [15, 42] 
            });
          }

          const pickupIcon = createPinIcon('#10B981'); // Green
          const dropoffIcon = createPinIcon('#EF4444'); // Red

          function updateFleet(riders, jobs, shouldCenter) {
            const currentRiderIds = new Set(riders.map(r => r.id));
            
            // Cleanup missing riders
            Object.keys(riderMarkers).forEach(id => {
              if (!currentRiderIds.has(id)) {
                map.removeLayer(riderMarkers[id]);
                delete riderMarkers[id];
              }
            });

            // Update/Add riders
            riders.forEach(r => {
              const pos = [r.lat, r.lng];
              if (riderMarkers[r.id]) {
                riderMarkers[r.id].setLatLng(pos);
                const el = riderMarkers[r.id].getElement();
                if (el) {
                  const body = el.querySelector('.rider-car-body');
                  if (body) body.style.transform = 'rotate(' + (r.heading || 0) + 'deg)';
                }
              } else {
                const marker = L.marker(pos, { 
                  icon: createRiderIcon(r.name),
                  zIndexOffset: 1000 
                }).addTo(map);
                
                // Allow DOM to render before applying rotation
                setTimeout(() => {
                   const el = marker.getElement();
                   if (el) {
                     const body = el.querySelector('.rider-car-body');
                     if (body) body.style.transform = 'rotate(' + (r.heading || 0) + 'deg)';
                   }
                }, 50);

                riderMarkers[r.id] = marker;
              }
            });

            // Refresh Jobs (clear and redraw for simplicity as they lack IDs)
            jobMarkers.forEach(m => map.removeLayer(m));
            jobMarkers = [];

            jobs.forEach(j => {
              if (j.pickup_location && j.pickup_location.lat) {
                const pm = L.marker([j.pickup_location.lat, j.pickup_location.lng], { icon: pickupIcon }).addTo(map);
                jobMarkers.push(pm);
              }
              if (j.dropoff_location && j.dropoff_location.lat) {
                const dm = L.marker([j.dropoff_location.lat, j.dropoff_location.lng], { icon: dropoffIcon }).addTo(map);
                jobMarkers.push(dm);
              }
            });

            // Center map to show all markers if requested
            if (shouldCenter) {
              const allLayers = [...Object.values(riderMarkers), ...jobMarkers];
              if (allLayers.length > 0) {
                const group = new L.featureGroup(allLayers);
                map.fitBounds(group.getBounds(), { padding: [60, 60], animate: true });
              }
            }
          }

          // Safety: Listen for message event to handle data updates
          window.addEventListener('message', (event) => {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data && data.riders && data.activeJobs) {
                updateFleet(data.riders, data.activeJobs, data.shouldCenter);
              }
            } catch (e) {
              console.error('Failed to parse message data', e);
            }
          });
        </script>
      </body>
    </html>
    `;
  }, [carMarkerDataUri]);

  // Handle real-time updates - Reliability: ensure initial data is sent only after WebView onLoad
  useEffect(() => {
    if (isLoaded && webViewRef.current) {
      const shouldCenter = !initialBoundsSet.current;
      const payload = JSON.stringify({ riders, activeJobs, shouldCenter });
      
      // Safety: Use window.postMessage via injectJavaScript to send structured data
      webViewRef.current.injectJavaScript(`
        (function() {
          window.postMessage(${payload}, '*');
        })();
        true;
      `);

      if (shouldCenter && (riders.length > 0 || activeJobs.length > 0)) {
        initialBoundsSet.current = true;
      }
    }
  }, [riders, activeJobs, isLoaded]);

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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', backgroundColor: '#f8fafc' },
  webView: { flex: 1 },
});
