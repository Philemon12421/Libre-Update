import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Platform, Animated, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, File, Download, Trash2,
  Upload, X, Edit2, Plus, Search,
  ArrowUpDown, BookOpen, FileCode, Layout, Star,
  Folder as FolderIcon, MoreHorizontal, ExternalLink,
  ChevronLeft, ZoomIn,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type Category = 'all' | 'pdf' | 'word' | 'ppt' | 'txt' | 'image' | 'dirs' | 'favorites' | 'others';

const CATEGORIES: { id: Category; label: string; icon: any; color: string }[] = [
  { id: 'all',       label: 'All',     icon: File,           color: '#64748b' },
  { id: 'pdf',       label: 'PDF',     icon: FileText,       color: '#ef4444' },
  { id: 'word',      label: 'Word',    icon: FileText,       color: '#2563eb' },
  { id: 'ppt',       label: 'PPT',     icon: Layout,         color: '#f97316' },
  { id: 'txt',       label: 'Text',    icon: BookOpen,       color: '#6366f1' },
  { id: 'image',     label: 'Images',  icon: ImageIcon,      color: '#10b981' },
  { id: 'dirs',      label: 'Folders', icon: FolderIcon,     color: '#f59e0b' },
  { id: 'favorites', label: 'Starred', icon: Star,           color: '#ec4899' },
  { id: 'others',    label: 'Others',  icon: MoreHorizontal, color: '#94a3b8' },
];

function matchCategory(file: LibreFile, cat: Category): boolean {
  const t = (file.type ?? '').toLowerCase();
  const ext = (file.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  switch (cat) {
    case 'all': return true;
    case 'pdf': return t.includes('pdf') || ext === 'pdf';
    case 'word': return t.includes('word') || t.includes('msword') || ['doc','docx','odt','rtf'].includes(ext);
    case 'ppt': return t.includes('presentation') || t.includes('powerpoint') || ['ppt','pptx','odp'].includes(ext);
    case 'txt': return t.includes('text') || t.includes('json') || ['txt','md','csv','json','js','ts','jsx','tsx','html','css','xml','yaml','yml'].includes(ext);
    case 'image': return t.includes('image') || ['jpg','jpeg','png','gif','webp','svg','bmp','heic'].includes(ext);
    case 'dirs': return false;
    case 'favorites': return !!(file as any).starred;
    case 'others': {
      const known = t.includes('pdf') || t.includes('word') || t.includes('msword') ||
        t.includes('presentation') || t.includes('powerpoint') || t.includes('text') ||
        t.includes('json') || t.includes('image') ||
        ['doc','docx','odt','rtf','ppt','pptx','odp','txt','md','csv','json','js','ts',
         'jsx','tsx','html','css','xml','yaml','yml','jpg','jpeg','png','gif','webp',
         'svg','bmp','heic','pdf'].includes(ext);
      return !known;
    }
    default: return true;
  }
}

function getIcon(type: string, size = 18, name = '') {
  const t = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf') || ext === 'pdf') return <FileText color="#ef4444" size={size} />;
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return <ImageIcon color="#10b981" size={size} />;
  if (t.includes('text') || ['txt','md'].includes(ext)) return <BookOpen color="#6366f1" size={size} />;
  if (t.includes('word') || ['doc','docx'].includes(ext)) return <FileText color="#2563eb" size={size} />;
  if (t.includes('sheet') || t.includes('excel') || ['xls','xlsx'].includes(ext)) return <Layout color="#10b981" size={size} />;
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext)) return <Layout color="#f97316" size={size} />;
  if (t.includes('javascript') || t.includes('json') || t.includes('code')) return <FileCode color="#f59e0b" size={size} />;
  return <File color="#94a3b8" size={size} />;
}

function getIconColor(type: string, name = '') {
  const t = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf') || ext === 'pdf') return { bg: '#fef2f2', color: '#ef4444' };
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return { bg: '#ecfdf5', color: '#10b981' };
  if (t.includes('word') || ['doc','docx'].includes(ext)) return { bg: '#eff6ff', color: '#2563eb' };
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext)) return { bg: '#fff7ed', color: '#f97316' };
  if (t.includes('text') || ['txt','md'].includes(ext)) return { bg: '#eef2ff', color: '#6366f1' };
  return { bg: '#f8fafc', color: '#94a3b8' };
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getPreviewType(file: LibreFile): 'image' | 'text' | 'pdf' | 'office' | 'none' {
  const t = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp','bmp','heic'].includes(ext)) return 'image';
  if (t.includes('pdf') || ext === 'pdf') return 'pdf';
  if (t.includes('text') || ['txt','md','csv','json','js','ts','html','css','xml','yaml','yml'].includes(ext)) return 'text';
  if (['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods'].includes(ext)) return 'office';
  return 'none';
}

