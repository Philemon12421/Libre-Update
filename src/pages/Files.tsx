import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Platform, Animated, KeyboardAvoidingView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, File, Download, Trash2,
  Upload, X, Edit2, Plus, Search, ArrowUpDown, BookOpen,
  FileCode, Layout, Star, Folder as FolderIcon, MoreHorizontal,
  ExternalLink, ChevronLeft, ZoomIn,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';

type SortOption  = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type Category    = 'all' | 'pdf' | 'word' | 'ppt' | 'txt' | 'image' | 'dirs' | 'favorites' | 'others';

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
  const t   = (file.type ?? '').toLowerCase();
  const ext = (file.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  switch (cat) {
    case 'all':       return true;
    case 'pdf':       return t.includes('pdf') || ext === 'pdf';
    case 'word':      return t.includes('word') || t.includes('msword') || ['doc','docx','odt','rtf'].includes(ext);
    case 'ppt':       return t.includes('presentation') || t.includes('powerpoint') || ['ppt','pptx','odp'].includes(ext);
    case 'txt':       return t.includes('text') || t.includes('json') || ['txt','md','csv','json','js','ts','jsx','tsx','html','css','xml','yaml','yml'].includes(ext);
    case 'image':     return t.includes('image') || ['jpg','jpeg','png','gif','webp','svg','bmp','heic'].includes(ext);
    case 'dirs':      return false;
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

function getPreviewType(file: LibreFile): 'image' | 'text' | 'pdf' | 'office' | 'none' {
  const t   = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp','bmp','heic'].includes(ext)) return 'image';
  if (t.includes('pdf')   || ext === 'pdf')                                                 return 'pdf';
  if (t.includes('text')  || ['txt','md','csv','json','js','ts','html','css','xml','yaml','yml'].includes(ext)) return 'text';
  if (['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods'].includes(ext))             return 'office';
  return 'none';
}

function getIconColor(type: string, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf')          || ext === 'pdf')                               return { bg: '#fef2f2', color: '#ef4444' };
  if (t.includes('image')        || ['jpg','jpeg','png','gif','webp'].includes(ext)) return { bg: '#ecfdf5', color: '#10b981' };
  if (t.includes('word')         || ['doc','docx'].includes(ext))                return { bg: '#eff6ff', color: '#2563eb' };
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))                return { bg: '#fff7ed', color: '#f97316' };
  if (t.includes('text')         || ['txt','md'].includes(ext))                  return { bg: '#eef2ff', color: '#6366f1' };
  return { bg: '#f8fafc', color: '#94a3b8' };
}

function getIcon(type: string, size = 18, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf')          || ext === 'pdf')                               return <FileText  color="#ef4444" size={size} />;
  if (t.includes('image')        || ['jpg','jpeg','png','gif','webp'].includes(ext)) return <ImageIcon color="#10b981" size={size} />;
  if (t.includes('text')         || ['txt','md'].includes(ext))                  return <BookOpen  color="#6366f1" size={size} />;
  if (t.includes('word')         || ['doc','docx'].includes(ext))                return <FileText  color="#2563eb" size={size} />;
  if (t.includes('sheet')        || ['xls','xlsx'].includes(ext))                return <Layout    color="#10b981" size={size} />;
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))                return <Layout    color="#f97316" size={size} />;
  if (t.includes('json')         || t.includes('code'))                          return <FileCode  color="#f59e0b" size={size} />;
  return <File color="#94a3b8" size={size} />;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── HTML builders ──────────────────────────────────────────────────────────

