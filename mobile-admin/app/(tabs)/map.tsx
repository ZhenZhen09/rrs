import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FleetPulseMap, FleetRider, FleetJob } from '../../components/UI/FleetPulseMap';
import { useRealTimeStore } from '../../store/useRealTimeStore';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { useDebounce } from '../../utils/useDebounce';

interface RiderLiveFallback {
  id: string;
  name: string;
  current_lat: number | string | null;
  current_lng: number | string | null;
}

export default function MapScreen() {
  const riderLocations = useRealTimeStore((state) => state.riderLocations);
  const rawLastRequestUpdate = useRealTimeStore((state) => state.lastRequestUpdate);
  const lastRequestUpdate = useDebounce(rawLastRequestUpdate, 2000);
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY, RADIUS, SPACING } = theme;

  const [activeJobs, setActiveJobs] = useState<FleetJob[]>([]);
  const [riderFallbacks, setRiderFallbacks] = useState<RiderLiveFallback[]>([]);

  const fetchMapData = useCallback(async () => {
    const [jobsResult, ridersResult] = await Promise.allSettled([
      api.get('/requests?limit=1000'),
      api.get('/users/riders/live'),
    ]);

    if (jobsResult.status === 'fulfilled') {
      const jobsList = jobsResult.value.data?.data || [];
      setActiveJobs(jobsList.filter((j: any) =>
        j.status === 'approved' &&
        j.delivery_status !== 'completed' &&
        j.delivery_status !== 'failed' &&
        j.delivery_status !== 'disapproved'
      ));
    } else {
      console.error('Failed to fetch jobs for map', jobsResult.reason);
    }

    if (ridersResult.status === 'fulfilled') {
      setRiderFallbacks(Array.isArray(ridersResult.value.data) ? ridersResult.value.data : []);
    } else {
      console.error('Failed to fetch riders for map', ridersResult.reason);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 10000);
    return () => clearInterval(interval);
  }, [fetchMapData, lastRequestUpdate]);

  const fleetRiders: FleetRider[] = (() => {
    const fallbackRiders = riderFallbacks.reduce<FleetRider[]>((result, rider) => {
      const lat = Number(rider.current_lat);
      const lng = Number(rider.current_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        result.push({ id: rider.id, lat, lng, heading: 0, name: rider.name || 'Rider' });
      }
      return result;
    }, []);

    const liveRiders = Array.from(riderLocations.entries()).map(([id, loc]) => ({
      id,
      lat: loc.lat,
      lng: loc.lng,
      heading: loc.heading || 0,
      name: loc.name || 'Rider'
    }));

    const merged = new Map(fallbackRiders.map((rider) => [rider.id, rider]));
    liveRiders.forEach((rider) => merged.set(rider.id, rider));
    return Array.from(merged.values());
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View className="flex-row items-center justify-between border-b" style={{ 
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
      }}>
        <View className="flex-row items-center">
          <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.accent }} />
          <Text className="text-xs font-bold tracking-widest" style={{ fontFamily: TYPOGRAPHY.fontFamily.bold, color: COLORS.primary }}>LIVE FLEET PULSE</Text>
        </View>
        <Text className="text-xs" style={{ fontFamily: TYPOGRAPHY.fontFamily.regular, color: COLORS.secondary }}>{fleetRiders.length} Riders Active</Text>
      </View>
      <View className="flex-1">
        <FleetPulseMap 
          riders={fleetRiders}
          activeJobs={activeJobs}
        />
      </View>
    </SafeAreaView>
  );
}
