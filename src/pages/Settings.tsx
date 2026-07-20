import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Switch, Platform, Alert, Linking,
  TextInput, Animated, KeyboardAvoidingView,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell, Database, Trash2, Shield, ChevronRight,
  Lock, CheckCircle, XCircle, AlertCircle,
  Eye, EyeOff, Key, ExternalLink,
  Zap, Plus, X, ChevronDown,
} from 'lucide-react-native';
import { db } from '../lib/db';

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// ── API Key storage keys ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  groq:      'libre_api_groq',
  openai:    'libre_api_openai',
  gemini:    'libre_api_gemini',
  anthropic: 'libre_api_anthropic',
  model:     'libre_ai_model',
  provider:  'libre_ai_provider',
};

const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq',
    desc: 'Free · Ultra fast · No credit card',
    color: '#f97316',
    bg: '#fff7ed',
    models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    signupUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_••••••••••••••••••••••••',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    desc: 'GPT-4o · Paid · Most capable',
    color: '#10b981',
    bg: '#ecfdf5',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    signupUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-••••••••••••••••••••••••',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    desc: 'Google AI · Free tier available',
    color: '#2563eb',
    bg: '#eff6ff',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    signupUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza••••••••••••••••••••••',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    desc: 'Claude · Excellent for documents',
    color: '#7c3aed',
    bg: '#f5f3ff',
    models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    signupUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-••••••••••••••••••',
  },
];

function StatusBadge({ status }: { status: PermStatus }) {
  const map: Record<PermStatus, { bg: string; color: string; icon: any; label: string }> = {
    granted:       { bg: '#ecfdf5', color: '#10b981', icon: CheckCircle, label: 'Granted'   },
    denied:        { bg: '#fef2f2', color: '#ef4444', icon: XCircle,     label: 'Denied'    },
    undetermined:  { bg: '#fff7ed', color: '#f97316', icon: AlertCircle, label: 'Not asked' },
    unavailable:   { bg: '#f8fafc', color: '#94a3b8', icon: AlertCircle, label: 'N/A'       },
  };
  const { bg, color, icon: Icon, label } = map[status];
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={color} />
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  text: { fontSize: 10, fontWeight: '800' },
});