function buildPdfHtml(uri: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;font-family:sans-serif;display:flex;flex-direction:column;min-height:100vh}
#toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0f172a;position:sticky;top:0;z-index:10;gap:8px;border-bottom:1px solid #1e293b}
.page-info{color:#94a3b8;font-size:12px;text-align:center;flex:1}
.page-info span{color:#60a5fa;font-weight:700}
.btn{background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;transition:background 0.15s}
.btn:active{background:#334155}
.zoom-btns{display:flex;gap:4px}
#canvas-wrap{display:flex;flex-direction:column;align-items:center;padding:16px 12px;gap:16px}
canvas{border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,0.5);max-width:100%;background:#fff}
#loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;color:#60a5fa;gap:12px;font-size:14px}
.spinner{width:36px;height:36px;border:3px solid #1e293b;border-top-color:#60a5fa;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#error{padding:32px;text-align:center;color:#f87171;font-size:13px;line-height:1.6}
</style></head><body>
<div id="toolbar">
  <button class="btn" onclick="changePage(-1)">‹ Prev</button>
  <div class="page-info">Page <span id="pn">—</span> / <span id="pc">—</span></div>
  <button class="btn" onclick="changePage(1)">Next ›</button>
  <div class="zoom-btns">
    <button class="btn" onclick="zoom(0.25)">＋</button>
    <button class="btn" onclick="zoom(-0.25)">－</button>
  </div>
</div>
<div id="loading"><div class="spinner"></div>Loading PDF…</div>
<div id="canvas-wrap" style="display:none"></div>
<div id="error" style="display:none"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let pdf=null,page=1,scale=1.3,rendering=false;
const wrap=document.getElementById('canvas-wrap');
const loading=document.getElementById('loading');
const err=document.getElementById('error');

async function renderPage(n){
  if(rendering)return;rendering=true;
  const p=await pdf.getPage(n);
  const vp=p.getViewport({scale});
  let canvas=document.getElementById('c'+n);
  if(!canvas){canvas=document.createElement('canvas');canvas.id='c'+n;wrap.appendChild(canvas);}
  canvas.width=vp.width;canvas.height=vp.height;
  await p.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  document.getElementById('pn').textContent=n;
  rendering=false;
}

pdfjsLib.getDocument('${uri}').promise.then(doc=>{
  pdf=doc;
  document.getElementById('pc').textContent=doc.numPages;
  loading.style.display='none';
  wrap.style.display='flex';
  renderPage(page);
}).catch(e=>{
  loading.style.display='none';
  err.style.display='block';
  err.textContent='Cannot load PDF: '+e.message;
});

function changePage(d){
  if(!pdf)return;
  const next=page+d;
  if(next<1||next>pdf.numPages)return;
  page=next;renderPage(page);
  wrap.scrollTo({top:0,behavior:'smooth'});
}
function zoom(d){scale=Math.min(Math.max(scale+d,0.5),3.5);renderPage(page);}
</script></body></html>`;
}

function buildOfficeViewerHtml(uri: string): string {
  const src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(uri)}`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}
iframe{width:100vw;height:100vh;border:none;display:block}</style>
</head><body>
<iframe src="${src}" allowfullscreen></iframe>
</body></html>`;
}

function buildTextHtml(text: string, name: string): string {
  const ext   = name.split('.').pop()?.toLowerCase() ?? '';
  const isCode= ['js','ts','jsx','tsx','html','css','json','xml','yaml','yml','md'].includes(ext);
  const isMd  = ext === 'md';
  const esc   = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (isCode && !isMd) return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;padding:0}
pre{padding:20px;font-family:'Courier New',monospace;font-size:12px;
    line-height:1.7;color:#38bdf8;white-space:pre-wrap;word-break:break-all;
    tab-size:2;overflow-x:auto}
.line-num{color:#334155;user-select:none;margin-right:16px;min-width:28px;display:inline-block;text-align:right}
</style></head><body>
<pre>${esc.split('\n').map((l,i)=>`<span class="line-num">${i+1}</span>${l}`).join('\n')}</pre>
</body></html>`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;padding:20px;font-family:-apple-system,sans-serif;font-size:14px;color:#1e293b;line-height:1.7}
p{margin-bottom:12px}
</style></head><body>
<div>${esc.replace(/\n/g,'<br/>')}</div>
</body></html>`;
}

// ── Document Viewer ────────────────────────────────────────────────────────
function DocumentViewer({ file, onClose }: { file: LibreFile; onClose: () => void }) {
  const [textContent, setTextContent] = useState('');
  const [webLoading,  setWebLoading]  = useState(true);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const type  = getPreviewType(file);
  const ic    = getIconColor(file.type, file.name);
  const isLocal = !file.data.startsWith('http') && !file.data.startsWith('data:');

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (type !== 'text') return;
    (async () => {
      try {
        const src = Platform.OS !== 'web'
          ? await FileSystem.readAsStringAsync(file.data)
          : file.data.startsWith('data:')
            ? atob(file.data.split(',')[1])
            : await (await fetch(file.data)).text();
        setTextContent(src);
      } catch { setTextContent('Could not read file.'); }
    })();
  }, [file]);

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose);
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });

  // ── Fallback card ──
  const FallbackCard = ({ label }: { label: string }) => (
    <View style={vStyles.fallback}>
      <View style={[vStyles.fallbackIcon, { backgroundColor: ic.bg }]}>
        {getIcon(file.type, 52, file.name)}
      </View>
      <Text style={vStyles.fallbackName} numberOfLines={2}>{file.name}</Text>
      <Text style={vStyles.fallbackSub}>{label}</Text>
      <TouchableOpacity style={[vStyles.openBtn, { backgroundColor: ic.color }]} onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
        <ExternalLink size={15} color="#fff" />
        <Text style={vStyles.openBtnText}>Open with App</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Loading spinner overlay ──
  const LoadingOverlay = () => webLoading ? (
    <View style={vStyles.loadingOverlay}>
      <View style={vStyles.loadingCard}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={vStyles.loadingText}>Loading preview…</Text>
      </View>
    </View>
  ) : null;

  const renderBody = () => {
    // IMAGE
    if (type === 'image') return (
      <View style={vStyles.imageBg}>
        <Image
          source={{ uri: file.data }}
          style={vStyles.imageFile}
          resizeMode="contain"
          onLoad={() => setImgLoaded(true)}
        />
        {!imgLoaded && (
          <View style={vStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    );

    // TEXT / CODE
    if (type === 'text') return (
      <View style={{ flex: 1 }}>
        <WebView
          style={{ flex: 1 }}
          originWhitelist={['*']}
          source={{ html: buildTextHtml(textContent, file.name) }}
          onLoadEnd={() => setWebLoading(false)}
          showsVerticalScrollIndicator={false}
          scrollEnabled
        />
        <LoadingOverlay />
      </View>
    );

    // PDF
    if (type === 'pdf') return (
      <View style={{ flex: 1 }}>
        <WebView
          style={{ flex: 1 }}
          originWhitelist={['*']}
          source={{ html: buildPdfHtml(file.data) }}
          onLoadEnd={() => setWebLoading(false)}
          javaScriptEnabled
          allowFileAccess
          mixedContentMode="always"
          showsVerticalScrollIndicator={false}
        />
        <LoadingOverlay />
      </View>
    );

    // OFFICE
    if (type === 'office') {
      if (isLocal) return (
        <FallbackCard label="Office files can only be previewed via a public URL. Tap below to open in a compatible app on your device." />
      );
      return (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            source={{ html: buildOfficeViewerHtml(file.data) }}
            onLoadEnd={() => setWebLoading(false)}
            javaScriptEnabled
          />
          <LoadingOverlay />
        </View>
      );
    }

    return <FallbackCard label="No preview available for this file type." />;
  };

  return (
    <Animated.View style={[vStyles.container, { transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={vStyles.header}>
        <TouchableOpacity onPress={handleClose} style={vStyles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={vStyles.headerMeta}>
          <View style={[vStyles.headerTypeTag, { backgroundColor: ic.bg }]}>
            {getIcon(file.type, 11, file.name)}
            <Text style={[vStyles.headerTypeText, { color: ic.color }]}>
              {file.name.split('.').pop()?.toUpperCase()}
            </Text>
          </View>
          <Text style={vStyles.headerName} numberOfLines={1}>{file.name}</Text>
          <Text style={vStyles.headerSize}>{formatSize(file.size)} · {format(file.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={() => Sharing.shareAsync(file.data)} style={vStyles.shareBtn} activeOpacity={0.7}>
          <Download size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={vStyles.body}>{renderBody()}</View>

      {/* Footer */}
      <View style={vStyles.footer}>
        <TouchableOpacity style={vStyles.footerBtn} onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
          <Download size={15} color="#fff" />
          <Text style={vStyles.footerBtnText}>Share / Export</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const vStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1 },
  headerTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  headerTypeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  headerName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  headerSize: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  shareBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1 },

  imageBg:   { flex: 1, backgroundColor: '#0f172a' },
  imageFile: { flex: 1, width: '100%' },

  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12 },
  fallbackIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fallbackName: { fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  fallbackSub:  { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  openBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  openBtnText:  { color: '#fff', fontSize: 12, fontWeight: '800' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
  loadingCard: { alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 28, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  footer: { padding: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  footerBtn: { backgroundColor: '#0f172a', height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  footerBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
});

// ── Main Page ──────────────────────────────────────────────────────────────
export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files,      setFiles]      = useState<LibreFile[]>([]);
  const [folders,    setFolders]    = useState<LibreFolder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [category,   setCategory]   = useState<Category>('all');
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
  const [noteName,    setNoteName]    = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote,  setSavingNote]  = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeFolderId
        ? await db.files.where('folderId').equals(activeFolderId).toArray()
        : await db.files.toArray();
      const sorted = [...query].sort((a, b) => {
        if (sortOption === 'newest')    return b.createdAt - a.createdAt;
        if (sortOption === 'oldest')    return a.createdAt - b.createdAt;
        if (sortOption === 'name-asc')  return a.name.localeCompare(b.name);
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
        const dir  = FileSystem.documentDirectory + 'libre_files/';
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
      await db.files.add({ id: Date.now(), name, type: mimeType ?? 'application/octet-stream', size: size ?? 0, data: finalUri, folderId: activeFolderId, createdAt: Date.now() });
      Alert.alert('✓ Uploaded', `"${name}" added successfully.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to pick file.'); }
    finally { setUploading(false); }
  };

  const toggleStar  = async (file: LibreFile) => { await db.files.update(file.id!, { starred: !(file as any).starred } as any); fetchFiles(); };
  const deleteFile  = (id: number) => Alert.alert('Delete', 'Permanently delete this file?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await db.files.delete(id); fetchFiles(); } },
  ]);
  const renameFile  = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false); setEditingFile(null); setNewFileName(''); fetchFiles();
  };
  const deleteSelected = () => Alert.alert('Delete', `Delete ${selectedIds.size} file(s)?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      await Promise.all(Array.from(selectedIds).map(id => db.files.delete(id as number)));
      setIsSelectMode(false); setSelectedIds(new Set()); fetchFiles();
    }},
  ]);
  const moveSelected = async (folderId: number | null) => {
    await Promise.all(Array.from(selectedIds).map(id => db.files.update(id as number, { folderId: folderId ?? undefined })));
    setShowMoveModal(false); setIsSelectMode(false); setSelectedIds(new Set()); fetchFiles();
  };
  const createNote = async () => {
    if (!noteName.trim()) { Alert.alert('Error', 'Enter a note name.'); return; }
    setSavingNote(true);
    try {
      let name = noteName.trim();
      if (!name.endsWith('.txt') && !name.endsWith('.md')) name += '.txt';
      let uri = '';
      if (Platform.OS !== 'web') {
        const dir  = FileSystem.documentDirectory + 'libre_files/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        uri = dir + Date.now() + '_' + name;
        await FileSystem.writeAsStringAsync(uri, noteContent);
      } else {
        uri = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(noteContent)))}`;
      }
      await db.files.add({ id: Date.now(), name, type: 'text/plain', size: noteContent.length, data: uri, folderId: activeFolderId, createdAt: Date.now() });
      setShowNoteModal(false); setNoteName(''); setNoteContent('');
      Alert.alert('✓ Created', `Note "${name}" saved.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to create note.'); }
    finally { setSavingNote(false); }
  };

  const renderFile = ({ item }: { item: LibreFile }) => {
    const isSelected = selectedIds.has(item.id!);
    const starred    = !!(item as any).starred;
    const ic         = getIconColor(item.type, item.name);
    const hasPreview = getPreviewType(item) !== 'none';
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
          {getIcon(item.type, 18, item.name)}
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>{formatSize(item.size)} · {format(item.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        {hasPreview && !isSelectMode && (
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
        <FolderIcon size={18} color="#f59e0b" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>{item.name}</Text>
        <Text style={styles.fileMeta}>Folder</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Top block: header + tabs + search ── */}
      <View style={styles.topBlock}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Files</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionCard} onPress={pickDocument} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color="#2563eb" size="small" />
                : <><Upload size={13} color="#2563eb" /><Text style={styles.actionCardText}>Upload</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]} onPress={() => setShowNoteModal(true)}>
              <Plus size={13} color="#10b981" /><Text style={[styles.actionCardText, { color: '#10b981' }]}>Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {CATEGORIES.map(cat => {
            const Icon     = cat.icon;
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Search + sort */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={13} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search files…"
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
              {sortOption === 'newest' ? 'New' : sortOption === 'oldest' ? 'Old' : sortOption === 'name-asc' ? 'A–Z' : 'Z–A'}
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
              <FolderIcon size={36} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Folders Yet</Text>
              <Text style={styles.emptySub}>Create folders from the Library tab</Text>
            </View>
          ) : (
            <FlatList data={folders} renderItem={renderFolder} keyExtractor={i => String(i.id)} contentContainerStyle={styles.listContent} />
          )
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <File size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Files Here'}</Text>
            <Text style={styles.emptySub}>{searchQuery ? 'Try a different keyword' : 'Upload a file to get started'}</Text>
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

      {/* Document Viewer */}
      {viewingFile && <DocumentViewer file={viewingFile} onClose={() => setViewingFile(null)} />}

      {/* ── Sort sheet ── */}
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
                  <Text style={[styles.sheetOptionText, sortOption === id && { color: '#2563eb', fontWeight: '700' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSortOptions(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.overlayCenter} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename File</Text>
            <TextInput
              style={styles.dialogInput}
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameFile}
            />
            <TouchableOpacity style={styles.dialogBtn} onPress={renameFile}>
              <Text style={styles.dialogBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRenameModal(false); setEditingFile(null); }}>
              <Text style={styles.dialogCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Move modal ── */}
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

      {/* ── New Note modal — keyboard aware ── */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Create Note</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="Filename (e.g. my_note.txt)"
              placeholderTextColor="#94a3b8"
              value={noteName}
              onChangeText={setNoteName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.dialogInput, styles.noteBody]}
              placeholder="Write your note here…"
              placeholderTextColor="#cbd5e1"
              multiline
              value={noteContent}
              onChangeText={setNoteContent}
              textAlignVertical="top"
              scrollEnabled
            />
            <TouchableOpacity style={[styles.dialogBtn, { marginTop: 12 }]} onPress={createNote} disabled={savingNote}>
              {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogBtnText}>Create Note</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => { setShowNoteModal(false); setNoteName(''); setNoteContent(''); }}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f1f5f9' },

  // ── Top block ──
  topBlock: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 0 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  title:          { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerActions:  { flexDirection: 'row', gap: 8 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
  },
  actionCardText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  // ── Chips ──
  tabsScroll:   { height: 44 },
  tabsContent:  { paddingHorizontal: 14, paddingVertical: 7, gap: 7, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    height: 28,
  },
  tabText:      { fontSize: 10, fontWeight: '700', color: '#64748b' },
  tabCount:     { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabCountText: { fontSize: 8, fontWeight: '900' },

  // ── Search ──
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 11, height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 11, height: 38,
  },
  sortBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  // ── Select bar ──
  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 12, marginBottom: 0, backgroundColor: '#0f172a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  selectCount:      { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  selectAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  selectActionText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // ── File list ──
  listContent: { padding: 12, paddingTop: 10, gap: 8 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  fileItemSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  checkbox:       { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  checkboxInner:  { width: 7, height: 7, backgroundColor: '#fff', borderRadius: 1.5 },
  fileIconWrap:   { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileInfo:       { flex: 1 },
  fileName:       { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  fileMeta:       { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  previewBadge:   { width: 22, height: 22, borderRadius: 7, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  actionBtn:      { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  emptyBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptySub:   { fontSize: 11, color: '#cbd5e1', textAlign: 'center' },

  // ── Sheets & dialogs ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 36,
    gap: 4,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10 },
  sheetOptionActive: { backgroundColor: '#eff6ff' },
  sheetOptionText:   { fontSize: 14, fontWeight: '500', color: '#475569' },
  sheetCancel:       { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetCancelText:   { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog:        { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center', gap: 4 },
  dialogTitle:   { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  dialogInput: {
    width: '100%', backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 13,
    fontSize: 14, color: '#1e293b',
  },
  noteBody:      { height: 130, marginTop: 8, textAlignVertical: 'top' },
  dialogBtn:     { backgroundColor: '#2563eb', width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dialogBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  dialogCancel:  { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 },
});
