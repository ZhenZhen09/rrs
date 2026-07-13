import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS as DEFAULT_COLORS, RADIUS as DEFAULT_RADIUS, TYPOGRAPHY as DEFAULT_TYPOGRAPHY } from '../../constants/Theme';
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

export default function PersonnelScreen() {
  const { theme } = useTheme();
  const { COLORS, RADIUS, TYPOGRAPHY, SPACING } = theme;

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    title: {
      fontSize: TYPOGRAPHY.size['3xl'],
      fontFamily: TYPOGRAPHY.fontFamily.bold,
      color: COLORS.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.size.sm,
      fontFamily: TYPOGRAPHY.fontFamily.medium,
      color: COLORS.secondary,
    },
    listContainer: {
      padding: SPACING.xl,
      gap: SPACING.lg,
    },
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.card,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.onPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.sm,
  },
  statusDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.foreground,
  },
  userEmail: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.muted,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.primary,
  },
  detailIdText: {
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.secondary,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.primary,
  },
  editText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accentBlue,
  },
  detailGrid: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.secondary,
  },
  detailValue: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.foreground,
  },
  editCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  dangerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  dangerActionText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.danger,
    marginLeft: 12,
  },
  deleteConfirmBox: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: RADIUS.card,
    borderBottomRightRadius: RADIUS.card,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.button,
    paddingHorizontal: 16,
    height: 52,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  roleTab: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleTabText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 12,
    color: COLORS.secondary,
  },
  roleTabTextActive: {
    color: COLORS.onPrimary,
  },
  submitButton: {
    height: 52,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  submitButtonText: {
    color: COLORS.onPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: TYPOGRAPHY.size.base,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  passwordBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  passwordLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.secondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  passwordValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    color: COLORS.primary,
    letterSpacing: 2,
  },
}), [theme]);

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
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => openUserDetail(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.substring(0, 2).toUpperCase()}</Text>
          <View style={[styles.statusDot, { 
            backgroundColor: item.status === 'online' ? COLORS.success : 
                             item.status === 'suspended' ? COLORS.danger : COLORS.muted 
          }]} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <Badge 
          label={item.role.toUpperCase()} 
          status={item.role === 'admin' ? 'danger' : item.role === 'personnel' ? 'warning' : 'info'} 
        />
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <MaterialIcons name="badge" size={14} color={COLORS.muted} />
          <Text style={styles.footerText}>{item.id}</Text>
        </View>
        {item.department && (
          <View style={styles.footerItem}>
            <MaterialIcons name="business" size={14} color={COLORS.muted} />
            <Text style={styles.footerText}>{item.department}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Personnel</Text>
        <Text style={styles.subtitle}>{users.length} Total Registered</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="person-add" size={24} color={COLORS.onPrimary} />
      </TouchableOpacity>

      {/* --- CREATE WIZARD MODAL --- */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!tempPassword ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Personnel</Text>
                  <TouchableOpacity onPress={closeCreateWizard}>
                    <MaterialIcons name="close" size={24} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput 
                    style={styles.input} 
                    value={newName} 
                    onChangeText={setNewName}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <TextInput 
                    style={styles.input} 
                    value={newEmail} 
                    onChangeText={setNewEmail}
                    placeholder="juan@example.com"
                    placeholderTextColor={COLORS.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>ROLE</Text>
                  <View style={styles.roleTabs}>
                    {(['rider', 'personnel', 'admin'] as const).map(r => (
                      <TouchableOpacity 
                        key={r}
                        style={[styles.roleTab, newRole === r && styles.roleTabActive]}
                        onPress={() => setNewRole(r)}
                      >
                        <Text style={[styles.roleTabText, newRole === r && styles.roleTabTextActive]}>
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {newRole !== 'rider' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>DEPARTMENT (OPTIONAL)</Text>
                    <TextInput 
                      style={styles.input} 
                      value={newDepartment} 
                      onChangeText={setNewDepartment}
                      placeholder="e.g. Logistics"
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.submitButton} 
                  onPress={handleCreateSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.submitButtonText}>PROVISION ACCOUNT</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={64} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>Account Provisioned</Text>
                <Text style={styles.successSubtitle}>Please securely share the temporary password with the user. They will be forced to change it upon first login.</Text>
                
                <View style={styles.passwordBox}>
                  <Text style={styles.passwordLabel}>TEMPORARY PASSWORD</Text>
                  <Text style={styles.passwordValue} selectable>{tempPassword}</Text>
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={closeCreateWizard}>
                  <Text style={styles.submitButtonText}>DONE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* --- DETAIL & MANAGEMENT MODAL --- */}
      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                    <Text style={styles.detailIdText}>{selectedUser.id}</Text>
                  </View>
                  <TouchableOpacity onPress={closeDetailWizard} style={{ padding: 4 }}>
                    <MaterialIcons name="close" size={24} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {tempPassword ? (
                    <View style={styles.passwordBox}>
                      <Text style={styles.passwordLabel}>NEW TEMPORARY PASSWORD</Text>
                      <Text style={styles.passwordValue} selectable>{tempPassword}</Text>
                      <Text style={[styles.successSubtitle, { marginTop: 8 }]}>Copy and share this securely.</Text>
                    </View>
                  ) : null}

                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                      <Text style={styles.editText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                  </View>

                  {isEditing ? (
                    <View style={styles.editCard}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>ROLE</Text>
                        <View style={styles.roleTabs}>
                          {(['rider', 'personnel', 'admin'] as const).map(r => (
                            <TouchableOpacity 
                              key={r}
                              style={[styles.roleTab, editRole === r && styles.roleTabActive]}
                              onPress={() => setEditRole(r)}
                            >
                              <Text style={[styles.roleTabText, editRole === r && styles.roleTabTextActive]}>
                                {r.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>DEPARTMENT</Text>
                        <TextInput 
                          style={styles.input} 
                          value={editDepartment} 
                          onChangeText={setEditDepartment}
                          placeholder="e.g. Logistics"
                          placeholderTextColor={COLORS.muted}
                        />
                      </View>
                      <TouchableOpacity 
                        style={[styles.submitButton, { marginTop: 0, height: 48 }]} 
                        onPress={handleSaveEdits}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text style={styles.submitButtonText}>SAVE CHANGES</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.detailGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{selectedUser.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Role</Text>
                        <Text style={styles.detailValue}>{selectedUser.role.toUpperCase()}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department</Text>
                        <Text style={styles.detailValue}>{selectedUser.department || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <Text style={[styles.detailValue, { 
                          color: selectedUser.status === 'suspended' ? COLORS.danger : COLORS.success 
                        }]}>
                          {selectedUser.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={[styles.sectionTitle, { color: COLORS.danger, marginTop: 24 }]}>Danger Zone</Text>
                  <View style={styles.dangerCard}>
                    <TouchableOpacity style={styles.dangerActionRow} onPress={handleResetPassword} disabled={isActionLoading}>
                      <MaterialIcons name="vpn-key" size={20} color={COLORS.danger} />
                      <Text style={styles.dangerActionText}>Force Password Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerActionRow} onPress={handleResetMFA} disabled={isActionLoading}>
                      <MaterialIcons name="phonelink-erase" size={20} color={COLORS.danger} />
                      <Text style={styles.dangerActionText}>Reset MFA Device</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerActionRow} onPress={handleToggleStatus} disabled={isActionLoading}>
                      <MaterialIcons name={selectedUser.status === 'suspended' ? 'play-circle-outline' : 'pause-circle-outline'} size={20} color={COLORS.danger} />
                      <Text style={styles.dangerActionText}>
                        {selectedUser.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                      </Text>
                    </TouchableOpacity>
                    
                    {isDeleting ? (
                      <View style={styles.deleteConfirmBox}>
                        <Text style={styles.label}>TYPE "{selectedUser.name.toUpperCase()}" TO CONFIRM</Text>
                        <TextInput 
                          style={[styles.input, { borderColor: COLORS.danger, height: 44, marginBottom: 8 }]} 
                          value={deleteConfirmText}
                          onChangeText={setDeleteConfirmText}
                          placeholder={selectedUser.name}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.roleTab, { flex: 1, borderColor: COLORS.border }]} 
                            onPress={() => { setIsDeleting(false); setDeleteConfirmText(''); }}
                          >
                            <Text style={styles.roleTabText}>CANCEL</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.roleTab, { flex: 1, backgroundColor: COLORS.danger, borderColor: COLORS.danger }]} 
                            onPress={handleDeleteAccount}
                            disabled={isActionLoading}
                          >
                            <Text style={[styles.roleTabText, { color: '#FFF' }]}>DELETE</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.dangerActionRow, { borderBottomWidth: 0 }]} onPress={() => setIsDeleting(true)}>
                        <MaterialIcons name="delete-forever" size={20} color={COLORS.danger} />
                        <Text style={styles.dangerActionText}>Permanently Delete Account</Text>
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

