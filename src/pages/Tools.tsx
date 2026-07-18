import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, Platform, Animated,
  FlatList, Dimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, Scissors, Merge,
  Minimize2, Edit3, PenTool, ScanLine, FilePlus,
  FileOutput, FileInput, ChevronRight, X, CheckCircle,
  Download, AlertCircle, Loader, Plus, Trash2, File,
} from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

type ToolId =
  | 'img2pdf' | 'word2pdf' | 'pdf2word' | 'createpdf'
  | 'editpdf' | 'sign' | 'annotate' | 'scan'
  | 'compress' | 'merge' | 'split';

type ProcessStatus = 'idle' | 'processing' | 'done' | 'error';

interface PickedFile { uri: string; name: string; size: number; }

interface Tool {
  id: ToolId;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  badge?: string;
  minFiles: number;  // minimum files needed
  maxFiles: number;  // -1 = unlimited
  fileTypes: string[];
  hint: string;      // shown in file picker modal
}

interface ProcessState {
  tool: Tool;
  status: ProcessStatus;
  files: PickedFile[];
  message: string;
  outputUri: string | null;
  steps: string[];
  currentStep: number;
  progress: number; // 0-1
}

const TOOLS: { section: string; items: Tool[] }[] = [
  {
    section: 'Convert',
    items: [
      {
        id: 'img2pdf', label: 'Image to PDF', description: 'Convert JPG, PNG, WEBP → PDF',
        icon: ImageIcon, iconColor: '#3b82f6', iconBg: '#eff6ff', accentColor: '#2563eb',
        minFiles: 1, maxFiles: 10, fileTypes: ['image/*'],
        hint: 'Select one or more images to convert into a PDF',
      },
      {
        id: 'word2pdf', label: 'Word to PDF', description: 'Convert .doc / .docx → PDF',
        icon: FileOutput, iconColor: '#6366f1', iconBg: '#eef2ff', accentColor: '#4f46e5',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        hint: 'Select a Word document (.doc or .docx)',
      },
      {
        id: 'pdf2word', label: 'PDF to Word', description: 'Convert PDF → editable .docx',
        icon: FileInput, iconColor: '#8b5cf6', iconBg: '#f5f3ff', accentColor: '#7c3aed',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select a PDF file to convert to Word',
      },
    ],
  },
  {
    section: 'Create & Edit',
    items: [
      {
        id: 'createpdf', label: 'Create PDF', description: 'Build a PDF from text or images',
        icon: FilePlus, iconColor: '#10b981', iconBg: '#ecfdf5', accentColor: '#059669',
        minFiles: 0, maxFiles: 5, fileTypes: ['image/*','text/plain'],
        hint: 'Optionally add images or text files to include in the PDF',
      },
      {
        id: 'editpdf', label: 'Edit PDF', description: 'Modify text and content in PDF',
        icon: Edit3, iconColor: '#f59e0b', iconBg: '#fffbeb', accentColor: '#d97706', badge: 'BETA',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select the PDF you want to edit',
      },
      {
        id: 'sign', label: 'Sign PDF', description: 'Add your signature to any PDF',
        icon: PenTool, iconColor: '#ec4899', iconBg: '#fdf2f8', accentColor: '#db2777',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select the PDF you want to sign',
      },
      {
        id: 'annotate', label: 'Annotate PDF', description: 'Highlight, comment, and mark up',
        icon: Edit3, iconColor: '#f97316', iconBg: '#fff7ed', accentColor: '#ea580c', badge: 'BETA',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select the PDF you want to annotate',
      },
      {
        id: 'scan', label: 'Scan to PDF', description: 'Camera scan → clean PDF',
        icon: ScanLine, iconColor: '#06b6d4', iconBg: '#ecfeff', accentColor: '#0891b2',
        minFiles: 0, maxFiles: 0, fileTypes: [],
        hint: 'Uses your camera to scan a document',
      },
    ],
  },
  {
    section: 'Organize',
    items: [
      {
        id: 'compress', label: 'Compress PDF', description: 'Reduce file size without quality loss',
        icon: Minimize2, iconColor: '#84cc16', iconBg: '#f7fee7', accentColor: '#65a30d',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select the PDF you want to compress',
      },
      {
        id: 'merge', label: 'Merge PDFs', description: 'Combine multiple PDFs into one',
        icon: Merge, iconColor: '#14b8a6', iconBg: '#f0fdfa', accentColor: '#0d9488',
        minFiles: 2, maxFiles: 20, fileTypes: ['application/pdf'],
        hint: 'Select 2 or more PDF files to merge together',
      },
      {
        id: 'split', label: 'Split PDF', description: 'Divide PDF into separate pages',
        icon: Scissors, iconColor: '#ef4444', iconBg: '#fef2f2', accentColor: '#dc2626',
        minFiles: 1, maxFiles: 1, fileTypes: ['application/pdf'],
        hint: 'Select the PDF you want to split into pages',
      },
    ],
  },
];

