import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Image,
  StyleSheet,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  FileText, 
  Folder as FolderIcon, 
  Search, 
  Settings as SettingsIcon, 
  BookOpen,
} from 'lucide-react-native';

import FilesPage from './pages/Files';
import FoldersPage from './pages/Folders';
import BookSearch from './pages/BookSearch';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('files');

  const navigation = [
    { id: 'files',    label: 'Home',     icon: FileText },
    { id: 'folders',  label: 'Library',  icon: FolderIcon },
    { id: 'search',   label: 'Discover', icon: Search },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about',    label: 'About',    icon: BookOpen },
  ];

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setCurrentPage('files')} 
          style={styles.logoContainer}
        >
          <View style={styles.logoBox}>
            <Image 
              source={{ uri: '/favicon.svg' }} 
              style={styles.logo} 
            />
          </View>
          <View>
            <Text style={styles.title}>LIBRE</Text>
            <Text style={styles.subtitle}>ARCHIVAL NODE</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        {renderPage()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setCurrentPage(item.id as Page)}
              style={styles.navItem}
            >
              <View style={[
                styles.navIconBox,
                isActive && styles.navIconBoxActive
              ]}>
                <Icon 
                  size={24} 
                  color={isActive ? '#2563eb' : '#94a3b8'} 
                  strokeWidth={isActive ? 2.5 : 1.8} 
                />
              </View>
              <Text style={[
                styles.navLabel,
                isActive && styles.navLabelActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
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
  navBar: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconBoxActive: {
    backgroundColor: '#eff6ff',
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navLabelActive: {
    color: '#2563eb',
  },
});
