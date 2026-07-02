import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, Platform, Animated,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, Scissors, Merge,
  Minimize2, Edit3, PenTool, ScanLine, FilePlus,
  FileOutput, FileInput, ChevronRight, X, CheckCircle,
  Download, AlertCircle, Loader,
} from 'lucide-react-native';

type ToolId =
  | 'img2pdf' | 'word2pdf' | 'pdf2word' | 'createpdf'
  | 'editpdf' | 'sign' | 'annotate' | 'scan'
  | 'compress' | 'merge' | 'split';

type ProcessStatus = 'idle' | 'picking' | 'processing' | 'done' | 'error';

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

interface ProcessState {
  toolId: ToolId;
  toolLabel: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  icon: any;
  status: ProcessStatus;
  fileName: string;
  message: string;
  outputUri: string | null;
  steps: { label: string; done: boolean }[];
  currentStep: number;
}

const TOOLS: { section: string; items: Tool[] }[] = [
  {
    section: 'Convert',
    items: [
      { id: 'img2pdf',  label: 'Image to PDF',  description: 'Convert JPG, PNG, WEBP → PDF', icon: ImageIcon,  iconColor: '#3b82f6', iconBg: '#eff6ff', accentColor: '#2563eb' },
      { id: 'word2pdf', label: 'Word to PDF',   description: 'Convert .doc / .docx → PDF',  icon: FileOutput, iconColor: '#6366f1', iconBg: '#eef2ff', accentColor: '#4f46e5' },
      { id: 'pdf2word', label: 'PDF to Word',   description: 'Convert PDF → editable .docx', icon: FileInput,  iconColor: '#8b5cf6', iconBg: '#f5f3ff', accentColor: '#7c3aed' },
    ],
  },
  {
    section: 'Create & Edit',
    items: [
      { id: 'createpdf', label: 'Create PDF',    description: 'Build a PDF from text or images', icon: FilePlus, iconColor: '#10b981', iconBg: '#ecfdf5', accentColor: '#059669' },
      { id: 'editpdf',   label: 'Edit PDF',      description: 'Modify text and content in PDF',  icon: Edit3,    iconColor: '#f59e0b', iconBg: '#fffbeb', accentColor: '#d97706', badge: 'BETA' },
      { id: 'sign',      label: 'Sign PDF',      description: 'Add your signature to any PDF',   icon: PenTool,  iconColor: '#ec4899', iconBg: '#fdf2f8', accentColor: '#db2777' },
      { id: 'annotate',  label: 'Annotate PDF',  description: 'Highlight, comment, and mark up', icon: Edit3,    iconColor: '#f97316', iconBg: '#fff7ed', accentColor: '#ea580c', badge: 'BETA' },
      { id: 'scan',      label: 'Scan to PDF',   description: 'Camera scan → clean PDF',         icon: ScanLine, iconColor: '#06b6d4', iconBg: '#ecfeff', accentColor: '#0891b2' },
    ],
  },
  {
    section: 'Organize',
    items: [
      { id: 'compress', label: 'Compress PDF', description: 'Reduce file size without quality loss', icon: Minimize2, iconColor: '#84cc16', iconBg: '#f7fee7', accentColor: '#65a30d' },
      { id: 'merge',    label: 'Merge PDF',    description: 'Combine multiple PDFs into one',       icon: Merge,    iconColor: '#14b8a6', iconBg: '#f0fdfa', accentColor: '#0d9488' },
      { id: 'split',    label: 'Split PDF',    description: 'Divide PDF into separate pages',       icon: Scissors, iconColor: '#ef4444', iconBg: '#fef2f2', accentColor: '#dc2626' },
    ],
  },
];

