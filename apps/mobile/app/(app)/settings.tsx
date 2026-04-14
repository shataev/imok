import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  // TODO (Week 7): check-in time, grace period, pause, delete account
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.placeholder}>Check-in time, grace period, pauses, and account settings.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  placeholder: { fontSize: 17, color: '#9ca3af' },
});
