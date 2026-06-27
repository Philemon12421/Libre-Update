import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, File, Download, Trash2,
  Upload, X, Edit2, Plus, FolderPlus, Search,
  ArrowUpDown, BookOpen, FileCode, Layout, Star,
  Folder as FolderIcon, MoreHorizontal,
} from 'lucide-react-native';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

type Category =
  | 'all' | 'pdf' | 'word' | 'ppt' | 'txt'
  | 'image' | 'dirs' | 'favorites' | 'others';

const CATEGORIES: { id: Category; label: string; icon: any; color: string }[] = [
  { id: 'all',       label: 'All',       icon: File,       color: '#64748b' },
  { id: 'pdf',       label: 'PDF',       icon: FileText,   color: '#ef4444' },
  { id: 'word',      label: 'Word',      icon: FileText,   color: '#2563eb' },
  { id: 'ppt',       label: 'PPT',       icon: Layout,     color: '#f97316' },
  { id: 'txt',       label: 'Text',      icon: BookOpen,   color: '#6366f1' },
  { id: 'image',     label: 'Images',    icon: ImageIcon,  color: '#10b981' },
  { id: 'dirs',      label: 'Folders',   icon: FolderIcon, color: '#f59e0b' },
  { id: 'favorites', label: 'Starred',   icon: Star,       color: '#ec4899' },
  { id: 'others',    label: 'Others',    icon: MoreHorizontal, color: '#94a3b8' },
];

function matchCategory(file: LibreFile, cat: Category): boolean {
  const t = (file.type ?? '').toLowerCase();
  const n = (file.name ?? '').toLowerCase();
  const ext = n.split('.').pop() ?? '';

  switch (cat) {
    case 'all': return true;
    case 'pdf': return t.includes('pdf') || ext === 'pdf';
    case 'word':
      return t.includes('word') || t.includes('msword') ||
        ['doc', 'docx', 'odt', 'rtf'].includes(ext);
    case 'ppt':
      return t.includes('presentation') || t.includes('powerpoint') ||
        ['ppt', 'pptx', 'odp'].includes(ext);
    case 'txt':
      return t.includes('text') || t.includes('json') ||
        ['txt', 'md', 'csv', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'xml', 'yaml', 'yml'].includes(ext);
    case 'image':
      return t.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(ext);
    case 'dirs': return false; // shown separately
    case 'favorites': return !!(file as any).starred;
    case 'others': {
      const known =
        t.includes('pdf') || t.includes('word') || t.includes('msword') ||
        t.includes('presentation') || t.includes('powerpoint') ||
        t.includes('text') || t.includes('json') || t.includes('image') ||
        ['doc','docx','odt','rtf','ppt','pptx','odp','txt','md','csv','json',
         'js','ts','jsx','tsx','html','css','xml','yaml','yml',
         'jpg','jpeg','png','gif','webp','svg','bmp','heic','pdf'].includes(ext);
      return !known;
    }
    default: return true;
  }
}

