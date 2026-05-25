import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, BackHandler, Linking, Dimensions, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { scale, moderateScale, verticalScale, normalizeFontSize } from '@/utils/responsive';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useJobDetails } from '@/hooks/data/useJobDetails';
import { useLocation } from '@/context/LocationContext';
import { encode as base64Encode } from 'base-64';

const { width, height } = Dimensions.get('window');

export default function JobDetailsScreen() {
  const {
    job,
    loading,
    updating,
    statusModalVisible,
    setStatusModalVisible,
    statusType,
    selectedReason,
    setSelectedReason,
    customRemark,
    setCustomRemark,
    COMPLETED_REASONS,
    FAILED_REASONS,
    handleUpdateStatus,
    handleSubmitStatus,
    router,
    isStartingDelivery,
    isSelfUpdated,
  } = useJobDetails();

  const { backgroundPermissionGranted, isSocketConnected, lastLocation, simulateLocation } = useLocation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const webViewRef = useRef<WebView>(null);
  
  const [roadPath, setRoadPath] = useState<{latitude: number, longitude: number}[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const remoteTerminalAlertedRef = useRef<string | null>(null);

  // --- REMOTE SYNC & AUTO-NAVIGATION ---
  useEffect(() => {
    const status = job?.delivery_status?.toLowerCase();
    const terminalStatuses = ['completed', 'failed', 'cancelled', 'disapproved'];
    
    if (status && terminalStatuses.includes(status)) {
      if (!isSelfUpdated) {
        if (remoteTerminalAlertedRef.current !== status) {
          remoteTerminalAlertedRef.current = status;
          const message = status === 'failed'
            ? 'Transaction marked as failed by the admin.'
            : status === 'completed'
              ? 'Transaction marked as complete by the admin.'
              : `This job has been marked as ${status.toUpperCase()} by the administrator.`;

          Alert.alert("Job Updated", message, [{ text: "OK" }]);
        }
      } else {
        // Updated by the Rider themselves
        // We'll give them a short moment to see the completion status
        // or just let them stay on the page until they click 'Back to Today'
        // Given the user's feedback, they want it to go back.
        const timer = setTimeout(() => {
          // Only auto-navigate if the modal is closed (success submitted)
          if (!statusModalVisible) {
            router.replace('/(tabs)');
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [job?.delivery_status, isSelfUpdated, statusModalVisible]);

  const startSimulation = () => {
    if (roadPath.length === 0) {
      Alert.alert("No Route", "Please wait for the route to load before simulating.");
      return;
    }
    
    setIsSimulating(true);
    let step = 0;
    
    simulationInterval.current = setInterval(() => {
      if (step >= roadPath.length) {
        clearInterval(simulationInterval.current!);
        setIsSimulating(false);
        Alert.alert("Destination Reached", "Simulation complete.");
        return;
      }
      
      const point = roadPath[step];
      
      // 1. Update system (Socket.io) so Admin/Personnel see it
      // If we are an admin, we override the riderId with the job's assigned rider
      simulateLocation(point.latitude, point.longitude, null, job?.assigned_rider_id);

      // 2. Update local WebView map
      const payload = JSON.stringify({ 
        lat: point.latitude, 
        lng: point.longitude,
        heading: null
      });
      webViewRef.current?.injectJavaScript(`if(window.updateRider) window.updateRider(${payload}); true;`);
      
      step += Math.max(1, Math.floor(roadPath.length / 50)); 
    }, 2000);
  };

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  // --- FULL JOURNEY ROUTING (Rider -> Pickup -> Dropoff) ---
  useEffect(() => {
    async function loadRoads() {
      const startLat = lastLocation?.lat || job?.pickup_location?.lat;
      const startLng = lastLocation?.lng || job?.pickup_location?.lng;

      if (startLat && job?.pickup_location && job?.dropoff_location) {
        try {
          const isAssigned = ['assigned', 'pending'].includes(job.delivery_status?.toLowerCase() || '');
          const points = isAssigned 
            ? `${startLng},${startLat};${job.pickup_location.lng},${job.pickup_location.lat};${job.dropoff_location.lng},${job.dropoff_location.lat}`
            : `${startLng},${startLat};${job.dropoff_location.lng},${job.dropoff_location.lat}`;

          const url = `https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=polyline`;
          
          const response = await fetch(url);
          if (!response.ok) return;

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) return;

          const data = await response.json();

          if (data.code === 'Ok' && data.routes && data.routes[0]) {
            const polyline = require('polyline');
            const points = polyline.decode(data.routes[0].geometry);
            const path = points.map((p: any) => ({ latitude: p[0], longitude: p[1] }));
            setRoadPath(path);
          }
        } catch (e) {
          console.warn('Road snap error:', e);
        }
      }
    }
    if (job) loadRoads();
  }, [job?.delivery_status, job?.pickup_location, job?.dropoff_location, lastLocation?.lat, lastLocation?.lng]);

  // Update Rider in WebView smoothly
  useEffect(() => {
    if (lastLocation && webViewRef.current) {
      const payload = JSON.stringify({ 
        lat: lastLocation.lat, 
        lng: lastLocation.lng,
        heading: lastLocation.heading
      });
      webViewRef.current.injectJavaScript(`if(window.updateRider) window.updateRider(${payload}); true;`);
    }
  }, [lastLocation]);

  useEffect(() => {
    if (webViewRef.current && job) {
      const initialPos = lastLocation || { 
        lat: Number(job.pickup_location?.lat || 0), 
        lng: Number(job.pickup_location?.lng || 0) 
      };
      const payload = JSON.stringify(initialPos);
      // Small delay to ensure WebView is ready
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`if(window.updateRider) window.updateRider(${payload}); true;`);
      }, 1000);
    }
  }, [job?.request_id]);

  useEffect(() => {
    if (webViewRef.current && roadPath.length > 0) {
      const payload = JSON.stringify(roadPath);
      webViewRef.current.injectJavaScript(`if(window.updatePath) window.updatePath(${payload}); true;`);
    }
  }, [roadPath]);

  const deliveryStatus = job?.delivery_status?.toLowerCase();
  const isNavigationMode = deliveryStatus === 'in_progress';

  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`if(window.setNavigationMode) window.setNavigationMode(${isNavigationMode}); true;`);
    }
  }, [isNavigationMode]);

  const snapPoints = useMemo(() => ['35%', '90%'], []);

  const handleBackPress = () => {
    const s = job?.delivery_status?.toLowerCase();
    if (s === 'in_progress' || s === 'assigned') {
      Alert.alert("Active Delivery", "Delivery is on going, please stay on the page.", [{ text: "OK" }]);
      return true;
    }
    router.back();
    return true;
  };

  useEffect(() => {
    const bh = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => bh.remove();
  }, [job?.delivery_status]);

  // --- MAP CONFIG HOOKS (MUST BE ABOVE ALL RETURNS) ---
  const pickup = useMemo(() => ({ 
    latitude: Number(job?.pickup_location?.lat || 0), 
    longitude: Number(job?.pickup_location?.lng || 0) 
  }), [job?.pickup_location]);

  const dropoff = useMemo(() => ({ 
    latitude: Number(job?.dropoff_location?.lat || 0), 
    longitude: Number(job?.dropoff_location?.lng || 0) 
  }), [job?.dropoff_location]);

  const isLocked = ['assigned', 'in_progress'].includes(deliveryStatus || '');
  
  const carMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#073f5a" d="M256 25c-82 0-103 29-103 88v22c-11 4-18 9-18 16v24c0 4 3 6 7 5l14-5v226c0 57 25 84 100 86 75-2 100-29 100-86V175l14 5c4 1 7-1 7-5v-24c0-7-7-12-18-16v-22C359 54 338 25 256 25Z"/><path fill="#3aa3d9" d="M256 39c-72 0-91 24-91 76v34c-16 4-28 10-28 18v14c0 3 2 4 5 3l23-9v223c0 48 20 72 91 74 71-2 91-26 91-74V175l23 9c3 1 5 0 5-3v-14c0-8-12-14-28-18v-34c0-52-19-76-91-76Z"/><path fill="#053d56" d="M192 162c43-13 85-18 128-5l-10 70c-36-14-72-18-108 0l-10-65Z"/><path fill="#053d56" d="M187 329c44 14 91 16 138-1l2 61c-49 26-95 27-142 0l2-60Z"/><path fill="#053d56" opacity=".72" d="M169 175l10 53v100l-18 58V184l8-9Z"/><path fill="#053d56" opacity=".72" d="M343 175l-10 53v100l18 58V184l-8-9Z"/><path fill="#134f68" d="M188 371c44 26 90 26 136 0l3 18c-49 27-95 27-142 0l3-18Z"/><path fill="#64bee9" d="M190 279c44 10 88 10 132 0v46c-41 19-85 19-132 0v-46Z"/><path fill="#64bee9" d="M178 146c53-20 106-26 156-7l-13 18c-42-14-86-10-130 5l-13-16Z"/><path fill="#b7d6f5" d="M176 62c17-11 39-13 50-6 4 3 3 7-1 9l-36 14c-9 4-17-8-13-17Z"/><path fill="#d1e5ff" opacity=".9" d="M178 64c8-6 17-9 28-10-10 8-19 16-28 25-5-3-6-10 0-15Z"/><path fill="#b7d6f5" d="M336 62c-17-11-39-13-50-6-4 3-3 7 1 9l36 14c9 4 17-8 13-17Z"/><path fill="#d1e5ff" opacity=".9" d="M334 64c-8-6-17-9-28-10 10 8 19 16 28 25-5-3-6-10 0-15Z"/><path fill="#b7d6f5" d="M176 450c17 11 39 13 50 6 4-3 3-7-1-9l-36-14c-9-4-17 8-13 17Z"/><path fill="#d1e5ff" opacity=".9" d="M178 448c8 6 17 9 28 10-10-8-19-16-28-25-5 3-6 10 0 15Z"/><path fill="#b7d6f5" d="M336 450c-17 11-39 13-50 6-4-3-3-7 1-9l36-14c9-4 17 8 13 17Z"/><path fill="#d1e5ff" opacity=".9" d="M334 448c-8 6-17 9-28 10 10-8 19-16 28-25 5 3 6 10 0 15Z"/><path fill="#0a5977" d="M160 275h18v5h-18z"/><path fill="#0a5977" d="M334 275h18v5h-18z"/><path fill="#197aa5" opacity=".35" d="M256 39c-72 0-91 24-91 76v34c-10 3-19 6-24 10 54-19 132-32 206-10v-34c0-52-19-76-91-76Z"/></svg>`;
  
  // Use Base64 for data URIs for maximum compatibility in all WebViews
  const carMarkerDataUri = useMemo(() => {
    return `data:image/svg+xml;base64,${base64Encode(carMarkerSvg)}`;
  }, [carMarkerSvg]);

  const mapHtml = useMemo(() => {
    if (!job) return '';
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f8fafc; }
          .marker-pin { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; background: #c30b82; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -15px 0 0 -15px; }
          .marker-pin::after { content: ''; width: 24px; height: 24px; margin: 3px 0 0 3px; background: #fff; position: absolute; border-radius: 50%; }
          .rider-car-icon { background: transparent; border: 0; transition: transform 0.7s linear; z-index: 9999 !important; }
          .rider-car-wrap { position: relative; width: 48px; height: 48px; animation: car-road-glide 1.4s ease-in-out infinite; }
          .rider-car-body { width: 48px; height: 48px; transform-origin: 50% 50%; transition: transform 0.35s ease; }
          .rider-car-body img { width: 48px; height: 48px; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(15,23,42,0.28)); }
          .rider-car-pulse { position: absolute; inset: 0; border-radius: 999px; background: #60A5FA; opacity: 0.2; z-index: -1; animation: car-pulse 1.2s cubic-bezier(0,0,0.2,1) infinite; }
          .nav-recenter { position: fixed; right: 16px; bottom: 38%; z-index: 9999; width: 48px; height: 48px; border-radius: 999px; border: 0; background: #0F172A; box-shadow: 0 10px 24px rgba(15,23,42,0.24); display: none; align-items: center; justify-content: center; }
          .nav-recenter.visible { display: flex; }
          .nav-recenter::before { content: ''; width: 14px; height: 14px; border-radius: 999px; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.25); }
          .nav-chip { position: fixed; left: 16px; top: 82px; z-index: 9999; display: none; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 999px; background: rgba(15,23,42,0.88); color: #fff; font: 800 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
          .nav-chip.visible { display: flex; }
          .nav-chip span { width: 7px; height: 7px; border-radius: 999px; background: #10B981; box-shadow: 0 0 0 5px rgba(16,185,129,0.18); }
          @keyframes car-road-glide { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-1px) scale(1.025); } }
          @keyframes car-pulse { 75%, 100% { transform: scale(1.8); opacity: 0; } }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="nav-chip" class="nav-chip"><span></span>Navigation</div>
        <button id="nav-recenter" class="nav-recenter" aria-label="Recenter rider"></button>
        <script>
          const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${pickup.latitude}, ${pickup.longitude}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          const pickupIcon = L.divIcon({ className: 'custom-div-icon', html: "<div style='background-color:#10B981;' class='marker-pin'></div>", iconSize: [30, 42], iconAnchor: [15, 42] });
          const dropoffIcon = L.divIcon({ className: 'custom-div-icon', html: "<div style='background-color:#EF4444;' class='marker-pin'></div>", iconSize: [30, 42], iconAnchor: [15, 42] });
          const riderIcon = L.divIcon({ 
            className: 'rider-car-icon', 
            html: "<div class='rider-car-wrap'><div id='rider-marker' class='rider-car-body'><img src='${carMarkerDataUri}' alt='' /></div><div class='rider-car-pulse'></div></div>", 
            iconSize: [48, 48], 
            iconAnchor: [24, 24] 
          });

          L.marker([${pickup.latitude}, ${pickup.longitude}], { icon: pickupIcon }).addTo(map);
          L.marker([${dropoff.latitude}, ${dropoff.longitude}], { icon: dropoffIcon }).addTo(map);
          
          let riderMarker = null;
          let roadPolyline = null;
          let roadPath = [];
          let navigationMode = false;
          let followMode = true;
          let currentRiderPosition = null;
          let targetRiderPosition = null;
          let currentHeading = 0;
          let targetHeading = 0;
          let animationFrame = null;
          let lastCameraMoveAt = 0;
          const navChip = document.getElementById('nav-chip');
          const recenterButton = document.getElementById('nav-recenter');

          function setNavigationUi() {
            if (navChip) navChip.classList.toggle('visible', navigationMode);
            if (recenterButton) recenterButton.classList.toggle('visible', navigationMode && !followMode);
          }

          function normalizeAngleDelta(from, to) {
            return ((to - from + 540) % 360) - 180;
          }

          function lerp(start, end, amount) {
            return start + (end - start) * amount;
          }

          function moveNavigationCamera(position, force) {
            if (!navigationMode || !followMode || !position) return;
            const now = Date.now();
            if (!force && now - lastCameraMoveAt < 250) return;
            lastCameraMoveAt = now;
            map.panTo(position, { animate: true, duration: 1.5, easeLinearity: 0.1, noMoveStart: true });
          }

          map.on('dragstart zoomstart', function() {
            if (!navigationMode) return;
            followMode = false;
            setNavigationUi();
          });

          if (recenterButton) {
            recenterButton.addEventListener('click', function() {
              followMode = true;
              setNavigationUi();
              moveNavigationCamera(currentRiderPosition || targetRiderPosition, true);
            });
          }

          function calculateBearing(from, to) {
            const startLat = from[0] * Math.PI / 180;
            const startLng = from[1] * Math.PI / 180;
            const endLat = to[0] * Math.PI / 180;
            const endLng = to[1] * Math.PI / 180;
            const y = Math.sin(endLng - startLng) * Math.cos(endLat);
            const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
            return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
          }

          function toMeters(latDiff, lngDiff, atLat) {
            const metersPerLat = 111320;
            const metersPerLng = 111320 * Math.cos(atLat * Math.PI / 180);
            return { x: lngDiff * metersPerLng, y: latDiff * metersPerLat };
          }

          function nearestPointOnSegment(point, start, end) {
            const atLat = point[0];
            const startOffset = toMeters(start[0] - point[0], start[1] - point[1], atLat);
            const endOffset = toMeters(end[0] - point[0], end[1] - point[1], atLat);
            const vx = endOffset.x - startOffset.x;
            const vy = endOffset.y - startOffset.y;
            const lengthSquared = vx * vx + vy * vy;
            const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (-(startOffset.x * vx + startOffset.y * vy)) / lengthSquared));
            return {
              point: [
                start[0] + (end[0] - start[0]) * t,
                start[1] + (end[1] - start[1]) * t,
              ],
              distance: Math.sqrt(Math.pow(startOffset.x + vx * t, 2) + Math.pow(startOffset.y + vy * t, 2)),
              bearing: calculateBearing(start, end)
            };
          }

          function snapToRoute(point, maxDistanceMeters) {
            if (!point || roadPath.length < 2) return { point, bearing: null };
            let nearest = { point, distance: Number.POSITIVE_INFINITY, bearing: null };

            for (let i = 0; i < roadPath.length - 1; i += 1) {
              const candidate = nearestPointOnSegment(point, roadPath[i], roadPath[i + 1]);
              if (candidate.distance < nearest.distance) nearest = candidate;
            }

            return nearest.distance <= maxDistanceMeters ? nearest : { point, bearing: null };
          }

          function renderRiderFrame() {
            if (!targetRiderPosition) {
              animationFrame = null;
              return;
            }

            if (!currentRiderPosition) {
              currentRiderPosition = targetRiderPosition;
              currentHeading = targetHeading;
            } else {
              currentRiderPosition = [
                lerp(currentRiderPosition[0], targetRiderPosition[0], 0.05),
                lerp(currentRiderPosition[1], targetRiderPosition[1], 0.05),
              ];
              currentHeading += normalizeAngleDelta(currentHeading, targetHeading) * 0.1;
            }

            if (riderMarker) riderMarker.setLatLng(currentRiderPosition);
            const el = document.getElementById('rider-marker');
            if (el) el.style.transform = 'rotate(' + currentHeading + 'deg)';
            moveNavigationCamera(currentRiderPosition, false);

            const latDone = Math.abs(currentRiderPosition[0] - targetRiderPosition[0]) < 0.0000001;
            const lngDone = Math.abs(currentRiderPosition[1] - targetRiderPosition[1]) < 0.0000001;
            const headingDone = Math.abs(normalizeAngleDelta(currentHeading, targetHeading)) < 0.1;

            if (latDone && lngDone && headingDone) {
              currentRiderPosition = targetRiderPosition;
              currentHeading = targetHeading;
              animationFrame = null;
              return;
            }

            animationFrame = requestAnimationFrame(renderRiderFrame);
          }

          function startRiderAnimation() {
            if (!animationFrame) animationFrame = requestAnimationFrame(renderRiderFrame);
          }

          window.updateRider = (data) => {
            if (data.lat && data.lng) {
              const newPos = [Number(data.lat), Number(data.lng)];
              const snapped = snapToRoute(newPos, 80);
              targetRiderPosition = snapped.point;
              
              if (snapped.bearing !== null) {
                targetHeading = snapped.bearing;
              } else if (data.heading !== undefined && data.heading !== null) {
                targetHeading = Number(data.heading);
              } else if (currentRiderPosition) {
                const b = calculateBearing(currentRiderPosition, targetRiderPosition);
                if (Math.abs(currentRiderPosition[0]-targetRiderPosition[0]) > 0.00001 || 
                    Math.abs(currentRiderPosition[1]-targetRiderPosition[1]) > 0.00001) {
                  targetHeading = b;
                }
              }

              if (!riderMarker) {
                currentRiderPosition = targetRiderPosition;
                currentHeading = targetHeading;
                riderMarker = L.marker(currentRiderPosition, { icon: riderIcon }).addTo(map);
                moveNavigationCamera(currentRiderPosition, true);
              }

              startRiderAnimation();
            }
          };

          window.setNavigationMode = function(enabled) {
            navigationMode = Boolean(enabled);
            followMode = navigationMode ? true : followMode;
            setNavigationUi();
            if (navigationMode) {
              moveNavigationCamera(currentRiderPosition || targetRiderPosition, true);
            }
          };

          window.updatePath = function(path) {
            if (path && path.length > 0) {
              roadPath = path.map(p => [Number(p.latitude), Number(p.longitude)]);
              if (roadPolyline) map.removeLayer(roadPolyline);
              roadPolyline = L.polyline(roadPath, { color: '#3B82F6', weight: 5 }).addTo(map);
              if (navigationMode && (currentRiderPosition || targetRiderPosition)) {
                moveNavigationCamera(currentRiderPosition || targetRiderPosition, true);
              } else {
                map.fitBounds(roadPolyline.getBounds(), { padding: [50, 50] });
              }
            }
          };

          setNavigationUi();
        </script>
      </body>
    </html>
  `;
  }, [job?.request_id, pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, carMarkerDataUri]);

  // --- EARLY RETURNS (AFTER ALL HOOKS) ---
  if (loading && !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!job) return null;

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          scrollEnabled={false}
          style={{ flex: 1 }}
        />
      </View>

      {isStartingDelivery && (
        <View style={styles.navigationStartingOverlay} pointerEvents="none">
          <View style={styles.navigationStartingCard}>
            <View style={styles.navigationSpinnerRing}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigationStartingTitle}>Starting Navigation</Text>
              <Text style={styles.navigationStartingText}>Preparing live route tracking...</Text>
            </View>
          </View>
        </View>
      )}

      <SafeAreaView style={styles.overlayHeader} pointerEvents="box-none">
        {!isLocked ? (
          <TouchableOpacity testID="job_back_button" style={styles.iconBtn} onPress={handleBackPress}><MaterialIcons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
        
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.simulateBtn, isSimulating && { backgroundColor: '#EF4444' }]} 
            onPress={isSimulating ? stopSimulation : startSimulation}
          >
            <MaterialIcons name={isSimulating ? "stop" : "play-arrow"} size={20} color="white" />
            <Text style={styles.simulateBtnText}>{isSimulating ? "STOP" : "SIMULATE"}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.badgeRow}>
          {!backgroundPermissionGranted && (
            <TouchableOpacity style={styles.warningBadge} onPress={() => Linking.openSettings()}><MaterialIcons name="report-problem" size={18} color="white" /></TouchableOpacity>
          )}
          <View style={[styles.statusBadge, { backgroundColor: isSocketConnected ? '#10B981' : '#64748B' }]}><Text style={styles.statusText}>{isSocketConnected ? 'LIVE' : 'OFFLINE'}</Text></View>
        </View>
      </SafeAreaView>

      <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints} handleIndicatorStyle={{ backgroundColor: '#E2E8F0', width: 40 }} backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 32 }}>
        <BottomSheetScrollView contentContainerStyle={styles.drawerInner}>
          <View style={styles.header}>
            <View><Text style={styles.label}>TRANSACTION ID</Text><Text style={styles.idText}>#{job.request_id.slice(-8).toUpperCase()}</Text></View>
            <Badge label={(job.delivery_status || 'PENDING').toUpperCase()} status={job.delivery_status === 'in_progress' ? 'warning' : job.delivery_status === 'completed' ? 'success' : 'info'} />
          </View>

          <View style={styles.destinationBox}>
            <MaterialIcons name="place" size={24} color="#3B82F6" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.label}>DROP-OFF DESTINATION</Text>
              <Text style={styles.mainInfoText}>{job.dropoff_location?.businessName || job.dropoff_address}</Text>
              {job.dropoff_location?.address && job.dropoff_location.address !== job.dropoff_location?.businessName && (
                <Text style={styles.locationDetailText}>{job.dropoff_location.address}</Text>
              )}
              {job.dropoff_location?.landmarks && (
                <Text style={styles.locationLandmarkText}>Landmark: {job.dropoff_location.landmarks}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailsArea}>
            <View style={styles.divider} />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ADMIN INSTRUCTIONS</Text>
              <View style={styles.instructionRow}><Text style={[styles.bodyText, !job.admin_remark && styles.italicGrey]}>{job.admin_remark || 'No admin comment'}</Text></View>
              {job.personnel_instructions && (
                <View style={[styles.instructionRow, { marginTop: 16, borderLeftColor: '#10B981' }]}><Text style={[styles.subLabel, { color: '#10B981' }]}>PERSONNEL NOTE:</Text><Text style={styles.bodyText}>{job.personnel_instructions}</Text></View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>CONTACT PERSONS</Text>
              <TouchableOpacity style={styles.contactRow} onPress={() => job.recipient_contact && Linking.openURL(`tel:${job.recipient_contact}`)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{job.recipient_name.charAt(0)}</Text></View>
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.boldBody}>{job.recipient_name}</Text><Text style={styles.greyText}>Recipient • {job.recipient_contact}</Text></View>
                <Ionicons name="call" size={20} color="#3B82F6" />
              </TouchableOpacity>
              {job.pickup_contact_name && (
                <TouchableOpacity style={[styles.contactRow, { marginTop: 16 }]} onPress={() => job.pickup_contact_mobile && Linking.openURL(`tel:${job.pickup_contact_mobile}`)}>
                  <View style={[styles.avatar, { backgroundColor: '#F1F5F9' }]}><MaterialIcons name="person" size={20} color="#64748B" /></View>
                  <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.boldBody}>{job.pickup_contact_name}</Text><Text style={styles.greyText}>Pickup Point Contact</Text></View>
                  <Ionicons name="call" size={20} color="#3B82F6" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>JOB CLASSIFICATION</Text>
              <Text style={styles.oneLiner}><Text style={styles.boldLabel}>Requested by: </Text>{job.requester_name}</Text>
              <Text style={styles.oneLiner}><Text style={styles.boldLabel}>Request Type: </Text>{job.request_type}</Text>
              <Text style={styles.oneLiner}><Text style={styles.boldLabel}>Scheduled: </Text>{job.time_window}</Text>
              <Text style={styles.oneLiner}><Text style={styles.boldLabel}>Urgency: </Text><Text style={{ color: '#EF4444', fontWeight: '800' }}>{job.urgency_level.toUpperCase()}</Text></Text>

              <View style={styles.classificationActionArea}>
                {(['assigned', 'pending'].includes(job.delivery_status?.toLowerCase()) || isStartingDelivery) && (
                  <TouchableOpacity
                    testID="job_start_delivery_button"
                    style={[styles.primaryBtn, isStartingDelivery && styles.primaryBtnLoading]}
                    onPress={() => handleUpdateStatus('in_progress')}
                    disabled={isStartingDelivery}
                  >
                    {isStartingDelivery ? (
                      <View style={styles.loadingContent}>
                        <ActivityIndicator color="white" />
                        <Text style={styles.primaryBtnText}>STARTING DELIVERY...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryBtnText}>DELIVERY START</Text>
                    )}
                  </TouchableOpacity>
                )}

                {job.delivery_status?.toLowerCase() === 'in_progress' && !isStartingDelivery && (
                  <View style={styles.btnGroup}>
                    <TouchableOpacity testID="job_complete_button" style={[styles.statusBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateStatus('completed')}><MaterialIcons name="check-circle" size={20} color="white" /><Text style={styles.btnLabel}>Complete</Text></TouchableOpacity>
                    <TouchableOpacity testID="job_failed_button" style={[styles.statusBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleUpdateStatus('failed')}><MaterialIcons name="error" size={20} color="white" /><Text style={styles.btnLabel}>Failed</Text></TouchableOpacity>
                  </View>
                )}

                {(['completed', 'failed', 'cancelled'].includes(job.delivery_status?.toLowerCase())) && (
                  <TouchableOpacity testID="job_back_to_today_button" style={[styles.primaryBtn, { backgroundColor: '#64748B' }]} onPress={() => router.replace('/(tabs)')}><Text style={styles.primaryBtnText}>BACK TO TODAY</Text></TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{statusType === 'completed' ? 'Completion Report' : 'Failure Report'}</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}><MaterialIcons name="close" size={24} color="#64748B" /></TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Please provide an outcome reason:</Text>
            <ScrollView style={styles.reasonsList}>
              {(statusType === 'completed' ? COMPLETED_REASONS : FAILED_REASONS).map((reason, idx) => (
                <TouchableOpacity testID={`status_reason_${idx}`} key={idx} style={[styles.reasonChip, selectedReason === reason && styles.reasonChipSelected]} onPress={() => setSelectedReason(reason)}>
                  <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextSelected]}>{reason}</Text>
                  {selectedReason === reason && <MaterialIcons name="check-circle" size={18} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.modalSubtitle}>Additional Remarks (Optional)</Text>
              <TextInput testID="status_remark_input" style={styles.input} placeholder="Type any additional details here..." value={customRemark} onChangeText={setCustomRemark} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
            <TouchableOpacity testID="status_submit_button" style={[styles.submitBtn, { backgroundColor: statusType === 'completed' ? '#10B981' : '#EF4444' }]} onPress={handleSubmitStatus} disabled={updating}>
               {updating ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  map: { width, height },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markerRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  markerCore: { width: 10, height: 10, borderRadius: 5 },
  bikeMarkerContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', elevation: 8 },
  navigationStartingOverlay: { position: 'absolute', top: 86, left: 16, right: 16, zIndex: 20, alignItems: 'center' },
  navigationStartingCard: { width: '100%', maxWidth: 420, minHeight: 74, borderRadius: 24, backgroundColor: 'rgba(15, 23, 42, 0.92)', padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 10 },
  navigationSpinnerRing: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  navigationStartingTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  navigationStartingText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 3 },
  overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  simulateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 12, height: 36, borderRadius: 18, marginRight: 8, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  simulateBtnText: { color: 'white', fontSize: 10, fontWeight: '900', marginLeft: 4, letterSpacing: 0.5 },
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  badgeRow: { flexDirection: 'row' },
  warningBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 4 },
  statusBadge: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', elevation: 4 },
  statusText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  drawerInner: { padding: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  idText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  destinationBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 20, marginBottom: 24 },
  mainInfoText: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginTop: 2 },
  locationDetailText: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 6, lineHeight: 17 },
  locationLandmarkText: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 3, lineHeight: 15 },
  classificationActionArea: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  primaryBtn: { backgroundColor: '#0F172A', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  primaryBtnLoading: { backgroundColor: '#1E293B' },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  btnGroup: { flexDirection: 'row', justifyContent: 'space-between' },
  statusBtn: { flex: 0.48, height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  btnLabel: { color: 'white', fontWeight: '700', marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, marginBottom: 16, elevation: 1 },
  cardTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 16, letterSpacing: 1 },
  instructionRow: { borderLeftWidth: 3, borderLeftColor: '#3B82F6', paddingLeft: 12 },
  subLabel: { fontSize: 10, fontWeight: '800', color: '#3B82F6', marginBottom: 2 },
  bodyText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  italicGrey: { fontStyle: 'italic', color: '#94A3B8' },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#3B82F6', fontWeight: '800', fontSize: 18 },
  boldBody: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  greyText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  oneLiner: { fontSize: 14, color: '#475569', marginBottom: 8 },
  boldLabel: { fontWeight: '700', color: '#0F172A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  reasonsList: { maxHeight: 200, marginBottom: 20 },
  reasonChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  reasonChipSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  reasonText: { fontSize: 14, color: '#475569' },
  reasonTextSelected: { color: '#1D4ED8', fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 14, color: '#0F172A', minHeight: 100, borderWidth: 1, borderColor: '#F1F5F9' },
  submitBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  submitBtnText: { color: 'white', fontWeight: '800', fontSize: 15 }
});
