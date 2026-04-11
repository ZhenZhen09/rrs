import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const TABS = ['Pending', 'Active', 'Done'];

const PREVIOUS_EXAMPLES = [
  { id: 'EX-01', customer: 'Regular Corp', location: 'Business District', type: 'Bulk Delivery', avgTime: '45 mins', icon: 'business' },
  { id: 'EX-02', customer: 'Morning Cafe', location: 'Old Town', type: 'Express Pickup', avgTime: '15 mins', icon: 'local-cafe' },
  { id: 'EX-03', customer: 'Tech Store', location: 'Cyber Plaza', type: 'Fragile Delivery', avgTime: '30 mins', icon: 'computer' },
  { id: 'EX-04', customer: 'City Hospital', location: 'Medical Zone', type: 'Urgent Lab', avgTime: '20 mins', icon: 'local-hospital' },
];

const MOCK_JOBS = [
  { id: 'REQ-1001', customer: 'Alice Johnson', location: 'Downtown Hub', time: '09:00 AM', status: 'Pending', type: 'Delivery', priority: 'High', items: '2x Pizza, 1x Coke' },
  { id: 'REQ-1002', customer: 'Bob Smith', location: 'West End Plaza', time: '10:30 AM', status: 'Active', type: 'Pickup', rider: 'Rider #42', items: 'Documents' },
  { id: 'REQ-1003', customer: 'Charlie Davis', location: 'North Station', time: '11:15 AM', status: 'Active', type: 'Delivery', rider: 'Rider #12', items: 'Laptop Repair' },
  { id: 'REQ-1004', customer: 'Diana Prince', location: 'Central Mall', time: '01:00 PM', status: 'Pending', type: 'Express', priority: 'Medium', items: 'Gifts' },
  { id: 'REQ-1005', customer: 'Ethan Hunt', location: 'Port Area', time: '02:45 PM', status: 'Done', type: 'Return', completedAt: '03:15 PM', rider: 'Rider #07', amount: '$15.50', duration: '30m' },
  { id: 'REQ-1006', customer: 'Fiona Glenanne', location: 'South Beach', time: '08:30 AM', status: 'Done', type: 'Delivery', completedAt: '09:15 AM', rider: 'Rider #19', amount: '$22.00', duration: '45m' },
  { id: 'REQ-1007', customer: 'George Bluth', location: 'Banana Stand', time: '12:00 PM', status: 'Done', type: 'Pickup', completedAt: '12:45 PM', rider: 'Rider #03', amount: '$10.00', duration: '25m' },
  { id: 'REQ-1008', customer: 'Hank Hill', location: 'Strickland Propane', time: '04:00 PM', status: 'Done', type: 'Express', completedAt: '04:30 PM', rider: 'Rider #11', amount: '$35.00', duration: '20m' },
];

export default function DispatchCenter() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const filteredJobs = MOCK_JOBS.filter(job => 
    job.status === activeTab &&
    (job.customer.toLowerCase().includes(search.toLowerCase()) || job.id.includes(search))
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  const renderJobCard = (job: any) => (
    <View key={job.id} style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={styles.idBadge}>
          <Text style={styles.jobIdText}>{job.id}</Text>
        </View>
        {job.priority && (
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) + '15' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(job.priority) }]}>{job.priority}</Text>
          </View>
        )}
        {activeTab === 'Done' && (
          <View style={styles.successBadge}>
            <MaterialIcons name="check-circle" size={12} color="#10B981" />
            <Text style={styles.successText}>COMPLETED</Text>
          </View>
        )}
      </View>

      <Text style={styles.customerName}>{job.customer}</Text>
      
      <View style={styles.infoRow}>
        <MaterialIcons name="location-on" size={16} color="#64748B" />
        <Text style={styles.infoText}>{job.location}</Text>
      </View>

      {activeTab === 'Done' ? (
        <View style={styles.transactionDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rider</Text>
            <Text style={styles.detailValue}>{job.rider}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{job.amount}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{job.duration}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.jobCardFooter}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{job.type}</Text>
          </View>
          <Text style={styles.timeText}>
            {`Due: ${job.time}`}
          </Text>
        </View>
      )}

      {activeTab !== 'Done' && (
        <TouchableOpacity 
          style={styles.manageButton}
          onPress={() => setSelectedJob(job)}
        >
          <Text style={styles.manageButtonText}>Manage Dispatch</Text>
          <MaterialIcons name="settings-input-component" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch Console</Text>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'Pending' && (
          <View style={styles.exampleSection}>
            <Text style={styles.sectionHeader}>Quick Templates from History</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exampleScroll}>
              {PREVIOUS_EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex.id} style={styles.exampleCard}>
                  <View style={styles.exampleIconContainer}>
                    <MaterialIcons name={ex.icon as any} size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.exampleCustomer}>{ex.customer}</Text>
                  <Text style={styles.exampleType}>{ex.type}</Text>
                  <View style={styles.exampleFooter}>
                    <MaterialIcons name="timer" size={12} color="#64748B" />
                    <Text style={styles.exampleTime}>{ex.avgTime} avg.</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionHeader}>{activeTab} Requests</Text>
        {filteredJobs.length > 0 ? (
          filteredJobs.map(renderJobCard)
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="clipboard-list" size={50} color="#E2E8F0" />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} requests</Text>
          </View>
        )}
      </ScrollView>

      {/* Dispatch Management Modal (Mock) */}
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
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView>
                <View style={styles.modalJobInfo}>
                  <Text style={styles.modalJobId}>{selectedJob.id}</Text>
                  <Text style={styles.modalCustomer}>{selectedJob.customer}</Text>
                </View>

                <Text style={styles.modalSectionTitle}>Select Available Rider</Text>
                {['Rider #01 (Near)', 'Rider #15 (Available)', 'Rider #22 (Busy)'].map((rider) => (
                  <TouchableOpacity key={rider} style={styles.riderOption}>
                    <FontAwesome5 name="biking" size={16} color="#1E293B" />
                    <Text style={styles.riderOptionText}>{rider}</Text>
                    <MaterialIcons name="add-circle-outline" size={24} color="#3B82F6" />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 16, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  activeTab: {},
  tabText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  activeTabText: { color: '#1E293B' },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: '#1E293B',
    borderRadius: 3,
  },
  scrollContent: { padding: 20 },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 4 },
    }),
  },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  idBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  jobIdText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  customerName: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#64748B', marginLeft: 6, fontWeight: '500' },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 16,
  },
  typeBadge: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase' },
  timeText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  manageButton: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  manageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginRight: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  modalJobInfo: { marginBottom: 24 },
  modalJobId: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },
  modalCustomer: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginTop: 4 },
  modalSectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 16, textTransform: 'uppercase' },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  riderOptionText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', marginLeft: 12 },
  confirmDispatchButton: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmDispatchText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  exampleSection: { marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  exampleScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  exampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    width: 160,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exampleIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  exampleCustomer: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  exampleType: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  exampleFooter: { flexDirection: 'row', alignItems: 'center' },
  exampleTime: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginLeft: 4 },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 0,
  },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  successBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  successText: { fontSize: 10, fontWeight: '800', color: '#10B981', marginLeft: 4 },
});
