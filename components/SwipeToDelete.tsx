import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ReactNode } from 'react';

import { colors, spacing, typography } from '@/constants/theme';

type SwipeToDeleteProps = {
  children: ReactNode;
  onDelete: () => void | Promise<void>;
  deleteLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
};

export function SwipeToDelete({
  children,
  onDelete,
  deleteLabel = 'Delete',
  confirmTitle = 'Delete item',
  confirmMessage = 'This cannot be undone.',
}: SwipeToDeleteProps) {
  const handleDelete = () => {
    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: deleteLabel,
        style: 'destructive',
        onPress: () => {
          void onDelete();
        },
      },
    ]);
  };

  const renderRightActions = () => (
    <Pressable style={styles.deleteAction} onPress={handleDelete}>
      <Text style={styles.deleteText}>{deleteLabel}</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={styles.content}>{children}</View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background },
  deleteAction: {
    backgroundColor: colors.statusOverdue,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: spacing.sm,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  deleteText: { ...typography.label, color: '#fff', fontWeight: '700' },
});
