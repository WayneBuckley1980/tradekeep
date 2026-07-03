import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Card } from '@/components/Card';
import { KeyboardSafeScroll } from '@/components/KeyboardSafeScroll';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { buildUnifiedCsvExport, fetchCsvExportSummary, type CsvExportSummary } from '@/lib/csvExport';

export default function ExportScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CsvExportSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      setLoadingSummary(true);
      fetchCsvExportSummary(user.id)
        .then(setSummary)
        .catch((error) => {
          console.error(error);
          Alert.alert('Could not load data', 'Try again in a moment.');
        })
        .finally(() => setLoadingSummary(false));
    }, [user?.id]),
  );

  const handleExport = async () => {
    if (!user?.id) return;
    setExporting(true);
    try {
      const result = await buildUnifiedCsvExport(user.id);
      const path = `${FileSystem.cacheDirectory}${result.filename}`;
      await FileSystem.writeAsStringAsync(path, result.content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exported', 'File saved to app cache.');
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.content} bottomInset={80} wrapStyle={styles.container}>
      <Text style={styles.intro}>
        Export all client data in one spreadsheet-friendly CSV. Each row is a client, job, quote, invoice or linked
        lead. Amounts use GBP with two decimal places; dates use UK format (DD/MM/YYYY).
      </Text>

      <Card style={styles.card}>
        {loadingSummary ? (
          <ActivityIndicator color={colors.textPrimary} style={styles.loader} />
        ) : (
          <>
            <Text style={styles.summaryTitle}>Ready to export</Text>
            <Text style={styles.summaryText}>
              {summary?.clients ?? 0} client{(summary?.clients ?? 0) === 1 ? '' : 's'} · {summary?.totalRows ?? 0} row
              {(summary?.totalRows ?? 0) === 1 ? '' : 's'}
            </Text>
            <Text style={styles.summaryDetail}>
              Includes jobs ({summary?.jobs ?? 0}), quotes ({summary?.quotes ?? 0}), quote lines (
              {summary?.quoteLines ?? 0}), invoices ({summary?.invoices ?? 0}) and converted leads (
              {summary?.leads ?? 0}).
            </Text>
            <Pressable style={styles.exportButton} onPress={handleExport} disabled={exporting}>
              {exporting ? (
                <ActivityIndicator color={colors.ctaText} />
              ) : (
                <Text style={styles.exportButtonText}>Export CSV</Text>
              )}
            </Pressable>
          </>
        )}
      </Card>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  loader: { paddingVertical: spacing.lg },
  summaryTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.xs },
  summaryText: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.xs },
  summaryDetail: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  exportButton: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  exportButtonText: { ...typography.label, color: colors.ctaText, fontWeight: '700' },
});
