import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getRiderAvatarSource } from '@/assets/rider-avatars/catalog.generated';

type Props = { avatarId: string | null | undefined; name: string; size: number };

export function RiderAvatar({ avatarId, name, size }: Props) {
  const [failedAvatarId, setFailedAvatarId] = useState<string | null>(null);
  const source = getRiderAvatarSource(avatarId);

  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
  const frame = { width: size, height: size, borderRadius: size / 2 };
  if (source && failedAvatarId !== avatarId) {
    return <Image testID="rider-avatar-image" source={source} onError={() => setFailedAvatarId(avatarId ?? null)} accessibilityLabel={`${name || 'Rider'} avatar`} style={[styles.image, frame]} />;
  }

  return (
    <View accessibilityLabel={`${name || 'Rider'} avatar`} style={[styles.fallback, frame]}>
      {initials ? <Text style={[styles.initials, { fontSize: Math.max(14, size * 0.32) }]}>{initials}</Text> : <MaterialIcons name="person" color="#1B5970" size={size * 0.58} />}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#E8F4F4' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F1F2', borderWidth: 1, borderColor: '#BEDBDD' },
  initials: { color: '#174B60', fontWeight: '800' },
});