// Build an HTML string that renders a PDF via pdf.js CDN
function buildPdfHtml(uri: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#1e1e2e; display:flex; flex-direction:column; align-items:center; }
  #toolbar { width:100%; background:#0f172a; padding:10px 16px; display:flex; align-items:center; gap:12px; position:sticky; top:0; z-index:10; }
  #toolbar span { color:#94a3b8; font-family:sans-serif; font-size:13px; }
  #page-num { color:#60a5fa !important; font-weight:700; }
  button { background:#1e293b; border:1px solid #334155; color:#e2e8f0; border-radius:8px; padding:5px 12px; font-size:13px; cursor:pointer; }
  button:active { background:#334155; }
  canvas { display:block; margin:12px auto; border-radius:4px; box-shadow:0 4px 24px rgba(0,0,0,0.4); max-width:100%; }
  #loading { color:#60a5fa; font-family:sans-serif; font-size:14px; padding:40px; text-align:center; }
  #error { color:#f87171; font-family:sans-serif; font-size:13px; padding:40px; text-align:center; }
</style>
</head>
<body>
<div id="toolbar">
  <button onclick="prevPage()">‹ Prev</button>
  <span>Page <span id="page-num">-</span> of <span id="page-count">-</span></span>
  <button onclick="nextPage()">Next ›</button>
  <button onclick="zoomIn()">＋</button>
  <button onclick="zoomOut()">－</button>
</div>
<canvas id="pdf-canvas"></canvas>
<div id="loading">Loading PDF…</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let pdfDoc = null, pageNum = 1, scale = 1.4;
  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');

  async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const vp = page.getViewport({ scale });
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    document.getElementById('page-num').textContent = num;
  }

  pdfjsLib.getDocument('${uri}').promise.then(pdf => {
    pdfDoc = pdf;
    document.getElementById('page-count').textContent = pdf.numPages;
    document.getElementById('loading').style.display = 'none';
    renderPage(pageNum);
  }).catch(e => {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = 'Could not load PDF: ' + e.message;
  });

  function prevPage() { if (pageNum > 1) { pageNum--; renderPage(pageNum); } }
  function nextPage() { if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); } }
  function zoomIn()  { scale = Math.min(scale + 0.3, 3.5); renderPage(pageNum); }
  function zoomOut() { scale = Math.max(scale - 0.3, 0.5); renderPage(pageNum); }
</script>
</body>
</html>`;
}

// Build HTML for Office docs via Microsoft viewer
function buildOfficeHtml(uri: string): string {
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(uri)}`;
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;">
<iframe src="${viewerUrl}" width="100%" height="100%" frameborder="0" style="border:none;display:block;height:100vh;"></iframe>
</body>
</html>`;
}

// Build HTML for text/code files
function buildTextHtml(text: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const isCode = ['js','ts','jsx','tsx','html','css','json','xml','yaml','yml','md'].includes(ext);
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; background:${isCode ? '#0f172a' : '#fff'}; }
  pre { padding:20px; font-family:monospace; font-size:13px; line-height:1.6;
        color:${isCode ? '#38bdf8' : '#1e293b'}; white-space:pre-wrap; word-break:break-word; }
</style>
</head>
<body><pre>${escaped}</pre></body>
</html>`;
}

