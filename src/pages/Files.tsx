import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Modal, 
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Download, 
  Trash2, 
  Upload,
  X, 
  ChevronRight, 
  Edit2, 
  Plus, 
  FolderPlus,
  Search,
  ArrowUpDown,
  BookOpen,
  FileCode,
  Layout
} from 'lucide-react-native';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const FOLDER_COLORS = [
  { name: 'blue',    color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' },
  { name: 'rose',    color: '#f43f5e', bg: '#fff1f2', border: '#ffe4e6' },
  { name: 'emerald', color: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
  { name: 'amber',   color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  { name: 'violet',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ede9fe' },
];

export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files, setFiles] = useState<LibreFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<LibreFile | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [folders, setFolders] = useState<LibreFolder[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingFile, setEditingFile] = useState<LibreFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let queryFetch;
      if (activeFolderId) {
        queryFetch = await db.files.where('folderId').equals(activeFolderId).toArray();
      } else {
        queryFetch = await db.files.toArray();
      }

      // Local sorting
      const sorted = [...queryFetch].sort((a, b) => {
        if (sortOption === 'newest') return b.createdAt - a.createdAt;
        if (sortOption === 'oldest') return a.createdAt - b.createdAt;
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });

      const allFolders = await db.folders.toArray();
      setFolders(allFolders);
      setFiles(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSelectedFileIds(new Set());
    }
  }, [activeFolderId, sortOption]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    if (previewFile) {
      const loadTextContent = async () => {
        const ext = previewFile.name.split('.').pop()?.toLowerCase();
        const t = previewFile.type.toLowerCase();
        const isText = t.includes('text') || t.includes('json') || t.includes('javascript') || t.includes('xml') ||
          ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'csv', 'yaml', 'yml'].includes(ext || '');

        if (isText) {
          setLoadingText(true);
          setTextContent('');
          try {
            if (Platform.OS === 'web') {
              if (previewFile.data.startsWith('data:')) {
                const base64Content = previewFile.data.split(',')[1];
                const binString = atob(base64Content);
                const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
                const decoded = new TextDecoder().decode(bytes);
                setTextContent(decoded);
              } else {
                const response = await fetch(previewFile.data);
                const text = await response.text();
                setTextContent(text);
              }
            } else {
              const content = await FileSystem.readAsStringAsync(previewFile.data);
              setTextContent(content);
            }
          } catch (err) {
            console.error('Failed to read text file', err);
            setTextContent('Error reading file content.');
          } finally {
            setLoadingText(false);
          }
        }
      };
      loadTextContent();
    } else {
      setTextContent('');
    }
  }, [previewFile]);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setUploading(true);
        setUploadProgress(0);
        
        const { name, size, uri, mimeType } = result.assets[0];
        
        // Simulate progress
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 95) {
              clearInterval(interval);
              return 95;
            }
            return prev + 5;
          });
        }, 50);

        let finalUri = uri;
        if (Platform.OS !== 'web') {
          const permanentDirectory = FileSystem.documentDirectory + 'libre_files/';
          const dirInfo = await FileSystem.getInfoAsync(permanentDirectory);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(permanentDirectory, { intermediates: true });
          }
          finalUri = permanentDirectory + Date.now() + '_' + name;
          await FileSystem.copyAsync({ from: uri, to: finalUri });
        } else {
          if (size && size < 2 * 1024 * 1024) {
            try {
              const response = await fetch(uri);
              const blob = await response.blob();
              const base64Promise = new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              finalUri = await base64Promise;
            } catch (err) {
              console.warn('Web base64 conversion failed, using temp URI', err);
            }
          }
        }

        await db.files.add({
          id: Date.now(),
          name,
          type: mimeType || 'application/octet-stream',
          size: size || 0,
          data: finalUri,
          folderId: activeFolderId,
          createdAt: Date.now(),
        });

        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          Alert.alert('Success', 'File added successfully');
          fetchFiles();
        }, 200);
        
        clearInterval(interval);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setUploading(false);
    }
  };

  const renameFile = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false);
    setEditingFile(null);
    setNewFileName('');
    fetchFiles();
  };

  const deleteFile = async (id: number) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await db.files.delete(id);
            fetchFiles();
          }
        }
      ]
    );
  };

  const deleteSelected = async () => {
    if (selectedFileIds.size === 0) return;
    Alert.alert(
      'Delete Selected',
      `Delete ${selectedFileIds.size} file(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await Promise.all(Array.from(selectedFileIds).map(id => db.files.delete(id as number)));
            setIsSelectMode(false);
            fetchFiles();
          }
        }
      ]
    );
  };

  const shareFile = async (file: LibreFile) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Error', 'Sharing is not available on this device');
      return;
    }
    await Sharing.shareAsync(file.data);
  };

  const toggleSelect = (id: number) => {
    const s = new Set(selectedFileIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedFileIds(s);
  };

  const moveSelected = async (folderId: number | null) => {
    if (selectedFileIds.size === 0) return;
    await Promise.all(Array.from(selectedFileIds).map(id => db.files.update(id as number, { folderId: folderId || undefined })));
    setShowMoveModal(false);
    setIsSelectMode(false);
    fetchFiles();
  };

  const getIcon = (type: string, size = 18, name = '') => {
    const t = type.toLowerCase();
    const n = name.toLowerCase();
    
    if (t.includes('pdf') || n.endsWith('.pdf')) 
      return <FileText color="#ef4444" size={size} />;
    
    if (t.includes('image')) 
      return <ImageIcon color="#3b82f6" size={size} />;
    
    if (t.includes('text') || n.endsWith('.txt')) 
      return <BookOpen color="#6366f1" size={size} />;
    
    if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) 
      return <FileText color="#2563eb" size={size} />;
    
    if (t.includes('sheet') || t.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) 
      return <Layout color="#10b981" size={size} />;
    
    if (t.includes('javascript') || t.includes('json') || t.includes('code')) 
      return <FileCode color="#f59e0b" size={size} />;
    
    return <File color="#94a3b8" size={size} />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFile = ({ item }: { item: LibreFile }) => {
    const isSelected = selectedFileIds.has(item.id!);
    return (
      <TouchableOpacity
        onPress={() => {
          if (isSelectMode) toggleSelect(item.id!);
          else setPreviewFile(item);
        }}
        style={[
          styles.fileItem,
          isSelectMode && isSelected && styles.fileItemSelected
        ]}
      >
        {isSelectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <View style={styles.checkboxInner} />}
          </View>
        )}
        <View style={styles.fileIconContainer}>
          {getIcon(item.type, 18, item.name)}
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileMeta}>
            {formatSize(item.size)} · {format(item.createdAt, 'MMM d, yyyy')}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => {
            setEditingFile(item);
            setNewFileName(item.name);
            setShowRenameModal(true);
          }}
          style={styles.actionBtn}
        >
          <Edit2 size={14} color="#94a3b8" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => deleteFile(item.id!)}
          style={styles.actionBtn}
        >
          <Trash2 size={14} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Files</Text>
          <Text style={styles.subtitle}>Resource Manager</Text>
        </View>
        
        <View style={styles.headerActions}>
          {files.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedFileIds(new Set());
              }}
              style={[styles.selectBtn, isSelectMode && styles.selectBtnActive]}
            >
              <Text style={[styles.selectBtnText, isSelectMode && styles.selectBtnTextActive]}>
                {isSelectMode ? 'Done' : 'Select'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Upload Box */}
      <TouchableOpacity 
        style={styles.uploadArea}
        onPress={pickDocument}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.progressText}>{uploadProgress}%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.uploadIconBox}>
              <Upload size={20} color="#3b82f6" />
            </View>
            <Text style={styles.uploadText}>Tap to add files</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Search & Sort Row */}
      <View style={styles.searchSortRow}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#cbd5e1"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.sortBtn}
          onPress={() => setShowSortOptions(true)}
        >
          <ArrowUpDown size={16} color="#64748b" />
          <Text style={styles.sortBtnText}>
            {sortOption === 'newest' ? 'Newest' : 
             sortOption === 'oldest' ? 'Oldest' : 
             sortOption === 'name-asc' ? 'A-Z' : 'Z-A'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#94a3b8" />
        </View>
      ) : filteredFiles.length === 0 ? (
        <View style={styles.emptyBox}>
          <FileText size={32} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Files Yet'}</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : 'Upload your first file above'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          renderItem={renderFile}
          keyExtractor={item => item.id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bulk Actions */}
      {isSelectMode && selectedFileIds.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedFileIds.size} SELECTED</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity 
              style={styles.moveBtn}
              onPress={() => setShowMoveModal(true)}
            >
              <Text style={styles.moveBtnText}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteBulkBtn}
              onPress={deleteSelected}
            >
              <Text style={styles.moveBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Preview Modal */}
      <Modal visible={!!previewFile} animationType="slide">
        {previewFile && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderInfo}>
                {getIcon(previewFile.type, 20, previewFile.name)}
                <View style={styles.previewHeaderText}>
                  <Text style={styles.previewFileName} numberOfLines={1}>{previewFile.name}</Text>
                  <Text style={styles.previewFileSize}>{formatSize(previewFile.size)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setPreviewFile(null)}>
                <X size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewBody}>
              {previewFile.type.includes('image') ? (
                <Image 
                  source={{ uri: previewFile.data }} 
                  style={styles.previewImage} 
                  resizeMode="contain"
                />
              ) : (
                (() => {
                  const ext = previewFile.name.split('.').pop()?.toLowerCase();
                  const t = previewFile.type.toLowerCase();
                  const isText = t.includes('text') || t.includes('json') || t.includes('javascript') || t.includes('xml') ||
                    ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'csv', 'yaml', 'yml'].includes(ext || '');

                  if (isText) {
                    return loadingText ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator color="#3b82f6" />
                        <Text style={styles.loadingText}>Reading file content...</Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.textPreviewScroll} contentContainerStyle={styles.textPreviewContainer}>
                        <Text style={styles.textPreviewContent}>{textContent}</Text>
                      </ScrollView>
                    );
                  }

                  return (
                    <View style={styles.noPreview}>
                      <FileText size={48} color="#cbd5e1" />
                      <Text style={styles.noPreviewText}>Preview not supported for this type</Text>
                      <TouchableOpacity 
                        style={styles.openBtn}
                        onPress={() => shareFile(previewFile)}
                      >
                        <Text style={styles.openBtnText}>Open with other app</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()
              )}
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity 
                style={styles.shareBtn}
                onPress={() => shareFile(previewFile)}
              >
                <Download size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share / Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortOptions} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.handle} />
            <Text style={styles.bottomSheetTitle}>Sort Files</Text>
            <View style={styles.sortList}>
              {[
                { id: 'newest', label: 'Newest First' },
                { id: 'oldest', label: 'Oldest First' },
                { id: 'name-asc', label: 'Name A-Z' },
                { id: 'name-desc', label: 'Name Z-A' },
              ].map((opt) => (
                <TouchableOpacity 
                  key={opt.id}
                  style={[styles.sortOption, sortOption === opt.id && styles.sortOptionActive]}
                  onPress={() => {
                    setSortOption(opt.id as SortOption);
                    setShowSortOptions(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, sortOption === opt.id && styles.sortOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.sheetCancelBtn}
              onPress={() => setShowSortOptions(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename File</Text>
            <TextInput
              style={styles.input}
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={renameFile}>
              <Text style={styles.confirmBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => { setShowRenameModal(false); setEditingFile(null); }}
            >
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Move Modal */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.handle} />
            <Text style={styles.bottomSheetTitle}>Move to folder</Text>
            <ScrollView style={styles.folderList}>
              <TouchableOpacity 
                style={styles.folderItem}
                onPress={() => moveSelected(null)}
              >
                <View style={[styles.folderIconSmall, { backgroundColor: '#f1f5f9' }]}>
                  <File size={14} color="#94a3b8" />
                </View>
                <Text style={styles.folderItemName}>Root (no folder)</Text>
              </TouchableOpacity>
              {folders.map(f => (
                <TouchableOpacity 
                  key={f.id} 
                  style={styles.folderItem}
                  onPress={() => f.id && moveSelected(f.id)}
                >
                  <View style={[styles.folderIconSmall, { backgroundColor: '#eff6ff' }]}>
                    <FolderPlus size={14} color="#3b82f6" />
                  </View>
                  <Text style={styles.folderItemName}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.sheetCancelBtn}
              onPress={() => setShowMoveModal(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
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
    paddingBottom: 15,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectBtnActive: {
    backgroundColor: '#0f172a',
  },
  selectBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  selectBtnTextActive: {
    color: '#fff',
  },
  uploadArea: {
    margin: 20,
    marginTop: 0,
    height: 100,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  uploadIconBox: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  uploadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3b82f6',
    marginTop: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sortList: {
    marginBottom: 10,
  },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  sortOptionActive: {
    backgroundColor: '#eff6ff',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sortOptionTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    marginBottom: 8,
  },
  fileItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkboxInner: {
    width: 6,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  fileIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  fileMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  bulkBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  bulkCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  moveBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moveBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteBulkBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  previewFileSize: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
  },
  previewBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  noPreview: {
    alignItems: 'center',
    padding: 40,
  },
  noPreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  openBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  shareBtn: {
    backgroundColor: '#0f172a',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
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
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cancelLink: {
    marginTop: 16,
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  folderList: {
    marginBottom: 10,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  folderIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sheetCancelBtn: {
    marginTop: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  cancelBtn: {
    padding: 4,
  },
  textPreviewScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0f172a',
  },
  textPreviewContainer: {
    padding: 20,
  },
  textPreviewContent: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    color: '#38bdf8',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '600',
  }
});
