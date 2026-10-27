import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTheme } from '../../context/ThemeContext';

interface SequenceModalProps {
  visible: boolean;
  onClose: () => void;
  sequenceTasks: any[];
  setSequenceTasks: (tasks: any[]) => void;
  saveSequence: () => void;
  isAssigning: boolean;
}

export const SequenceModal = ({ visible, onClose, sequenceTasks, setSequenceTasks, saveSequence, isAssigning }: SequenceModalProps) => {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[85%] rounded-t-2xl" style={{ backgroundColor: COLORS.surface, padding: SPACING.xl }}>
          <View className="mb-6 flex-row items-center justify-between" style={{ marginBottom: SPACING.xl }}>
            <Text className="font-fira-bold text-xl" style={{ color: COLORS.primary }}>Route Editor</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          <Text className="mb-4 font-fira-bold text-xs uppercase" style={{ color: COLORS.secondary }}>Adjust delivery sequence</Text>
          
          <View style={{ height: 400 }}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <DraggableFlatList
                data={sequenceTasks}
                onDragEnd={({ data }) => setSequenceTasks(data)}
                keyExtractor={(item) => item.id}
                containerStyle={{ flex: 1 }}
                renderItem={({ item: task, drag, isActive, getIndex }: any) => {
                  const index = getIndex() || 0;
                  return (
                    <ScaleDecorator>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onLongPress={drag}
                        disabled={isActive}
                        className="mb-2 flex-row items-center rounded-xl border p-3"
                        style={{
                          backgroundColor: isActive ? COLORS.surface : COLORS.background,
                          borderColor: isActive ? COLORS.primary : COLORS.border,
                          elevation: isActive ? 5 : 0,
                          shadowOpacity: isActive ? 0.2 : 0,
                          opacity: isActive ? 0.9 : 1,
                        }}
                      >
                        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.primary, marginRight: 12 }}>
                          <Text className="font-fira-bold text-sm text-white">{index + 1}</Text>
                        </View>
                        <View className="flex-1 pr-2">
                          <Text className="font-fira-bold text-sm" style={{ color: COLORS.primary }} numberOfLines={1}>
                            {task.building !== 'N/A' && task.building ? task.building : 'No Building Specified'}
                          </Text>
                          <Text className="mt-0.5 font-fira-medium text-[11px]" style={{ color: COLORS.secondary, marginTop: 2 }} numberOfLines={1}>
                            {task.location}
                          </Text>
                          <View className="mt-1.5 flex-row items-center justify-between">
                            <Text className="font-fira-code text-[9px]" style={{ color: COLORS.secondary }}>#{task.id.slice(-8).toUpperCase()}</Text>
                            <Text className="font-fira-bold text-[10px]" style={{ color: COLORS.primary }}>{task.customer}</Text>
                          </View>
                        </View>
                        <View className="flex-row gap-1">
                          <TouchableOpacity onPressIn={drag} className="p-2">
                            <MaterialIcons name="drag-indicator" size={28} color={isActive ? COLORS.primary : COLORS.muted} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </ScaleDecorator>
                  );
                }}
              />
            </GestureHandlerRootView>
          </View>

          <TouchableOpacity 
            className="mt-3 items-center rounded-lg p-[18px]"
            style={{ backgroundColor: COLORS.accent, opacity: isAssigning ? 0.5 : 1 }}
            onPress={saveSequence}
            disabled={isAssigning}
          >
            {isAssigning ? <ActivityIndicator color="#FFF" /> : <Text className="font-fira-bold text-base" style={{ color: COLORS.onPrimary }}>Save Sequence</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
