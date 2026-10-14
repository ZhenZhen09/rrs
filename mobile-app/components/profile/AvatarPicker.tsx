import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RiderAvatar } from './RiderAvatar';

type Props = { selectedAvatarId: string | null; disabled: boolean; onSelect: (avatarId: string) => void };
const avatarIds = ['avatar_01', 'avatar_02', 'avatar_03', 'avatar_04', 'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08'] as const;

export function AvatarPicker({ selectedAvatarId, disabled, onSelect }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Choose an avatar" style={styles.grid}>
      {avatarIds.map((id, index) => {
        const selected = id === selectedAvatarId;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={`Avatar ${index + 1}${selected ? ', selected' : ''}`}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(id)}
            style={[styles.choice, selected && styles.selected, disabled && styles.disabled]}
          >
            <RiderAvatar avatarId={id} name={`Avatar ${index + 1}`} size={54} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{index + 1}</Text>
            {selected && <View testID={`avatar-${String(index + 1).padStart(2, '0')}-check`} style={styles.check}><MaterialIcons name="check" size={15} color="#FFFFFF" /></View>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  choice: { width: '23%', minWidth: 64, minHeight: 91, borderRadius: 16, borderWidth: 2, borderColor: '#D6E5E9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, position: 'relative' },
  selected: { borderColor: '#17586B', backgroundColor: '#EDF7F4' },
  disabled: { opacity: 0.66 },
  label: { fontSize: 11, color: '#58717C', fontWeight: '700', marginTop: 2 },
  selectedLabel: { color: '#17586B' },
  check: { position: 'absolute', right: 2, top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#17586B', alignItems: 'center', justifyContent: 'center' },
});
