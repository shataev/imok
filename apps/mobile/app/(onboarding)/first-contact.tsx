import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView, Platform, ActionSheetIOS,
} from 'react-native';
import { router } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { api } from '@/lib/api';
import { PhoneInput } from '@/components/PhoneInput';

export default function FirstContactScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to contacts in Settings.');
      return;
    }

    const result = await Contacts.presentContactPickerAsync();
    if (!result) return;

    const phoneNumbers = result.phoneNumbers ?? [];
    if (phoneNumbers.length === 0) {
      Alert.alert('No phone number', 'This contact has no phone number.');
      return;
    }

    const pickNumber = (number: string) => {
      const cleaned = number.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      setPhone(cleaned);
      const fullName = result.name
        || [result.firstName, result.lastName].filter(Boolean).join(' ')
        || '';
      setName(fullName);
    };

    if (phoneNumbers.length === 1) {
      pickNumber(phoneNumbers[0].number ?? '');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Choose a phone number',
          options: [...phoneNumbers.map(p => p.number ?? ''), 'Cancel'],
          cancelButtonIndex: phoneNumbers.length,
        },
        idx => {
          if (idx < phoneNumbers.length) pickNumber(phoneNumbers[idx].number ?? '');
        },
      );
    } else {
      pickNumber(phoneNumbers[0].number ?? '');
    }
  };

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

      <Pressable style={styles.pickButton} onPress={handlePickContact}>
        <Text style={styles.pickButtonText}>Choose from contacts</Text>
      </Pressable>

      <Text style={styles.divider}>or enter manually</Text>

      <Text style={styles.label}>Contact name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane (daughter)" />

      <Text style={styles.label}>Phone number</Text>
      <PhoneInput value={phone} onChange={setPhone} />

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
  pickButton: { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  pickButtonText: { fontSize: 17, fontWeight: '600', color: '#16a34a' },
  divider: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { fontSize: 20, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 10, marginBottom: 28, color: '#111827' },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
