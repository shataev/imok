import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>imok</Text>
      <Text style={styles.subtitle}>Your daily check-in.{'\n'}Peace of mind for those who care.</Text>
      <Pressable style={styles.button} onPress={() => router.push('/(onboarding)/phone')}>
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 56, fontWeight: '700', color: '#22c55e', marginBottom: 16 },
  subtitle: { fontSize: 20, textAlign: 'center', color: '#374151', marginBottom: 48, lineHeight: 30 },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 48 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
