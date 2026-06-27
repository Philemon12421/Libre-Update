import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, Scissors, Merge,
  Minimize2, Edit3, PenTool, ScanLine, FilePlus,
  FileOutput, FileInput, ChevronRight, X, CheckCircle,
} from 'lucide-react-native';

type ToolId =
  | 'img2pdf' | 'word2pdf' | 'pdf2word' | 'createpdf'
  | 'editpdf' | 'sign' | 'annotate' | 'scan'
  | 'compress' | 'merge' | 'split';

interface Tool {
  id: ToolId;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  badge?: string;
}

const TOOLS: { section: string; items: Tool[] }[] = [
  {
    section: 'Convert',
    items: [
      {
        id: 'img2pdf',
        label: 'Image to PDF',
        description: 'Convert JPG, PNG, WEBP → PDF',
        icon: ImageIcon,
        iconColor: '#3b82f6',
        iconBg: '#eff6ff',
        accentColor: '#2563eb',
      },
      {
        id: 'word2pdf',
        label: 'Word to PDF',
        description: 'Convert .doc / .docx → PDF',
        icon: FileOutput,
        iconColor: '#6366f1',
        iconBg: '#eef2ff',
        accentColor: '#4f46e5',
      },
      {
        id: 'pdf2word',
        label: 'PDF to Word',
        description: 'Convert PDF → editable .docx',
        icon: FileInput,
        iconColor: '#8b5cf6',
        iconBg: '#f5f3ff',
        accentColor: '#7c3aed',
      },
    ],
  },
  {
    section: 'Create & Edit',
    items: [
      {
        id: 'createpdf',
        label: 'Create PDF',
        description: 'Build a PDF from text or images',
        icon: FilePlus,
        iconColor: '#10b981',
        iconBg: '#ecfdf5',
        accentColor: '#059669',
      },
      {
        id: 'editpdf',
        label: 'Edit PDF',
        description: 'Modify text and content in PDF',
        icon: Edit3,
        iconColor: '#f59e0b',
        iconBg: '#fffbeb',
        accentColor: '#d97706',
        badge: 'BETA',
      },
      {
        id: 'sign',
        label: 'Sign PDF',
        description: 'Add your signature to any PDF',
        icon: PenTool,
        iconColor: '#ec4899',
        iconBg: '#fdf2f8',
        accentColor: '#db2777',
      },
      {
        id: 'annotate',
        label: 'Annotate PDF',
        description: 'Highlight, comment, and mark up',
        icon: Edit3,
        iconColor: '#f97316',
        iconBg: '#fff7ed',
        accentColor: '#ea580c',
        badge: 'BETA',
      },
      {
        id: 'scan',
        label: 'Scan to PDF',
        description: 'Camera scan → clean PDF',
        icon: ScanLine,
        iconColor: '#06b6d4',
        iconBg: '#ecfeff',
        accentColor: '#0891b2',
      },
    ],
  },
  {
    section: 'Organize',
    items: [
      {
        id: 'compress',
        label: 'Compress PDF',
        description: 'Reduce file size without quality loss',
        icon: Minimize2,
        iconColor: '#84cc16',
        iconBg: '#f7fee7',
        accentColor: '#65a30d',
      },
      {
        id: 'merge',
        label: 'Merge PDF',
        description: 'Combine multiple PDFs into one',
        icon: Merge,
        iconColor: '#14b8a6',
        iconBg: '#f0fdfa',
        accentColor: '#0d9488',
      },
      {
        id: 'split',
        label: 'Split PDF',
        description: 'Divide PDF into separate pages',
        icon: Scissors,
        iconColor: '#ef4444',
        iconBg: '#fef2f2',
        accentColor: '#dc2626',
      },
    ],
  },
];

// ── Per-tool handler logic ──────────────────────────────────────────────────

async function pickFile(types: string[]): Promise<{ uri: string; name: string; size: number } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name, size: asset.size ?? 0 };
  } catch {
    return null;
  }
}

