import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActionSheetIOS, Platform, Modal, FlatList,
} from 'react-native';

interface Country {
  name: string;
  iso: string; // 2-letter country code
  code: string; // e.g. "+66"
}

const COUNTRIES: Country[] = [
  { name: 'Thailand', iso: 'TH', code: '+66' },
  { name: 'Russia', iso: 'RU', code: '+7' },
  { name: 'United States', iso: 'US', code: '+1' },
  { name: 'United Kingdom', iso: 'GB', code: '+44' },
  { name: 'Germany', iso: 'DE', code: '+49' },
  { name: 'France', iso: 'FR', code: '+33' },
  { name: 'Australia', iso: 'AU', code: '+61' },
  { name: 'Singapore', iso: 'SG', code: '+65' },
  { name: 'Japan', iso: 'JP', code: '+81' },
  { name: 'China', iso: 'CN', code: '+86' },
  { name: 'India', iso: 'IN', code: '+91' },
  { name: 'Indonesia', iso: 'ID', code: '+62' },
  { name: 'Malaysia', iso: 'MY', code: '+60' },
  { name: 'Philippines', iso: 'PH', code: '+63' },
  { name: 'Vietnam', iso: 'VN', code: '+84' },
  { name: 'South Korea', iso: 'KR', code: '+82' },
  { name: 'UAE', iso: 'AE', code: '+971' },
  { name: 'Netherlands', iso: 'NL', code: '+31' },
  { name: 'Italy', iso: 'IT', code: '+39' },
  { name: 'Spain', iso: 'ES', code: '+34' },
  { name: 'Canada', iso: 'CA', code: '+1' },
  { name: 'Ukraine', iso: 'UA', code: '+380' },
  { name: 'Poland', iso: 'PL', code: '+48' },
  { name: 'Sweden', iso: 'SE', code: '+46' },
  { name: 'Norway', iso: 'NO', code: '+47' },
  { name: 'Finland', iso: 'FI', code: '+358' },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Thailand

interface Props {
  value: string;
  onChange: (phone: string) => void;
  inputStyle?: object;
  autoFocus?: boolean;
}

export function PhoneInput({ value, onChange, inputStyle, autoFocus }: Props) {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [local, setLocal] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const internalChange = useRef(false);

  // Parse incoming value when it changes externally (e.g. contact picked from address book)
  useEffect(() => {
    if (internalChange.current) {
      internalChange.current = false;
      return;
    }
    if (!value) return;
    if (value.startsWith('+')) {
      // Sort by code length desc so "+380" matches before "+38"
      const matched = [...COUNTRIES]
        .sort((a, b) => b.code.length - a.code.length)
        .find(c => value.startsWith(c.code));
      if (matched) {
        setCountry(matched);
        setLocal(value.slice(matched.code.length));
      } else {
        setLocal(value.slice(1)); // unknown country code, keep digits
      }
    } else {
      // No country code prefix — treat as local number, keep selected country
      setLocal(value);
    }
  }, [value]);

  const handleLocalChange = (text: string) => {
    const cleaned = text.replace(/^\+?0*/, '');
    setLocal(cleaned);
    internalChange.current = true;
    onChange(country.code + cleaned);
  };

  const handleSelectCountry = (selected: Country) => {
    setCountry(selected);
    onChange(selected.code + local);
    setModalVisible(false);
  };

  const openPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...COUNTRIES.map(c => `${c.iso}  ${c.name}  ${c.code}`), 'Cancel'],
          cancelButtonIndex: COUNTRIES.length,
        },
        idx => {
          if (idx < COUNTRIES.length) handleSelectCountry(COUNTRIES[idx]);
        },
      );
    } else {
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.row}>
      <Pressable style={styles.countryPicker} onPress={openPicker}>
        <Text style={styles.iso}>{country.iso}</Text>
        <Text style={styles.code}>{country.code}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <TextInput
        style={[styles.input, inputStyle]}
        value={local}
        onChangeText={handleLocalChange}
        placeholder="812345678"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
        autoFocus={autoFocus}
      />

      {/* Android country picker modal */}
      {Platform.OS === 'android' && (
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <FlatList
            data={COUNTRIES}
            keyExtractor={c => c.code + c.name}
            renderItem={({ item }) => (
              <Pressable style={styles.modalItem} onPress={() => handleSelectCountry(item)}>
                <Text style={styles.modalFlag}>{item.iso}</Text>
                <Text style={styles.modalName}>{item.name}</Text>
                <Text style={styles.modalCode}>{item.code}</Text>
              </Pressable>
            )}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minWidth: 90,
    minHeight: 52,
    borderRightWidth: 1.5,
    borderRightColor: '#e5e7eb',
    gap: 4,
  },
  iso: { fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.5 },
  code: { fontSize: 15, color: '#111827', fontWeight: '600', marginLeft: 4 },
  caret: { fontSize: 10, color: '#9ca3af', marginLeft: 2 },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  modalFlag: { fontSize: 14, fontWeight: '700', color: '#374151', width: 32 },
  modalName: { flex: 1, fontSize: 16, color: '#111827' },
  modalCode: { fontSize: 15, color: '#6b7280' },
});
