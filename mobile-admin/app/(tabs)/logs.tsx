import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const LOGS = [
  { id: 1, type: 'Dispatch', message: 'Rider #12 assigned to REQ-1003', time: '2 mins ago', level: 'Info', user: 'Admin' },
  { id: 2, type: 'Auth', message: 'Successful login: Harvey Specter (RD-004)', time: '15 mins ago', level: 'Success', user: 'System' },
  { id: 3, type: 'System', message: 'Database backup completed successfully', time: '1 hour ago', level: 'Success', user: 'Cron' },
  { id: 4, type: 'Request', message: 'New delivery request REQ-1009 created', time: '2 hours ago', level: 'Info', user: 'Customer App' },
  { id: 5, type: 'Error', message: 'Failed to notify Rider #22: Connection timeout', time: '3 hours ago', level: 'Error', user: 'Notification Svc' },
  { id: 6, type: 'Dispatch', message: 'REQ-1001 status updated to COMPLETED', time: '4 hours ago', level: 'Success', user: 'Rider App' },
  { id: 7, type: 'Admin', message: 'Global pricing updated for Peak Hours', time: '5 hours ago', level: 'Warning', user: 'Super Admin' },
  { id: 8, type: 'System', message: 'High CPU usage detected on Node-01', time: '6 hours ago', level: 'Warning', user: 'Monitor' },
];

export default function SystemLogs() {
  const [filter, setFilter] = useState('All');

  const filteredLogs = filter === 'All' ? LOGS : LOGS.filter(log => log.level === filter);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Success': return '#10B981';
      case 'Error': return '#EF4444';
      case 'Warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Logs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Info', 'Success', 'Warning', 'Error'].map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredLogs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={[styles.levelIndicator, { backgroundColor: getLevelColor(log.level) }]} />
              <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>{log.level.toUpperCase()}</Text>
              <Text style={styles.logTime}>{log.time}</Text>
            </View>
            <Text style={styles.logMessage}>{log.message}</Text>
            <View style={styles.logFooter}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{log.type}</Text>
              </View>
              <Text style={styles.logUser}>By {log.user}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 24, paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 20 },
  filterScroll: { marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#1E293B' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: 20 },
  logCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  levelIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  logLevel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  logTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 'auto' },
  logMessage: { fontSize: 14, color: '#1E293B', fontWeight: '600', marginBottom: 12, lineHeight: 20 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  logUser: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
});