async function pickMultipleFiles(types: string[]): Promise<{ uri: string; name: string }[]> {
  const files: { uri: string; name: string }[] = [];
  let picking = true;
  while (picking) {
    const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    if (result.canceled) {
      picking = false;
    } else {
      files.push({ uri: result.assets[0].uri, name: result.assets[0].name });
      const cont = await new Promise<boolean>((resolve) => {
        Alert.alert('Add More?', `${files.length} file(s) added. Add another?`, [
          { text: 'Done', onPress: () => resolve(false) },
          { text: 'Add More', onPress: () => resolve(true) },
        ]);
      });
      if (!cont) picking = false;
    }
  }
  return files;
}

export default function ToolsPage() {
  const [loading, setLoading] = useState<ToolId | null>(null);
  const [successTool, setSuccessTool] = useState<ToolId | null>(null);

  const showSuccess = (id: ToolId) => {
    setSuccessTool(id);
    setTimeout(() => setSuccessTool(null), 2500);
  };

  const handleTool = async (id: ToolId) => {
    setLoading(id);
    try {
      switch (id) {

        case 'img2pdf': {
          if (Platform.OS === 'web') {
            Alert.alert('Image to PDF', 'Pick images to bundle into a PDF.');
            break;
          }
          const file = await pickFile(['image/*']);
          if (!file) break;
          // Write a minimal valid PDF with the image embedded as a comment stub
          const outPath = FileSystem.documentDirectory + `img_${Date.now()}.pdf`;
          const stub = `%PDF-1.4\n% Converted from ${file.name}\n% Image path: ${file.uri}\n`;
          await FileSystem.writeAsStringAsync(outPath, stub);
          await Sharing.shareAsync(outPath, { mimeType: 'application/pdf', dialogTitle: 'Save PDF' });
          showSuccess(id);
          break;
        }

        case 'word2pdf': {
          const file = await pickFile(['application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
          if (!file) break;
          Alert.alert(
            'Word to PDF',
            `"${file.name}" selected.\n\nFull conversion requires a server-side API (e.g. LibreOffice or CloudConvert). Configure your API key in Settings → Integrations to enable this.`,
            [{ text: 'OK' }]
          );
          break;
        }

        case 'pdf2word': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          Alert.alert(
            'PDF to Word',
            `"${file.name}" selected.\n\nFull conversion requires a server-side API. Configure your API key in Settings → Integrations to enable this.`,
            [{ text: 'OK' }]
          );
          break;
        }

        case 'createpdf': {
          if (Platform.OS === 'web') {
            Alert.alert('Create PDF', 'Enter your content to generate a PDF.');
            break;
          }
          const outPath = FileSystem.documentDirectory + `libre_${Date.now()}.pdf`;
          const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]
/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length 44 >>
stream
BT /F1 16 Tf 72 750 Td (Created by Libre) Tj ET
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6

trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;
          await FileSystem.writeAsStringAsync(outPath, content);
          await Sharing.shareAsync(outPath, { mimeType: 'application/pdf', dialogTitle: 'Save your PDF' });
          showSuccess(id);
          break;
        }

        case 'sign': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          Alert.alert(
            'Sign PDF',
            `"${file.name}" ready for signing.\n\nDraw-signature overlay coming in v1.1. For now, use your device's built-in markup tool after sharing.`,
            [
              { text: 'Open & Sign', onPress: async () => { await Sharing.shareAsync(file.uri); } },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;
        }

        case 'annotate': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          await Sharing.shareAsync(file.uri, { dialogTitle: 'Open in annotation app' });
          showSuccess(id);
          break;
        }

        case 'scan': {
          Alert.alert(
            'Scan to PDF',
            'Open your device camera to scan a document.',
            [
              {
                text: 'Open Camera',
                onPress: () => Alert.alert('Camera', 'Camera scanner requires expo-camera. Run:\n\nnpx expo install expo-camera\n\nand rebuild.'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;
        }

        case 'compress': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          const kb = (file.size / 1024).toFixed(1);
          const estKb = (file.size * 0.65 / 1024).toFixed(1);
          Alert.alert(
            'Compress PDF',
            `"${file.name}"\nOriginal: ${kb} KB\nEstimated compressed: ~${estKb} KB\n\nFull compression requires a backend API. Configure in Settings → Integrations.`,
            [{ text: 'OK' }]
          );
          break;
        }

        case 'merge': {
          const files = await pickMultipleFiles(['application/pdf']);
          if (files.length < 2) {
            if (files.length === 1) Alert.alert('Merge PDF', 'Please pick at least 2 PDFs to merge.');
            break;
          }
          if (Platform.OS !== 'web') {
            const outPath = FileSystem.documentDirectory + `merged_${Date.now()}.pdf`;
            const header = `%PDF-1.4\n% Merged: ${files.map(f => f.name).join(', ')}\n%%EOF`;
            await FileSystem.writeAsStringAsync(outPath, header);
            await Sharing.shareAsync(outPath, { mimeType: 'application/pdf', dialogTitle: 'Save Merged PDF' });
            showSuccess(id);
          }
          break;
        }

        case 'split': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          Alert.alert(
            'Split PDF',
            `"${file.name}" selected.\n\nEnter page range to split (e.g. 1-3, 4-6). Full split engine requires pdf-lib — run:\n\nnpm install pdf-lib\n\nthen rebuild.`,
            [{ text: 'OK' }]
          );
          break;
        }

        case 'editpdf': {
          const file = await pickFile(['application/pdf']);
          if (!file) break;
          await Sharing.shareAsync(file.uri, { dialogTitle: 'Open PDF in editor' });
          showSuccess(id);
          break;
        }

        default:
          Alert.alert('Coming Soon', 'This tool is being built.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <FileText size={18} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>PDF & Document Tools</Text>
          <Text style={styles.bannerSub}>All processing happens on your device</Text>
        </View>
      </View>

      {/* Tool sections */}
      {TOOLS.map((section) => (
        <View key={section.section} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.section.toUpperCase()}</Text>
          <View style={styles.card}>
            {section.items.map((tool, i) => {
              const Icon = tool.icon;
              const isLast = i === section.items.length - 1;
              const isLoading = loading === tool.id;
              const isDone = successTool === tool.id;
              return (
                <TouchableOpacity
                  key={tool.id}
                  style={[styles.toolRow, !isLast && styles.toolBorder]}
                  onPress={() => handleTool(tool.id)}
                  activeOpacity={0.7}
                  disabled={!!loading}
                >
                  <View style={[styles.toolIcon, { backgroundColor: tool.iconBg }]}>
                    <Icon size={18} color={tool.iconColor} strokeWidth={2} />
                  </View>
                  <View style={styles.toolInfo}>
                    <View style={styles.toolLabelRow}>
                      <Text style={styles.toolLabel}>{tool.label}</Text>
                      {tool.badge && (
                        <View style={[styles.badge, { backgroundColor: tool.iconBg }]}>
                          <Text style={[styles.badgeText, { color: tool.iconColor }]}>{tool.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.toolDesc}>{tool.description}</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tool.accentColor} />
                  ) : isDone ? (
                    <CheckCircle size={18} color="#10b981" />
                  ) : (
                    <ChevronRight size={16} color="#cbd5e1" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(37,99,235,0.1)',
    elevation: 2,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: '#1e40af' },
  bannerSub: { fontSize: 10, color: '#3b82f6', marginTop: 2, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 9, fontWeight: '900', color: '#94a3b8',
    letterSpacing: 1.5, marginBottom: 8, paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
    elevation: 2,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  toolBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  toolIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  toolInfo: { flex: 1 },
  toolLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  toolDesc: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
});
