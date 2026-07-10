import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#FFD700';

type JobCompleteCelebrationProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function JobCompleteCelebration({ visible, onDismiss }: JobCompleteCelebrationProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <LinearGradient colors={[GOLD, GOLD_LIGHT, GOLD]} style={styles.card}>
          <Text style={styles.title}>Job Complete</Text>
          <Text style={styles.subtitle}>Payment received. Well done.</Text>
          <Pressable style={styles.btn} onPress={onDismiss}>
            <Text style={styles.btnText}>View completed jobs</Text>
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: '#2A2A2A',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  btnText: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
