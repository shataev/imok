import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, Modal, TextInput, ActivityIndicator, ActionSheetIOS, Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import type { Contact } from '@imok/shared';
import { api } from '@/lib/api';

interface ContactFormData {
  name: string;
  phone: string;
}

const EMPTY_FORM: ContactFormData = { name: '', phone: '' };

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await api.get<Contact[]>('/contacts');
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchContacts(); }, [fetchContacts]);

  const pickFromContacts = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow imok to access your contacts to quickly add an emergency contact.',
      );
      return;
    }

    const result = await Contacts.presentContactPickerAsync();
    if (!result) return;

    const phoneNumbers = result.phoneNumbers ?? [];
    if (phoneNumbers.length === 0) {
      Alert.alert('No phone number', 'This contact has no phone number saved.');
      return;
    }

    const name = result.name ?? '';

    if (phoneNumbers.length === 1) {
      const phone = (phoneNumbers[0]?.number ?? '').replace(/\s/g, '');
      setEditingContact(null);
      setForm({ name, phone });
      setModalVisible(true);
      return;
    }

    // Multiple numbers — let user pick
    const options = phoneNumbers.map((p) => `${p.label ?? 'phone'}: ${p.number ?? ''}`);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, 'Cancel'], cancelButtonIndex: options.length, title: 'Which number?' },
        (index) => {
          if (index === options.length) return;
          const phone = (phoneNumbers[index]?.number ?? '').replace(/\s/g, '');
          setEditingContact(null);
          setForm({ name, phone });
          setModalVisible(true);
        },
      );
    } else {
      // Android: use first number, user can edit manually
      const phone = (phoneNumbers[0]?.number ?? '').replace(/\s/g, '');
      setEditingContact(null);
      setForm({ name, phone });
      setModalVisible(true);
    }
  }, []);

  const openAdd = () => {
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({ name: contact.name, phone: contact.phone });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    if (!form.phone.startsWith('+') || form.phone.length < 8) {
      Alert.alert('Invalid number', 'Use format: +66812345678');
      return;
    }
    setSaving(true);
    try {
      if (editingContact) {
        const updated = await api.patch<Contact>(`/contacts/${editingContact.id}`, {
          name: form.name.trim(),
        });
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.post<Contact>('/contacts', {
          name: form.name.trim(),
          phone: form.phone,
          notifyViaSms: true,
        });
        setContacts((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contact: Contact) => {
    Alert.alert(
      'Remove contact',
      `Remove ${contact.name}? They will no longer be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/contacts/${contact.id}`);
              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
            } catch {
              Alert.alert('Error', 'Could not remove contact.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <Pressable style={styles.addButton} onPress={pickFromContacts}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No contacts yet.</Text>
          <Text style={styles.emptyHint}>Add someone who should be notified if you don't check in.</Text>
          <Pressable style={styles.addButton} onPress={pickFromContacts}>
            <Text style={styles.addButtonText}>Choose from contacts</Text>
          </Pressable>
          <Pressable onPress={openAdd} style={styles.manualLink}>
            <Text style={styles.manualLinkText}>or enter manually</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.contactRow}>
              <Pressable style={styles.contactInfo} onPress={() => openEdit(item)}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Remove</Text>
              </Pressable>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{editingContact ? 'Edit contact' : 'Add contact'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Jane (daughter)"
            autoFocus
          />

          {!editingContact && (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="+44 7700 900000"
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>They'll receive an SMS when you're added. No app needed.</Text>
            </>
          )}

          <View style={styles.modalButtons}>
            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  addButton: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 15, color: '#9ca3af', textAlign: 'center', marginBottom: 8 },
  manualLink: { paddingVertical: 8 },
  manualLinkText: { fontSize: 15, color: '#6b7280', textDecorationLine: 'underline' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 17, fontWeight: '600', color: '#111827' },
  contactPhone: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#ef4444', fontSize: 15 },
  separator: { height: 1, backgroundColor: '#f3f4f6' },
  modal: { flex: 1, padding: 32, backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { fontSize: 18, borderBottomWidth: 2, borderColor: '#22c55e', paddingVertical: 10, marginBottom: 8, color: '#111827' },
  hint: { fontSize: 14, color: '#9ca3af', marginBottom: 28 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 32 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { fontSize: 17, color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 12, backgroundColor: '#22c55e', paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
