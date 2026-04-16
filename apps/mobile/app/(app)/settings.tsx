import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import type { User, Pause } from '@imok/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const GRACE_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const logout = useAuthStore(s => s.logout);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [checkinTime, setCheckinTime] = useState('');
  const [gracePeriodMin, setGracePeriodMin] = useState(30);

  const [pauses, setPauses] = useState<Pause[]>([]);
  const [showAddPause, setShowAddPause] = useState(false);
  const [pauseFrom, setPauseFrom] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [addingPause, setAddingPause] = useState(false);

  const loadUser = useCallback(async () => {
    const u = await api.get<User>('/user/me');
    setUser(u);
    setName(u.name ?? '');
    setCheckinTime(u.checkinTime.slice(0, 5)); // "09:00:00" → "09:00"
    setGracePeriodMin(u.gracePeriodMin);
  }, []);

  const loadPauses = useCallback(async () => {
    const list = await api.get<Pause[]>('/pauses');
    setPauses(list);
  }, []);

  useEffect(() => {
    Promise.all([loadUser(), loadPauses()]).finally(() => setLoading(false));
  }, [loadUser, loadPauses]);

  const save = async () => {
    if (!/^\d{2}:\d{2}$/.test(checkinTime)) {
      Alert.alert('Invalid time', 'Please enter time in HH:MM format (e.g. 09:00)');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<User>('/user/me', { name, checkinTime, gracePeriodMin });
      setUser(updated);
      Alert.alert('Saved', 'Your settings have been updated.');
    } finally {
      setSaving(false);
    }
  };

  const addPause = async () => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(pauseFrom) || !dateRe.test(pauseUntil)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format (e.g. 2026-05-01)');
      return;
    }
    if (pauseFrom > pauseUntil) {
      Alert.alert('Invalid range', 'Start date must be before end date');
      return;
    }
    setAddingPause(true);
    try {
      await api.post('/pauses', { pauseFrom, pauseUntil, reason: pauseReason || undefined });
      setPauseFrom('');
      setPauseUntil('');
      setPauseReason('');
      setShowAddPause(false);
      await loadPauses();
    } finally {
      setAddingPause(false);
    }
  };

  const deletePause = (id: string) => {
    Alert.alert('Delete pause?', 'Check-ins will resume on the scheduled days.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/pauses/${id}`);
          await loadPauses();
        },
      },
    ]);
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'All your data will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/user/me');
            } catch {
              // Account may already be gone — proceed to logout anyway
            }
            logout();
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Section title="Profile">
        <Field label="Name">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9ca3af"
          />
        </Field>
      </Section>

      <Section title="Check-in">
        <Field label="Daily check-in time (HH:MM)">
          <TextInput
            style={styles.input}
            value={checkinTime}
            onChangeText={setCheckinTime}
            placeholder="09:00"
            placeholderTextColor="#9ca3af"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </Field>
        <Field label="Grace period">
          <View style={styles.chips}>
            {GRACE_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.chip, gracePeriodMin === opt.value && styles.chipActive]}
                onPress={() => setGracePeriodMin(opt.value)}
              >
                <Text style={[styles.chipText, gracePeriodMin === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>
      </Section>

      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
      </Pressable>

      <Section title="Pauses">
        <Text style={styles.pauseHint}>
          Pauses skip check-ins for a date range — useful when travelling.
        </Text>

        {pauses.map(p => (
          <View key={p.id} style={styles.pauseRow}>
            <View style={styles.pauseInfo}>
              <Text style={styles.pauseDates}>{p.pauseFrom} → {p.pauseUntil}</Text>
              {p.reason ? <Text style={styles.pauseReason}>{p.reason}</Text> : null}
            </View>
            <Pressable onPress={() => deletePause(p.id)} hitSlop={12}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </View>
        ))}

        {pauses.length === 0 && !showAddPause && (
          <Text style={styles.noPauses}>No pauses scheduled.</Text>
        )}

        {showAddPause ? (
          <View style={styles.addPauseForm}>
            <TextInput
              style={styles.input}
              value={pauseFrom}
              onChangeText={setPauseFrom}
              placeholder="From: YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              maxLength={10}
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={pauseUntil}
              onChangeText={setPauseUntil}
              placeholder="Until: YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              maxLength={10}
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={pauseReason}
              onChangeText={setPauseReason}
              placeholder="Reason (optional)"
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.pauseActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowAddPause(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.addButton, addingPause && styles.saveButtonDisabled]}
                onPress={addPause}
                disabled={addingPause}
              >
                <Text style={styles.addButtonText}>{addingPause ? '…' : 'Add pause'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addPauseButton} onPress={() => setShowAddPause(true)}>
            <Text style={styles.addPauseButtonText}>+ Add pause</Text>
          </Pressable>
        )}
      </Section>

      <Section title="Account">
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Pressable style={styles.deleteAccountButton} onPress={deleteAccount}>
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </Pressable>
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 28 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 15, color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  chips: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  saveButton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 28 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  pauseHint: { fontSize: 14, color: '#9ca3af', marginBottom: 14 },
  pauseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 10 },
  pauseInfo: { flex: 1 },
  pauseDates: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pauseReason: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  deleteText: { fontSize: 18, color: '#9ca3af', fontWeight: '600' },
  noPauses: { fontSize: 14, color: '#9ca3af', marginBottom: 12 },

  addPauseForm: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginBottom: 12 },
  pauseActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  cancelButtonText: { fontSize: 15, color: '#374151' },
  addButton: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#22c55e', alignItems: 'center' },
  addButtonText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  addPauseButton: { borderWidth: 1.5, borderColor: '#22c55e', borderRadius: 12, padding: 14, alignItems: 'center', borderStyle: 'dashed' },
  addPauseButtonText: { fontSize: 15, color: '#22c55e', fontWeight: '600' },

  logoutButton: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  logoutText: { fontSize: 16, color: '#374151', fontWeight: '600' },
  deleteAccountButton: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  deleteAccountText: { fontSize: 16, color: '#dc2626', fontWeight: '600' },
});
