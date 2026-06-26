import { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type KeyboardSafeScrollProps = ScrollViewProps & {
  children: ReactNode;
  /** Extra space at bottom so the last field can scroll above the keyboard */
  bottomInset?: number;
  keyboardVerticalOffset?: number;
  wrapStyle?: StyleProp<ViewStyle>;
  showDoneBar?: boolean;
};

export function KeyboardSafeScroll({
  children,
  contentContainerStyle,
  bottomInset = 280,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 96 : 0,
  wrapStyle,
  showDoneBar = Platform.OS === 'ios',
  ...scrollProps
}: KeyboardSafeScrollProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, wrapStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {showDoneBar ? (
        <Pressable style={styles.doneBar} onPress={Keyboard.dismiss} hitSlop={8}>
          <Text style={styles.doneText}>Hide keyboard</Text>
        </Pressable>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentContainerStyle]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  doneBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  doneText: {
    ...typography.caption,
    color: colors.statusUpcoming,
    fontWeight: '600',
  },
});