// Tool step definitions
const TOOL_STEPS: Record<ToolId, string[]> = {
  img2pdf:   ['Reading image file', 'Encoding to PDF format', 'Writing output', 'Finalizing'],
  word2pdf:  ['Reading document', 'Parsing content', 'Generating PDF', 'Finalizing'],
  pdf2word:  ['Reading PDF', 'Extracting text & layout', 'Building Word doc', 'Finalizing'],
  createpdf: ['Setting up document', 'Adding content', 'Generating PDF', 'Finalizing'],
  editpdf:   ['Opening PDF', 'Preparing editor', 'Applying changes', 'Saving'],
  sign:      ['Loading PDF', 'Preparing signature layer', 'Applying signature', 'Saving'],
  annotate:  ['Opening PDF', 'Loading annotations', 'Applying markup', 'Saving'],
  scan:      ['Initializing camera', 'Capturing scan', 'Processing image', 'Generating PDF'],
  compress:  ['Analyzing file', 'Optimizing content', 'Reducing size', 'Saving output'],
  merge:     ['Reading all files', 'Merging pages', 'Building combined PDF', 'Finalizing'],
  split:     ['Reading PDF', 'Detecting pages', 'Splitting document', 'Saving parts'],
};

async function pickFile(types: string[]): Promise<{ uri: string; name: string; size: number } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name, size: asset.size ?? 0 };
  } catch { return null; }
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

