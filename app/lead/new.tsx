import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';

import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import { createLead } from '@/lib/leads';

export default function NewLeadScreen() {
  const { user } = useAuth();
  const terms = useTerminology();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestedService, setRequestedService] = useState('');
  const [notes, setNotes] = useState('');

  const save = async () => {
    if (!user?.id || !name.trim()) {
      Alert.alert('Required', 'Enter a name for this enquiry.');
      return;
    }
    const lead = await createLead(user.id, {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      requested_service: requestedService.trim() || null,
      notes: notes.trim() || null,
      status: 'new',
      converted_customer_id: null,
    });
    router.replace(`/lead/${lead.id}` as never);
  };

  if (!user?.id) return null;

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name *" placeholderTextColor={colors.textMuted} />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} value={requestedService} onChangeText={setRequestedService} placeholder={`Requested service (e.g. ${terms.serviceExample})`} placeholderTextColor={colors.textMuted} />
      <TextInput style={[styles.input, styles.multi]} value={notes} onChangeText={setNotes} placeholder="Notes" placeholderTextColor={colors.textMuted} multiline />
      <Pressable style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>Save lead</Text>
      </Pressable>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  input: { ...inputStyle, marginBottom: spacing.sm },
  multi: { minHeight: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
