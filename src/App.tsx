import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar as RNStatusBar,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import {
  FileText,
  Folder as FolderIcon,
  Search,
  Settings as SettingsIcon,
  BookOpen,
  Plus,
  X,
} from 'lucide-react-native';

import FilesPage from './pages/Files';
import FoldersPage from './pages/Folders';
import BookSearch from './pages/BookSearch';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';
import Logo from './components/Logo';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about';

const MAIN_NAV: { id: Page; label: string; icon: any }[] = [
  { id: 'files',   label: 'Home',     icon: FileText  },
  { id: 'folders', label: 'Library',  icon: FolderIcon },
  { id: 'search',  label: 'Discover', icon: Search    },
  { id: 'settings',label: 'Settings', icon: SettingsIcon },
];

const MORE_NAV: { id: Page; label: string; icon: any }[] = [
  { id: 'about', label: 'About', icon: BookOpen },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('files');
  const [moreOpen, setMoreOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'files':    return <FilesPage />;
      case 'folders':  return <FoldersPage />;
      case 'search':   return <BookSearch />;
      case 'settings': return <SettingsPage />;
      case 'about':    return <AboutPage />;
      default:         return <FilesPage />;
    }
  };

  const handleMoreNav = (id: Page) => {
    setCurrentPage(id);
    setMoreOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setCurrentPage('files')}
          style={styles.logoContainer}
        >
          <View style={{ marginRight: 12 }}>
            <Logo size={36} />
          </View>
          <View>
            <Text style={styles.title}>LIBRE</Text>
            <Text style={styles.subtitle}>ARCHIVAL NODE</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.main}>{renderPage()}</View>

      {/* Bottom Navigation */}
      <View style={styles.navWrapper}>
        <BlurView intensity={60} tint="light" style={styles.navBar}>
          {MAIN_NAV.map((item) => {
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
                  <Icon
                    size={22}
                    color={isActive ? '#2563eb' : '#64748b'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Spacer for FAB */}
          <View style={styles.fabSpacer} />
        </BlurView>

        {/* Floating Plus Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setMoreOpen(true)}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* More Pages Modal */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMoreOpen(false)}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              {/* Handle */}
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>More</Text>

              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => handleMoreNav(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalIconBox}>
                      <Icon size={20} color="#2563eb" strokeWidth={2} />
                    </View>
                    <Text style={styles.modalItemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setMoreOpen(false)}
              >
                <X size={18} color="#64748b" strokeWidth={2} />
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </BlurView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 10 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 1,
    marginTop: 2,
  },
  main: {
    flex: 1,
  },

  // Nav
  navWrapper: {
    position: 'relative',
  },
  navBar: {
    flexDirection: 'row',
    height: 80,
    borderTopWidth: 1,
    borderTopColor: 'rgba(241,245,249,0.8)',
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navIconBox: {
    width: 46,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBoxActive: {
    backgroundColor: '#eff6ff',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 3,
    letterSpacing: 0.4,
  },
  navLabelActive: {
    color: '#2563eb',
  },
  fabSpacer: {
    width: 64,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalItemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