// ── Document Viewer ─────────────────────────────────────────────────────────
function DocumentViewer({ file, onClose }: { file: LibreFile; onClose: () => void }) {
  const [textContent, setTextContent]   = useState('');
  const [webLoading, setWebLoading]     = useState(true);
  const [loadError, setLoadError]       = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const type = getPreviewType(file);
  const ic   = getIconColor(file.type, file.name);
  const isLocalUri = !file.data.startsWith('http') && !file.data.startsWith('data:');

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  // Load text content for text files
  useEffect(() => {
    if (type !== 'text') return;
    (async () => {
      try {
        let src = '';
        if (Platform.OS === 'web') {
          src = file.data.startsWith('data:')
            ? atob(file.data.split(',')[1])
            : await (await fetch(file.data)).text();
        } else {
          src = await FileSystem.readAsStringAsync(file.data);
        }
        setTextContent(src);
      } catch { setTextContent('Could not read file.'); }
    })();
  }, [file]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(onClose);
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });

  // ── Fallback UI for when preview is not possible ──
  const FallbackView = ({ label, onOpen }: { label: string; onOpen: () => void }) => (
    <View style={vStyles.center}>
      <View style={[vStyles.typeIconBox, { backgroundColor: ic.bg }]}>
        {getIcon(file.type, 52, file.name)}
      </View>
      <Text style={vStyles.noPreviewTitle}>{file.name}</Text>
      <Text style={vStyles.noPreviewSub}>{label}</Text>
      <TouchableOpacity style={vStyles.openExternalBtn} onPress={onOpen} activeOpacity={0.85}>
        <ExternalLink size={15} color="#fff" />
        <Text style={vStyles.openExternalText}>Open with App</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Loading overlay for WebView ──
  const WebLoadingOverlay = () => webLoading ? (
    <View style={vStyles.webLoading}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={vStyles.loadingText}>Loading preview…</Text>
    </View>
  ) : null;

  const renderContent = () => {
    // ── IMAGE ──────────────────────────────────────────────────────────────
    if (type === 'image') return (
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <Image
          source={{ uri: file.data }}
          style={{ flex: 1 }}
          resizeMode="contain"
          onLoad={() => setWebLoading(false)}
        />
        {webLoading && <View style={vStyles.webLoading}><ActivityIndicator size="large" color="#2563eb" /></View>}
      </View>
    );

    // ── TEXT / CODE ────────────────────────────────────────────────────────
    if (type === 'text') return (
      <WebView
        style={{ flex: 1 }}
        originWhitelist={['*']}
        source={{ html: buildTextHtml(textContent, file.name) }}
        onLoadEnd={() => setWebLoading(false)}
        showsVerticalScrollIndicator={false}
      />
    );

    // ── PDF ────────────────────────────────────────────────────────────────
    if (type === 'pdf') {
      // Local file on native: use WebView with pdf.js via base64 or file uri
      if (Platform.OS !== 'web' && isLocalUri) {
        // Read and pass as base64 data URI inside html
        return (
          <View style={{ flex: 1 }}>
            <WebView
              style={{ flex: 1 }}
              originWhitelist={['*']}
              source={{ html: buildPdfHtml(file.data) }}
              onLoadEnd={() => setWebLoading(false)}
              onError={() => { setWebLoading(false); setLoadError(true); }}
              javaScriptEnabled
              allowFileAccess
              mixedContentMode="always"
            />
            <WebLoadingOverlay />
            {loadError && <FallbackView label="Could not render PDF inline." onOpen={() => Sharing.shareAsync(file.data)} />}
          </View>
        );
      }
      // Remote PDF: Google Docs viewer
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.data)}&embedded=true`;
      return (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            source={{ uri: viewerUrl }}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => { setWebLoading(false); setLoadError(true); }}
            javaScriptEnabled
          />
          <WebLoadingOverlay />
          {loadError && <FallbackView label="Could not load PDF. Open in external app." onOpen={() => Sharing.shareAsync(file.data)} />}
        </View>
      );
    }

    // ── OFFICE (Word / PPT / Excel) ────────────────────────────────────────
    if (type === 'office') {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      // Local office files: Microsoft viewer needs a public URL — fallback to open externally
      if (isLocalUri) {
        return (
          <FallbackView
            label={`${ext.toUpperCase()} files can be previewed when opened from a URL. Tap below to open in a compatible app.`}
            onOpen={() => Sharing.shareAsync(file.data)}
          />
        );
      }
      // Remote office file: Microsoft Office Online viewer
      return (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            source={{ html: buildOfficeHtml(file.data) }}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => { setWebLoading(false); setLoadError(true); }}
            javaScriptEnabled
          />
          <WebLoadingOverlay />
          {loadError && <FallbackView label="Could not load document." onOpen={() => Sharing.shareAsync(file.data)} />}
        </View>
      );
    }

    // ── UNKNOWN ────────────────────────────────────────────────────────────
    return (
      <FallbackView
        label="No preview available for this file type."
        onOpen={() => Sharing.shareAsync(file.data)}
      />
    );
  };

  return (
    <Animated.View style={[vStyles.container, { transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={vStyles.header}>
        <TouchableOpacity onPress={handleClose} style={vStyles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={vStyles.headerInfo}>
          <Text style={vStyles.headerName} numberOfLines={1}>{file.name}</Text>
          <Text style={vStyles.headerMeta}>{formatSize(file.size)} · {format(file.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={() => Sharing.shareAsync(file.data)} style={vStyles.shareBtn} activeOpacity={0.7}>
          <Download size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={vStyles.body}>{renderContent()}</View>

      {/* Footer */}
      <View style={vStyles.footer}>
        <TouchableOpacity style={vStyles.shareFullBtn} onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
          <Download size={16} color="#fff" />
          <Text style={vStyles.shareFullText}>Share / Export</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const vStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 44 : 54, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  headerMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1, fontWeight: '600' },
  shareBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, backgroundColor: '#f8fafc' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  shareFullBtn: {
    backgroundColor: '#0f172a', height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  shareFullText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 14 },
  textScroll: { flex: 1, backgroundColor: '#0f172a' },
  textContent: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12, color: '#38bdf8', lineHeight: 20 },
  typeIconBox: { width: 90, height: 90, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noPreviewTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  noPreviewSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  openExternalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  openExternalText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
});

// ── Main Files Page ─────────────────────────────────────────────────────────
export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files, setFiles]           = useState<LibreFile[]>([]);
  const [folders, setFolders]       = useState<LibreFolder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [category, setCategory]     = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [viewingFile, setViewingFile] = useState<LibreFile | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingFile, setEditingFile] = useState<LibreFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteName, setNoteName]     = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeFolderId
        ? await db.files.where('folderId').equals(activeFolderId).toArray()
        : await db.files.toArray();
      const sorted = [...query].sort((a, b) => {
        if (sortOption === 'newest')   return b.createdAt - a.createdAt;
        if (sortOption === 'oldest')   return a.createdAt - b.createdAt;
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
      setFiles(sorted);
      setFolders(await db.folders.toArray());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeFolderId, sortOption]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const counts: Record<Category, number> = {} as any;
  CATEGORIES.forEach(c => {
    counts[c.id] = c.id === 'dirs' ? folders.length : files.filter(f => matchCategory(f, c.id)).length;
  });

  const filtered = (category === 'dirs' ? [] : files)
    .filter(f => matchCategory(f, category))
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      setUploading(true);
      const { name, size, uri, mimeType } = result.assets[0];
      let finalUri = uri;
      if (Platform.OS !== 'web') {
        const dir = FileSystem.documentDirectory + 'libre_files/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        finalUri = dir + Date.now() + '_' + name;
        await FileSystem.copyAsync({ from: uri, to: finalUri });
      } else if (size && size < 2 * 1024 * 1024) {
        try {
          const blob = await (await fetch(uri)).blob();
          finalUri = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
        } catch {}
      }
      await db.files.add({
        id: Date.now(), name, type: mimeType ?? 'application/octet-stream',
        size: size ?? 0, data: finalUri, folderId: activeFolderId, createdAt: Date.now(),
      });
      Alert.alert('✓ Uploaded', `"${name}" added successfully.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to pick file.'); }
    finally { setUploading(false); }
  };

  const toggleStar = async (file: LibreFile) => {
    await db.files.update(file.id!, { starred: !(file as any).starred } as any);
    fetchFiles();
  };

  const deleteFile = (id: number) => {
    Alert.alert('Delete', 'Permanently delete this file?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await db.files.delete(id); fetchFiles(); } },
    ]);
  };

  const renameFile = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false); setEditingFile(null); setNewFileName('');
    fetchFiles();
  };

  const createNote = async () => {
    if (!noteName.trim()) { Alert.alert('Error', 'Enter a note name.'); return; }
    setSavingNote(true);
    try {
      let name = noteName.trim();
      if (!name.endsWith('.txt') && !name.endsWith('.md')) name += '.txt';
      let uri = '';
      if (Platform.OS !== 'web') {
        const dir = FileSystem.documentDirectory + 'libre_files/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        uri = dir + Date.now() + '_' + name;
        await FileSystem.writeAsStringAsync(uri, noteContent);
      } else {
        uri = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(noteContent)))}`;
      }
      await db.files.add({
        id: Date.now(), name, type: 'text/plain', size: noteContent.length,
        data: uri, folderId: activeFolderId, createdAt: Date.now(),
      });
      setShowNoteModal(false); setNoteName(''); setNoteContent('');
      Alert.alert('✓ Created', `Note "${name}" saved.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to create note.'); }
    finally { setSavingNote(false); }
  };

  const deleteSelected = () => {
    Alert.alert('Delete', `Delete ${selectedIds.size} file(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await Promise.all(Array.from(selectedIds).map(id => db.files.delete(id as number)));
        setIsSelectMode(false); setSelectedIds(new Set()); fetchFiles();
      }},
    ]);
  };

  const moveSelected = async (folderId: number | null) => {
    await Promise.all(Array.from(selectedIds).map(id =>
      db.files.update(id as number, { folderId: folderId ?? undefined })
    ));
    setShowMoveModal(false); setIsSelectMode(false); setSelectedIds(new Set()); fetchFiles();
  };

  const renderFile = ({ item }: { item: LibreFile }) => {
    const isSelected = selectedIds.has(item.id!);
    const starred = !!(item as any).starred;
    const ic = getIconColor(item.type, item.name);
    const previewType = getPreviewType(item);
    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && styles.fileItemSelected]}
        onPress={() => isSelectMode
          ? setSelectedIds(prev => { const s = new Set(prev); s.has(item.id!) ? s.delete(item.id!) : s.add(item.id!); return s; })
          : setViewingFile(item)
        }
        onLongPress={() => { setIsSelectMode(true); setSelectedIds(new Set([item.id!])); }}
        activeOpacity={0.7}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <View style={styles.checkboxInner} />}
          </View>
        )}
        <View style={[styles.fileIconWrap, { backgroundColor: ic.bg }]}>
          {getIcon(item.type, 17, item.name)}
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>{formatSize(item.size)} · {format(item.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        {previewType !== 'none' && !isSelectMode && (
          <View style={styles.previewBadge}>
            <ZoomIn size={10} color="#2563eb" />
          </View>
        )}
        <TouchableOpacity onPress={() => toggleStar(item)} style={styles.actionBtn}>
          <Star size={13} color={starred ? '#f59e0b' : '#cbd5e1'} fill={starred ? '#f59e0b' : 'none'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setEditingFile(item); setNewFileName(item.name); setShowRenameModal(true); }} style={styles.actionBtn}>
          <Edit2 size={13} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteFile(item.id!)} style={styles.actionBtn}>
          <Trash2 size={13} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFolder = ({ item }: { item: LibreFolder }) => (
    <View style={styles.fileItem}>
      <View style={[styles.fileIconWrap, { backgroundColor: '#fffbeb' }]}>
        <FolderIcon size={17} color="#f59e0b" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>{item.name}</Text>
        <Text style={styles.fileMeta}>Folder</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBlock}>
      <View style={styles.header}>
        <Text style={styles.title}>Files</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionCard} onPress={pickDocument} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#2563eb" size="small" />
              : <><Upload size={14} color="#2563eb" /><Text style={styles.actionCardText}>Upload</Text></>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]} onPress={() => setShowNoteModal(true)}>
            <Plus size={14} color="#10b981" /><Text style={[styles.actionCardText, { color: '#10b981' }]}>Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category tabs — no bottom margin, flush to search */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.tab, isActive && { backgroundColor: cat.color, borderColor: cat.color }]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Icon size={11} color={isActive ? '#fff' : cat.color} strokeWidth={2} />
              <Text style={[styles.tabText, isActive && { color: '#fff' }]}>{cat.label}</Text>
              <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : cat.color + '18' }]}>
                <Text style={[styles.tabCountText, { color: isActive ? '#fff' : cat.color }]}>{counts[cat.id]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search + Sort */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={13} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files..."
            placeholderTextColor="#cbd5e1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={13} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortOptions(true)}>
          <ArrowUpDown size={13} color="#64748b" />
          <Text style={styles.sortBtnText}>
            {sortOption === 'newest' ? 'New' : sortOption === 'oldest' ? 'Old' : sortOption === 'name-asc' ? 'A-Z' : 'Z-A'}
          </Text>
        </TouchableOpacity>
      </View>
      </View>{/* end topBlock */}

      {/* Select bar */}
      {isSelectMode && (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.selectAction} onPress={() => setShowMoveModal(true)}>
              <Text style={styles.selectActionText}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectAction, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]} onPress={deleteSelected}>
              <Text style={[styles.selectActionText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectAction} onPress={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}>
              <X size={13} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* File list */}
      <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.emptyBox}><ActivityIndicator color="#94a3b8" /></View>
      ) : category === 'dirs' ? (
        folders.length === 0 ? (
          <View style={styles.emptyBox}>
            <FolderIcon size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Folders Yet</Text>
            <Text style={styles.emptySub}>Create folders from the Library tab</Text>
          </View>
        ) : (
          <FlatList data={folders} renderItem={renderFolder} keyExtractor={i => String(i.id)} contentContainerStyle={styles.listContent} />
        )
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <File size={32} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Files Here'}</Text>
          <Text style={styles.emptySub}>{searchQuery ? 'Try different keywords' : 'Upload a file to get started'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderFile}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.listContent}
        />
      )}
      </View>

      {/* Document Viewer — overlaid, not a Modal */}
      {viewingFile && (
        <DocumentViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}

      {/* Sort Sheet */}
      <Modal visible={showSortOptions} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
            {(['newest','oldest','name-asc','name-desc'] as const).map(id => {
              const label = id === 'newest' ? 'Newest First' : id === 'oldest' ? 'Oldest First' : id === 'name-asc' ? 'Name A–Z' : 'Name Z–A';
              return (
                <TouchableOpacity key={id} style={[styles.sheetOption, sortOption === id && styles.sheetOptionActive]}
                  onPress={() => { setSortOption(id); setShowSortOptions(false); }}>
                  <Text style={[styles.sheetOptionText, sortOption === id && { color: '#2563eb' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSortOptions(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename File</Text>
            <TextInput style={styles.dialogInput} value={newFileName} onChangeText={setNewFileName} autoFocus />
            <TouchableOpacity style={styles.dialogBtn} onPress={renameFile}>
              <Text style={styles.dialogBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRenameModal(false); setEditingFile(null); }}>
              <Text style={styles.dialogCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Move Modal */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Move to Folder</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetOption} onPress={() => moveSelected(null)}>
                <Text style={styles.sheetOptionText}>Root (no folder)</Text>
              </TouchableOpacity>
              {folders.map(f => (
                <TouchableOpacity key={f.id} style={styles.sheetOption} onPress={() => f.id && moveSelected(f.id)}>
                  <FolderIcon size={14} color="#f59e0b" />
                  <Text style={[styles.sheetOptionText, { marginLeft: 8 }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowMoveModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Note Modal */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Create Note</Text>
            <TextInput style={styles.dialogInput} placeholder="Filename (e.g. my_note.txt)"
              placeholderTextColor="#94a3b8" value={noteName} onChangeText={setNoteName} />
            <TextInput style={[styles.dialogInput, { height: 120, textAlignVertical: 'top', marginTop: 8 }]}
              placeholder="Write your note here..." placeholderTextColor="#cbd5e1"
              multiline value={noteContent} onChangeText={setNoteContent} />
            <TouchableOpacity style={[styles.dialogBtn, { marginTop: 12 }]} onPress={createNote} disabled={savingNote}>
              {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogBtnText}>Create Note</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => { setShowNoteModal(false); setNoteName(''); setNoteContent(''); }}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBlock: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  actionCardText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  // Tabs — no bottom border gap
  tabsScroll: { height: 40 },
  tabsContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4, gap: 6, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    height: 28,
  },
  tabText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  tabCount: { minWidth: 15, height: 15, borderRadius: 7.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabCountText: { fontSize: 8, fontWeight: '900' },

  // Search — no top padding, flush to tabs
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 11, height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  sortBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginBottom: 6, backgroundColor: '#0f172a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
  },
  selectCount: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  selectAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  selectActionText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  listContent: { padding: 14, paddingTop: 6 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1,
  },
  fileItemSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  checkboxInner: { width: 7, height: 7, backgroundColor: '#fff', borderRadius: 1.5 },
  fileIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  fileMeta: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  previewBadge: { width: 20, height: 20, borderRadius: 6, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  actionBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 200 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 14, textTransform: 'uppercase' },
  emptySub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '60%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 14 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 4, borderRadius: 10 },
  sheetOptionActive: { backgroundColor: '#eff6ff' },
  sheetOptionText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  sheetCancel: { height: 48, alignItems: 'center', justifyContent: 'center' },
  sheetCancelText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center' },
  dialogTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 18 },
  dialogInput: { width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 13, fontSize: 14, color: '#1e293b' },
  dialogBtn: { backgroundColor: '#2563eb', width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  dialogBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  dialogCancel: { marginTop: 12, fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
});
