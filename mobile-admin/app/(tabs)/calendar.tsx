import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

// Mock data for schedules
const SCHEDULES = [
  { id: '1', time: '09:00 AM', title: 'Morning Dispatch', rider: 'John Doe', status: 'Completed', color: '#10B981' },
  { id: '2', time: '11:30 AM', title: 'Route Optimization', rider: 'Jane Smith', status: 'In Progress', color: '#3B82F6' },
  { id: '3', time: '02:00 PM', title: 'Express Delivery', rider: 'Mike Ross', status: 'Pending', color: '#F59E0B' },
  { id: '4', time: '04:30 PM', title: 'Bulk Pickup', rider: 'Harvey Specter', status: 'Pending', color: '#F59E0B' },
];

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const renderHeader = () => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.monthTitle}>{monthNames[currentMonth.getMonth()]}</Text>
          <Text style={styles.yearTitle}>{currentMonth.getFullYear()}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            style={styles.headerButton}
          >
            <MaterialIcons name="chevron-left" size={28} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            style={styles.headerButton}
          >
            <MaterialIcons name="chevron-right" size={28} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <View style={styles.daysOfWeekContainer}>
        {days.map((day, index) => (
          <Text key={index} style={styles.dayOfWeekText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderCalendarGrid = () => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const totalDays = daysInMonth(month, year);
    const firstDay = firstDayOfMonth(month, year);
    
    const calendarDays = [];
    // Empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<View key={`empty-${i}`} style={styles.daySlot} />);
    }
    
    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      const isSelected = selectedDate.getDate() === i && 
                         selectedDate.getMonth() === month && 
                         selectedDate.getFullYear() === year;
      const isToday = new Date().getDate() === i && 
                      new Date().getMonth() === month && 
                      new Date().getFullYear() === year;

      calendarDays.push(
        <TouchableOpacity 
          key={i} 
          style={[styles.daySlot, isSelected && styles.selectedDaySlot]}
          onPress={() => setSelectedDate(new Date(year, month, i))}
        >
          <Text style={[
            styles.dayText, 
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayText
          ]}>
            {i}
          </Text>
          {i % 5 === 0 && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarGrid}>
        {calendarDays}
      </View>
    );
  };

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
      <View style={styles.scheduleContent}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTime}>{item.time}</Text>
          <Text style={styles.scheduleStatus}>{item.status}</Text>
        </View>
        <Text style={styles.scheduleTitle}>{item.title}</Text>
        <View style={styles.riderInfo}>
          <MaterialIcons name="person" size={14} color="#64748B" />
          <Text style={styles.riderName}>{item.rider}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarContainer}>
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCalendarGrid()}
      </View>
      
      <View style={styles.scheduleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={SCHEDULES}
          renderItem={renderScheduleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scheduleList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No schedules for this day</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
  },
  yearTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayOfWeekText: {
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  daySlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 20,
  },
  selectedDaySlot: {
    backgroundColor: '#1E293B',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  todayText: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    position: 'absolute',
    bottom: 4,
  },
  scheduleSection: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  scheduleList: {
    paddingBottom: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIndicator: {
    width: 6,
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  scheduleStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
});
