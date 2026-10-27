import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
}

export const FilterModal = ({ visible, onClose, filterPriority, setFilterPriority }: FilterModalProps) => {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[85%] rounded-t-2xl" style={{ backgroundColor: COLORS.surface, padding: SPACING.xl }}>
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-fira-bold" style={{ color: COLORS.primary }}>Advanced Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          
          <Text className="mb-4 text-xs font-fira-bold uppercase" style={{ color: COLORS.secondary }}>Priority Level</Text>
          <View className="mb-6 flex-row gap-2">
            {['All', 'Urgent', 'Normal'].map(p => (
              <TouchableOpacity 
                key={p} 
                className="rounded-full border px-4 py-2"
                style={{ borderColor: filterPriority === p ? COLORS.primary : COLORS.border, backgroundColor: filterPriority === p ? COLORS.primary : COLORS.background }}
                onPress={() => setFilterPriority(p)}
              >
                <Text className="text-xs font-fira-bold" style={{ color: filterPriority === p ? '#FFF' : COLORS.secondary }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity className="mt-3 items-center rounded-lg p-[18px]" style={{ backgroundColor: COLORS.accent }} onPress={onClose}>
            <Text className="text-base font-fira-bold" style={{ color: COLORS.onPrimary }}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
