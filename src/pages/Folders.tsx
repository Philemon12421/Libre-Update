import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, Alert, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import {
  Folder as FolderIcon, Plus, X, Edit2, Trash2,
  ChevronRight, FolderOpen, FileText, Image as ImageIcon,
  File, Layout, BookOpen, ArrowLeft, MoreVertical,
  Search, Upload,
} from 'lucide-react-native';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';
import FilesPage from './Files';

// ── Colour palette for folders ─────────────────────────────────────────────
const FOLDER_COLORS = [
  { id: 'blue',   color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
  { id: 'purple', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'green',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'orange', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'pink',   color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  { id: 'teal',   color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'yellow', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'slate',  color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
];

function getFolderStyle(colorId?: string) {
  return FOLDER_COLORS.find(c => c.id === colorId) ?? FOLDER_COLORS[0];
}

function getFileTypeIcon(type: string, name: string, size = 14) {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf')   || ext === 'pdf')                                return <FileText  size={size} color="#ef4444" />;
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return <ImageIcon size={size} color="#10b981" />;
  if (t.includes('word')  || ['doc','docx'].includes(ext))                 return <FileText  size={size} color="#2563eb" />;
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))          return <Layout    size={size} color="#f97316" />;
  if (t.includes('text')  || ['txt','md'].includes(ext))                   return <BookOpen  size={size} color="#6366f1" />;
  return <File size={size} color="#94a3b8" />;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Folder card ────────────────────────────────────────────────────────────
function FolderCard({
  folder, fileCount, previewFiles,
  onOpen, onRename, onDelete, onChangeColor,
}: {
  folder: LibreFolder;
  fileCount: number;
  previewFiles: LibreFile[];
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onChangeColor: () => void;
}) {
  const fs      = getFolderStyle((folder as any).color);
  const scaleAn = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scaleAn, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scaleAn, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[fc.card, { transform: [{ scale: scaleAn }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onOpen}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={fc.touchArea}
      >
        {/* Top row */}
        <View style={fc.topRow}>
          {/* Folder icon */}
          <View style={[fc.iconWrap, { backgroundColor: fs.bg, borderColor: fs.border }]}>
            <FolderIcon size={26} color={fs.color} fill={fs.bg} />
          </View>

          {/* Actions */}
          <View style={fc.actions}>
            <TouchableOpacity style={fc.actionBtn} onPress={onRename} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Edit2 size={13} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={fc.actionBtn} onPress={onChangeColor} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[fc.colorDot, { backgroundColor: fs.color }]} />
            </TouchableOpacity>
            <TouchableOpacity style={fc.actionBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={13} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Folder name */}
        <Text style={fc.name} numberOfLines={1}>{folder.name}</Text>

        {/* File count + meta */}
        <Text style={fc.meta}>
          {fileCount === 0 ? 'Empty' : `${fileCount} file${fileCount > 1 ? 's' : ''}`}
          {(folder as any).createdAt ? ` · ${format((folder as any).createdAt, 'MMM d')}` : ''}
        </Text>

        {/* Preview strip */}
        {previewFiles.length > 0 && (
          <View style={fc.previewStrip}>
            {previewFiles.slice(0, 4).map((f, i) => (
              <View
                key={f.id}
                style={[fc.previewItem, { backgroundColor: fs.bg, borderColor: fs.border, marginLeft: i > 0 ? 4 : 0 }]}
              >
                {getFileTypeIcon(f.type, f.name, 12)}
              </View>
            ))}
            {fileCount > 4 && (
              <View style={[fc.previewMore, { backgroundColor: fs.color }]}>
                <Text style={fc.previewMoreText}>+{fileCount - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Open arrow */}
        <View style={[fc.openRow, { borderTopColor: fs.border }]}>
          <Text style={[fc.openText, { color: fs.color }]}>Open folder</Text>
          <ChevronRight size={13} color={fs.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const fc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  touchArea:  { padding: 16 },
  topRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  iconWrap:   { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actions:    { flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionBtn:  { width: 30, height: 30, borderRadius: 9, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  colorDot:   { width: 10, height: 10, borderRadius: 5 },
  name:       { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  meta:       { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 12 },
  previewStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  previewItem: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewMore: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  previewMoreText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  openRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 0 },
  openText:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});

// ── Folder detail (inside view) ────────────────────────────────────────────
function FolderDetail({
  folder, onBack,
}: {
  folder: LibreFolder;
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fs        = getFolderStyle((folder as any).color);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onBack);
  };

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Animated.View style={[fd.container, { transform: [{ translateX }] }]}>
      {/* Coloured accent strip */}
      <View style={[fd.accentStrip, { backgroundColor: fs.color }]} />
      {/* Header */}
      <View style={fd.header}>
        <TouchableOpacity onPress={handleBack} style={[fd.backBtn, { backgroundColor: fs.bg }]} activeOpacity={0.7}>
          <ArrowLeft size={20} color={fs.color} />
        </TouchableOpacity>
        <View style={[fd.folderIconSmall, { backgroundColor: fs.bg }]}>
          <FolderOpen size={20} color={fs.color} />
        </View>
        <View style={fd.headerText}>
          <Text style={fd.headerName} numberOfLines={1}>{folder.name}</Text>
          <Text style={[fd.headerSub, { color: fs.color }]}>FOLDER</Text>
        </View>
      </View>

      {/* Files inside this folder — reuse FilesPage with folderId */}
      <View style={{ flex: 1 }}>
        <FilesPage activeFolderId={folder.id} />
      </View>
    </Animated.View>
  );
}

const fd = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    zIndex: 50,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 14,
    backgroundColor: '#fff',

  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  folderIconSmall: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  accentStrip:  { height: 4, width: '100%' },
  headerText:   { flex: 1 },
  headerName:   { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  headerSub:    { fontSize: 10, fontWeight: '700', marginTop: 1, letterSpacing: 1.5 },
});

// ── Main Folders Page ──────────────────────────────────────────────────────
export default function FoldersPage() {
  const [folders,         setFolders]         = useState<LibreFolder[]>([]);
  const [fileCounts,      setFileCounts]       = useState<Record<number, number>>({});
  const [previewMap,      setPreviewMap]       = useState<Record<number, LibreFile[]>>({});
  const [loading,         setLoading]          = useState(true);
  const [searchQuery,     setSearchQuery]      = useState('');
  const [openFolder,      setOpenFolder]       = useState<LibreFolder | null>(null);
  const [showCreateModal, setShowCreateModal]  = useState(false);
  const [showRenameModal, setShowRenameModal]  = useState(false);
  const [showColorModal,  setShowColorModal]   = useState(false);
  const [editingFolder,   setEditingFolder]    = useState<LibreFolder | null>(null);
  const [newFolderName,   setNewFolderName]    = useState('');
  const [selectedColor,   setSelectedColor]    = useState('blue');
  const [saving,          setSaving]           = useState(false);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const all   = await db.folders.toArray();
      const files = await db.files.toArray();

      // Count files per folder
      const counts: Record<number, number> = {};
      const previews: Record<number, LibreFile[]> = {};
      all.forEach(f => { counts[f.id!] = 0; previews[f.id!] = []; });
      files.forEach(file => {
        if (file.folderId != null) {
          counts[file.folderId] = (counts[file.folderId] ?? 0) + 1;
          if ((previews[file.folderId] ?? []).length < 4) {
            previews[file.folderId] = [...(previews[file.folderId] ?? []), file];
          }
        }
      });

      setFolders(all);
      setFileCounts(counts);
      setPreviewMap(previews);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const createFolder = async () => {
    if (!newFolderName.trim()) { Alert.alert('Error', 'Enter a folder name.'); return; }
    setSaving(true);
    try {
      await db.folders.add({
        name: newFolderName.trim(),
        color: selectedColor,
        createdAt: Date.now(),
      } as any);
      setShowCreateModal(false);
      setNewFolderName('');
      setSelectedColor('blue');
      fetchFolders();
    } catch { Alert.alert('Error', 'Could not create folder.'); }
    finally { setSaving(false); }
  };

  const renameFolder = async () => {
    if (!newFolderName.trim() || !editingFolder?.id) return;
    setSaving(true);
    try {
      await db.folders.update(editingFolder.id, { name: newFolderName.trim() } as any);
      setShowRenameModal(false);
      setEditingFolder(null);
      setNewFolderName('');
      fetchFolders();
    } catch { Alert.alert('Error', 'Could not rename folder.'); }
    finally { setSaving(false); }
  };

  const changeColor = async (colorId: string) => {
    if (!editingFolder?.id) return;
    await db.folders.update(editingFolder.id, { color: colorId } as any);
    setShowColorModal(false);
    setEditingFolder(null);
    fetchFolders();
  };

  const deleteFolder = (folder: LibreFolder) => {
    const count = fileCounts[folder.id!] ?? 0;
    Alert.alert(
      'Delete Folder',
      count > 0
        ? `"${folder.name}" contains ${count} file(s). Deleting will move them to root. Continue?`
        : `Delete "${folder.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            // Move files to root
            const files = await db.files.where('folderId').equals(folder.id!).toArray();
            await Promise.all(files.map(f => db.files.update(f.id!, { folderId: undefined } as any)));
            await db.folders.delete(folder.id!);
            fetchFolders();
          },
        },
      ]
    );
  };

  const filtered = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalFiles   = Object.values(fileCounts).reduce((a, b) => a + b, 0);
  const totalFolders = folders.length;

  if (loading) return (
    <View style={styles.loadingBox}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.topBlock}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Library</Text>
            <Text style={styles.subtitle}>{totalFolders} folders · {totalFiles} files</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => { setNewFolderName(''); setSelectedColor('blue'); setShowCreateModal(true); }}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#fff" strokeWidth={2.5} />
            <Text style={styles.newBtnText}>New Folder</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={13} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search folders…"
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
        </View>
      </View>

      {/* ── Stats row ── */}
      {folders.length > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: 'Folders', value: totalFolders, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Files',   value: totalFiles,   color: '#10b981', bg: '#ecfdf5' },
            { label: 'Used',    value: totalFiles > 0 ? `${totalFiles}` : '—', color: '#7c3aed', bg: '#f5f3ff' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Folder grid ── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIllustration}>
            <FolderIcon size={52} color="#bfdbfe" />
          </View>
          <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Folders Yet'}</Text>
          <Text style={styles.emptySub}>
            {searchQuery ? 'Try a different keyword' : 'Tap "New Folder" to organise your files'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => { setNewFolderName(''); setSelectedColor('blue'); setShowCreateModal(true); }}
              activeOpacity={0.85}
            >
              <Plus size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Create First Folder</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <FolderCard
                folder={item}
                fileCount={fileCounts[item.id!] ?? 0}
                previewFiles={previewMap[item.id!] ?? []}
                onOpen={() => setOpenFolder(item)}
                onRename={() => { setEditingFolder(item); setNewFolderName(item.name); setShowRenameModal(true); }}
                onDelete={() => deleteFolder(item)}
                onChangeColor={() => { setEditingFolder(item); setShowColorModal(true); }}
              />
            </View>
          )}
        />
      )}

      {/* ── Folder detail overlay ── */}
      {openFolder && (
        <FolderDetail
          folder={openFolder}
          onBack={() => { setOpenFolder(null); fetchFolders(); }}
        />
      )}

      {/* ── Create folder modal ── */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>New Folder</Text>

            <TextInput
              style={styles.input}
              placeholder="Folder name"
              placeholderTextColor="#94a3b8"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createFolder}
            />

            {/* Colour picker */}
            <Text style={styles.colorLabel}>Choose colour</Text>
            <View style={styles.colorRow}>
              {FOLDER_COLORS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.colorChip, { backgroundColor: c.bg, borderColor: selectedColor === c.id ? c.color : c.border }]}
                  onPress={() => setSelectedColor(c.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorCircle, { backgroundColor: c.color }]} />
                  {selectedColor === c.id && <View style={[styles.colorCheck, { backgroundColor: c.color }]} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={[styles.folderPreview, { backgroundColor: getFolderStyle(selectedColor).bg }]}>
              <FolderIcon size={22} color={getFolderStyle(selectedColor).color} />
              <Text style={[styles.folderPreviewName, { color: getFolderStyle(selectedColor).color }]} numberOfLines={1}>
                {newFolderName || 'Folder name'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: getFolderStyle(selectedColor).color }]}
              onPress={createFolder}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create Folder</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.overlayCenter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename Folder</Text>
            <TextInput
              style={styles.input}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameFolder}
            />
            <TouchableOpacity style={styles.createBtn} onPress={renameFolder} activeOpacity={0.85} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowRenameModal(false); setEditingFolder(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change colour modal ── */}
      <Modal visible={showColorModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Change Colour</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.colorGridItem, { backgroundColor: c.bg, borderColor: c.border }]}
                  onPress={() => changeColor(c.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorGridCircle, { backgroundColor: c.color }]} />
                  <Text style={[styles.colorGridLabel, { color: c.color }]}>
                    {c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowColorModal(false); setEditingFolder(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f1f5f9' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Top ──
  topBlock: {
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  title:    { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  newBtnText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

  searchRow: { paddingHorizontal: 18, paddingBottom: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4,
  },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },

  // ── Grid ──
  grid:    { padding: 14, paddingTop: 10, paddingBottom: 40 },
  gridRow: { gap: 12, marginBottom: 12 },
  gridCell:{ flex: 1 },

  // ── Empty ──
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 },
  emptyIllustration: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  emptySub:   { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  emptyBtnText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  // ── Modals ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 40 : 28, gap: 6,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },

  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#0f172a', fontWeight: '600',
  },

  colorLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 },
  colorRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  colorChip: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  colorCircle: { width: 18, height: 18, borderRadius: 9 },
  colorCheck: {
    position: 'absolute', bottom: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#fff',
  },

  folderPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
  },
  folderPreviewName: { fontSize: 14, fontWeight: '800', flex: 1 },

  createBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  createBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  cancelBtn:     { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog:        { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, gap: 10 },
  dialogTitle:   { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },

  colorGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorGridItem:  { width: '22%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 },
  colorGridCircle:{ width: 22, height: 22, borderRadius: 11 },
  colorGridLabel: { fontSize: 9, fontWeight: '800', textTransform: 'capitalize' },
});
