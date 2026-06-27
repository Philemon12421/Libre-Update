import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Platform, StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Folder as FolderIcon, Search,
  Settings as SettingsIcon, BookOpen, Plus, X, Wrench,
} from 'lucide-react-native';

import FilesPage    from './src/pages/Files';
import FoldersPage  from './src/pages/Folders';
import BookSearch   from './src/pages/BookSearch';
import SettingsPage from './src/pages/Settings';
import AboutPage    from './src/pages/About';
import ToolsPage    from './src/pages/Tools';
import Logo         from './src/components/Logo';
import SplashScreen     from './src/SplashScreen';
import OnboardingScreen from './src/OnboardingScreen';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about' | 'tools';
type AppState = 'splash' | 'onboarding' | 'app' | null;

const MAIN_NAV: { id: Page; label: string; icon: any }[] = [
  { id: 'files',    label: 'Home',     icon: FileText     },
  { id: 'folders',  label: 'Library',  icon: FolderIcon   },
  { id: 'search',   label: 'Discover', icon: Search       },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const MORE_NAV: { id: Page; label: string; icon: any; desc: string }[] = [
  { id: 'tools', label: 'PDF Tools',   icon: Wrench,   desc: 'Convert, merge, split, sign & more' },
  { id: 'about', label: 'About Libre', icon: BookOpen, desc: 'Version & app info'                 },
];

const ONBOARDING_KEY = 'libre_onboarding_done_v2';

export default function App() {
  const [appState, setAppState]       = useState<AppState>(null);
  const [currentPage, setCurrentPage] = useState<Page>('files');
  const [moreOpen, setMoreOpen]       = useState(false);

  useEffect(() => { setAppState('splash'); }, []);

  const handleSplashFinish = async () => {
    try {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setAppState(done === 'true' ? 'app' : 'onboarding');
    } catch {
      setAppState('onboarding');
    }
  };

  const handleOnboardingFinish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
    setAppState('app');
  };

  if (appState === null)         return null;
  if (appState === 'splash')     return <SafeAreaProvider><SplashScreen     onFinish={handleSplashFinish}     /></SafeAreaProvider>;
  if (appState === 'onboarding') return <SafeAreaProvider><OnboardingScreen onFinish={handleOnboardingFinish} /></SafeAreaProvider>;

  const renderPage = () => {
    switch (currentPage) {
      case 'files':    return <FilesPage />;
      case 'folders':  return <FoldersPage />;
      case 'search':   return <BookSearch />;
      case 'settings': return <SettingsPage />;
      case 'tools':    return <ToolsPage />;
      case 'about':    return <AboutPage />;
      default:         return <FilesPage />;
    }
  };

  const handleMoreNav = (id: Page) => { setCurrentPage(id); setMoreOpen(false); };
  const isCoreTab = MAIN_NAV.some(n => n.id === currentPage);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        {/* ── Header (no subtitle) ──────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentPage('files')} style={styles.logoRow} activeOpacity={0.8}>
            <Logo size={36} />
            <Text style={styles.appName}>LIBRE</Text>
          </TouchableOpacity>

          {!isCoreTab && (
            <View style={styles.pagePill}>
              <Text style={styles.pagePillText}>
                {MORE_NAV.find(n => n.id === currentPage)?.label ?? currentPage}
              </Text>
            </View>
          )}
        </View>

        {/* ── Page content ─────────────────────────────────────── */}
        <View style={styles.main}>{renderPage()}</View>

        {/* ── Bottom nav ───────────────────────────────────────── */}
        <View style={styles.navWrapper}>
          <BlurView intensity={70} tint="light" style={styles.navBar}>
            {MAIN_NAV.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setCurrentPage(item.id)}
                  style={styles.navItem}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
                    <Icon size={21} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={isActive ? 2.5 : 1.8} />
                  </View>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ width: 62 }} />
          </BlurView>

          <TouchableOpacity style={styles.fab} onPress={() => setMoreOpen(true)} activeOpacity={0.85}>
            <Plus size={26} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── More sheet ───────────────────────────────────────── */}
        <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setMoreOpen(false)}>
            <BlurView intensity={40} tint="dark" style={styles.backdropBlur}>
              <Pressable style={styles.sheet} onPress={() => {}}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetHeading}>More</Text>

                {MORE_NAV.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sheetItem, isActive && styles.sheetItemActive]}
                      onPress={() => handleMoreNav(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.sheetIconBox, isActive && { backgroundColor: '#eff6ff' }]}>
                        <Icon size={20} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetItemLabel, isActive && { color: '#2563eb' }]}>{item.label}</Text>
                        <Text style={styles.sheetItemDesc}>{item.desc}</Text>
                      </View>
                      {isActive && <View style={styles.activeDot} />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setMoreOpen(false)}>
                  <X size={16} color="#64748b" />
                  <Text style={styles.sheetCloseText}>Close</Text>
                </TouchableOpacity>
              </Pressable>
            </BlurView>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName:  { fontSize: 17, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
  pagePill: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#eff6ff', borderRadius: 20,
    borderWidth: 1, borderColor: '#dbeafe',
  },
  pagePillText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },

  main: { flex: 1 },

  navWrapper: { position: 'relative' },
  navBar: {
    flexDirection: 'row', height: 76,
    borderTopWidth: 1, borderTopColor: 'rgba(241,245,249,0.9)',
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    paddingHorizontal: 4, alignItems: 'center', overflow: 'hidden',
  },
  navItem:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  navIconBox:       { width: 44, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navIconBoxActive: { backgroundColor: '#eff6ff' },
  navLabel:         { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 3, letterSpacing: 0.3 },
  navLabelActive:   { color: '#2563eb' },

  fab: {
    position: 'absolute', right: 14, bottom: 14,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },

  backdrop:     { flex: 1, justifyContent: 'flex-end' },
  backdropBlur: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 22,
  },
  sheetHeading: {
    fontSize: 11, fontWeight: '900', color: '#94a3b8',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16,
  },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetItemActive:  { backgroundColor: '#fafcff' },
  sheetIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  sheetItemLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sheetItemDesc:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  activeDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2563eb' },
  sheetCloseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, gap: 6,
  },
  sheetCloseText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
});