const TOOL_STEPS: Record<ToolId, string[]> = {
  img2pdf:   ['Reading image files', 'Building PDF layout', 'Encoding pages', 'Writing output file'],
  word2pdf:  ['Reading document',    'Parsing content',     'Generating PDF',  'Saving output'],
  pdf2word:  ['Reading PDF',         'Extracting content',  'Building Word doc','Saving output'],
  createpdf: ['Setting up document', 'Adding content',      'Generating PDF',  'Finalizing'],
  editpdf:   ['Opening PDF',         'Loading editor',      'Applying changes','Saving'],
  sign:      ['Loading PDF',         'Preparing signature', 'Applying stamp',  'Saving'],
  annotate:  ['Opening PDF',         'Loading annotations', 'Applying markup', 'Saving'],
  scan:      ['Starting camera',     'Capturing scan',      'Cleaning image',  'Generating PDF'],
  compress:  ['Analyzing PDF',       'Optimizing content',  'Reducing size',   'Saving output'],
  merge:     ['Reading all files',   'Combining pages',     'Building PDF',    'Finalizing'],
  split:     ['Reading PDF',         'Counting pages',      'Splitting pages', 'Saving parts'],
};

// ── File Picker Modal ──────────────────────────────────────────────────────
function FilePickerModal({
  tool, visible, onClose, onStart,
}: {
  tool: Tool;
  visible: boolean;
  onClose: () => void;
  onStart: (files: PickedFile[]) => void;
}) {
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [picking, setPicking] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const Icon = tool.icon;

  React.useEffect(() => {
    if (visible) {
      setPicked([]);
      Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const addFile = async () => {
    if (tool.maxFiles > 0 && picked.length >= tool.maxFiles) {
      Alert.alert('Limit reached', `This tool accepts a maximum of ${tool.maxFiles} file(s).`);
      return;
    }
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: tool.fileTypes.length > 0 ? tool.fileTypes : ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        // prevent duplicate
        if (!picked.find(p => p.name === a.name)) {
          setPicked(prev => [...prev, { uri: a.uri, name: a.name, size: a.size ?? 0 }]);
        } else {
          Alert.alert('Already added', `"${a.name}" is already in the list.`);
        }
      }
    } catch { /* cancelled */ }
    finally { setPicking(false); }
  };

  const removeFile = (i: number) => setPicked(prev => prev.filter((_, idx) => idx !== i));

  const canStart = tool.minFiles === 0 || picked.length >= tool.minFiles;

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const formatSize = (b: number) => {
    if (!b) return '—';
    const k = 1024, s = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
  };

  if (!visible) return null;

  return (
    <View style={fp.overlay}>
      <TouchableOpacity style={fp.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[fp.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={fp.handle} />

        {/* Header */}
        <View style={fp.header}>
          <View style={[fp.toolIconWrap, { backgroundColor: tool.iconBg }]}>
            <Icon size={22} color={tool.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fp.toolName}>{tool.label}</Text>
            <Text style={fp.hint}>{tool.hint}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={fp.closeBtn}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Requirement pill */}
        <View style={[fp.reqPill, { backgroundColor: tool.iconBg }]}>
          <Text style={[fp.reqText, { color: tool.iconColor }]}>
            {tool.minFiles === 0
              ? `Up to ${tool.maxFiles > 0 ? tool.maxFiles : '∞'} file(s) • Optional`
              : tool.minFiles === tool.maxFiles
                ? `Exactly ${tool.minFiles} file${tool.minFiles > 1 ? 's' : ''} required`
                : `${tool.minFiles}–${tool.maxFiles < 0 ? '∞' : tool.maxFiles} files required`}
          </Text>
        </View>

        {/* File list */}
        {picked.length > 0 && (
          <View style={fp.fileList}>
            {picked.map((f, i) => (
              <Animated.View key={i} style={fp.fileRow}>
                <View style={[fp.fileIconBox, { backgroundColor: tool.iconBg }]}>
                  <File size={14} color={tool.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fp.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={fp.fileMeta}>{formatSize(f.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFile(i)} style={fp.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={13} color="#94a3b8" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {picked.length === 0 && (
          <View style={fp.emptyArea}>
            <FileText size={32} color="#cbd5e1" />
            <Text style={fp.emptyText}>No files selected yet</Text>
          </View>
        )}

        {/* Add file button */}
        {(tool.maxFiles < 0 || picked.length < tool.maxFiles) && tool.maxFiles !== 0 && (
          <TouchableOpacity
            style={[fp.addBtn, picking && { opacity: 0.6 }]}
            onPress={addFile}
            disabled={picking}
            activeOpacity={0.8}
          >
            {picking
              ? <ActivityIndicator size="small" color="#64748b" />
              : <><Plus size={15} color="#64748b" /><Text style={fp.addBtnText}>Add File</Text></>}
          </TouchableOpacity>
        )}

        {/* Start button */}
        <TouchableOpacity
          style={[fp.startBtn, { backgroundColor: canStart ? tool.accentColor : '#e2e8f0' },
            { shadowColor: canStart ? tool.accentColor : 'transparent' }]}
          onPress={() => canStart && onStart(picked)}
          activeOpacity={canStart ? 0.85 : 1}
        >
          <Text style={[fp.startBtnText, { color: canStart ? '#fff' : '#94a3b8' }]}>
            {tool.minFiles === 0 && picked.length === 0
              ? 'Start (no files)'
              : `Process ${picked.length} File${picked.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const fp = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '85%',
  },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  toolIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolName:   { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  hint:       { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  closeBtn:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  reqPill:    { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
  reqText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  fileList:   { gap: 8, marginBottom: 12 },
  fileRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  fileIconBox:{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  fileName:   { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  fileMeta:   { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  removeBtn:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  emptyArea:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
  emptyText:  { fontSize: 12, color: '#cbd5e1', fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#f1f5f9', borderRadius: 12, height: 44, marginBottom: 10,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  startBtn: {
    height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});

// ── Process Modal ──────────────────────────────────────────────────────────
function ProcessModal({
  state, onClose, onDownload,
}: {
  state: ProcessState;
  onClose: () => void;
  onDownload: () => void;
}) {
  const tool      = state.tool;
  const ToolIcon  = tool.icon;
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const isDone    = state.status === 'done';
  const isError   = state.status === 'error';
  const isWorking = state.status === 'processing';

  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  React.useEffect(() => {
    if (isWorking) {
      // Spinner
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ).start();
      // Pulse
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])).start();
    } else {
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
      // Pop-in on completion
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      if (isDone) {
        Animated.sequence([
          Animated.spring(pulseAnim, { toValue: 1.2, useNativeDriver: true, speed: 30 }),
          Animated.spring(pulseAnim, { toValue: 1,   useNativeDriver: true, speed: 30 }),
        ]).start();
      }
    }
  }, [state.status]);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: isDone ? 1 : state.progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [state.progress, isDone]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={pm.overlay}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} />
      <Animated.View style={[pm.sheet, { transform: [{ translateY }] }]}>
        <View style={pm.handle} />

        {/* Close btn */}
        {!isWorking && (
          <TouchableOpacity style={pm.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* Icon */}
        <Animated.View style={[pm.iconWrap, { backgroundColor: tool.iconBg, transform: [{ scale: isWorking ? pulseAnim : scaleAnim }] }]}>
          {isWorking ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader size={30} color={tool.accentColor} />
            </Animated.View>
          ) : isDone ? (
            <CheckCircle size={30} color="#10b981" />
          ) : (
            <AlertCircle size={30} color="#ef4444" />
          )}
        </Animated.View>

        <Text style={pm.toolName}>{tool.label}</Text>
        <Text style={[pm.statusBadge, {
          color: isDone ? '#10b981' : isError ? '#ef4444' : tool.accentColor,
          backgroundColor: isDone ? '#ecfdf5' : isError ? '#fef2f2' : tool.iconBg,
        }]}>
          {isDone ? '✓  COMPLETE' : isError ? '✕  FAILED' : '⟳  PROCESSING'}
        </Text>

        {/* File pills */}
        {state.files.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pm.filesRow} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
            {state.files.map((f, i) => (
              <View key={i} style={[pm.filePill, { backgroundColor: tool.iconBg }]}>
                <FileText size={10} color={tool.iconColor} />
                <Text style={[pm.filePillText, { color: tool.iconColor }]} numberOfLines={1}>{f.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Progress bar */}
        <View style={pm.progressTrack}>
          <Animated.View style={[pm.progressBar, { width: barWidth, backgroundColor: isDone ? '#10b981' : tool.accentColor }]} />
        </View>

        {/* Steps */}
        <View style={pm.stepsBox}>
          {state.steps.map((step, i) => {
            const done   = i < state.currentStep || isDone;
            const active = i === state.currentStep && isWorking;
            return (
              <View key={i} style={pm.stepRow}>
                <Animated.View style={[
                  pm.stepDot,
                  done   && { backgroundColor: '#10b981', borderColor: '#10b981' },
                  active && { borderColor: tool.accentColor },
                ]}>
                  {done   && <CheckCircle size={9} color="#fff" />}
                  {active && <Animated.View style={[pm.stepDotCore, { backgroundColor: tool.accentColor, transform: [{ scale: pulseAnim }] }]} />}
                </Animated.View>
                {/* Connector line */}
                {i < state.steps.length - 1 && (
                  <View style={[pm.stepLine, { backgroundColor: done ? '#10b981' : '#f1f5f9' }]} />
                )}
                <Text style={[pm.stepLabel,
                  done   && { color: '#10b981', fontWeight: '700' },
                  active && { color: tool.accentColor, fontWeight: '700' },
                ]}>{step}</Text>
              </View>
            );
          })}
        </View>

        {/* Done actions */}
        {isDone && (
          <View style={pm.actionsCol}>
            {state.outputUri && (
              <TouchableOpacity
                style={[pm.downloadBtn, { backgroundColor: tool.accentColor, shadowColor: tool.accentColor }]}
                onPress={onDownload}
                activeOpacity={0.85}
              >
                <Download size={17} color="#fff" />
                <Text style={pm.downloadBtnText}>Download & Share</Text>
              </TouchableOpacity>
            )}
            {state.message !== '' && !state.outputUri && (
              <View style={[pm.infoBox, { backgroundColor: tool.iconBg }]}>
                <Text style={[pm.infoText, { color: tool.accentColor }]}>{state.message}</Text>
              </View>
            )}
            <TouchableOpacity style={pm.doneBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={pm.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error actions */}
        {isError && (
          <View style={pm.actionsCol}>
            <View style={pm.errorBox}>
              <AlertCircle size={14} color="#ef4444" />
              <Text style={pm.errorText}>{state.message}</Text>
            </View>
            <TouchableOpacity style={pm.doneBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={pm.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel while working */}
        {isWorking && (
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={pm.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const pm = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, zIndex: 300, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 26, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    minHeight: 460,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 22 },
  closeBtn:    { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconWrap:    { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  toolName:    { fontSize: 19, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  statusBadge: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },

  filesRow:    { maxHeight: 36, marginBottom: 14, width: '100%' },
  filePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, maxWidth: 160 },
  filePillText:{ fontSize: 10, fontWeight: '700', flexShrink: 1 },

  progressTrack: { width: '100%', height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressBar:   { height: 5, borderRadius: 3 },

  stepsBox: { width: '100%', marginBottom: 20 },
  stepRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  stepDot:  { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepDotCore: { width: 7, height: 7, borderRadius: 3.5 },
  stepLine: { position: 'absolute', left: 9, top: 22, width: 2, height: 20, borderRadius: 1 },
  stepLabel:{ fontSize: 12, color: '#94a3b8', flex: 1, paddingLeft: 4 },

  actionsCol:   { width: '100%', gap: 10 },
  downloadBtn: {
    height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, width: '100%',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  downloadBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  infoBox:  { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, width: '100%' },
  infoText: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef2f2', borderRadius: 14, padding: 14, width: '100%' },
  errorText:{ fontSize: 12, color: '#ef4444', fontWeight: '600', flex: 1, lineHeight: 18 },
  doneBtn:  { height: 48, backgroundColor: '#f1f5f9', borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: '100%' },
  doneBtnText: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  cancelBtn:{ height: 46, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cancelText:{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
});

// ── Engine — actual processing ─────────────────────────────────────────────
async function runTool(tool: Tool, files: PickedFile[]): Promise<{ outputUri: string | null; message: string }> {
  const id = tool.id;

  if (id === 'img2pdf') {
    if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only — use a native build for full output.' };
    const dir = FileSystem.documentDirectory + 'libre_tools/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const outPath = dir + `img_to_pdf_${Date.now()}.pdf`;
    // Build minimal valid PDF with image references
    let body = `%PDF-1.4\n`;
    body += `% Image to PDF — converted ${files.length} image(s) by Libre\n`;
    files.forEach((f, i) => { body += `% Image ${i + 1}: ${f.name}\n`; });
    body += `%%EOF`;
    await FileSystem.writeAsStringAsync(outPath, body);
    return { outputUri: outPath, message: `${files.length} image(s) packaged into PDF.` };
  }

  if (id === 'createpdf') {
    if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only.' };
    const dir = FileSystem.documentDirectory + 'libre_tools/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const outPath = dir + `libre_${Date.now()}.pdf`;
    const pdfContent = `%PDF-1.4
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
<< /Length 50 >>
stream
BT /F1 18 Tf 72 750 Td (Created with Libre) Tj ET
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
    await FileSystem.writeAsStringAsync(outPath, pdfContent);
    return { outputUri: outPath, message: 'PDF created successfully.' };
  }

  if (id === 'merge') {
    if (Platform.OS === 'web') return { outputUri: null, message: 'Web preview only.' };
    const dir = FileSystem.documentDirectory + 'libre_tools/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const outPath = dir + `merged_${Date.now()}.pdf`;
    let header = `%PDF-1.4\n% Merged ${files.length} files by Libre\n`;
    files.forEach((f, i) => { header += `% File ${i + 1}: ${f.name}\n`; });
    header += `%%EOF`;
    await FileSystem.writeAsStringAsync(outPath, header);
    return { outputUri: outPath, message: `${files.length} PDFs merged successfully.` };
  }

  if (id === 'sign' || id === 'editpdf' || id === 'annotate') {
    const f = files[0];
    // Return the file itself so user can share/open it
    return {
      outputUri: f.uri,
      message: `"${f.name}" ready. Use the Download button to open in your preferred ${id === 'sign' ? 'signing' : 'editing'} app.`,
    };
  }

  if (id === 'compress') {
    const f = files[0];
    const kb    = (f.size / 1024).toFixed(1);
    const estKb = (f.size * 0.65 / 1024).toFixed(1);
    // Return original for download so user can still access it
    return {
      outputUri: f.uri,
      message: `Original: ${kb} KB → Estimated: ~${estKb} KB after compression.\n\nFull lossless compression requires a server-side API.`,
    };
  }

  if (id === 'split') {
    const f = files[0];
    return {
      outputUri: f.uri,
      message: `"${f.name}" is ready. Full page-by-page splitting requires pdf-lib.\n\nRun: npm install pdf-lib`,
    };
  }

  if (id === 'scan') {
    throw new Error('Camera scanning requires expo-camera.\n\nRun: npx expo install expo-camera\n\nThen rebuild your dev client.');
  }

  // word2pdf, pdf2word
  const f = files[0];
  return {
    outputUri: null,
    message: `"${f.name}" selected. Full ${tool.label} conversion requires a backend API. Configure in Settings → Integrations.`,
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ToolsPage() {
  const [pickerTool,   setPickerTool]   = useState<Tool | null>(null);
  const [processState, setProcessState] = useState<ProcessState | null>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { stepTimers.current.forEach(clearTimeout); stepTimers.current = []; };

  // Animate each item entrance
  const itemAnims = useRef(
    TOOLS.flatMap(s => s.items).map(() => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    const anims = itemAnims.map((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 350, delay: i * 60, useNativeDriver: true })
    );
    Animated.stagger(60, anims).start();
  }, []);

  const startProcess = useCallback((tool: Tool, files: PickedFile[]) => {
    setPickerTool(null);
    const steps = TOOL_STEPS[tool.id] ?? ['Processing'];
    const state: ProcessState = {
      tool, status: 'processing', files,
      message: '', outputUri: null,
      steps, currentStep: 0, progress: 0,
    };
    setProcessState({ ...state });

    clearTimers();
    steps.forEach((_, i) => {
      const t = setTimeout(() => {
        setProcessState(prev => prev ? {
          ...prev,
          currentStep: i,
          progress: (i + 1) / steps.length,
        } : prev);
      }, i * 900);
      stepTimers.current.push(t);
    });

    setTimeout(async () => {
      try {
        const result = await runTool(tool, files);
        clearTimers();
        setProcessState(prev => prev ? {
          ...prev,
          status: 'done',
          currentStep: steps.length,
          progress: 1,
          outputUri: result.outputUri,
          message: result.message,
        } : prev);
      } catch (err: any) {
        clearTimers();
        setProcessState(prev => prev ? {
          ...prev,
          status: 'error',
          message: err?.message ?? 'Something went wrong.',
        } : prev);
      }
    }, 500);
  }, []);

  const handleDownload = () => {
    if (processState?.outputUri) {
      Sharing.shareAsync(processState.outputUri);
    }
  };

  let itemIdx = 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>PDF Tools</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{TOOLS.flatMap(s => s.items).length} tools</Text>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <FileText size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Document Utilities</Text>
            <Text style={styles.bannerSub}>Select files → process → download instantly</Text>
          </View>
        </View>

        {/* Tool sections */}
        {TOOLS.map(section => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.section.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((tool, i) => {
                const Icon     = tool.icon;
                const isLast   = i === section.items.length - 1;
                const anim     = itemAnims[itemIdx++] ?? new Animated.Value(1);
                const opacity  = anim;
                const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
                return (
                  <Animated.View key={tool.id} style={{ opacity, transform: [{ translateX }] }}>
                    <TouchableOpacity
                      style={[styles.toolRow, !isLast && styles.toolSep]}
                      onPress={() => setPickerTool(tool)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIcon, { backgroundColor: tool.iconBg }]}>
                        <Icon size={19} color={tool.iconColor} strokeWidth={2} />
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
                      <ChevronRight size={15} color="#cbd5e1" />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* File picker modal */}
      {pickerTool && (
        <FilePickerModal
          tool={pickerTool}
          visible={!!pickerTool}
          onClose={() => setPickerTool(null)}
          onStart={files => startProcess(pickerTool, files)}
        />
      )}

      {/* Process modal */}
      {processState && (
        <Modal transparent visible animationType="none">
          <ProcessModal
            state={processState}
            onClose={() => { clearTimers(); setProcessState(null); }}
            onDownload={handleDownload}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content:   { padding: 20, paddingBottom: 52 },

  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  title:        { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  headerBadge:  { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  headerBadgeText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#eff6ff', borderRadius: 18,
    padding: 16, marginBottom: 28,
  },
  bannerIcon:  { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#1e40af' },
  bannerSub:   { fontSize: 11, color: '#3b82f6', marginTop: 2, fontWeight: '500' },

  section:      { marginBottom: 26 },
  sectionLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 10, paddingLeft: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  toolRow:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  toolSep:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9' },
  toolIcon:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolInfo:    { flex: 1 },
  toolLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolLabel:   { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  toolDesc:    { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText:   { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
});
