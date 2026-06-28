import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { Card } from '@/components/Card';
import { AttachmentGallery } from '@/components/AttachmentGallery';
import { colors, spacing, typography } from '@/constants/theme';
import {
  deleteAttachment,
  fetchAttachmentsForCustomer,
  uploadAttachment,
} from '@/lib/attachments';
import type { Attachment, AttachmentKind } from '@/types/database';

const DOCUMENT_KINDS: { kind: AttachmentKind; label: string }[] = [
  { kind: 'insurance', label: 'Insurance' },
  { kind: 'guarantee', label: 'Guarantee' },
  { kind: 'manual', label: 'Manual' },
  { kind: 'receipt', label: 'Receipt' },
  { kind: 'document_photo', label: 'Photo' },
  { kind: 'pdf', label: 'PDF' },
];

type ClientDocumentsSectionProps = {
  userId: string;
  customerId: string;
};

export function ClientDocumentsSection({ userId, customerId }: ClientDocumentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const all = await fetchAttachmentsForCustomer(userId, customerId);
    setAttachments(all.filter((a) => !a.job_id && a.kind !== 'voice'));
  };

  useEffect(() => {
    load().catch(console.error);
  }, [userId, customerId]);

  const upload = async (uri: string, kind: AttachmentKind, fileName: string) => {
    setUploading(true);
    try {
      await uploadAttachment(userId, { uri, kind, customerId, fileName });
      await load();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload file');
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async (kind: AttachmentKind) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    await upload(result.assets[0].uri, kind, result.assets[0].name);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await upload(result.assets[0].uri, 'document_photo', result.assets[0].fileName ?? 'photo.jpg');
  };

  const handleDelete = (attachment: Attachment) => {
    Alert.alert('Remove document', 'Delete this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAttachment(userId, attachment);
          await load();
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Client documents</Text>
      <AttachmentGallery attachments={attachments} onDelete={handleDelete} />
      <View style={styles.chips}>
        {DOCUMENT_KINDS.map((doc) => (
          <Pressable
            key={doc.kind}
            style={styles.chip}
            disabled={uploading}
            onPress={() => (doc.kind === 'document_photo' ? pickPhoto() : pickDocument(doc.kind))}
          >
            <Text style={styles.chipText}>+ {doc.label}</Text>
          </Pressable>
        ))}
      </View>
      {uploading ? <Text style={styles.meta}>Uploading…</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  chipText: { ...typography.caption, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