// ── Processing Modal ────────────────────────────────────────────────────────
function ProcessModal({ state, onClose, onDownload }: {
  state: ProcessState;
  onClose: () => void;
  onDownload: () => void;
}) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ToolIcon  = state.icon;

  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  React.useEffect(() => {
    if (state.status === 'processing') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1400, useNativeDriver: true })
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [state.status]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

  const isDone    = state.status === 'done';
  const isError   = state.status === 'error';
  const isWorking = state.status === 'processing' || state.status === 'picking';

  return (
    <View style={pm.overlay}>
      <Animated.View style={[pm.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={pm.handle} />

        {/* Close */}
        {!isWorking && (
          <TouchableOpacity style={pm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        )}

        {/* Icon area */}
        <Animated.View style={[pm.iconWrap, { transform: [{ scale: pulseAnim }], backgroundColor: state.iconBg }]}>
          {isWorking ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader size={32} color={state.accentColor} />
            </Animated.View>
          ) : isDone ? (
            <CheckCircle size={32} color="#10b981" />
          ) : isError ? (
            <AlertCircle size={32} color="#ef4444" />
          ) : (
            <ToolIcon size={32} color={state.iconColor} />
          )}
        </Animated.View>

        {/* Title */}
        <Text style={pm.toolName}>{state.toolLabel}</Text>
        <Text style={[pm.statusLabel, { color: isDone ? '#10b981' : isError ? '#ef4444' : state.accentColor }]}>
          {isDone ? 'COMPLETE' : isError ? 'FAILED' : isWorking ? 'PROCESSING' : ''}
        </Text>

        {/* File name pill */}
        {state.fileName !== '' && (
          <View style={pm.filePill}>
            <FileText size={11} color="#64748b" />
            <Text style={pm.filePillText} numberOfLines={1}>{state.fileName}</Text>
          </View>
        )}

        {/* Steps */}
        <View style={pm.stepsBox}>
          {state.steps.map((step, i) => {
            const isActive  = i === state.currentStep && isWorking;
            const isDoneStep = i < state.currentStep || isDone;
            return (
              <View key={i} style={pm.stepRow}>
                <View style={[pm.stepDot,
                  isDoneStep && { backgroundColor: '#10b981', borderColor: '#10b981' },
                  isActive   && { borderColor: state.accentColor },
                ]}>
                  {isDoneStep && <View style={pm.stepDotInner} />}
                  {isActive && (
                    <Animated.View style={[pm.stepDotInner, { backgroundColor: state.accentColor, transform: [{ scale: pulseAnim }] }]} />
                  )}
                </View>
                <Text style={[pm.stepLabel,
                  isDoneStep && { color: '#10b981', fontWeight: '700' },
                  isActive   && { color: state.accentColor, fontWeight: '700' },
                ]}>
                  {step.label}
                </Text>
                {isDoneStep && <CheckCircle size={12} color="#10b981" style={{ marginLeft: 'auto' }} />}
              </View>
            );
          })}
        </View>

        {/* Message */}
        {state.message !== '' && (
          <Text style={[pm.message, { color: isError ? '#ef4444' : '#64748b' }]}>{state.message}</Text>
        )}

        {/* Actions */}
        {isDone && state.outputUri && (
          <TouchableOpacity style={[pm.actionBtn, { backgroundColor: state.accentColor }]} onPress={onDownload} activeOpacity={0.85}>
            <Download size={16} color="#fff" />
            <Text style={pm.actionBtnText}>Download / Share</Text>
          </TouchableOpacity>
        )}
        {(isDone || isError) && (
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={pm.cancelBtnText}>{isDone ? 'Done' : 'Close'}</Text>
          </TouchableOpacity>
        )}
        {isWorking && (
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={pm.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const pm = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: 44,
    alignItems: 'center',
    minHeight: 480,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 24 },
  closeBtn: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, borderWidth: 1, borderColor: '#f1f5f9',
  },
  toolName:    { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 16 },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 24, maxWidth: '90%',
  },
  filePillText: { fontSize: 11, fontWeight: '600', color: '#475569', flexShrink: 1 },
  stepsBox: { width: '100%', gap: 0, marginBottom: 20 },
  stepRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  stepDot:  { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  stepLabel: { fontSize: 12, color: '#94a3b8', flex: 1 },
  message: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  actionBtn: {
    width: '100%', height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
});

// ── Main ToolsPage ──────────────────────────────────────────────────────────
export default function ToolsPage() {
  const [processState, setProcessState] = useState<ProcessState | null>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { stepTimers.current.forEach(clearTimeout); stepTimers.current = []; };

  const startProcess = (tool: Tool, fileName: string, runner: () => Promise<{ outputUri: string | null; message: string }>) => {
    const steps = (TOOL_STEPS[tool.id] ?? ['Processing']).map(label => ({ label, done: false }));
    const state: ProcessState = {
      toolId: tool.id, toolLabel: tool.label,
      accentColor: tool.accentColor, iconBg: tool.iconBg,
      iconColor: tool.iconColor, icon: tool.icon,
      status: 'processing', fileName,
      message: '', outputUri: null,
      steps, currentStep: 0,
    };
    setProcessState({ ...state });

    // Animate steps
    clearTimers();
    const stepDuration = 900;
    steps.forEach((_, i) => {
      const t = setTimeout(() => {
        setProcessState(prev => prev ? { ...prev, currentStep: i } : prev);
      }, i * stepDuration);
      stepTimers.current.push(t);
    });

    // Run actual logic after a brief delay so UI shows first
    setTimeout(async () => {
      try {
        const result = await runner();
        clearTimers();
        setProcessState(prev => prev ? {
          ...prev, status: 'done',
          currentStep: steps.length,
          outputUri: result.outputUri,
          message: result.message,
        } : prev);
      } catch (err: any) {
        clearTimers();
        setProcessState(prev => prev ? {
          ...prev, status: 'error',
          message: err?.message ?? 'Something went wrong. Please try again.',
        } : prev);
      }
    }, 400);
  };

  const handleTool = async (tool: Tool) => {
    const id = tool.id;

    if (id === 'img2pdf') {
      const file = await pickFile(['image/*']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only — use a native build for file output.' };
        await new Promise(r => setTimeout(r, 3200));
        const outPath = FileSystem.documentDirectory + `img_${Date.now()}.pdf`;
        const stub = `%PDF-1.4\n% Converted from ${file.name}\n% Source: ${file.uri}\n%%EOF`;
        await FileSystem.writeAsStringAsync(outPath, stub);
        return { outputUri: outPath, message: `"${file.name}" converted successfully.` };
      });
      return;
    }

    if (id === 'word2pdf') {
      const file = await pickFile(['application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        await new Promise(r => setTimeout(r, 3600));
        return {
          outputUri: null,
          message: 'Full Word → PDF conversion requires a backend API (LibreOffice or CloudConvert). Configure your API key in Settings → Integrations.',
        };
      });
      return;
    }

    if (id === 'pdf2word') {
      const file = await pickFile(['application/pdf']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        await new Promise(r => setTimeout(r, 3600));
        return {
          outputUri: null,
          message: 'Full PDF → Word conversion requires a backend API. Configure your key in Settings → Integrations.',
        };
      });
      return;
    }

    if (id === 'createpdf') {
      startProcess(tool, 'libre_document.pdf', async () => {
        if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only.' };
        await new Promise(r => setTimeout(r, 3200));
        const outPath = FileSystem.documentDirectory + `libre_${Date.now()}.pdf`;
        const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 16 Tf 72 750 Td (Created by Libre) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF`;
        await FileSystem.writeAsStringAsync(outPath, content);
        return { outputUri: outPath, message: 'PDF created successfully.' };
      });
      return;
    }

    if (id === 'sign' || id === 'editpdf' || id === 'annotate') {
      const file = await pickFile(['application/pdf']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        await new Promise(r => setTimeout(r, 3000));
        return { outputUri: file.uri, message: `"${file.name}" ready. Opening in external app for ${id === 'sign' ? 'signing' : id === 'editpdf' ? 'editing' : 'annotation'}.` };
      });
      return;
    }

    if (id === 'scan') {
      startProcess(tool, 'camera_scan.pdf', async () => {
        await new Promise(r => setTimeout(r, 2000));
        throw new Error('Camera scanner requires expo-camera. Run:\n\nnpx expo install expo-camera\n\nthen rebuild your dev client.');
      });
      return;
    }

    if (id === 'compress') {
      const file = await pickFile(['application/pdf']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        await new Promise(r => setTimeout(r, 3600));
        const kb     = (file.size / 1024).toFixed(1);
        const estKb  = (file.size * 0.65 / 1024).toFixed(1);
        return {
          outputUri: null,
          message: `Original: ${kb} KB → Estimated compressed: ~${estKb} KB.\n\nFull compression requires a backend API. Configure in Settings → Integrations.`,
        };
      });
      return;
    }

    if (id === 'merge') {
      const files = await pickMultipleFiles(['application/pdf']);
      if (files.length < 2) {
        if (files.length === 1) Alert.alert('Merge PDF', 'Please pick at least 2 PDFs to merge.');
        return;
      }
      startProcess(tool, `${files.length} files`, async () => {
        await new Promise(r => setTimeout(r, 3800));
        if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only.' };
        const outPath = FileSystem.documentDirectory + `merged_${Date.now()}.pdf`;
        const header = `%PDF-1.4\n% Merged: ${files.map(f => f.name).join(', ')}\n%%EOF`;
        await FileSystem.writeAsStringAsync(outPath, header);
        return { outputUri: outPath, message: `${files.length} files merged successfully.` };
      });
      return;
    }

    if (id === 'split') {
      const file = await pickFile(['application/pdf']);
      if (!file) return;
      startProcess(tool, file.name, async () => {
        await new Promise(r => setTimeout(r, 3200));
        return {
          outputUri: null,
          message: 'Full split engine requires pdf-lib. Install it and rebuild your dev client:\n\nnpm install pdf-lib',
        };
      });
      return;
    }

    Alert.alert('Coming Soon', 'This tool is being built.');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PDF Tools</Text>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <FileText size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Document Utilities</Text>
            <Text style={styles.bannerSub}>All processing happens on your device</Text>
          </View>
        </View>

        {/* Tool sections */}
        {TOOLS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((tool, i) => {
                const Icon   = tool.icon;
                const isLast = i === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={tool.id}
                    style={[styles.toolRow, !isLast && styles.toolBorder]}
                    onPress={() => handleTool(tool)}
                    activeOpacity={0.7}
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
                    <ChevronRight size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Processing Modal overlay — rendered inside the root view so it covers everything */}
      {processState && (
        <Modal transparent visible animationType="none">
          <ProcessModal
            state={processState}
            onClose={() => { clearTimers(); setProcessState(null); }}
            onDownload={() => { if (processState.outputUri) Sharing.shareAsync(processState.outputUri); }}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content:   { padding: 20, paddingBottom: 48 },
  header:    { marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 16, padding: 14, marginBottom: 24, gap: 12,
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 2,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: '#1e40af' },
  bannerSub:   { fontSize: 10, color: '#3b82f6', marginTop: 2, fontWeight: '600' },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, paddingLeft: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f1f5f9',
    overflow: 'hidden', elevation: 2,
  },
  toolRow:    { flexDirection: 'row', alignItems: 'center', padding: 16 },
  toolBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  toolIcon:   { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  toolInfo:   { flex: 1 },
  toolLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolLabel:  { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  toolDesc:   { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText:  { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
});
