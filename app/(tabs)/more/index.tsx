import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Card } from '@/components/Card';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, FREE_TIER_LIMIT, inputStyle, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTerminology } from '@/hooks/useTerminology';
import { exportUserData, updateProfile } from '@/lib/customers';
import { restorePurchases } from '@/lib/purchases';
import { createTag, deleteTag, ensureDefaultTags, fetchTags } from '@/lib/tags';
import { BUSINESS_TYPES, WORK_LOCATIONS } from '@/lib/terminology';
import type { BusinessType, Tag, WorkLocationType } from '@/types/database';

export default function MoreScreen() {
  const { user, isPro, profile, signOut, refreshProfile } = useAuth();
  const terms = useTerminology();
  const [tags, setTags] = useState<Tag[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('trades');
  const [workLocation, setWorkLocation] = useState<WorkLocationType>('visit_customers');
  const [newTag, setNewTag] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      fetchTags(user.id)
        .then(setTags)
        .catch(console.error);
      ensureDefaultTags(user.id).catch(console.error);
      setBusinessName(profile?.business_name ?? '');
      setBusinessPhone(profile?.business_phone ?? '');
      setBusinessEmail(profile?.business_email ?? '');
      setBusinessType(profile?.business_type ?? 'trades');
      setWorkLocation(profile?.work_location ?? 'visit_customers');
    }, [user?.id, profile]),
  );

  const saveBusiness = async () => {
    if (!user?.id) return;
    await updateProfile(user.id, {
      business_name: businessName.trim() || null,
      business_phone: businessPhone.trim() || null,
      business_email: businessEmail.trim() || null,
      business_type: businessType,
      work_location: workLocation,
    });
    await refreshProfile();
    Alert.alert('Saved', 'Business profile updated.');
  };

  const handleExport = async () => {
    if (!user?.id) return;
    const data = await exportUserData(user.id);
    const path = `${FileSystem.cacheDirectory}tradekeep-export.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    } else {
      Alert.alert('Exported', 'Data saved to cache.');
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await restorePurchases();
      await refreshProfile();
      Alert.alert(restored ? 'Restored' : 'No subscription', restored ? 'Pro is active.' : 'No active subscription found.');
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/sign-in');
      }},
    ]);
  };

  const addTag = async () => {
    if (!user?.id || !newTag.trim()) return;
    await createTag(user.id, newTag.trim());
    setNewTag('');
    setTags(await fetchTags(user.id));
  };

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.content} bottomInset={160} wrapStyle={styles.container}>
      <Text style={styles.sectionTitle}>Business type</Text>
      <Card style={styles.card}>
        <Text style={styles.hint}>Changes labels across the app ({terms.job}, {terms.client}, etc.)</Text>
        {BUSINESS_TYPES.map((item) => (
          <Pressable key={item.id} style={styles.typeRow} onPress={() => setBusinessType(item.id)}>
            <Text style={styles.typeIcon}>{item.icon}</Text>
            <Text style={[styles.typeLabel, businessType === item.id && styles.typeSelected]}>{item.label}</Text>
          </Pressable>
        ))}
        <Text style={[styles.label, styles.spaced]}>Work style</Text>
        {WORK_LOCATIONS.map((item) => (
          <Pressable key={item.id} style={styles.typeRow} onPress={() => setWorkLocation(item.id)}>
            <Text style={[styles.typeLabel, workLocation === item.id && styles.typeSelected]}>{item.label}</Text>
          </Pressable>
        ))}
      </Card>

      <Text style={styles.sectionTitle}>Business profile</Text>
      <Card style={styles.card}>
        <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Business name" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} value={businessPhone} onChangeText={setBusinessPhone} placeholder="Phone" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        <TextInput style={styles.input} value={businessEmail} onChangeText={setBusinessEmail} placeholder="Email" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
        <Pressable style={styles.btn} onPress={saveBusiness}>
          <Text style={styles.btnText}>Save profile</Text>
        </Pressable>
      </Card>

      <Text style={styles.sectionTitle}>Tags</Text>
      <Card style={styles.card}>
        {tags.map((tag) => (
          <View key={tag.id} style={styles.tagRow}>
            <Text style={[styles.tagName, { color: tag.color }]}>{tag.name}</Text>
            <Pressable onPress={async () => {
              if (!user?.id) return;
              await deleteTag(user.id, tag.id);
              setTags(await fetchTags(user.id));
            }}>
              <Text style={styles.deleteTag}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.tagAdd}>
          <TextInput style={[styles.input, { flex: 1 }]} value={newTag} onChangeText={setNewTag} placeholder="New tag" placeholderTextColor={colors.textMuted} />
          <Pressable style={styles.smallBtn} onPress={addTag}><Text style={styles.btnText}>Add</Text></Pressable>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Account</Text>
      <Card style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? 'Apple ID'}</Text>
        <Text style={[styles.label, styles.spaced]}>Plan</Text>
        <Text style={styles.value}>{isPro ? 'Pro' : `Free (${FREE_TIER_LIMIT} clients)`}</Text>
        {!isPro ? (
          <Pressable onPress={() => router.push('/paywall')}><Text style={styles.link}>Upgrade to Pro</Text></Pressable>
        ) : null}
      </Card>

      <Pressable style={styles.row} onPress={handleExport}><Text style={styles.rowText}>Export data</Text></Pressable>
      <Pressable style={styles.row} onPress={handleRestore}><Text style={styles.rowText}>Restore purchases</Text></Pressable>
      <Pressable style={styles.row} onPress={handleSignOut}><Text style={[styles.rowText, styles.destructive]}>Sign out</Text></Pressable>

      <Text style={styles.footer}>TradeKeep v2.1</Text>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 120 },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md, textTransform: 'uppercase' },
  card: { marginBottom: spacing.md },
  input: { ...inputStyle, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.ctaBackground, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  smallBtn: { backgroundColor: colors.ctaBackground, borderRadius: 10, padding: spacing.md, marginLeft: spacing.sm },
  btnText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  tagName: { ...typography.body, fontWeight: '600' },
  deleteTag: { ...typography.caption, color: colors.statusOverdue },
  tagAdd: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  typeIcon: { fontSize: 20 },
  typeLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  typeSelected: { color: colors.textPrimary, fontWeight: '700' },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs },
  spaced: { marginTop: spacing.md },
  link: { ...typography.label, color: colors.textPrimary, marginTop: spacing.sm, fontWeight: '600' },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  rowText: { ...typography.body, color: colors.textPrimary },
  destructive: { color: colors.statusOverdue },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
