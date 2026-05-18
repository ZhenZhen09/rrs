import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { moderateScale, verticalScale } from '../../utils/responsive';
import { PremiumJobCard } from '../../components/Dispatch/PremiumJobCard';
import { useRealTime } from '../../context/RealTimeContext';
import api from '../../services/api';

const TABS = ['Pending', 'Active', 'Done'];

const PREVIOUS_EXAMPLES = [
  { id: 'EX-01', customer: 'Regular Corp', location: 'Business District', type: 'Bulk Delivery', avgTime: '45 mins', icon: 'business' },
  { id: 'EX-02', customer: 'Morning Cafe', location: 'Old Town', type: 'Express Pickup', avgTime: '15 mins', icon: 'local-cafe' },
  { id: 'EX-03', customer: 'Tech Store', location: 'Cyber Plaza', type: 'Fragile Delivery', avgTime: '30 mins', icon: 'computer' },
  { id: 'EX-04', customer: 'City Hospital', location: 'Medical Zone', type: 'Urgent Lab', avgTime: '20 mins', icon: 'local-hospital' },
];

export default function DispatchCenter() {
  const { lastRequestUpdate } = useRealTime();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/requests?limit=100');
      const backendJobs = response.data.delivery_requests || [];
      
      const mappedJobs = backendJobs.map((bj: any) => {
        let status = 'Pending';
        if (bj.status === 'pending' || bj.status === 'submitted_waiting') {
          status = 'Pending';
        } else if (bj.status === 'approved' && !['completed', 'failed', 'cancelled'].includes(bj.delivery_status)) {
          status = 'Active';
        } else if (['completed', 'failed'].includes(bj.delivery_status)) {
          status = 'Done';
        }

        return {
          id: bj.request_id,
          customer: bj.requester_name,
          location: bj.dropoff_location?.address || bj.dropoff_address || 'Unknown',
          time: bj.time_window || 'ASAP',
          status: status,
          type: bj.request_type || 'Delivery',
          priority: bj.urgency_level,
          rider: bj.assigned_rider_name,
        };
      });
      
      setJobs(mappedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [lastRequestUpdate]);

  const filteredJobs = jobs.filter(job => 
    job.status === activeTab &&
    (job.customer?.toLowerCase().includes(search.toLowerCase()) || job.id.includes(search))
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Console</Text>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* 3-Tab Selector */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'Pending' && (
          <View style={styles.exampleSection}>
            <Text style={styles.sectionHeader}>Quick Templates from History</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exampleScroll}>
              {PREVIOUS_EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex.id} style={styles.exampleCard}>
                  <View style={styles.exampleIconContainer}>
                    <MaterialIcons name={ex.icon as any} size={24} color={COLORS.accentBlue} />
                  </View>
                  <Text style={styles.exampleCustomer}>{ex.customer}</Text>
                  <Text style={styles.exampleType}>{ex.type}</Text>
                  <View style={styles.exampleFooter}>
                    <MaterialIcons name="timer" size={12} color={COLORS.secondary} />
                    <Text style={styles.exampleTime}>{ex.avgTime} avg.</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionHeader}>{activeTab} Requests</Text>
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => (
            <PremiumJobCard 
              key={job.id} 
              job={job} 
              onPress={setSelectedJob} 
              activeTab={activeTab} 
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="clipboard-list" size={50} color={COLORS.border} />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} requests</Text>
          </View>
        )}
      </ScrollView>

      {/* Dispatch Management Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Management</Text>
              <TouchableOpacity onPress={() => setSelectedJob(null)}>
                <MaterialIcons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalJobId}>{selectedJob.id}</Text>
                  <Text style={styles.modalCustomer}>{selectedJob.customer}</Text>
                </View>

                <View style={styles.instructionSection}>
                  <Text style={styles.modalSectionTitle}>Admin Instructions</Text>
                  <View style={styles.instructionCard}>
                    <Text style={styles.instructionText}>
                      Ensure rider confirms pickup with customer via call. High priority items require photos.
                    </Text>
                  </View>
                </View>

                <View style={styles.spacer} />

                <Text style={styles.modalSectionTitle}>Select Available Rider</Text>
                {['Rider #01 (Near)', 'Rider #15 (Available)', 'Rider #22 (Busy)'].map((rider) => (
                  <TouchableOpacity key={rider} style={styles.riderOption}>
                    <FontAwesome5 name="biking" size={16} color={COLORS.primary} />
                    <Text style={styles.riderOptionText}>{rider}</Text>
                    <MaterialIcons name="add-circle-outline" size={24} color={COLORS.accentBlue} />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity 
                  style={styles.confirmDispatchButton}
                  onPress={() => setSelectedJob(null)}
                >
                  <Text style={styles.confirmDispatchText}>Confirm Assignment</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    padding: moderateScale(20), 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  title: { 
    fontSize: TYPOGRAPHY.size['2xl'], 
    fontWeight: '900' as any, 
    color: COLORS.primary, 
    marginBottom: verticalScale(16), 
    letterSpacing: -0.5 
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: moderateScale(12),
    height: verticalScale(48),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: moderateScale(10),
  },
  searchInput: { 
    flex: 1, 
    fontSize: TYPOGRAPHY.size.base, 
    fontWeight: '500' as any,
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: verticalScale(16) },
  activeTab: {},
  tabText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '700' as any, color: COLORS.muted },
  activeTabText: { color: COLORS.primary },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scrollContent: { padding: moderateScale(20) },
  sectionHeader: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '800' as any, 
    color: COLORS.secondary, 
    marginBottom: verticalScale(16), 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  emptyContainer: { alignItems: 'center', marginTop: verticalScale(100) },
  emptyText: { marginTop: verticalScale(16), fontSize: TYPOGRAPHY.size.base, fontWeight: '600' as any, color: COLORS.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    padding: moderateScale(24),
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: '900' as any, color: COLORS.primary },
  modalJobInfo: { marginBottom: verticalScale(24) },
  modalJobId: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '800' as any, color: COLORS.accentBlue, textTransform: 'uppercase' },
  modalCustomer: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: '900' as any, color: COLORS.primary, marginTop: verticalScale(4) },
  modalSectionTitle: { 
    fontSize: TYPOGRAPHY.size.xs, 
    fontWeight: '900' as any, 
    color: COLORS.secondary, 
    marginBottom: verticalScale(16), 
    textTransform: 'uppercase' 
  },
  instructionSection: {
    marginBottom: verticalScale(12),
  },
  instructionCard: {
    backgroundColor: '#F1F5F9',
    padding: moderateScale(16),
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  instructionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: '600' as any,
    lineHeight: 20,
  },
  spacer: {
    height: verticalScale(24),
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: moderateScale(16),
    borderRadius: 16,
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riderOptionText: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontWeight: '700' as any, color: COLORS.primary, marginLeft: moderateScale(12) },
  confirmDispatchButton: {
    backgroundColor: COLORS.primary,
    padding: moderateScale(18),
    borderRadius: RADIUS.button,
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  confirmDispatchText: { color: '#FFFFFF', fontSize: TYPOGRAPHY.size.base, fontWeight: '800' as any },
  exampleSection: { marginBottom: verticalScale(24) },
  exampleScroll: { marginHorizontal: moderateScale(-20), paddingHorizontal: moderateScale(20) },
  exampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: moderateScale(16),
    marginRight: moderateScale(16),
    width: moderateScale(160),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exampleIconContainer: { 
    width: moderateScale(40), 
    height: moderateScale(40), 
    borderRadius: 12, 
    backgroundColor: '#EFF6FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: verticalScale(12) 
  },
  exampleCustomer: { fontSize: TYPOGRAPHY.size.base, fontWeight: '800' as any, color: COLORS.primary, marginBottom: verticalScale(4) },
  exampleType: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '600' as any, color: COLORS.secondary, marginBottom: verticalScale(12) },
  exampleFooter: { flexDirection: 'row', alignItems: 'center' },
  exampleTime: { fontSize: TYPOGRAPHY.size.xs, fontWeight: '700' as any, color: COLORS.muted, marginLeft: moderateScale(4) },
});
