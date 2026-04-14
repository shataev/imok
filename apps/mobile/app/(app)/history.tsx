import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  // TODO (Week 7): calendar view of past check-ins
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.placeholder}>Your check-in history will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  placeholder: { fontSize: 17, color: '#9ca3af' },
});
