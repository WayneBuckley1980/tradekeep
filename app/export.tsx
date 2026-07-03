import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Card } from '@/components/Card';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { exportUserData } from '@/lib/customers';
import {
  buildCsvExport,
  CSV_EXPORT_OPTIONS,
  fetchCsvExportCounts,
  type CsvExportCounts,
  type CsvExportKind,
} from '@/lib/csvExport';

export default function ExportScreen() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<CsvExportCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [exportingKind, setExportingKind] = useState<CsvExportKind | 'json' | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      setLoadingCounts(true);
      fetchCsvExportCounts(user.id)
        .then(setCounts)
        .catch((error) => {
          console.error(error);
          Alert.alert('Could not load data', 'Try again in a moment.');
        })
        .finally(() => setLoadingCounts(false));
    }, [user?.id]),
  );

  const shareFile = async (path: string, mimeType: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
    } else {
      Alert.alert('Exported', 'File saved to app cache.');
    }
  };

  const handleCsvExport = async (kind: CsvExportKind) => {
    if (!user?.id) return;
    setExportingKind(kind);
    try {
      const result = await buildCsvExport(user.id, kind);
      const path = `${FileSystem.cacheDirectory}${result.filename}`;
      await FileSystem.writeAsStringAsync(path, result.content);
      await shareFile(path, 'text/csv');
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExportingKind(null);
    }
  };

  const handleJsonExport = async () => {
    if (!user?.id) return;
    setExportingKind('json');
    try {
      const data = await exportUserData(user.id);
      const exportedAt = new Date().toISOString().slice(0, 10);
      const path = `${FileSystem.cacheDirectory}tradekeep-export-${exportedAt}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
      await shareFile(path, 'application/json');
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExportingKind(null);
    }
  };

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.content} bottomInset={80} wrapStyle={styles.container}>
      <Text style={styles.intro}>
        Export your CRM data as CSV files for spreadsheets, accounting tools or backup. Amounts use GBP with two
        decimal places; dates use UK format (DD/MM/YYYY).
      </Text>

      <Text style={styles.sectionTitle}>CSV exports</Text>
      <Card style={styles.card}>
        {loadingCounts ? (
          <ActivityIndicator color={colors.textPrimary} style={styles.loader} />
        ) : (
          CSV_EXPORT_OPTIONS.map((option, index) => (
            <View key={option.kind}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                style={styles.row}
                onPress={() => handleCsvExport(option.kind)}
                disabled={exportingKind !== null}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{option.label}</Text>
                  <Text style={styles.rowDescription}>{option.description}</Text>
                  <Text style={styles.rowMeta}>
                    {counts?.[option.kind] ?? 0} record{(counts?.[option.kind] ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
                {exportingKind === option.kind ? (
                  <ActivityIndicator color={colors.textSecondary} />
                ) : (
                  <Text style={styles.exportLabel}>Export</Text>
                )}
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Text style={styles.sectionTitle}>Full backup</Text>
      <Card style={styles.card}>
        <Pressable style={styles.row} onPress={handleJsonExport} disabled={exportingKind !== null}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Export all data (JSON)</Text>
            <Text style={styles.rowDescription}>
              Complete backup including payments and tags. Best for restoring into TradeKeep.
            </Text>
          </View>
          {exportingKind === 'json' ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={styles.exportLabel}>Export</Text>
          )}
        </Pressable>
      </Card>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  card: { marginBottom: spacing.md },
  loader: { paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowText: { flex: 1, paddingRight: spacing.md },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  rowDescription: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  exportLabel: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.xs },
});
