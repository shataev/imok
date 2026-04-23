import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import type { CheckinStatus } from '@imok/shared';
import { api } from '@/lib/api';

interface TodayCheckin {
  status: CheckinStatus;
  scheduledFor: string;
}

const STATUS_CONFIG: Record<CheckinStatus, { bg: string; label: string; color: string }> = {
  pending:   { bg: '#fef9c3', label: "Haven't checked in yet", color: '#854d0e' },
  confirmed: { bg: '#dcfce7', label: "You're checked in for today", color: '#166534' },
  escalated: { bg: '#fee2e2', label: 'Your contacts have been notified', color: '#991b1b' },
  skipped:   { bg: '#f3f4f6', label: 'Check-in paused today', color: '#374151' },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const [checkin, setCheckin] = useState<TodayCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [offline, setOffline] = useState(false);

  const fetchToday = async () => {
    try {
      const data = await api.get<TodayCheckin>('/checkins/today');
      setCheckin(data);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const data = await api.post<TodayCheckin>('/checkins/confirm', {});
      setCheckin(data);
    } catch {
      Alert.alert(
        'Could not check in',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => { void fetchToday(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  if (offline) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>📡</Text>
        <Text style={styles.offlineTitle}>No connection</Text>
        <Text style={styles.offlineHint}>Check your internet and try again.</Text>
        <Pressable style={styles.retryButton} onPress={() => { setLoading(true); void fetchToday(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const noCheckinToday = !checkin?.scheduledFor;
  const statusCfg = noCheckinToday
    ? { bg: '#f9fafb', label: 'No check-in scheduled yet', color: '#9ca3af' }
    : STATUS_CONFIG[checkin!.status];

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting()}</Text>

      <View style={[styles.statusCard, { backgroundColor: statusCfg.bg }]}>
        <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
      </View>

      {checkin?.status === 'pending' && checkin?.scheduledFor && (
        <Pressable style={[styles.okButton, confirming && styles.okButtonDisabled]} onPress={handleConfirm} disabled={confirming}>
          <Text style={styles.okButtonText}>{confirming ? '...' : "I'm OK"}</Text>
        </Pressable>
      )}

      <Text style={styles.nextCheckin}>
        {checkin?.scheduledFor
          ? `Check-in at ${new Date(checkin.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 32, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  greeting: { fontSize: 22, color: '#6b7280', marginBottom: 24 },
  statusCard: { borderRadius: 20, padding: 24, width: '100%', marginBottom: 40, alignItems: 'center' },
  statusLabel: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  okButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 40,
  },
  okButtonDisabled: { opacity: 0.6 },
  okButtonText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  nextCheckin: { fontSize: 15, color: '#9ca3af' },
  offlineIcon: { fontSize: 48, marginBottom: 16 },
  offlineTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
  offlineHint: { fontSize: 15, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
