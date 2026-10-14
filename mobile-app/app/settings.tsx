import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { RiderAvatar } from '@/components/profile/RiderAvatar';
import { useAuth } from '@/context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateAvatar } = useAuth();
  const name = user?.name || 'Rider';
  const [savedAvatarId, setSavedAvatarId] = useState<string | null>(user?.avatar_id ?? user?.avatarId ?? null);
  const [draftAvatarId, setDraftAvatarId] = useState<string | null>(user?.avatar_id ?? user?.avatarId ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'saved' | 'error' | null>(null);

  const selectAvatar = (avatarId: string) => {
    if (saving) return;
    setDraftAvatarId(avatarId);
    setMessage(null);
  };

  const saveAvatar = async () => {
    if (saving || !draftAvatarId || draftAvatarId === savedAvatarId) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateAvatar(draftAvatarId);
      setSavedAvatarId(draftAvatarId);
      setMessage('saved');
    } catch {
      setMessage('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#173B56" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>YOUR PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.identity}>
            <RiderAvatar avatarId={savedAvatarId} name={name} size={72} />
            <View style={styles.identityText}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.caption}>Rider profile</Text>
            </View>
          </View>
          <Text style={styles.pickerTitle}>Choose your avatar</Text>
          <Text style={styles.hint}>Choose an avatar, then save your change.</Text>
          <AvatarPicker selectedAvatarId={draftAvatarId} disabled={saving} onSelect={selectAvatar} />
          {saving && <View accessibilityLiveRegion="polite" style={styles.feedback}><ActivityIndicator color="#17586B" /><Text style={styles.progress}>Saving avatar…</Text></View>}
          {message === 'saved' && <Text accessibilityLiveRegion="polite" style={styles.success}>Avatar saved</Text>}
          {message === 'error' && <Text accessibilityLiveRegion="polite" style={styles.error}>Could not save your avatar. Check your connection and tap a choice to try again.</Text>}
        </View>
      </ScrollView>
      <View style={styles.saveBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save avatar" accessibilityState={{ disabled: saving || !draftAvatarId || draftAvatarId === savedAvatarId }} disabled={saving || !draftAvatarId || draftAvatarId === savedAvatarId} onPress={saveAvatar} style={[styles.saveButton, (saving || !draftAvatarId || draftAvatarId === savedAvatarId) && styles.saveButtonDisabled]}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save avatar'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E4ECEF' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#173B56' },
  content: { padding: 20, paddingBottom: 36 },
  saveBar: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#E0EBEE' },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: '#617D89', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E0EBEE' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#EDF2F4' },
  identityText: { flex: 1 },
  name: { fontSize: 19, fontWeight: '800', color: '#173B56' },
  caption: { color: '#607C87', marginTop: 3 },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: '#173B56', marginTop: 20 },
  hint: { color: '#617D89', marginTop: 4, marginBottom: 16 },
  saveButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#17586B', alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { backgroundColor: '#8EA7AE' },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  progress: { color: '#17586B', fontWeight: '700' },
  success: { color: '#176B50', fontWeight: '700', marginTop: 16 },
  error: { color: '#B42335', fontWeight: '600', marginTop: 16 },
});
