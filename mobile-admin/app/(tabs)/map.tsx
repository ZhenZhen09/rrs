import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { encode as base64Encode } from 'base-64';
import { useRealTime } from '../../context/RealTimeContext';
import { COLORS } from '../../constants/Theme';

// Custom car marker SVG matching web tracking styles
const riderMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#1E293B" d="M256 25c-82 0-103 29-103 88v22c-11 4-18 9-18 16v24c0 4 3 6 7 5l14-5v226c0 57 25 84 100 86 75-2 100-29 100-86V175l14 5c4 1 7-1 7-5v-24c0-7-7-12-18-16v-22C359 54 338 25 256 25Z"/>
  <path fill="#3B82F6" d="M256 39c-72 0-91 24-91 76v34c-16 4-28 10-28 18v14c0 3 2 4 5 3l23-9v223c0 48 20 72 91 74 71-2 91-26 91-74V175l23 9c3 1 5 0 5-3v-14c0-8-12-14-28-18v-34c0-52-19-76-91-76Z"/>
  <path fill="#0f172a" d="M192 162c43-13 85-18 128-5l-10 70c-36-14-72-18-108 0l-10-65Z"/>
  <path fill="#0f172a" d="M187 329c44 14 91 16 138-1l2 61c-49 26-95 27-142 0l2-60Z"/>
  <path fill="#60A5FA" d="M190 279c44 10 88 10 132 0v-46c-41 19-85 19-132 0v-46Z"/>
  <path fill="#93C5FD" d="M178 146c53-20 106-26 156-7l-13 18c-42-14-86-10-130 5l-13-16Z"/>
</svg>`;

export default function MapScreen() {
  const { riderLocations } = useRealTime();
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
          .rider-icon-wrap { position: relative; width: 44px; height: 44px; }
          .rider-icon-body { width: 44px; height: 44px; transform-origin: 50% 50%; transition: transform 0.2s ease-in-out; }
          .rider-icon-body img { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.25)); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            maxZoom: 18
          }).setView([14.5995, 120.9842], 12); // Default to Manila
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
          }).addTo(map);

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

          const riderMarkers = {};

          window.addEventListener('message', (event) => {
            try {
              const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (data && data.type === 'UPDATE_RIDERS') {
                const locations = data.payload;
                const activeIds = new Set(locations.map(l => l.id));
                const bounds = [];

                // Remove inactive markers
                Object.keys(riderMarkers).forEach(id => {
                  if (!activeIds.has(id)) {
                    map.removeLayer(riderMarkers[id]);
                    delete riderMarkers[id];
                  }
                });

                // Add or update markers
                locations.forEach(loc => {
                  const pos = [loc.lat, loc.lng];
                  bounds.push(pos);
                  if (riderMarkers[loc.id]) {
                    riderMarkers[loc.id].setLatLng(pos);
                    const el = riderMarkers[loc.id].getElement();
                    if (el) {
                      const body = el.querySelector('.rider-icon-body');
                      if (body) body.style.transform = 'rotate(' + (loc.heading || 0) + 'deg)';
                    }
                  } else {
                    riderMarkers[loc.id] = L.marker(pos, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
                    const el = riderMarkers[loc.id].getElement();
                    if (el) {
                      const body = el.querySelector('.rider-icon-body');
                      if (body) body.style.transform = 'rotate(' + (loc.heading || 0) + 'deg)';
                    }
                  }
                });

                if (data.shouldFit && bounds.length > 0) {
                  map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], animate: true });
                }
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

  useEffect(() => {
    if (isLoaded && webViewRef.current) {
      // Map Map to Array for easier serialization
      const locations = Array.from(riderLocations.entries()).map(([id, loc]) => ({
        id,
        lat: loc.lat,
        lng: loc.lng,
        heading: loc.heading
      }));
      
      const shouldFit = !initialCenteredRef.current && locations.length > 0;
      
      const payload = JSON.stringify({ 
        type: 'UPDATE_RIDERS', 
        payload: locations,
        shouldFit
      });
      
      webViewRef.current.injectJavaScript(`
        (function() {
          window.postMessage(${payload}, '*');
        })();
        true;
      `);

      if (shouldFit) {
        initialCenteredRef.current = true;
      }
    }
  }, [riderLocations, isLoaded]);

  return (
    <View style={styles.container}>
      {!isLoaded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onLoad={() => setIsLoaded(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    zIndex: 10,
  }
});
