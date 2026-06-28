import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { deleteAttachment, fetchAttachmentsForJob, getAttachmentUrl, uploadAttachment } from '@/lib/attachments';
import type { Attachment } from '@/types/database';

type VoiceNotesSectionProps = {
  userId: string;
  customerId: string;
  jobId?: string;
};

function VoiceNoteRow({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const player = useAudioPlayer(url ?? undefined);

  useEffect(() => {
    getAttachmentUrl(attachment.storage_path).then(setUrl).catch(console.error);
  }, [attachment.storage_path]);

  return (
    <View style={styles.noteRow}>
      <Pressable style={styles.playBtn} onPress={() => player.play()} disabled={!url}>
        <Text style={styles.playText}>▶</Text>
      </Pressable>
      <Text style={styles.noteMeta} numberOfLines={1}>
        {attachment.file_name ?? 'Voice note'} · {new Date(attachment.created_at).toLocaleDateString('en-GB')}
      </Text>
      <Pressable onPress={onDelete}>
        <Text style={styles.remove}>×</Text>
      </Pressable>
    </View>
  );
}

export function VoiceNotesSection({ userId, customerId, jobId }: VoiceNotesSectionProps) {
  const [notes, setNotes] = useState<Attachment[]>([]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const load = async () => {
    if (jobId) {
      const all = await fetchAttachmentsForJob(userId, jobId);
      setNotes(all.filter((a) => a.kind === 'voice'));
      return;
    }
    setNotes([]);
  };

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })().catch(console.error);
    load().catch(console.error);
  }, [userId, jobId]);

  const startRecording = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert('Microphone access', 'Allow microphone access to record voice notes.');
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopAndUpload = async () => {
    if (!jobId) return;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;

    try {
      await uploadAttachment(userId, {
        uri,
        kind: 'voice',
        customerId,
        jobId,
        fileName: `voice-${Date.now()}.m4a`,
      });
      await load();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not save recording');
    }
  };

  const remove = (attachment: Attachment) => {
    Alert.alert('Delete voice note', 'Remove this recording?', [
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

  if (!jobId) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Voice notes</Text>
      {notes.map((note) => (
        <VoiceNoteRow key={note.id} attachment={note} onDelete={() => remove(note)} />
      ))}
      {recorderState.isRecording ? (
        <Pressable style={styles.recordBtnActive} onPress={stopAndUpload}>
          <Text style={styles.recordText}>■ Stop & save</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.recordBtn} onPress={startRecording}>
          <Text style={styles.recordText}>🎙 Record voice note</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.textPrimary, fontSize: 14 },
  noteMeta: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  remove: { ...typography.heading, color: colors.statusOverdue, fontSize: 20 },
  recordBtn: { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  recordBtnActive: { backgroundColor: colors.statusOverdue, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  recordText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
});
