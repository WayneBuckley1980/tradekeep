import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { attachmentKindLabel, getAttachmentUrls, isImageAttachment } from '@/lib/attachments';
import type { Attachment } from '@/types/database';

type AttachmentGalleryProps = {
  attachments: Attachment[];
  onDelete?: (attachment: Attachment) => void;
  showLabels?: boolean;
};

export function AttachmentGallery({ attachments, onDelete, showLabels = true }: AttachmentGalleryProps) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const images = attachments.filter((a) => isImageAttachment(a.kind));
  const other = attachments.filter((a) => !isImageAttachment(a.kind));

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAttachmentUrls(attachments)
      .then((map) => {
        if (active) setUrls(map);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attachments]);

  if (attachments.length === 0) {
    return <Text style={styles.empty}>No attachments yet.</Text>;
  }

  return (
    <View>
      {loading && images.length > 0 ? (
        <ActivityIndicator color={colors.textPrimary} style={styles.loader} />
      ) : null}
      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((attachment) => {
            const uri = urls.get(attachment.id);
            return (
              <View key={attachment.id} style={styles.thumbWrap}>
                {uri ? (
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbMissing]}>
                    <Text style={styles.missingText}>?</Text>
                  </View>
                )}
                {showLabels ? (
                  <Text style={styles.caption} numberOfLines={1}>
                    {attachmentKindLabel(attachment.kind)}
                  </Text>
                ) : null}
                {onDelete ? (
                  <Pressable style={styles.deleteBtn} onPress={() => onDelete(attachment)}>
                    <Text style={styles.deleteText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {other.map((attachment) => (
        <View key={attachment.id} style={styles.fileRow}>
          <Text style={styles.fileName}>
            {attachmentKindLabel(attachment.kind)} · {attachment.file_name ?? 'file'}
          </Text>
          {onDelete ? (
            <Pressable onPress={() => onDelete(attachment)}>
              <Text style={styles.deleteLink}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.caption, color: colors.textMuted },
  loader: { marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: '48%', position: 'relative' },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: colors.surfaceElevated },
  thumbMissing: { alignItems: 'center', justifyContent: 'center' },
  missingText: { ...typography.heading, color: colors.textMuted },
  caption: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  fileName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  deleteLink: { ...typography.caption, color: colors.statusOverdue },
});
