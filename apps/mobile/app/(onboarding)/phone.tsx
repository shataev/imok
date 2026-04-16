import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { PhoneInput } from '@/components/PhoneInput';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.startsWith('+') || phone.length < 8) {
      Alert.alert('Invalid number', 'Please enter your number with country code, e.g. +66812345678');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { phone });
      router.push({ pathname: '/(onboarding)/otp', params: { phone } });
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your phone number</Text>
      <Text style={styles.hint}>We'll send you a one-time code to verify it's you.</Text>
      <PhoneInput value={phone} onChange={setPhone} autoFocus />
      <View style={{ height: 32 }} />
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSendOtp} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send code'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 17, color: '#6b7280', marginBottom: 32, lineHeight: 26 },
  input: { fontSize: 24, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 12, marginBottom: 32, color: '#111827' },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
