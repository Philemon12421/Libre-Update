import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Switch, Platform, Alert, Linking,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Bell, Database, Trash2, Shield, ChevronRight, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { db } from '../lib/db';

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function StatusBadge({ status }: { status: PermStatus }) {
  if (status === 'granted')
    return (
      <View style={[badge.wrap, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
        <CheckCircle size={11} color="#10b981" />
        <Text style={[badge.text, { color: '#10b981' }]}>Granted</Text>
      </View>
    );
  if (status === 'denied')
    return (
      <View style={[badge.wrap, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
        <XCircle size={11} color="#ef4444" />
        <Text style={[badge.text, { color: '#ef4444' }]}>Denied</Text>
      </View>
    );
  return (
    <View style={[badge.wrap, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
      <AlertCircle size={11} color="#f97316" />
      <Text style={[badge.text, { color: '#f97316' }]}>{status === 'undetermined' ? 'Not asked' : 'N/A'}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  text: { fontSize: 10, fontWeight: '800' },
});

export default function SettingsPage() {
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [storagePerm, setStoragePerm] = useState<PermStatus>('undetermined');
  const [notifPerm, setNotifPerm] = useState<PermStatus>('undetermined');
  const [requestingStorage, setRequestingStorage] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setStoragePerm('granted');
      if ('Notification' in window) {
        const s = Notification.permission;
        setNotifPerm(s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'undetermined');
        setNotifications(s === 'granted');
      } else {
        setNotifPerm('unavailable');
      }
      return;
    }
    try {
      const media = await MediaLibrary.getPermissionsAsync();
      setStoragePerm(media.status as PermStatus);
    } catch {
      setStoragePerm('unavailable');
    }
    try {
      const notif = await Notifications.getPermissionsAsync();
      const s = notif.status === 'granted' ? 'granted' : notif.status === 'denied' ? 'denied' : 'undetermined';
      setNotifPerm(s);
      setNotifications(s === 'granted');
    } catch {
      setNotifPerm('unavailable');
    }
  };

  useEffect(() => { checkPermissions(); }, []);

  const requestStoragePermission = async () => {
    if (requestingStorage) return;
    setRequestingStorage(true);
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Storage', 'Storage access is always available on web.');
        setStoragePerm('granted');
        return;
      }
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        setStoragePerm('granted');
        Alert.alert('✓ Storage Access', 'Libre can now save files to your device library.');
      } else if (!canAskAgain) {
        Alert.alert(
          'Permission Blocked',
          'Storage access was permanently denied. Open your device Settings to enable it for Libre.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setStoragePerm('denied');
      } else {
        setStoragePerm('denied');
        Alert.alert('Denied', 'Storage access was not granted. You can try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not request storage permission.');
    } finally {
      setRequestingStorage(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (requestingNotif) return;
    setRequestingNotif(true);
    try {
      if (Platform.OS === 'web') {
        if (!('Notification' in window)) { Alert.alert('Unsupported', 'Notifications not supported here.'); return; }
        const result = await Notification.requestPermission();
        const s = result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'undetermined';
        setNotifPerm(s); setNotifications(s === 'granted');
        return;
      }
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifPerm('granted'); setNotifications(true);
        Alert.alert('✓ Notifications', 'You will receive archive alerts.');
      } else if (!canAskAgain) {
        Alert.alert(
          'Permission Blocked',
          'Notification permission was permanently denied. Enable it in your device Settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setNotifPerm('denied');
      } else {
        setNotifPerm('denied');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRequestingNotif(false);
    }
  };

  const clearAllData = async () => {
    try {
      await Promise.all([db.files.clear(), db.folders.clear(), (db as any).books?.clear?.()]);
      setConfirmClear(false); setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch {
      Alert.alert('Error', 'Failed to clear data.');
    }
  };

  const PermButton = ({ status, onRequest, loading }: { status: PermStatus; onRequest: () => void; loading: boolean }) => {
    if (status === 'granted') return <StatusBadge status="granted" />;
    return (
      <TouchableOpacity
        style={[styles.reqBtn, loading && { opacity: 0.6 }]}
        onPress={onRequest}
        disabled={loading}
      >
        <Text style={styles.reqBtnText}>{loading ? 'Requesting...' : status === 'denied' ? 'Try Again' : 'Request'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>App Preferences</Text>
      </View>

      {cleared && (
        <View style={styles.successBanner}>
          <CheckCircle size={14} color="#059669" />
          <Text style={styles.successText}>All data cleared successfully</Text>
        </View>
      )}

      {/* Preferences */}
      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
            <Bell size={16} color="#3b82f6" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Text style={styles.rowDesc}>Archive alerts & updates</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={(val) => {
              if (val && notifPerm !== 'granted') requestNotificationPermission();
              else setNotifications(val);
            }}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Storage */}
      <Text style={styles.sectionLabel}>STORAGE</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
            <Database size={16} color="#10b981" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Local Storage</Text>
            <Text style={styles.rowDesc}>Files stored on your device</Text>
          </View>
          <Text style={styles.badge}>AsyncStorage</Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={() => setConfirmClear(true)}>
          <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
            <Trash2 size={16} color="#ef4444" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Clear All Data</Text>
            <Text style={styles.rowDesc}>Permanently delete all files & folders</Text>
          </View>
          <ChevronRight size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Permissions */}
      <Text style={styles.sectionLabel}>PERMISSIONS</Text>
      <View style={styles.card}>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
            <Lock size={16} color="#f97316" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Storage / Media</Text>
            <Text style={styles.rowDesc}>Save files to device library</Text>
          </View>
          <PermButton status={storagePerm} onRequest={requestStoragePermission} loading={requestingStorage} />
        </View>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
            <Bell size={16} color="#3b82f6" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Text style={styles.rowDesc}>Receive archive alerts</Text>
          </View>
          <PermButton status={notifPerm} onRequest={requestNotificationPermission} loading={requestingNotif} />
        </View>
      </View>

      {/* Privacy */}
      <Text style={styles.sectionLabel}>PRIVACY</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#f5f3ff' }]}>
            <Shield size={16} color="#8b5cf6" />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Privacy</Text>
            <Text style={styles.rowDesc}>No data ever leaves your device</Text>
          </View>
          <View style={styles.greenBadge}>
            <Text style={styles.greenBadgeText}>Local Only</Text>
          </View>
        </View>
      </View>

      <View style={styles.versionRow}>
        <View style={styles.versionDot} />
        <Text style={styles.versionText}>Libre Archival Node · v1.0.0</Text>
      </View>

      {/* Confirm clear modal */}
      <Modal visible={confirmClear} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIconBox}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <Text style={styles.dialogTitle}>Clear All Data?</Text>
            <Text style={styles.dialogSub}>All files and folders will be permanently deleted. This cannot be undone.</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={clearAllData}>
              <Text style={styles.deleteBtnText}>Clear Everything</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmClear(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  subtitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#d1fae5',
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  successText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  sectionLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginTop: 24, paddingLeft: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9',
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  rowDesc: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  badge: { fontSize: 9, fontWeight: '700', color: '#94a3b8' },
  greenBadge: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  greenBadgeText: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  reqBtn: {
    backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, alignItems: 'center',
  },
  reqBtnText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 6 },
  versionDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#3b82f6' },
  versionText: { fontSize: 10, color: '#cbd5e1', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  dialogIconBox: { width: 56, height: 56, backgroundColor: '#fef2f2', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 },
  dialogSub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  deleteBtn: { backgroundColor: '#ef4444', width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cancelBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});
