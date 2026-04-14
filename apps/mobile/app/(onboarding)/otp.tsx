import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>('/auth/verify-otp', { phone, otp });
      await setTokens(res.accessToken, res.refreshToken);
      router.replace('/(onboarding)/profile');
    } catch {
      Alert.alert('Wrong code', 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.hint}>We sent a 6-digit code to {phone}</Text>
      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <Pressable style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]} onPress={handleVerify} disabled={loading || otp.length < 6}>
        <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 17, color: '#6b7280', marginBottom: 32, lineHeight: 26 },
  input: { fontSize: 36, letterSpacing: 8, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 12, marginBottom: 32, textAlign: 'center', color: '#111827' },
  button: { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
