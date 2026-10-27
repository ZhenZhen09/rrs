import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface DispatchModalProps {
  selectedJob: any;
  setSelectedJob: (job: any) => void;
  isBulkAssignModalOpen: boolean;
  setIsBulkAssignModalOpen: (open: boolean) => void;
  selectedJobIds: string[];
  adminInstructions: string;
  setAdminInstructions: (instructions: string) => void;
  handleReturnForRevision: (job?: any) => void;
  handleCancelRequest: () => void;
  riders: any[];
  selectedRiderId: string | null;
  setSelectedRiderId: (id: string) => void;
  getRiderUnavailableReason: (rider: any) => string | null;
  handleAssignRider: () => void;
  handleBulkAssign: () => void;
  isAssigning: boolean;
}

export const DispatchModal = ({
  selectedJob, setSelectedJob, isBulkAssignModalOpen, setIsBulkAssignModalOpen,
  selectedJobIds, adminInstructions, setAdminInstructions,
  handleReturnForRevision, handleCancelRequest,
  riders, selectedRiderId, setSelectedRiderId, getRiderUnavailableReason,
  handleAssignRider, handleBulkAssign, isAssigning
}: DispatchModalProps) => {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  const visible = !!selectedJob || isBulkAssignModalOpen;
  const selectedRiderUnavailableReason = selectedRiderId
    ? getRiderUnavailableReason(riders.find((rider) => rider.id === selectedRiderId))
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-[85%] rounded-t-2xl" style={{ backgroundColor: COLORS.surface, padding: SPACING.xl }}>
          <View className="mb-6 flex-row items-center justify-between" style={{ marginBottom: SPACING.xl }}>
            <Text className="font-fira-bold text-xl" style={{ color: COLORS.primary }}>{isBulkAssignModalOpen ? 'Bulk Dispatch' : 'Dispatch Management'}</Text>
            <TouchableOpacity onPress={() => { setSelectedJob(null); setIsBulkAssignModalOpen(false); }}>
              <MaterialIcons name="close" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
          >
            {!isBulkAssignModalOpen && selectedJob && (
              <View className="mb-6" style={{ marginBottom: SPACING.xl }}>
                <Text className="font-fira-code-medium text-sm uppercase" style={{ color: COLORS.primary }}>{selectedJob.id}</Text>
                <Text className="mt-1 mb-4 font-fira-bold text-2xl" style={{ color: COLORS.primary, marginTop: 4, marginBottom: 16 }}>{selectedJob.customer}</Text>

                <View className="mb-3 flex-row items-start">
                  <View className="mt-0.5 w-6 items-center mr-3">
                    <MaterialIcons name="local-shipping" size={16} color={COLORS.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-fira-bold text-[10px] uppercase" style={{ color: COLORS.secondary }}>Request Type</Text>
                    <Text className="mt-0.5 font-fira-medium text-sm" style={{ color: COLORS.primary, marginTop: 2 }}>{selectedJob.type}</Text>
                  </View>
                </View>

                <View className="mb-3 flex-row items-start">
                  <View className="mt-0.5 w-6 items-center mr-3">
                    <MaterialIcons name="place" size={16} color={COLORS.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-fira-bold text-[10px] uppercase" style={{ color: COLORS.secondary }}>Location</Text>
                    <Text className="mt-0.5 font-fira-medium text-sm" style={{ color: COLORS.primary, marginTop: 2 }}>{selectedJob.location}</Text>
                  </View>
                </View>

                <View className="mb-3 flex-row items-start">
                  <View className="mt-0.5 w-6 items-center mr-3">
                    <MaterialIcons name="calendar-today" size={16} color={COLORS.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-fira-bold text-[10px] uppercase" style={{ color: COLORS.secondary }}>Date Filed</Text>
                    <Text className="mt-0.5 font-fira-medium text-sm" style={{ color: COLORS.primary, marginTop: 2 }}>
                      {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                    </Text>
                  </View>
                </View>

                <View className="mb-3 flex-row items-start">
                  <View className="mt-0.5 w-6 items-center mr-3">
                    <MaterialIcons name="access-time" size={16} color={COLORS.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-fira-bold text-[10px] uppercase" style={{ color: COLORS.secondary }}>Time Window</Text>
                    <Text className="mt-0.5 font-fira-medium text-sm" style={{ color: COLORS.primary, marginTop: 2 }}>{selectedJob.time}</Text>
                  </View>
                </View>

                <View className="mb-3 flex-row items-start">
                  <View className="mt-0.5 w-6 items-center mr-3">
                    <MaterialIcons name="warning" size={16} color={COLORS.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-fira-bold text-[10px] uppercase" style={{ color: COLORS.secondary }}>Priority</Text>
                    <Text className="mt-0.5 font-fira-medium text-sm capitalize" style={{ color: selectedJob.priority === 'Urgent' ? COLORS.danger : COLORS.primary, marginTop: 2 }}>{selectedJob.priority}</Text>
                  </View>
                </View>
              </View>
            )}
            {isBulkAssignModalOpen && (
              <View className="mb-6" style={{ marginBottom: SPACING.xl }}>
                <Text className="mt-1 mb-4 font-fira-bold text-2xl" style={{ color: COLORS.primary, marginTop: 4, marginBottom: 16 }}>{selectedJobIds.length} Requests Selected</Text>
              </View>
            )}

            {!isBulkAssignModalOpen && selectedJob?.personnel_instructions && (
              <View className="mb-3">
                <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Personnel Notes</Text>
                <View className="rounded-lg border-l-4 px-3 py-1.5" style={{ backgroundColor: COLORS.background, borderLeftColor: COLORS.muted }}>
                  <Text className="font-fira-medium text-sm" style={{ minHeight: 20, color: COLORS.primary, lineHeight: 20, textAlignVertical: 'top' }}>
                    {selectedJob.personnel_instructions}
                  </Text>
                </View>
              </View>
            )}

            <View className="mb-3">
              <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Admin Instructions</Text>
              <View className="rounded-lg border-l-4 px-3 py-1.5" style={{ backgroundColor: COLORS.background, borderLeftColor: COLORS.primary }}>
                <TextInput
                  className="font-fira-medium text-sm"
                  style={{ color: COLORS.primary, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' }}
                  placeholder="Write instructions/remarks for the rider..."
                  placeholderTextColor={COLORS.muted}
                  value={adminInstructions}
                  onChangeText={setAdminInstructions}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </View>

            {!isBulkAssignModalOpen && (
              <>
                <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Management Actions</Text>
                <View className="mb-4 flex-row justify-between">
                  <TouchableOpacity
                    className="mx-1 flex-1 flex-row items-center justify-center rounded-lg py-3"
                    style={{ backgroundColor: COLORS.warning, opacity: isAssigning ? 0.5 : 1 }}
                    onPress={() => handleReturnForRevision(selectedJob)}
                    disabled={isAssigning}
                  >
                    <MaterialIcons name="assignment-return" size={18} color="#FFFFFF" />
                    <Text className="ml-1.5 font-fira-bold text-xs text-white">Return</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="mx-1 flex-1 flex-row items-center justify-center rounded-lg py-3"
                    style={{ backgroundColor: COLORS.danger, opacity: isAssigning ? 0.5 : 1 }}
                    onPress={handleCancelRequest}
                    disabled={isAssigning}
                  >
                    <MaterialIcons name="cancel" size={18} color="#FFFFFF" />
                    <Text className="ml-1.5 font-fira-bold text-xs text-white">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Select Available Rider</Text>
            {riders.length > 0 ? (
              riders.map((rider) => {
                const isSelected = selectedRiderId === rider.id;
                const unavailableReason = getRiderUnavailableReason(rider);
                const isUnavailable = !!unavailableReason;
                return (
                  <TouchableOpacity 
                    key={rider.id} 
                    className="mb-3 flex-row items-center rounded-xl border p-4"
                    style={{
                      backgroundColor: isSelected ? COLORS.muted : COLORS.background,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      opacity: isUnavailable ? 0.55 : 1,
                    }}
                    onPress={() => {
                      if (isUnavailable) return;
                      setSelectedRiderId(rider.id);
                    }}
                    disabled={isUnavailable}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="two-wheeler" size={24} color={isSelected ? COLORS.primary : COLORS.secondary} />
                    <View className="ml-3 flex-1">
                      <Text className="font-fira-bold text-base" style={{ color: isUnavailable ? COLORS.muted : isSelected ? COLORS.primary : COLORS.secondary }}>
                        {rider.name || rider.email}
                      </Text>
                      {isUnavailable && (
                        <Text className="mt-0.5 font-fira-bold text-xs uppercase" style={{ color: COLORS.muted }}>{unavailableReason}</Text>
                      )}
                    </View>
                    <MaterialIcons 
                      name={isSelected ? "check-circle" : (isUnavailable ? "block" : "radio-button-unchecked")} 
                      size={24} 
                      color={isSelected ? COLORS.primary : COLORS.muted} 
                    />
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text className="mt-4 font-fira-medium text-base" style={{ color: COLORS.muted }}>No available riders found</Text>
            )}

            <TouchableOpacity 
              className="mt-3 items-center rounded-lg p-[18px]"
              style={{ backgroundColor: COLORS.accent, opacity: (!selectedRiderId || isAssigning || selectedRiderUnavailableReason) ? 0.5 : 1 }}
              onPress={isBulkAssignModalOpen ? handleBulkAssign : handleAssignRider}
              disabled={!selectedRiderId || isAssigning || !!selectedRiderUnavailableReason}
              activeOpacity={0.8}
            >
              {isAssigning ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-fira-bold text-base" style={{ color: COLORS.onPrimary }}>Confirm Assignment</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
