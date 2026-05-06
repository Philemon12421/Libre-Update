import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  StyleSheet, 
  TouchableOpacity,
  Linking
} from 'react-native';
import { Shield, HardDrive, Wifi, BookOpen, ExternalLink } from 'lucide-react-native';

const features = [
  {
    icon: HardDrive,
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    title: 'Offline First',
    description: 'All files stored locally on your device using AsyncStorage. No internet required.',
  },
  {
    icon: Shield,
    iconBg: '#ecfdf5',
    iconColor: '#10b981',
    title: 'Private by Default',
    description: 'Your data never leaves your device. Zero telemetry, zero tracking.',
  },
  {
    icon: Wifi,
    iconBg: '#f5f3ff',
    iconColor: '#8b5cf6',
    title: 'Book Discovery',
    description: 'Search millions of books via Google Books and Open Library APIs.',
  },
  {
    icon: BookOpen,
    iconBg: '#fffbeb',
    iconColor: '#f59e0b',
    title: 'Private Archive',
    description: 'Keep your digital library organized and accessible anywhere.',
  },
];

export default function AboutPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
        <Text style={styles.subtitle}>Libre Archival Node</Text>
      </View>

      {/* App Card */}
      <View style={styles.appCard}>
        <View style={styles.appIconBox}>
          <Image 
            source={{ uri: '/favicon.svg' }} 
            style={styles.appIcon} 
          />
        </View>
        <Text style={styles.appTitle}>LIBRE</Text>
        <Text style={styles.appSubtitle}>Archival Node</Text>
        <Text style={styles.appDescription}>
          A local-first file manager and book discovery tool. Your personal archive, offline and private.
        </Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.card}>
          {features.map((f, i) => {
            const Icon = f.icon;
            const isLast = i === features.length - 1;
            return (
              <View 
                key={i} 
                style={[styles.featureItem, !isLast && styles.itemBorder]}
              >
                <View style={[styles.iconBox, { backgroundColor: f.iconBg }]}>
                  <Icon size={16} color={f.iconColor} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDescription}>{f.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tech Stack */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built With</Text>
        <View style={styles.techStack}>
          {['React Native', 'Expo', 'TypeScript', 'AsyncStorage', 'Lucide Icons'].map(tech => (
            <View key={tech} style={styles.techBadge}>
              <Text style={styles.techText}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Links */}
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://github.com/Philemon12421')}
          style={styles.linkItem}
        >
          <View style={styles.linkIconBox}>
            <BookOpen size={16} color="#475569" />
          </View>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>GitHub</Text>
            <Text style={styles.linkSubtitle}>View source code</Text>
          </View>
          <ExternalLink size={14} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>
        Made with care · Open Source
      </Text>
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
  appCard: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  appIconBox: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#bfdbfe',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  appDescription: {
    fontSize: 12,
    color: '#dbeafe',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 20,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
  featureItem: {
    flexDirection: 'row',
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
    marginTop: 2,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  featureDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
  techStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  techText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  linkIconBox: {
    width: 36,
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  linkSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 8,
  },
});
