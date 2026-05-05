import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Modal, 
  TextInput,
  ViewStyle,
  TextStyle
} from 'react-native';
import { 
  FolderIcon, 
  Plus, 
  ChevronLeft, 
  FolderPlus, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  File 
} from 'lucide-react-native';
import { db, LibreFolder, LibreFile } from '../lib/db';
import { format } from 'date-fns';
import FilesPage from './Files';

const FOLDER_COLORS = [
  { name: 'blue',    color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' },
  { name: 'rose',    color: '#f43f5e', bg: '#fff1f2', border: '#ffe4e6' },
  { name: 'emerald', color: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
  { name: 'amber',   color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  { name: 'violet',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ede9fe' },
];

interface FolderWithStats extends LibreFolder {
  count: number;
  totalSize: number;
  recentFiles: LibreFile[];
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderWithStats[]>([]);
  const [activeFolder, setActiveFolder] = useState<LibreFolder | null>(null);
  const [folderFileCount, setFolderFileCount] = useState(0);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFolderColor = (colorName?: string) =>
    FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];

  const fetchFolders = useCallback(async () => {
    const allFolders = await db.folders.orderBy('createdAt').reverse().toArray();
    const foldersWithStats = await Promise.all(
      allFolders.map(async folder => {
        const filesInFolder = await db.files
          .where('folderId').equals(folder.id!)
          .sortBy('createdAt'); // Sort to get consistent preview
        
        // Reversed files for preview (most recent first)
        const recentFiles = filesInFolder.reverse().slice(0, 3);

        return {
          ...folder,
          count: filesInFolder.length,
          totalSize: filesInFolder.reduce((sum, f) => sum + (f.size || 0), 0),
          recentFiles
        };
      })
    );
    setFolders(foldersWithStats);

    if (activeFolder) {
      const count = await db.files.where('folderId').equals(activeFolder.id!).count();
      setFolderFileCount(count);
    }
  }, [activeFolder]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({ 
      name: newFolderName.trim(), 
      createdAt: Date.now(), 
      color: selectedColor,
      id: Date.now() // Simple id generation for mock
    });
    setNewFolderName('');
    setSelectedColor('blue');
    setIsCreating(false);
    fetchFolders();
  };

  const executeDelete = async (id: number) => {
    await db.files.where('folderId').equals(id).delete();
    await db.folders.delete(id);
    if (activeFolder?.id === id) setActiveFolder(null);
    setConfirmDeleteId(null);
    fetchFolders();
  };

  const getPreviewIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText size={10} color="#ef4444" />;
    if (t.includes('image')) return <ImageIcon size={10} color="#3b82f6" />;
    return <File size={10} color="#94a3b8" />;
  };

  const renderFolder = ({ item }: { item: FolderWithStats }) => {
    const color = getFolderColor(item.color);
    return (
      <TouchableOpacity
        onPress={() => setActiveFolder(item)}
        style={[styles.folderCard, { borderColor: color.border }]}
      >
        <View style={styles.folderHeader}>
          <View style={[styles.folderIconBox, { backgroundColor: color.bg }]}>
            <FolderIcon size={20} color={color.color} />
          </View>
          {item.recentFiles.length > 0 && (
            <View style={styles.previewStack}>
              {item.recentFiles.map((f, i) => (
                <View 
                  key={f.id} 
                  style={[
                    styles.previewMiniIcon, 
                    { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -10 }
                  ]}
                >
                  {getPreviewIcon(f.type)}
                </View>
              ))}
            </View>
          )}
        </View>
        <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.folderStats}>
          <View style={[styles.badge, { backgroundColor: color.bg }]}>
            <Text style={[styles.badgeText, { color: color.color }]}>{item.count} files</Text>
          </View>
          <Text style={styles.sizeText}>{formatSize(item.totalSize)}</Text>
        </View>
        <Text style={styles.dateText}>{format(item.createdAt, 'MMM d, yyyy')}</Text>

        <TouchableOpacity
          onPress={() => item.id && setConfirmDeleteId(item.id)}
          style={styles.deleteFolderBtn}
        >
          <Trash2 size={14} color="#cbd5e1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (activeFolder) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => setActiveFolder(null)}
              style={styles.backBtn}
            >
              <ChevronLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <View>
              <Text style={styles.folderTitle}>{activeFolder.name}</Text>
              <Text style={styles.folderSubtitle}>{folderFileCount} file{folderFileCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => activeFolder.id && setConfirmDeleteId(activeFolder.id)}
            style={styles.headerDeleteBtn}
          >
            <Trash2 size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <FilesPage activeFolderId={activeFolder.id} />

        {/* Delete Confirm Modal (Reuse) */}
        <Modal
          visible={confirmDeleteId !== null}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconBoxRed}>
                <Trash2 size={24} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Delete Folder?</Text>
              <Text style={styles.modalSubtitle}>
                This will permanently delete the folder and all files inside it. This cannot be undone.
              </Text>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => confirmDeleteId && executeDelete(confirmDeleteId)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setConfirmDeleteId(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Your collections</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsCreating(true)}
          style={styles.addBtn}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Folder List */}
      {folders.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconBox}>
            <FolderPlus size={32} color="#cbd5e1" />
          </View>
          <Text style={styles.emptyTitle}>No Folders Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a folder to organize your files into collections.
          </Text>
          <TouchableOpacity
            onPress={() => setIsCreating(true)}
            style={styles.createBtn}
          >
            <Text style={styles.createBtnText}>Create Folder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={folders}
          renderItem={renderFolder}
          keyExtractor={item => item.id!.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={isCreating}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <Text style={styles.modalSubtitleLabel}>Organize your files</Text>

            <View style={[styles.previewIconBox, { backgroundColor: getFolderColor(selectedColor).bg }]}>
              <FolderPlus size={32} color={getFolderColor(selectedColor).color} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Folder name..."
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <View style={styles.colorRow}>
              {FOLDER_COLORS.map(c => (
                <TouchableOpacity
                  key={c.name}
                  onPress={() => setSelectedColor(c.name)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.color },
                    selectedColor === c.name && styles.selectedColorCircle
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.confirmCreateBtn}
              onPress={createFolder}
            >
              <Text style={styles.confirmCreateText}>Create Folder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => { setIsCreating(false); setNewFolderName(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={confirmDeleteId !== null}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBoxRed}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Folder?</Text>
            <Text style={styles.modalSubtitle}>
              This will permanently delete the folder and all files inside it. This cannot be undone.
            </Text>
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => confirmDeleteId && executeDelete(confirmDeleteId)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setConfirmDeleteId(null)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    marginTop: 2,
    letterSpacing: 1,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  folderSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerDeleteBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  folderCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    width: '48%',
    position: 'relative',
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previewStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  folderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  folderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sizeText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  dateText: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  deleteFolderBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    marginBottom: 20,
  },
  createBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalSubtitleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  previewIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    borderRadius: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#0f172a',
    transform: [{ scale: 1.1 }],
  },
  confirmCreateBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmCreateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalIconBoxRed: {
    width: 56,
    height: 56,
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
