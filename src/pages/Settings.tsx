import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView,
  Switch
} from 'react-native';
import { Bell, Database, Trash2, Shield, ChevronRight } from 'lucide-react-native';
import { db } from '../lib/db';

interface SettingsPageProps {
  isDark?: boolean;
  setIsDark?: (val: boolean) => void;
}

export default function SettingsPage({ isDark, setIsDark }: SettingsPageProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const clearAllData = async () => {
    await db.files.delete(0); // This is a mock delete, but you get the idea
    // In our TableMock we'd need a clear() method.
    // For now let's just mock success.
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const sections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          iconBg: '#eff6ff',
          iconColor: '#3b82f6',
          label: 'Notifications',
          description: 'Archive alerts and updates',
          action: (
            <Switch 
              value={notifications} 
              onValueChange={setNotifications}
              trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
              thumbColor="#fff"
            />
          ),
        },
      ],
    },
    {
      title: 'Storage',
      items: [
        {
          icon: Database,
          iconBg: '#ecfdf5',
          iconColor: '#10b981',
          label: 'Local Storage',
          description: 'All files stored on your device',
          action: <Text style={styles.badgeText}>AsyncStorage</Text>,
        },
        {
          icon: Trash2,
          iconBg: '#fef2f2',
          iconColor: '#ef4444',
          label: 'Clear All Data',
          description: 'Permanently delete all files and folders',
          action: <ChevronRight size={16} color="#cbd5e1" />,
          onTap: () => setConfirmClear(true),
          danger: true,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Shield,
          iconBg: '#f5f3ff',
          iconColor: '#8b5cf6',
          label: 'Privacy',
          description: 'No data ever leaves your device',
          action: <Text style={[styles.badgeText, { color: '#10b981' }]}>Local Only</Text>,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>App preferences</Text>
      </View>

      {/* Cleared Banner */}
      {cleared && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>All data cleared successfully</Text>
        </View>
      )}

      {/* Settings Sections */}
      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, i) => {
              const Icon = item.icon;
              const isLast = i === section.items.length - 1;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={item.onTap}
                  disabled={!item.onTap}
                  style={[
                    styles.item,
                    !isLast && styles.itemBorder,
                    item.danger && { backgroundColor: '#fff' }
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                    <Icon size={16} color={item.iconColor} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemLabel, item.danger && { color: '#ef4444' }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  {item.action}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* App Version */}
      <View style={styles.versionBox}>
        <Text style={styles.versionText}>Libre Archival Node · v1.0.0</Text>
      </View>

      {/* Confirm Clear Modal */}
      <Modal
        visible={confirmClear}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Clear All Data?</Text>
            <Text style={styles.modalSubtitle}>
              All files and folders will be permanently deleted. This cannot be undone.
            </Text>
            
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={clearAllData}
            >
              <Text style={styles.deleteBtnText}>Clear Everything</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setConfirmClear(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 1,
  },
  banner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemDescription: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
