import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';

export default function FirstContactScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    if (!phone.startsWith('+') || phone.length < 8) {
      Alert.alert('Invalid number', 'Please enter a number with country code, e.g. +44 7700 900000');
      return;
    }
    setLoading(true);
    try {
      await api.post('/contacts', { name: name.trim(), phone, notifyViaSms: true });
      router.replace('/(app)/home');
    } catch {
      Alert.alert('Error', 'Could not add contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add your first contact</Text>
      <Text style={styles.hint}>
        If you don't check in, we'll send them an SMS.{'\n'}They don't need the app.
      </Text>

      <Text style={styles.label}>Contact name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane (daughter)" autoFocus />

      <Text style={styles.label}>Phone number</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+44 7700 900000" keyboardType="phone-pad" />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAdd} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Adding…' : "I'm ready"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 32, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 17, color: '#6b7280', marginBottom: 32, lineHeight: 26 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { fontSize: 20, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 10, marginBottom: 28, color: '#111827' },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
