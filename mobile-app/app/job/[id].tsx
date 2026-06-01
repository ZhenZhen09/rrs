import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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

import { LEAFLET_JS, LEAFLET_CSS } from './LeafletAssets';

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

  const { backgroundPermissionGranted, isSocketConnected, lastLocation, refreshCurrentLocation, simulateLocation } = useLocation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const webViewRef = useRef<WebView>(null);
  
  const [roadPath, setRoadPath] = useState<{latitude: number, longitude: number}[]>([]);
  const [offCourseCount, setOffCourseCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteTerminalAlertedRef = useRef<string | null>(null);

  const deliveryStatus = job?.delivery_status?.toLowerCase();
  const isNavigationMode = deliveryStatus === 'in_progress';

  const startSimulation = (mode: 'normal' | 'deviate' = 'normal') => {
    if (roadPath.length === 0) {
      Alert.alert("No Route", "Please wait for the route to load before simulating.");
      return;
    }
    
    setIsSimulating(true);
    let step = 0;
    
    // For 'deviate' mode, we'll add an offset after 20% of the trip
    const deviateThreshold = Math.floor(roadPath.length * 0.2);
    const offsetLat = 0.0015; // Approx 160 meters
    const offsetLng = 0.0015;

    simulationInterval.current = setInterval(() => {
      if (step >= roadPath.length) {
        clearInterval(simulationInterval.current!);
        setIsSimulating(false);
        Alert.alert("Destination Reached", "Simulation complete.");
        return;
      }
      
      const point = roadPath[step];
      let finalLat = point.latitude;
      let finalLng = point.longitude;

      if (mode === 'deviate' && step > deviateThreshold) {
        // Gradually veer off the path
        const multiplier = Math.min(step - deviateThreshold, 10);
        finalLat += offsetLat * (multiplier / 10);
        finalLng += offsetLng * (multiplier / 10);
      }

      simulateLocation(finalLat, finalLng, null, job?.assigned_rider_id);

      const payload = JSON.stringify({ 
        lat: finalLat, 
        lng: finalLng,
        heading: null,
        isSimulated: true
      });
      webViewRef.current?.injectJavaScript(`
        if(window.updateRider) {
          window.updateRider(${payload});
        }
        true;
      `);
      
      step += 1; 
    }, 500);
  };

  const handleSimulatePress = () => {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    Alert.alert(
      "Simulation Mode",
      "Choose how you want to simulate this delivery:",
      [
        { text: "Follow Original Route", onPress: () => startSimulation('normal') },
        { text: "Deviate (Test Rerouting)", onPress: () => startSimulation('deviate') },
        { text: "Cancel", style: "cancel" }
      ]
    );
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

  // --- FULL JOURNEY ROUTING ---
  const loadRoads = useCallback(async () => {
    const startLat = lastLocation?.lat || job?.current_location?.lat || job?.pickup_location?.lat;
    const startLng = lastLocation?.lng || job?.current_location?.lng || job?.pickup_location?.lng;

    if (startLat && job?.pickup_location && job?.dropoff_location) {
      try {
        const isAssigned = ['assigned', 'pending'].includes(job.delivery_status?.toLowerCase() || '');
        const points = isAssigned 
          ? `${startLng},${startLat};${job.pickup_location.lng},${job.pickup_location.lat};${job.dropoff_location.lng},${job.dropoff_location.lat}`
          : `${startLng},${startLat};${job.dropoff_location.lng},${job.dropoff_location.lat}`;

        const url = `https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=polyline`;
        
        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const polyline = require('polyline');
          const points = polyline.decode(data.routes[0].geometry);
          const path = points.map((p: any) => ({ latitude: p[0], longitude: p[1] }));
          setRoadPath(path);
          setOffCourseCount(0); // Reset count after successful re-route
          console.log('🔄 Route updated/re-routed');
        }
      } catch (e) {
        console.warn('Road snap error:', e);
      }
    }
  }, [job?.delivery_status, job?.pickup_location, job?.dropoff_location, lastLocation?.lat, lastLocation?.lng]);

  useEffect(() => {
    if (job && roadPath.length === 0) loadRoads();
  }, [job, loadRoads, roadPath.length]);

  // --- AUTOMATIC REROUTING LOGIC ---
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distToSegment = (p: {lat: number, lng: number}, v: {lat: number, lng: number}, w: {lat: number, lng: number}) => {
    const l2 = Math.pow(getDistance(v.lat, v.lng, w.lat, w.lng), 2);
    if (l2 === 0) return getDistance(p.lat, p.lng, v.lat, v.lng);
    let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
    t = Math.max(0, Math.min(1, t));
    return getDistance(p.lat, p.lng, v.lat + t * (w.lat - v.lat), v.lng + t * (w.lng - v.lng));
  };

  useEffect(() => {
    if (!isNavigationMode || roadPath.length < 2 || !lastLocation?.lat || isSimulating) return;

    let minReach = Infinity;
    const p = { lat: Number(lastLocation.lat), lng: Number(lastLocation.lng) };

    for (let i = 0; i < roadPath.length - 1; i++) {
      const d = distToSegment(p, 
        { lat: roadPath[i].latitude, lng: roadPath[i].longitude }, 
        { lat: roadPath[i+1].latitude, lng: roadPath[i+1].longitude }
      );
      if (d < minReach) minReach = d;
    }

    if (minReach > 50) { // 50 meters off-track
      setOffCourseCount(prev => prev + 1);
    } else {
      setOffCourseCount(0);
    }
  }, [lastLocation, roadPath, isNavigationMode, isSimulating]);

  useEffect(() => {
    if (offCourseCount >= 3) { // Consistent off-track for ~15 seconds (assuming 5s updates)
      loadRoads();
    }
  }, [offCourseCount, loadRoads]);

  const isMapReady = useRef(false);

  const mapRiderPosition = useMemo(() => {
    if (!job) return null;

    if (lastLocation?.lat && lastLocation?.lng) {
      return {
        lat: Number(lastLocation.lat),
        lng: Number(lastLocation.lng),
        heading: lastLocation.heading ?? null,
      };
    }

    if (job.current_location?.lat && job.current_location?.lng) {
      return {
        lat: Number(job.current_location.lat),
        lng: Number(job.current_location.lng),
        heading: null,
      };
    }

    return null;
  }, [
    job?.request_id,
    job?.current_location?.lat,
    job?.current_location?.lng,
    lastLocation?.lat,
    lastLocation?.lng,
    lastLocation?.heading,
  ]);

  useEffect(() => {
    if (!job?.request_id) return;
    refreshCurrentLocation(job.request_id);
  }, [job?.request_id, refreshCurrentLocation]);

  const initialRiderForHtml = useMemo(() => {
    if (!job) return null;
    return job.current_location?.lat && job.current_location?.lng
      ? {
          lat: Number(job.current_location.lat),
          lng: Number(job.current_location.lng),
          heading: null,
        }
      : null;
  }, [
    job?.request_id,
    job?.current_location?.lat,
    job?.current_location?.lng,
  ]);

  const pushMapStateToWebView = useCallback((force = false) => {
    if (!webViewRef.current || !job) return;
    if (!force && !isMapReady.current) return;

    if (roadPath.length > 0) {
      const payload = JSON.stringify(roadPath);
      webViewRef.current.injectJavaScript(`
        if (window.updatePath) {
          window.updatePath(${payload});
        }
        true;
      `);
    }

    if (mapRiderPosition) {
      const payload = JSON.stringify(mapRiderPosition);
      webViewRef.current.injectJavaScript(`
        if (window.updateRider) {
          window.updateRider(${payload});
        }
        true;
      `);
    }

    webViewRef.current.injectJavaScript(`
      if (window.setNavigationMode) {
        window.setNavigationMode(${isNavigationMode});
      }
      true;
    `);
  }, [job?.request_id, mapRiderPosition, roadPath, isNavigationMode]);

  useEffect(() => {
    pushMapStateToWebView();
  }, [pushMapStateToWebView]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        isMapReady.current = true;
        pushMapStateToWebView(true);
        console.log('✅ WebView Map is ready');
      } else if (data.type === 'ERROR') {
        console.error('❌ WebView Error:', data.msg);
      } else if (data.type === 'DEBUG') {
        console.log('🐞 WebView Debug:', data.msg);
      }
    } catch (e) {}
  };

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

  const pickup = useMemo(() => ({ 
    latitude: Number(job?.pickup_location?.lat || 0), 
    longitude: Number(job?.pickup_location?.lng || 0) 
  }), [job?.pickup_location]);

  const dropoff = useMemo(() => ({ 
    latitude: Number(job?.dropoff_location?.lat || 0), 
    longitude: Number(job?.dropoff_location?.lng || 0) 
  }), [job?.dropoff_location]);

  const isLocked = ['assigned', 'in_progress'].includes(deliveryStatus || '');
  
  const carMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width:48px;height:48px;"><path fill="#073f5a" d="M256 25c-82 0-103 29-103 88v22c-11 4-18 9-18 16v24c0 4 3 6 7 5l14-5v226c0 57 25 84 100 86 75-2 100-29 100-86V175l14 5c4 1 7-1 7-5v-24c0-7-7-12-18-16v-22C359 54 338 25 256 25Z"/><path fill="#3aa3d9" d="M256 39c-72 0-91 24-91 76v34c-16 4-28 10-28 18v14c0 3 2 4 5 3l23-9v223c0 48 20 72 91 74 71-2 91-26 91-74V175l23 9c3 1 5 0 5-3v-14c0-8-12-14-28-18v-34c0-52-19-76-91-76Z"/><path fill="#053d56" d="M192 162c43-13 85-18 128-5l-10 70c-36-14-72-18-108 0l-10-65Z"/><path fill="#053d56" d="M187 329c44 14 91 16 138-1l2 61c-49 26-95 27-142 0l2-60Z"/><path fill="#64bee9" d="M190 279c44 10 88 10 132 0v46c-41 19-85 19-132 0v-46Z"/></svg>`;

  const mapHtml = useMemo(() => {
    if (!job) return '';
    const initialRiderPayload = JSON.stringify(initialRiderForHtml);
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          ${LEAFLET_CSS}
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #f8fafc; }
          .marker-pin { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; background: #c30b82; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -15px 0 0 -15px; }
          .marker-pin::after { content: ''; width: 24px; height: 24px; margin: 3px 0 0 3px; background: #fff; position: absolute; border-radius: 50%; }
          .rider-car-icon { background: transparent; border: 0; z-index: 9999 !important; }
          .rider-car-wrap { position: relative; width: 48px; height: 48px; }
          .rider-car-body { width: 48px; height: 48px; transform-origin: 50% 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.1s cubic-bezier(0, 0, 0.2, 1); }
          .rider-car-pulse { position: absolute; inset: 0; border-radius: 999px; background: #60A5FA; opacity: 0.2; z-index: -1; animation: car-pulse 1.2s cubic-bezier(0,0,0.2,1) infinite; }
          .nav-recenter { position: fixed; right: 16px; bottom: 38%; z-index: 9999; width: 48px; height: 48px; border-radius: 999px; border: 0; background: #0F172A; box-shadow: 0 10px 24px rgba(15,23,42,0.24); display: none; align-items: center; justify-content: center; }
          .nav-recenter.visible { display: flex; }
          .nav-recenter::before { content: ''; width: 14px; height: 14px; border-radius: 999px; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.25); }
          .nav-chip { position: fixed; left: 16px; top: 82px; z-index: 9999; display: none; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 999px; background: rgba(15,23,42,0.88); color: #fff; font: 800 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
          .nav-chip.visible { display: flex; }
          .nav-chip span { width: 7px; height: 7px; border-radius: 999px; background: #10B981; box-shadow: 0 0 0 5px rgba(16,185,129,0.18); }
          @keyframes car-pulse { 75%, 100% { transform: scale(1.8); opacity: 0; } }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div id="nav-chip" class="nav-chip"><span></span>Navigation</div>
        <button id="nav-recenter" class="nav-recenter" aria-label="Recenter rider"></button>
        <script>
          ${LEAFLET_JS}
          
          const CAR_MARKER_SVG = ${JSON.stringify(carMarkerSvg)};
          const INITIAL_RIDER = ${initialRiderPayload};
          const debug = (msg) => {
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', msg }));
          };
          window.onerror = function(msg, url, line, column, error) {
            if (msg === 'Script error.' && line === 0) {
              debug('Ignored generic external script error');
              return true;
            }

            const details = [
              msg,
              url ? 'url=' + url : null,
              line ? 'line=' + line : null,
              column ? 'column=' + column : null,
              error && error.stack ? error.stack : null,
            ].filter(Boolean).join(' ');

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', msg: details || 'Unknown WebView error' }));
            }
          };

          const map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            fadeAnimation: true
          }).setView([${pickup.latitude}, ${pickup.longitude}], 14);
          
          // CartoDB Voyager - Mobile optimized
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20
          }).addTo(map);

          const pickupIcon = L.divIcon({ className: 'custom-div-icon', html: "<div style='background-color:#10B981;' class='marker-pin'></div>", iconSize: [30, 42], iconAnchor: [15, 42] });
          const dropoffIcon = L.divIcon({ className: 'custom-div-icon', html: "<div style='background-color:#EF4444;' class='marker-pin'></div>", iconSize: [30, 42], iconAnchor: [15, 42] });
          
          let riderMarker = null;
          let roadPolyline = null;
          let roadPath = [];
          let navigationMode = true; 
          let followMode = true;
          
          let targetRiderPosition = null;
          let currentRiderPosition = null;
          let currentHeading = 0;
          let targetHeading = 0;
          let animationFrame = null;
          let lastFrameTime = performance.now();
          let lastUpdateAt = Date.now();
          let velocity = { lat: 0, lng: 0 };
          
          const navChip = document.getElementById('nav-chip');
          const recenterButton = document.getElementById('nav-recenter');

          function normalizeAngle(a) {
            return (a + 180) % 360 - 180;
          }

          function lerpAngle(start, end, amount) {
            const diff = (end - start + 540) % 360 - 180;
            return (start + diff * amount + 360) % 360;
          }

          window.updateRider = (data) => {
            if (!data) return;
            const lat = Number(data.lat || data.latitude);
            const lng = Number(data.lng || data.longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
              const newPos = [lat, lng];
              const snapped = snapToRoute(newPos, 100);
              const now = Date.now();

              if (targetRiderPosition) {
                const timeDelta = now - lastUpdateAt;
                if (timeDelta > 0) {
                  const latVel = (snapped.point[0] - targetRiderPosition[0]) / timeDelta;
                  const lngVel = (snapped.point[1] - targetRiderPosition[1]) / timeDelta;

                  if (Math.abs(latVel) < 0.00001 && Math.abs(lngVel) < 0.00001) {
                    velocity = { lat: latVel, lng: lngVel };
                  }
                }
              }

              targetRiderPosition = snapped.point;
              lastUpdateAt = now;

              if (snapped.bearing !== null) {
                targetHeading = snapped.bearing;
              } else if (data.heading !== undefined && data.heading !== null) {
                targetHeading = Number(data.heading);
              } else if (targetRiderPosition && currentRiderPosition) {
                const latDiff = Math.abs(currentRiderPosition[0] - targetRiderPosition[0]);
                const lngDiff = Math.abs(currentRiderPosition[1] - targetRiderPosition[1]);
                if (latDiff > 0.0000001 || lngDiff > 0.0000001) {
                  targetHeading = calculateBearing(currentRiderPosition, targetRiderPosition);
                }
              }

              if (!riderMarker) {
                currentRiderPosition = [...targetRiderPosition];
                currentHeading = targetHeading;

                const riderIcon = L.divIcon({ 
                  className: 'rider-car-icon', 
                  html: '<div class="rider-car-wrap"><div id="rider-marker" class="rider-car-body">' + CAR_MARKER_SVG + '</div><div class="rider-car-pulse"></div></div>', 
                  iconSize: [48, 48], 
                  iconAnchor: [24, 24] 
                });
                riderMarker = L.marker(currentRiderPosition, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
                moveNavigationCamera(currentRiderPosition, true);
              }

              startRiderAnimation();
            }
          };

          function setNavigationUi() {
            if (navChip) navChip.classList.toggle('visible', navigationMode);
            if (recenterButton) recenterButton.classList.toggle('visible', !followMode && navigationMode);
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
              if (currentRiderPosition) map.setView(currentRiderPosition, 16, { animate: true });
            });
          }

          function moveNavigationCamera(position, force) {
            if ((followMode || force) && position) {
              map.setView(position, 16, { animate: true });
            }
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

          function renderRiderFrame(time) {
            if (!targetRiderPosition || !currentRiderPosition) {
              animationFrame = null;
              return;
            }

            const now = Date.now();
            const timeSinceUpdate = now - lastUpdateAt;
            lastFrameTime = time;

            // Capture previous position for movement vector calculation
            const prevLat = currentRiderPosition[0];
            const prevLng = currentRiderPosition[1];

            if (timeSinceUpdate > 1000 && timeSinceUpdate < 15000 && (velocity.lat !== 0 || velocity.lng !== 0)) {
              const friction = Math.max(0, 1 - (timeSinceUpdate - 1000) / 14000);
              currentRiderPosition = [
                currentRiderPosition[0] + velocity.lat * friction,
                currentRiderPosition[1] + velocity.lng * friction
              ];
            } else {
              const damping = 0.08;
              const nextLat = currentRiderPosition[0] + (targetRiderPosition[0] - currentRiderPosition[0]) * damping;
              const nextLng = currentRiderPosition[1] + (targetRiderPosition[1] - currentRiderPosition[1]) * damping;
              const dist = Math.sqrt(Math.pow(nextLat - targetRiderPosition[0], 2) + Math.pow(nextLng - targetRiderPosition[1], 2));

              currentRiderPosition = dist > 0.01 ? [...targetRiderPosition] : [nextLat, nextLng];
            }

            // Calculate visual movement vector
            const dx = currentRiderPosition[1] - prevLng;
            const dy = currentRiderPosition[0] - prevLat;

            // DEAD ZONE: Only update heading if moved more than ~0.5 meters (approx 0.000005 degrees)
            // This prevents "shaking" or "spinning" when the rider is stationary
            if (Math.abs(dx) > 0.000005 || Math.abs(dy) > 0.000005) {
              const moveHeading = calculateBearing([prevLat, prevLng], currentRiderPosition);
              targetHeading = moveHeading;
            }

            // SMOOTHING: Slow down the rotation speed (0.06 instead of 0.12)
            // This makes the turns look more like a heavy vehicle and less like a needle
            currentHeading = lerpAngle(currentHeading, targetHeading, 0.06);
            
            if (riderMarker) {
              riderMarker.setLatLng(currentRiderPosition);
              const el = document.getElementById('rider-marker');
              if (el) {
                el.style.transform = 'rotate(' + currentHeading + 'deg)';
              }
            }
            
            if (followMode) {
              moveNavigationCamera(currentRiderPosition, false);
            }

            animationFrame = requestAnimationFrame(renderRiderFrame);
          }

          function startRiderAnimation() {
            if (!animationFrame) {
              lastFrameTime = performance.now();
              animationFrame = requestAnimationFrame(renderRiderFrame);
            }
          }

          window.updatePath = function(path) {
            if (path && path.length > 0) {
              roadPath = path.map(p => [Number(p.latitude || p.lat), Number(p.longitude || p.lng)]);
              if (roadPolyline) map.removeLayer(roadPolyline);
              roadPolyline = L.polyline(roadPath, { color: '#3B82F6', weight: 5, opacity: 0.8 }).addTo(map);

              if (targetRiderPosition) {
                const snapped = snapToRoute(targetRiderPosition, 100);
                targetRiderPosition = snapped.point;
                if (snapped.bearing !== null) {
                  targetHeading = snapped.bearing;
                }
              }

              if (currentRiderPosition) {
                const snapped = snapToRoute(currentRiderPosition, 100);
                currentRiderPosition = snapped.point;
                if (riderMarker) {
                  riderMarker.setLatLng(currentRiderPosition);
                }
                if (snapped.bearing !== null) {
                  targetHeading = snapped.bearing;
                }
              }

              if (!riderMarker) {
                map.fitBounds(roadPolyline.getBounds(), { padding: [50, 50] });
              }
            }
          };

          window.setNavigationMode = (mode) => {
            navigationMode = !!mode;
            setNavigationUi();
          };

          L.marker([${pickup.latitude}, ${pickup.longitude}], { icon: pickupIcon }).addTo(map);
          L.marker([${dropoff.latitude}, ${dropoff.longitude}], { icon: dropoffIcon }).addTo(map);

          setNavigationUi();

          if (INITIAL_RIDER) {
            window.updateRider(INITIAL_RIDER);
          }
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }
        </script>
      </body>
    </html>
  `;
  }, [job?.request_id, pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, carMarkerSvg, initialRiderForHtml]);

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
          onMessage={onMessage}
          onLoadStart={() => {
            isMapReady.current = false;
          }}
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

      {offCourseCount >= 1 && offCourseCount < 3 && (
        <View style={styles.navigationStartingOverlay} pointerEvents="none">
          <View style={[styles.navigationStartingCard, { backgroundColor: 'rgba(239, 68, 68, 0.92)' }]}>
            <View style={[styles.navigationSpinnerRing, { backgroundColor: '#B91C1C' }]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigationStartingTitle}>Off Course Detected</Text>
              <Text style={styles.navigationStartingText}>Rerouting in {(3 - offCourseCount) * 5}s...</Text>
            </View>
          </View>
        </View>
      )}

      {offCourseCount >= 3 && (
        <View style={styles.navigationStartingOverlay} pointerEvents="none">
          <View style={[styles.navigationStartingCard, { backgroundColor: 'rgba(37, 99, 235, 0.92)' }]}>
            <View style={[styles.navigationSpinnerRing, { backgroundColor: '#1E40AF' }]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigationStartingTitle}>Recalculating</Text>
              <Text style={styles.navigationStartingText}>Finding new path to destination...</Text>
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
            onPress={handleSimulatePress}
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
  detailsArea: { marginTop: 0 },
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
