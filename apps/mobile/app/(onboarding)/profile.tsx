import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [checkinTime, setCheckinTime] = useState('09:00');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/user/me', { name: name.trim(), checkinTime });
      router.replace('/(onboarding)/first-contact');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>About you</Text>
      <Text style={styles.hint}>This helps us personalise your check-ins.</Text>

      <Text style={styles.label}>Your name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John" autoFocus />

      <Text style={styles.label}>Daily check-in time</Text>
      <TextInput
        style={styles.input}
        value={checkinTime}
        onChangeText={setCheckinTime}
        placeholder="09:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Text style={styles.fieldHint}>Format: HH:MM (24h). Your local time.</Text>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Continue'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 32, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 17, color: '#6b7280', marginBottom: 32, lineHeight: 26 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { fontSize: 20, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 10, marginBottom: 8, color: '#111827' },
  fieldHint: { fontSize: 14, color: '#9ca3af', marginBottom: 28 },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