// ── API Key Modal ─────────────────────────────────────────────────────────
function APIKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [apiKeys,          setApiKeys]          = useState<Record<string, string>>({});
  const [activeProvider,   setActiveProvider]   = useState(PROVIDERS[0].id);
  const [selectedModel,    setSelectedModel]    = useState(PROVIDERS[0].models[0]);
  const [showKey,          setShowKey]          = useState(false);
  const [testing,          setTesting]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [showModelDrop,    setShowModelDrop]    = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadKeys();
      Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const loadKeys = async () => {
    try {
      const keys: Record<string, string> = {};
      for (const p of PROVIDERS) {
        const k = await AsyncStorage.getItem(STORAGE_KEYS[p.id as keyof typeof STORAGE_KEYS] ?? '');
        if (k) keys[p.id] = k;
      }
      setApiKeys(keys);
      const provider = await AsyncStorage.getItem(STORAGE_KEYS.provider);
      const model    = await AsyncStorage.getItem(STORAGE_KEYS.model);
      if (provider) setActiveProvider(provider);
      if (model)    setSelectedModel(model);
    } catch {}
  };

  const provider = PROVIDERS.find(p => p.id === activeProvider)!;

  const saveKey = async () => {
    const key = apiKeys[activeProvider]?.trim() ?? '';
    if (!key) { Alert.alert('Empty Key', 'Enter an API key first.'); return; }
    setSaving(true);
    try {
      const storageKey = STORAGE_KEYS[activeProvider as keyof typeof STORAGE_KEYS];
      await AsyncStorage.setItem(storageKey, key);
      await AsyncStorage.setItem(STORAGE_KEYS.provider, activeProvider);
      await AsyncStorage.setItem(STORAGE_KEYS.model, selectedModel);
      Alert.alert('✓ Saved', `${provider.name} API key saved successfully.`);
    } catch { Alert.alert('Error', 'Could not save key.'); }
    finally { setSaving(false); }
  };

  const testKey = async () => {
    const key = apiKeys[activeProvider]?.trim() ?? '';
    if (!key) { Alert.alert('No Key', 'Enter an API key first.'); return; }
    setTesting(true);
    try {
      let res: any;
      if (activeProvider === 'groq' || activeProvider === 'openai') {
        const url = activeProvider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: selectedModel, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }),
        });
        res = await r.json();
        if (res.choices?.[0]?.message) Alert.alert('✓ Key Works!', `${provider.name} is connected and ready.`);
        else Alert.alert('Key Error', res.error?.message ?? 'Unexpected response.');
      } else if (activeProvider === 'gemini') {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] }) }
        );
        res = await r.json();
        if (res.candidates?.[0]) Alert.alert('✓ Key Works!', 'Gemini is connected and ready.');
        else Alert.alert('Key Error', res.error?.message ?? 'Unexpected response.');
      } else if (activeProvider === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: selectedModel, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] }),
        });
        res = await r.json();
        if (res.content?.[0]) Alert.alert('✓ Key Works!', 'Anthropic Claude is connected and ready.');
        else Alert.alert('Key Error', res.error?.message ?? 'Unexpected response.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message ?? 'Could not reach the API.');
    } finally { setTesting(false); }
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [800, 0] });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={ak.overlay}>
        <TouchableOpacity style={ak.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[ak.sheet, { transform: [{ translateY }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Handle + close */}
              <View style={ak.topRow}>
                <View style={ak.handle} />
                <TouchableOpacity style={ak.closeBtn} onPress={onClose}>
                  <X size={15} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <View style={ak.titleRow}>
                <View style={ak.titleIcon}>
                  <Key size={18} color="#fff" />
                </View>
                <View>
                  <Text style={ak.title}>AI API Keys</Text>
                  <Text style={ak.titleSub}>Add keys to power document AI</Text>
                </View>
              </View>

              {/* Provider tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ak.providerTabs}>
                {PROVIDERS.map(p => {
                  const hasKey   = !!(apiKeys[p.id]?.trim());
                  const isActive = activeProvider === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[ak.providerTab, isActive && { backgroundColor: p.bg, borderColor: p.color }]}
                      onPress={() => { setActiveProvider(p.id); setSelectedModel(p.models[0]); setShowKey(false); }}
                      activeOpacity={0.8}
                    >
                      {hasKey && <View style={[ak.keyDot, { backgroundColor: '#10b981' }]} />}
                      <Text style={[ak.providerTabText, isActive && { color: p.color, fontWeight: '800' }]}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Provider card */}
              <View style={[ak.providerCard, { borderColor: provider.bg }]}>
                {/* Description */}
                <View style={[ak.providerHeader, { backgroundColor: provider.bg }]}>
                  <View style={[ak.providerDot, { backgroundColor: provider.color }]} />
                  <Text style={[ak.providerName, { color: provider.color }]}>{provider.name}</Text>
                  <Text style={ak.providerDesc}>{provider.desc}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(provider.signupUrl)} style={ak.getKeyBtn}>
                    <ExternalLink size={11} color={provider.color} />
                    <Text style={[ak.getKeyText, { color: provider.color }]}>Get free key</Text>
                  </TouchableOpacity>
                </View>

                {/* Key input */}
                <View style={ak.inputSection}>
                  <Text style={ak.inputLabel}>API Key</Text>
                  <View style={ak.inputRow}>
                    <TextInput
                      style={ak.keyInput}
                      value={apiKeys[activeProvider] ?? ''}
                      onChangeText={v => setApiKeys(prev => ({ ...prev, [activeProvider]: v }))}
                      placeholder={provider.placeholder}
                      placeholderTextColor="#cbd5e1"
                      secureTextEntry={!showKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowKey(v => !v)} style={ak.eyeBtn}>
                      {showKey ? <EyeOff size={15} color="#94a3b8" /> : <Eye size={15} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Model picker */}
                <View style={ak.inputSection}>
                  <Text style={ak.inputLabel}>Model</Text>
                  <TouchableOpacity style={ak.modelBtn} onPress={() => setShowModelDrop(v => !v)} activeOpacity={0.8}>
                    <Zap size={13} color={provider.color} />
                    <Text style={ak.modelBtnText}>{selectedModel}</Text>
                    <ChevronDown size={13} color="#94a3b8" />
                  </TouchableOpacity>
                  {showModelDrop && (
                    <View style={ak.modelDropdown}>
                      {provider.models.map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[ak.modelOption, selectedModel === m && { backgroundColor: provider.bg }]}
                          onPress={() => { setSelectedModel(m); setShowModelDrop(false); }}
                        >
                          <Text style={[ak.modelOptionText, selectedModel === m && { color: provider.color, fontWeight: '700' }]}>{m}</Text>
                          {selectedModel === m && <CheckCircle size={13} color={provider.color} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={ak.actions}>
                  <TouchableOpacity
                    style={[ak.testBtn, { backgroundColor: provider.bg }]}
                    onPress={testKey}
                    disabled={testing}
                    activeOpacity={0.8}
                  >
                    <Text style={[ak.testBtnText, { color: provider.color }]}>
                      {testing ? 'Testing…' : 'Test Key'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ak.saveBtn, { backgroundColor: provider.color }]}
                    onPress={saveKey}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Text style={ak.saveBtnText}>{saving ? 'Saving…' : 'Save Key'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Status */}
                {apiKeys[activeProvider]?.trim() && (
                  <View style={ak.statusRow}>
                    <View style={ak.statusDot} />
                    <Text style={ak.statusText}>Key configured for {provider.name}</Text>
                  </View>
                )}
              </View>

              {/* All providers summary */}
              <Text style={ak.summaryLabel}>Configured Keys</Text>
              <View style={ak.summaryRow}>
                {PROVIDERS.map(p => {
                  const hasKey = !!(apiKeys[p.id]?.trim());
                  return (
                    <View key={p.id} style={[ak.summaryChip, { backgroundColor: hasKey ? p.bg : '#f8fafc' }]}>
                      <View style={[ak.summaryDot, { backgroundColor: hasKey ? p.color : '#cbd5e1' }]} />
                      <Text style={[ak.summaryChipText, { color: hasKey ? p.color : '#94a3b8' }]}>{p.name}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ak = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  backdrop:  { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '90%', minHeight: '60%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingHorizontal: 20, marginBottom: 4 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', flex: 1, marginRight: 8 },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 18 },
  titleIcon:{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  titleSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  providerTabs:    { paddingHorizontal: 22, gap: 8, paddingBottom: 16 },
  providerTab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: 'transparent',
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  keyDot:          { width: 6, height: 6, borderRadius: 3 },
  providerTabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  providerCard: {
    marginHorizontal: 16, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  providerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, flexWrap: 'wrap',
  },
  providerDot:  { width: 8, height: 8, borderRadius: 4 },
  providerName: { fontSize: 13, fontWeight: '900' },
  providerDesc: { fontSize: 11, color: '#64748b', flex: 1 },
  getKeyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  getKeyText:   { fontSize: 10, fontWeight: '800' },

  inputSection: { paddingHorizontal: 16, paddingTop: 14 },
  inputLabel:   { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden' },
  keyInput:     { flex: 1, fontSize: 13, color: '#1e293b', padding: 13, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  eyeBtn:       { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },

  modelBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 13 },
  modelBtnText:  { flex: 1, fontSize: 12, fontWeight: '600', color: '#1e293b' },
  modelDropdown: { backgroundColor: '#fff', borderRadius: 12, marginTop: 6, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  modelOption:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13 },
  modelOptionText: { fontSize: 12, color: '#475569' },

  actions:     { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 14 },
  testBtn:     { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  testBtnText: { fontSize: 12, fontWeight: '800' },
  saveBtn:     { flex: 2, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingBottom: 14 },
  statusDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10b981' },
  statusText: { fontSize: 10, color: '#10b981', fontWeight: '600' },

  summaryLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, paddingHorizontal: 22, marginBottom: 10 },
  summaryRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22 },
  summaryChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  summaryDot:   { width: 6, height: 6, borderRadius: 3 },
  summaryChipText: { fontSize: 11, fontWeight: '700' },
});

// ── Main Settings Page ────────────────────────────────────────────────────
export default function SettingsPage() {
  const [confirmClear,      setConfirmClear]      = useState(false);
  const [cleared,           setCleared]           = useState(false);
  const [notifications,     setNotifications]     = useState(false);
  const [storagePerm,       setStoragePerm]       = useState<PermStatus>('undetermined');
  const [notifPerm,         setNotifPerm]         = useState<PermStatus>('undetermined');
  const [requestingStorage, setRequestingStorage] = useState(false);
  const [requestingNotif,   setRequestingNotif]   = useState(false);
  const [showAPIModal,      setShowAPIModal]       = useState(false);
  const [configuredCount,   setConfiguredCount]   = useState(0);

  useEffect(() => { checkPermissions(); checkConfiguredKeys(); }, []);

  const checkConfiguredKeys = async () => {
    let count = 0;
    for (const p of PROVIDERS) {
      const k = await AsyncStorage.getItem(STORAGE_KEYS[p.id as keyof typeof STORAGE_KEYS] ?? '');
      if (k?.trim()) count++;
    }
    setConfiguredCount(count);
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setStoragePerm('granted');
      if ('Notification' in window) {
        const s = Notification.permission;
        setNotifPerm(s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'undetermined');
        setNotifications(s === 'granted');
      } else setNotifPerm('unavailable');
      return;
    }
    try { const m = await MediaLibrary.getPermissionsAsync(); setStoragePerm(m.status as PermStatus); } catch { setStoragePerm('unavailable'); }
    try {
      const n = await Notifications.getPermissionsAsync();
      const s = n.status === 'granted' ? 'granted' : n.status === 'denied' ? 'denied' : 'undetermined';
      setNotifPerm(s); setNotifications(s === 'granted');
    } catch { setNotifPerm('unavailable'); }
  };

  const requestStoragePerm = async () => {
    if (requestingStorage) return;
    setRequestingStorage(true);
    try {
      if (Platform.OS === 'web') { setStoragePerm('granted'); return; }
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') { setStoragePerm('granted'); Alert.alert('✓ Granted', 'Storage access enabled.'); }
      else if (!canAskAgain) { Alert.alert('Blocked', 'Enable in device Settings.', [{ text: 'Open Settings', onPress: () => Linking.openSettings() }, { text: 'Cancel', style: 'cancel' }]); setStoragePerm('denied'); }
      else setStoragePerm('denied');
    } catch {} finally { setRequestingStorage(false); }
  };

  const requestNotifPerm = async () => {
    if (requestingNotif) return;
    setRequestingNotif(true);
    try {
      if (Platform.OS === 'web') {
        if (!('Notification' in window)) return;
        const r = await Notification.requestPermission();
        const s = r === 'granted' ? 'granted' : r === 'denied' ? 'denied' : 'undetermined';
        setNotifPerm(s); setNotifications(s === 'granted'); return;
      }
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') { setNotifPerm('granted'); setNotifications(true); }
      else if (!canAskAgain) { Alert.alert('Blocked', 'Enable in device Settings.', [{ text: 'Open Settings', onPress: () => Linking.openSettings() }, { text: 'Cancel', style: 'cancel' }]); setNotifPerm('denied'); }
      else setNotifPerm('denied');
    } catch {} finally { setRequestingNotif(false); }
  };

  const clearAllData = async () => {
    try {
      await Promise.all([db.files.clear(), db.folders.clear(), (db as any).books?.clear?.()]);
      setConfirmClear(false); setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch { Alert.alert('Error', 'Failed to clear data.'); }
  };

  const PermButton = ({ status, onRequest, loading }: { status: PermStatus; onRequest: () => void; loading: boolean }) => {
    if (status === 'granted') return <StatusBadge status="granted" />;
    return (
      <TouchableOpacity style={[st.reqBtn, loading && { opacity: 0.6 }]} onPress={onRequest} disabled={loading}>
        <Text style={st.reqBtnText}>{loading ? 'Requesting…' : status === 'denied' ? 'Try Again' : 'Enable'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

      <View style={st.header}>
        <Text style={st.title}>Settings</Text>
        <Text style={st.subtitle}>Preferences & Integrations</Text>
      </View>

      {cleared && (
        <View style={st.successBanner}>
          <CheckCircle size={14} color="#059669" />
          <Text style={st.successText}>All data cleared successfully</Text>
        </View>
      )}

      {/* ── AI KEYS ── */}
      <Text style={st.sectionLabel}>AI INTEGRATION</Text>
      <TouchableOpacity style={st.aiCard} onPress={() => setShowAPIModal(true)} activeOpacity={0.88}>
        {/* Gradient overlay — darker on right */}
        <View style={st.aiCardOverlay} pointerEvents="none" />
        <View style={st.aiCardLeft}>
          <View style={st.aiCardIcon}>
            <Key size={20} color="#fff" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.aiCardTitle}>Document AI Keys</Text>
            <Text style={st.aiCardSub}>
              {configuredCount > 0
                ? `${configuredCount} provider${configuredCount > 1 ? 's' : ''} configured`
                : 'Tap to add your free API keys'}
            </Text>
          </View>
        </View>
        <View style={[st.aiCardBadge, configuredCount > 0 && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          {configuredCount > 0
            ? <Text style={st.aiCardBadgeText}>✓ Active</Text>
            : <Text style={st.aiCardBadgeText}>Set Up →</Text>}
        </View>
      </TouchableOpacity>

      {/* ── PREFERENCES ── */}
      <Text style={st.sectionLabel}>PREFERENCES</Text>
      <View style={st.card}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: '#eff6ff' }]}><Bell size={16} color="#3b82f6" /></View>
          <View style={st.rowInfo}><Text style={st.rowLabel}>Notifications</Text><Text style={st.rowDesc}>Archive alerts & reminders</Text></View>
          <Switch value={notifications} onValueChange={v => { if (v && notifPerm !== 'granted') requestNotifPerm(); else setNotifications(v); }} trackColor={{ false: '#e2e8f0', true: '#2563eb' }} thumbColor="#fff" />
        </View>
      </View>

      {/* ── STORAGE ── */}
      <Text style={st.sectionLabel}>STORAGE</Text>
      <View style={st.card}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: '#ecfdf5' }]}><Database size={16} color="#10b981" /></View>
          <View style={st.rowInfo}><Text style={st.rowLabel}>Local Storage</Text><Text style={st.rowDesc}>Files stored on your device</Text></View>
          <Text style={st.tagText}>Local</Text>
        </View>
        <View style={st.rowDiv} />
        <TouchableOpacity style={st.row} onPress={() => setConfirmClear(true)}>
          <View style={[st.iconBox, { backgroundColor: '#fef2f2' }]}><Trash2 size={16} color="#ef4444" /></View>
          <View style={st.rowInfo}><Text style={[st.rowLabel, { color: '#ef4444' }]}>Clear All Data</Text><Text style={st.rowDesc}>Permanently delete all files & folders</Text></View>
          <ChevronRight size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* ── PERMISSIONS ── */}
      <Text style={st.sectionLabel}>PERMISSIONS</Text>
      <View style={st.card}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: '#fff7ed' }]}><Lock size={16} color="#f97316" /></View>
          <View style={st.rowInfo}><Text style={st.rowLabel}>Storage / Media</Text><Text style={st.rowDesc}>Save files to device library</Text></View>
          <PermButton status={storagePerm} onRequest={requestStoragePerm} loading={requestingStorage} />
        </View>
        <View style={st.rowDiv} />
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: '#eff6ff' }]}><Bell size={16} color="#3b82f6" /></View>
          <View style={st.rowInfo}><Text style={st.rowLabel}>Notifications</Text><Text style={st.rowDesc}>Receive archive alerts</Text></View>
          <PermButton status={notifPerm} onRequest={requestNotifPerm} loading={requestingNotif} />
        </View>
      </View>

      {/* ── PRIVACY ── */}
      <Text style={st.sectionLabel}>PRIVACY</Text>
      <View style={st.card}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: '#f5f3ff' }]}><Shield size={16} color="#8b5cf6" /></View>
          <View style={st.rowInfo}><Text style={st.rowLabel}>Privacy First</Text><Text style={st.rowDesc}>Documents never leave your device · AI only sees text you share</Text></View>
          <View style={st.greenBadge}><Text style={st.greenBadgeText}>Local</Text></View>
        </View>
      </View>

      <View style={st.versionRow}>
        <View style={st.versionDot} />
        <Text style={st.versionText}>Libre Archival Node · v1.0.0</Text>
      </View>

      {/* ── Clear confirm ── */}
      <Modal visible={confirmClear} transparent animationType="fade">
        <View style={st.overlay}>
          <View style={st.dialog}>
            <View style={st.dialogIcon}><Trash2 size={24} color="#ef4444" /></View>
            <Text style={st.dialogTitle}>Clear All Data?</Text>
            <Text style={st.dialogSub}>All files and folders will be permanently deleted. This cannot be undone.</Text>
            <TouchableOpacity style={st.deleteBtn} onPress={clearAllData}><Text style={st.deleteBtnText}>Clear Everything</Text></TouchableOpacity>
            <TouchableOpacity style={st.cancelBtn} onPress={() => setConfirmClear(false)}><Text style={st.cancelBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── API Key Modal ── */}
      <APIKeyModal visible={showAPIModal} onClose={() => { setShowAPIModal(false); checkConfiguredKeys(); }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content:   { padding: 20, paddingBottom: 60 },
  header:    { marginBottom: 24 },
  title:     { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle:  { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 4, letterSpacing: 1 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14, marginBottom: 20 },
  successText:   { fontSize: 12, fontWeight: '700', color: '#059669' },
  sectionLabel:  { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 10, marginTop: 24, paddingLeft: 2 },

  aiCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f97316', borderRadius: 20, padding: 18,
    shadowColor: '#ea580c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 7,
  },
  aiCardOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: '50%', borderTopRightRadius: 20, borderBottomRightRadius: 20,
    backgroundColor: '#ea580c', opacity: 0.55,
  },
  aiCardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  aiCardIcon:    { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  aiCardTitle:   { fontSize: 14, fontWeight: '800', color: '#fff' },
  aiCardSub:     { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  aiCardBadge:   { backgroundColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  aiCardBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  rowDiv:  { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 16 },
  row:     { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowInfo: { flex: 1 },
  rowLabel:{ fontSize: 13, fontWeight: '700', color: '#1e293b' },
  rowDesc: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  tagText: { fontSize: 9, fontWeight: '700', color: '#94a3b8' },
  greenBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  greenBadgeText: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  reqBtn:     { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  reqBtnText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },

  versionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 36, gap: 6 },
  versionDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7c3aed' },
  versionText:{ fontSize: 10, color: '#cbd5e1', fontWeight: '600' },

  overlay:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog:     { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 28, padding: 28, alignItems: 'center' },
  dialogIcon: { width: 56, height: 56, backgroundColor: '#fef2f2', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  dialogTitle:{ fontSize: 16, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 },
  dialogSub:  { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  deleteBtn:  { backgroundColor: '#ef4444', width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  cancelBtn:  { height: 48, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cancelBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});
