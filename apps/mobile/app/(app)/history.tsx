import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import type { Checkin, CheckinStatus } from '@imok/shared';
import { api } from '@/lib/api';

const STATUS: Record<CheckinStatus, { color: string; bg: string; label: string; icon: string }> = {
  confirmed: { color: '#166534', bg: '#dcfce7', label: 'OK', icon: '✓' },
  pending:   { color: '#854d0e', bg: '#fef9c3', label: 'Missed', icon: '?' },
  escalated: { color: '#991b1b', bg: '#fee2e2', label: 'Escalated', icon: '!' },
  skipped:   { color: '#374151', bg: '#f3f4f6', label: 'Paused', icon: '—' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function HistoryScreen() {
  const [items, setItems] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const data = await api.get<Checkin[]>(
        `/checkins?from=${from.toISOString().slice(0, 10)}`,
      );
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No check-ins yet.</Text>
        <Text style={styles.emptySub}>Your history will appear here once check-ins start.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#22c55e" />
      }
      ListHeaderComponent={null}
      renderItem={({ item }) => {
        const s = STATUS[item.status];
        return (
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
              <Text style={[styles.badgeText, { color: s.color }]}>{s.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.date}>{formatDate(item.scheduledFor)}</Text>
              <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
            </View>
            {item.confirmedAt && (
              <Text style={styles.time}>
                {new Date(item.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  empty: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
  list: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeText: { fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  date: { fontSize: 16, fontWeight: '600', color: '#111827' },
  statusLabel: { fontSize: 14, marginTop: 2 },
  time: { fontSize: 14, color: '#9ca3af' },
});
