import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../../components/UI/Badge';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
  mfa_enabled?: boolean;
}

function PersonnelHeroIcon({ primary, success }: { primary: string; success: string }) {
  return (
    <View className="h-24 w-24 items-center justify-center" accessible={false}>
      <View
        className="absolute h-[68px] w-[68px] rounded-[22px]"
        style={{ backgroundColor: `${primary}18`, transform: [{ rotate: '-10deg' }, { translateY: 5 }] }}
      />
      <View
        className="absolute h-[68px] w-[68px] rounded-[22px]"
        style={{ backgroundColor: `${primary}28`, transform: [{ rotate: '9deg' }, { translateY: 2 }] }}
      />
      <View
        className="h-[68px] w-[68px] items-center justify-center rounded-[22px]"
        style={{ backgroundColor: '#FFFFFF', shadowColor: primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5 }}
      >
        <MaterialIcons name="groups" size={36} color={primary} />
        <View className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: success }}>
          <MaterialIcons name="verified" size={16} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

export default function PersonnelScreen() {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Detail Modal States
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // New Personnel Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'rider' | 'admin' | 'personnel'>('rider');
  const [newDepartment, setNewDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const activeUsers = users.filter((user) => user.status !== 'suspended').length;
  const riderCount = users.filter((user) => user.role === 'rider').length;

  // --- Create User Flow ---
  const handleCreateSubmit = async () => {
    if (!newName || !newEmail || !newRole) {
      Alert.alert('Validation Error', 'Name, email, and role are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/users', {
        name: newName,
        email: newEmail,
        role: newRole,
        department: newDepartment || null
      });
      setTempPassword(response.data.tempPassword);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to provision account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeCreateWizard = () => {
    setCreateModalVisible(false);
    setNewName('');
    setNewEmail('');
    setNewRole('rider');
    setNewDepartment('');
    setTempPassword('');
  };

  // --- Manage User Flow ---
  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDepartment(user.department || '');
    setIsEditing(false);
    setIsDeleting(false);
    setDeleteConfirmText('');
    setDetailModalVisible(true);
  };

  const closeDetailWizard = () => {
    setDetailModalVisible(false);
    setSelectedUser(null);
    setTempPassword(''); // clear just in case it was shown here
  };

  const handleSaveEdits = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      await api.patch(`/users/${selectedUser.id}`, {
        role: editRole,
        department: editDepartment || null
      });
      Alert.alert('Success', 'User details updated.');
      setIsEditing(false);
      fetchUsers();
      setSelectedUser({ ...selectedUser, role: editRole, department: editDepartment || null });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    Alert.alert(
      "Reset Password",
      "Are you sure you want to invalidate their current password and generate a new one?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsActionLoading(true);
            try {
              const res = await api.post(`/users/${selectedUser.id}/reset-password`);
              setTempPassword(res.data.tempPassword);
              Alert.alert('Success', 'Password has been reset.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleResetMFA = () => {
    if (!selectedUser) return;
    Alert.alert(
      "Reset MFA",
      "Are you sure you want to disable Multi-Factor Authentication for this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await api.post(`/users/${selectedUser.id}/reset-mfa`);
              Alert.alert('Success', 'MFA has been reset.');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to reset MFA');
            } finally {
              setIsActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'suspended' ? 'offline' : 'suspended';
    setIsActionLoading(true);
    try {
      await api.patch(`/users/${selectedUser.id}`, { status: newStatus });
      Alert.alert('Success', `Account has been ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`);
      fetchUsers();
      setSelectedUser({ ...selectedUser, status: newStatus });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUser) return;
    if (deleteConfirmText.toLowerCase() !== selectedUser.name.toLowerCase()) {
      Alert.alert('Mismatch', 'The typed name does not match the user.');
      return;
    }
    setIsActionLoading(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      Alert.alert('Deleted', 'The account has been permanently deleted.');
      fetchUsers();
      closeDetailWizard();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete account');
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      className="rounded-xl border p-4 shadow-sm" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.card, padding: SPACING.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
      activeOpacity={0.7}
      onPress={() => openUserDetail(item)}
    >
      <View className="mb-3 flex-row items-center">
        <View className="relative mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.primary }}>
          <Text className="text-sm font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{item.name.substring(0, 2).toUpperCase()}</Text>
          <View className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2" style={{ borderColor: COLORS.surface, backgroundColor:
            item.status === 'online' ? COLORS.success :
                             item.status === 'suspended' ? COLORS.danger : COLORS.muted
          }} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{item.name}</Text>
          <Text className="text-xs" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{item.email}</Text>
        </View>
        <Badge
          label={item.role.toUpperCase()}
          status={item.role === 'admin' ? 'danger' : item.role === 'personnel' ? 'warning' : 'info'}
        />
      </View>
      <View className="flex-row items-center gap-4 border-t pt-3" style={{ borderTopColor: COLORS.background }}>
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="badge" size={14} color={COLORS.muted} />
          <Text className="text-xs" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.mono }}>{item.id}</Text>
        </View>
        {item.department && (
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="business" size={14} color={COLORS.muted} />
            <Text className="text-xs" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.mono }}>{item.department}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }} edges={['top']}>
      <View className="px-6 pt-4 pb-2" style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm }}>
        <Text className="text-3xl tracking-[-0.5px]" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Personnel</Text>
        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{users.length} Total Registered</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View
              className="mb-1 flex-row items-center justify-between rounded-3xl border p-5"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: RADIUS.card, padding: SPACING.xl, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
              accessible
              accessibilityLabel={`${users.length} personnel registered, ${activeUsers} active accounts, ${riderCount} riders`}
            >
              <View className="flex-1 pr-3">
                <Text className="mb-1 text-[10px] font-bold tracking-[1.5px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>WORKFORCE OVERVIEW</Text>
                <Text className="text-3xl font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{users.length}</Text>
                <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Total personnel</Text>
                <View className="mt-4 flex-row items-center gap-2">
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${COLORS.success}18` }}>
                    <Text className="text-[11px] font-bold" style={{ color: COLORS.success, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{activeUsers} active</Text>
                  </View>
                  <Text className="text-[11px]" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>{riderCount} riders</Text>
                </View>
              </View>
              <PersonnelHeroIcon primary={COLORS.primary} success={COLORS.success} />
            </View>
          }
          ListHeaderComponentStyle={{ marginBottom: SPACING.lg }}
          contentContainerStyle={{ padding: SPACING.xl, gap: SPACING.lg }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: COLORS.accent, elevation: 8, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Add personnel"
      >
        <MaterialIcons name="person-add" size={24} color={COLORS.onPrimary} />
      </TouchableOpacity>

      {/* --- CREATE WIZARD MODAL --- */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl p-6 pb-10" style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.modal, borderTopRightRadius: RADIUS.modal }}>
            {!tempPassword ? (
              <>
                <View className="mb-6 flex-row items-start justify-between">
                  <Text className="text-xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>New Personnel</Text>
                  <TouchableOpacity onPress={closeCreateWizard}>
                    <MaterialIcons name="close" size={24} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>FULL NAME</Text>
                  <TextInput
                    className="h-[52px] rounded-xl border px-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground }}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>EMAIL ADDRESS</Text>
                  <TextInput
                    className="h-[52px] rounded-xl border px-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground }}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="juan@example.com"
                    placeholderTextColor={COLORS.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>ROLE</Text>
                  <View className="flex-row gap-2">
                    {(['rider', 'personnel', 'admin'] as const).map(r => (
                      <TouchableOpacity
                        key={r}
                        className="h-11 flex-1 items-center justify-center rounded-lg border" style={{ backgroundColor: newRole === r ? COLORS.primary : COLORS.background, borderColor: newRole === r ? COLORS.primary : COLORS.border }}
                        onPress={() => setNewRole(r)}
                      >
                        <Text className="text-xs font-bold" style={{ color: newRole === r ? COLORS.onPrimary : COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {newRole !== 'rider' && (
                  <View className="mb-5">
                    <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>DEPARTMENT (OPTIONAL)</Text>
                    <TextInput
                      className="h-[52px] rounded-xl border px-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground }}
                      value={newDepartment}
                      onChangeText={setNewDepartment}
                      placeholder="e.g. Logistics"
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>
                )}

                <TouchableOpacity
                  className="mt-6 h-[52px] items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.accent, marginTop: SPACING.xl }}
                  onPress={handleCreateSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <Text className="text-base font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>PROVISION ACCOUNT</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View className="items-center py-6" style={{ paddingVertical: SPACING.xl }}>
                <View className="mb-6" style={{ marginBottom: SPACING.lg }}>
                  <MaterialIcons name="check-circle" size={64} color={COLORS.success} />
                </View>
                <Text className="mb-2 text-xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Account Provisioned</Text>
                <Text className="mb-6 px-4 text-center text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium, marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg }}>Please securely share the temporary password with the user. They will be forced to change it upon first login.</Text>

                <View className="mb-6 w-full items-center rounded-xl border p-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.xl }}>
                  <Text className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>TEMPORARY PASSWORD</Text>
                  <Text className="text-2xl tracking-widest" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }} selectable>{tempPassword}</Text>
                </View>

                <TouchableOpacity className="mt-6 h-[52px] w-full items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.accent }} onPress={closeCreateWizard}>
                  <Text className="text-base font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>DONE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* --- DETAIL & MANAGEMENT MODAL --- */}
      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-3xl p-6 pb-10" style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.modal, borderTopRightRadius: RADIUS.modal }}>
            {selectedUser && (
              <>
                <View className="mb-6 flex-row items-start justify-between">
                  <View>
                    <Text className="text-xl font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedUser.name}</Text>
                    <Text className="mt-1 text-xs" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.mono }}>{selectedUser.id}</Text>
                  </View>
                  <TouchableOpacity onPress={closeDetailWizard} style={{ padding: 4 }}>
                    <MaterialIcons name="close" size={24} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {tempPassword ? (
                    <View className="mb-6 w-full items-center rounded-xl border p-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.xl }}>
                      <Text className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>NEW TEMPORARY PASSWORD</Text>
                      <Text className="text-2xl tracking-widest" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.monoMedium }} selectable>{tempPassword}</Text>
                      <Text className="mt-2 text-center text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Copy and share this securely.</Text>
                    </View>
                  ) : null}

                  <View className="mb-4 mt-2 flex-row items-center justify-between">
                    <Text className="text-base font-bold" style={{ color: COLORS.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Account Details</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                      <Text className="text-sm font-bold" style={{ color: COLORS.accentBlue, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                  </View>

                  {isEditing ? (
                    <View className="rounded-xl border p-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}>
                      <View className="mb-5">
                        <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>ROLE</Text>
                        <View className="flex-row gap-2">
                          {(['rider', 'personnel', 'admin'] as const).map(r => (
                            <TouchableOpacity
                              key={r}
                              className="h-11 flex-1 items-center justify-center rounded-lg border" style={{ backgroundColor: editRole === r ? COLORS.primary : COLORS.background, borderColor: editRole === r ? COLORS.primary : COLORS.border }}
                              onPress={() => setEditRole(r)}
                            >
                              <Text className="text-xs font-bold" style={{ color: editRole === r ? COLORS.onPrimary : COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                                {r.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View className="mb-5">
                        <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>DEPARTMENT</Text>
                        <TextInput
                          className="h-[52px] rounded-xl border px-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground }}
                          value={editDepartment}
                          onChangeText={setEditDepartment}
                          placeholder="e.g. Logistics"
                          placeholderTextColor={COLORS.muted}
                        />
                      </View>
                      <TouchableOpacity
                        className="h-12 items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.accent }}
                        onPress={handleSaveEdits}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text className="text-base font-bold" style={{ color: COLORS.onPrimary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>SAVE CHANGES</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="rounded-xl border p-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}>
                      <View className="flex-row justify-between border-b py-2" style={{ borderBottomColor: COLORS.border }}>
                        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Email</Text>
                        <Text className="text-sm font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedUser.email}</Text>
                      </View>
                      <View className="flex-row justify-between border-b py-2" style={{ borderBottomColor: COLORS.border }}>
                        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Role</Text>
                        <Text className="text-sm font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedUser.role.toUpperCase()}</Text>
                      </View>
                      <View className="flex-row justify-between border-b py-2" style={{ borderBottomColor: COLORS.border }}>
                        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Department</Text>
                        <Text className="text-sm font-bold" style={{ color: COLORS.foreground, fontFamily: TYPOGRAPHY.fontFamily.bold }}>{selectedUser.department || 'N/A'}</Text>
                      </View>
                      <View className="flex-row justify-between py-2">
                        <Text className="text-sm" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.medium }}>Status</Text>
                        <Text className="text-sm font-bold" style={{ color: selectedUser.status === 'suspended' ? COLORS.danger : COLORS.success, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                          {selectedUser.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text className="mb-4 mt-6 text-base font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Danger Zone</Text>
                  <View className="mt-2 rounded-xl border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
                    <TouchableOpacity className="flex-row items-center border-b p-4" style={{ borderBottomColor: '#FECACA' }} onPress={handleResetPassword} disabled={isActionLoading}>
                      <MaterialIcons name="vpn-key" size={20} color={COLORS.danger} />
                      <Text className="ml-3 text-sm font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Force Password Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center border-b p-4" style={{ borderBottomColor: '#FECACA' }} onPress={handleResetMFA} disabled={isActionLoading}>
                      <MaterialIcons name="phonelink-erase" size={20} color={COLORS.danger} />
                      <Text className="ml-3 text-sm font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Reset MFA Device</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center border-b p-4" style={{ borderBottomColor: '#FECACA' }} onPress={handleToggleStatus} disabled={isActionLoading}>
                      <MaterialIcons name={selectedUser.status === 'suspended' ? 'play-circle-outline' : 'pause-circle-outline'} size={20} color={COLORS.danger} />
                      <Text className="ml-3 text-sm font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>
                        {selectedUser.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                      </Text>
                    </TouchableOpacity>

                    {isDeleting ? (
                      <View className="rounded-b-xl bg-white p-4">
                        <Text className="mb-2 text-[10px] font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: TYPOGRAPHY.fontFamily.bold }}>TYPE &quot;{selectedUser.name.toUpperCase()}&quot; TO CONFIRM</Text>
                        <TextInput
                          className="mb-2 h-11 rounded-xl border px-4" style={{ backgroundColor: COLORS.background, borderColor: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.medium, color: COLORS.foreground }}
                          value={deleteConfirmText}
                          onChangeText={setDeleteConfirmText}
                          placeholder={selectedUser.name}
                        />
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            className="h-11 flex-1 items-center justify-center rounded-lg border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.border }}
                            onPress={() => { setIsDeleting(false); setDeleteConfirmText(''); }}
                          >
                            <Text className="text-xs font-bold" style={{ color: COLORS.secondary, fontFamily: TYPOGRAPHY.fontFamily.bold }}>CANCEL</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="h-11 flex-1 items-center justify-center rounded-lg border" style={{ backgroundColor: COLORS.danger, borderColor: COLORS.danger }}
                            onPress={handleDeleteAccount}
                            disabled={isActionLoading}
                          >
                            <Text className="text-xs font-bold text-white" style={{ fontFamily: TYPOGRAPHY.fontFamily.bold }}>DELETE</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity className="flex-row items-center p-4" onPress={() => setIsDeleting(true)}>
                        <MaterialIcons name="delete-forever" size={20} color={COLORS.danger} />
                        <Text className="ml-3 text-sm font-bold" style={{ color: COLORS.danger, fontFamily: TYPOGRAPHY.fontFamily.bold }}>Permanently Delete Account</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