function getIcon(type: string, size = 18, name = '') {
  const t = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf') || ext === 'pdf')
    return <FileText color="#ef4444" size={size} />;
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext))
    return <ImageIcon color="#10b981" size={size} />;
  if (t.includes('text') || ['txt','md'].includes(ext))
    return <BookOpen color="#6366f1" size={size} />;
  if (t.includes('word') || ['doc','docx'].includes(ext))
    return <FileText color="#2563eb" size={size} />;
  if (t.includes('sheet') || t.includes('excel') || ['xls','xlsx'].includes(ext))
    return <Layout color="#10b981" size={size} />;
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))
    return <Layout color="#f97316" size={size} />;
  if (t.includes('javascript') || t.includes('json') || t.includes('code'))
    return <FileCode color="#f59e0b" size={size} />;
  return <File color="#94a3b8" size={size} />;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files, setFiles] = useState<LibreFile[]>([]);
  const [folders, setFolders] = useState<LibreFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const [previewFile, setPreviewFile] = useState<LibreFile | null>(null);
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingFile, setEditingFile] = useState<LibreFile | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteName, setNoteName] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = activeFolderId
        ? await db.files.where('folderId').equals(activeFolderId).toArray()
        : await db.files.toArray();

      const sorted = [...query].sort((a, b) => {
        if (sortOption === 'newest') return b.createdAt - a.createdAt;
        if (sortOption === 'oldest') return a.createdAt - b.createdAt;
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
      setFiles(sorted);
      setFolders(await db.folders.toArray());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, sortOption]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    if (!previewFile) { setTextContent(''); return; }
    const ext = previewFile.name.split('.').pop()?.toLowerCase() ?? '';
    const t = previewFile.type.toLowerCase();
    const isText = t.includes('text') || t.includes('json') ||
      ['txt','md','json','js','ts','jsx','tsx','html','css','csv','yaml','yml'].includes(ext);
    if (!isText) return;
    setLoadingText(true);
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const src = previewFile.data.startsWith('data:')
            ? atob(previewFile.data.split(',')[1])
            : await (await fetch(previewFile.data)).text();
          setTextContent(src);
        } else {
          setTextContent(await FileSystem.readAsStringAsync(previewFile.data));
        }
      } catch { setTextContent('Could not read file.'); }
      finally { setLoadingText(false); }
    })();
  }, [previewFile]);

  // Category counts
  const counts: Record<Category, number> = {} as any;
  CATEGORIES.forEach(c => {
    counts[c.id] = c.id === 'dirs'
      ? folders.length
      : files.filter(f => matchCategory(f, c.id)).length;
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
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file.');
    } finally {
      setUploading(false);
    }
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
    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && styles.fileItemSelected]}
        onPress={() => isSelectMode ? (setSelectedIds(prev => { const s = new Set(prev); s.has(item.id!) ? s.delete(item.id!) : s.add(item.id!); return s; })) : setPreviewFile(item)}
        onLongPress={() => { setIsSelectMode(true); setSelectedIds(new Set([item.id!])); }}
        activeOpacity={0.7}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <View style={styles.checkboxInner} />}
          </View>
        )}
        <View style={styles.fileIconWrap}>{getIcon(item.type, 18, item.name)}</View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>{formatSize(item.size)} · {format(item.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleStar(item)} style={styles.actionBtn}>
          <Star size={14} color={starred ? '#f59e0b' : '#cbd5e1'} fill={starred ? '#f59e0b' : 'none'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setEditingFile(item); setNewFileName(item.name); setShowRenameModal(true); }} style={styles.actionBtn}>
          <Edit2 size={14} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteFile(item.id!)} style={styles.actionBtn}>
          <Trash2 size={14} color="#94a3b8" />
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
      {/* Header */}
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

      {/* Category tabs */}
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
              <Icon size={12} color={isActive ? '#fff' : cat.color} strokeWidth={2} />
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
          <Search size={14} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files..."
            placeholderTextColor="#cbd5e1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortOptions(true)}>
          <ArrowUpDown size={14} color="#64748b" />
          <Text style={styles.sortBtnText}>
            {sortOption === 'newest' ? 'New' : sortOption === 'oldest' ? 'Old' : sortOption === 'name-asc' ? 'A-Z' : 'Z-A'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Select mode toolbar */}
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
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
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

      {/* Preview Modal */}
      <Modal visible={!!previewFile} animationType="slide">
        {previewFile && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {getIcon(previewFile.type, 20, previewFile.name)}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.previewName} numberOfLines={1}>{previewFile.name}</Text>
                  <Text style={styles.previewSize}>{formatSize(previewFile.size)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setPreviewFile(null)}>
                <X size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewBody}>
              {previewFile.type.includes('image') ? (
                <Image source={{ uri: previewFile.data }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              ) : loadingText ? (
                <ActivityIndicator color="#3b82f6" />
              ) : textContent ? (
                <ScrollView style={styles.textScroll}>
                  <Text style={styles.textContent}>{textContent}</Text>
                </ScrollView>
              ) : (
                <View style={styles.noPreview}>
                  <FileText size={48} color="#cbd5e1" />
                  <Text style={styles.noPreviewText}>No preview for this file type</Text>
                  <TouchableOpacity style={styles.openBtn} onPress={() => Sharing.shareAsync(previewFile.data)}>
                    <Text style={styles.openBtnText}>Open with another app</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.previewFooter}>
              <TouchableOpacity style={styles.shareBtn} onPress={() => Sharing.shareAsync(previewFile.data)}>
                <Download size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share / Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortOptions} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
            {([['newest','Newest First'],['oldest','Oldest First'],['name-asc','Name A-Z'],['name-desc','Name Z-A']] as const).map(([id, label]) => (
              <TouchableOpacity key={id} style={[styles.sheetOption, sortOption === id && styles.sheetOptionActive]}
                onPress={() => { setSortOption(id); setShowSortOptions(false); }}>
                <Text style={[styles.sheetOptionText, sortOption === id && { color: '#2563eb' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
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
                  <FolderIcon size={14} color="#f59e0b" style={{ marginRight: 8 }} />
                  <Text style={styles.sheetOptionText}>{f.name}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  actionCardText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabsContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    height: 30,
  },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabCount: {
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountText: { fontSize: 9, fontWeight: '900' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  sortBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8, backgroundColor: '#0f172a',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  selectCount: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  selectAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  selectActionText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  listContent: { padding: 16, paddingTop: 4 },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#f1f5f9',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.04)',
    elevation: 1,
  },
  fileItemSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 2,
    borderColor: '#cbd5e1', marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  checkboxInner: { width: 7, height: 7, backgroundColor: '#fff', borderRadius: 1.5 },
  fileIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  fileMeta: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  actionBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 16, textTransform: 'uppercase' },
  emptySub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  previewContainer: { flex: 1, backgroundColor: '#fff' },
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  previewName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  previewSize: { fontSize: 10, color: '#3b82f6', fontWeight: '600' },
  previewBody: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  textScroll: { flex: 1, width: '100%', backgroundColor: '#0f172a' },
  textContent: { padding: 20, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12, color: '#38bdf8', lineHeight: 20 },
  noPreview: { alignItems: 'center', padding: 40 },
  noPreviewText: { fontSize: 13, color: '#64748b', marginTop: 16, textAlign: 'center' },
  openBtn: { marginTop: 20, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  openBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  previewFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  shareBtn: {
    backgroundColor: '#0f172a', height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '60%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 16 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12 },
  sheetOptionActive: { backgroundColor: '#eff6ff' },
  sheetOptionText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  sheetCancel: { height: 50, alignItems: 'center', justifyContent: 'center' },
  sheetCancelText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center' },
  dialogTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: 20 },
  dialogInput: {
    width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b',
  },
  dialogBtn: { backgroundColor: '#2563eb', width: '100%', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  dialogBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  dialogCancel: { marginTop: 14, fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
});
