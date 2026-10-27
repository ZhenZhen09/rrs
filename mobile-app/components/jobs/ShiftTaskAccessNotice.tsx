import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { normalizeFontSize, scale, verticalScale } from '@/utils/responsive';

export function ShiftTaskAccessNotice({ title, message }: { title: string; message: string }) {
  return (
    <View testID="shift-task-access-notice" style={styles.container}>
      <View style={styles.icon}><MaterialIcons name="lock-outline" size={21} color="#64748B" /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.preview}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.placeholderCard}>
            <View style={styles.placeholderIcon} />
            <View style={styles.placeholderLines}>
              <View style={styles.longLine} />
              <View style={styles.shortLine} />
            </View>
            <View style={styles.placeholderBadge} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ShiftAvailabilityNotice() {
  return (
    <View testID="shift-availability-notice" style={styles.offlineNotice}>
      <MaterialIcons name="wifi-off" size={17} color="#64748B" />
      <Text style={styles.offlineNoticeText}>Tasks are in preview. Go online to open and start them.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: scale(20), paddingTop: verticalScale(24), paddingBottom: verticalScale(18), alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', marginBottom: verticalScale(10) },
  title: { color: '#475569', fontSize: normalizeFontSize(15), fontWeight: '800', textAlign: 'center' },
  message: { color: '#94A3B8', fontSize: normalizeFontSize(12), lineHeight: normalizeFontSize(17), textAlign: 'center', marginTop: verticalScale(4), marginBottom: verticalScale(14) },
  preview: { width: '100%', gap: verticalScale(9) },
  placeholderCard: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingHorizontal: scale(12), borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', opacity: 0.72 },
  placeholderIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#CBD5E1' },
  placeholderLines: { flex: 1, gap: 7 },
  longLine: { width: '68%', height: 9, borderRadius: 5, backgroundColor: '#CBD5E1' },
  shortLine: { width: '44%', height: 7, borderRadius: 4, backgroundColor: '#D8E0E8' },
  placeholderBadge: { width: 48, height: 17, borderRadius: 9, backgroundColor: '#D8E0E8' },
  offlineNotice: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(12), padding: scale(10), borderRadius: 10, backgroundColor: '#F1F5F9' },
  offlineNoticeText: { flex: 1, color: '#64748B', fontSize: normalizeFontSize(12), fontWeight: '700' },
});
