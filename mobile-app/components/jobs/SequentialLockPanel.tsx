import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type SequentialLockPanelProps = {
  activeRequestId?: string;
  onBackToTasks: () => void;
  onRequestSequenceSkip: () => void;
};

export function SequentialLockPanel({
  activeRequestId,
  onBackToTasks,
  onRequestSequenceSkip,
}: SequentialLockPanelProps) {
  const activeRequestLabel = activeRequestId
    ? `#${activeRequestId.slice(-8).toUpperCase()}`
    : 'your active task';

  return (
    <View testID="sequential-lock-panel" style={styles.container}>
      <View style={styles.summary}>
        <MaterialIcons name="lock" size={18} color="#B45309" />
        <View style={styles.summaryText}>
          <Text style={styles.title}>SEQUENTIAL LOCK ACTIVE</Text>
          <Text style={styles.message} numberOfLines={1}>
            Complete <Text style={styles.requestId}>{activeRequestLabel}</Text> first
          </Text>
        </View>
      </View>

      <TouchableOpacity
        testID="locked-back-to-tasks"
        accessibilityRole="button"
        accessibilityLabel="Back to Tasks"
        onPress={onBackToTasks}
        style={[styles.action, styles.backAction]}
      >
        <MaterialIcons name="arrow-back" size={16} color="#FFFFFF" />
        <Text style={[styles.actionText, styles.backActionText]}>BACK TO TASKS</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="locked-request-sequence-skip"
        accessibilityRole="button"
        accessibilityLabel="Request Sequence Skip"
        onPress={onRequestSequenceSkip}
        style={[styles.action, styles.skipAction]}
      >
        <MaterialIcons name="alt-route" size={17} color="#92400E" />
        <Text style={[styles.actionText, styles.skipActionText]}>REQUEST SEQUENCE SKIP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  summaryText: { flex: 1, minWidth: 0 },
  title: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.65,
  },
  message: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  requestId: { color: '#0F172A', fontWeight: '900' },
  action: {
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  backAction: { backgroundColor: '#64748B' },
  skipAction: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FCD34D' },
  actionText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.45 },
  backActionText: { color: '#FFFFFF' },
  skipActionText: { color: '#92400E' },
});
