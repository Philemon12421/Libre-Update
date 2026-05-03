import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Download, 
  Trash2, 
  Upload,
  Eye,
  X,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Plus,
  FolderPlus
} from 'lucide-react';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { sendLocalNotification } from '../lib/notifications';
import { Document, Page, pdfjs } from 'react-pdf';

const FOLDER_COLORS = [
  { name: 'blue', class: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  { name: 'rose', class: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
  { name: 'emerald', class: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { name: 'amber', class: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  { name: 'violet', class: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
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
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderColor, setSelectedFolderColor] = useState('blue');
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number } | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    let allFiles;
    if (activeFolderId) {
      allFiles = await db.files.where('folderId').equals(activeFolderId).toArray();
    } else {
      allFiles = await db.files.orderBy('createdAt').reverse().toArray();
    }
    const allFolders = await db.folders.toArray();
    setFolders(allFolders);
    setFiles(allFiles);
    setLoading(false);
    setSelectedFileIds(new Set());
  }, [activeFolderId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const stats = React.useMemo(() => {
    const data = {
      pdf: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      doc: { count: 0, size: 0 },
      other: { count: 0, size: 0 }
    };
    files.forEach(f => {
      let cat: 'pdf' | 'image' | 'doc' | 'other' = 'other';
      const type = f.type.toLowerCase();
      if (type.includes('pdf')) cat = 'pdf';
      else if (type.includes('image')) cat = 'image';
      else if (type.includes('word') || type.includes('doc') || type.includes('presentation') || type.includes('powerpoint') || type.includes('sheet') || type.includes('excel')) cat = 'doc';
      
      data[cat].count++;
      data[cat].size += f.size || 0;
    });
    return data;
  }, [files]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      setUploadProgress({ name: file.name, progress: 0 });
      
      for(let p = 0; p <= 100; p += 25) {
        setUploadProgress(prev => prev ? { ...prev, progress: p } : null);
        await new Promise(r => setTimeout(r, 50));
      }

      const libreFile: LibreFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: file,
        folderId: activeFolderId,
        createdAt: Date.now(),
      };
      await db.files.add(libreFile);
    }
    setUploadProgress(null);
    sendLocalNotification("Storage Updated", `${acceptedFiles.length} item(s) archived locally.`);
    fetchFiles();
  }, [fetchFiles, activeFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop
  } as any);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({
      name: newFolderName,
      createdAt: Date.now(),
      color: selectedFolderColor
    });
    setNewFolderName('');
    setSelectedFolderColor('blue');
    setIsCreatingFolder(false);
    fetchFiles();
    sendLocalNotification("Library Expanded", `New collection "${newFolderName}" initiated.`);
  };

  const renameFile = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false);
    setEditingFile(null);
    setNewFileName('');
    fetchFiles();
    sendLocalNotification("Asset Renamed", "File metadata updated successfully.");
  };

  const deleteFile = async (id: number) => {
    if (!confirm('Permanently delete this item?')) return;
    await db.files.delete(id);
    fetchFiles();
  };

  const deleteSelected = async () => {
    if (selectedFileIds.size === 0) return;
    if (!confirm(`Permanently purge ${selectedFileIds.size} selected items?`)) return;
    
    await Promise.all(Array.from(selectedFileIds).map(id => db.files.delete(id)));
    setIsSelectMode(false);
    fetchFiles();
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFileIds(newSelected);
  };

  const selectAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      const allIds = files.map(f => f.id).filter((id): id is number => id !== undefined);
      setSelectedFileIds(new Set(allIds));
    }
  };

  const moveSelected = async (folderId: number | null) => {
    if (selectedFileIds.size === 0) return;
    await Promise.all(
      Array.from(selectedFileIds).map(id => 
        db.files.update(id, { folderId: folderId || undefined })
      )
    );
    setShowMoveModal(false);
    setIsSelectMode(false);
    fetchFiles();
    sendLocalNotification("Files Moved", `${selectedFileIds.size} item(s) relocated.`);
  };

  const getIcon = (type: string, name: string = '') => {
    const t = type.toLowerCase();
    const n = name.toLowerCase();
    
    if (t.includes('pdf') || n.endsWith('.pdf')) return <FileText className="text-red-500" size={18} />;
    if (t.includes('image') || n.endsWith('.jpg') || n.endsWith('.png') || n.endsWith('.webp')) return <ImageIcon className="text-blue-500" size={18} />;
    if (t.includes('word') || t.includes('doc') || n.endsWith('.docx') || n.endsWith('.doc')) return <FileText className="text-indigo-500" size={18} />;
    if (t.includes('presentation') || t.includes('powerpoint') || n.endsWith('.pptx') || n.endsWith('.ppt')) return <FileText className="text-orange-500" size={18} />;
    if (t.includes('spreadsheet') || t.includes('excel') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv')) return <FileText className="text-emerald-500" size={18} />;
    if (t.includes('zip') || t.includes('rar') || t.includes('compressed') || n.endsWith('.zip')) return <File className="text-amber-500" size={18} />;
    if (t.includes('video') || n.endsWith('.mp4') || n.endsWith('.mov')) return <ImageIcon className="text-violet-500" size={18} />;
    return <File className="text-slate-400 dark:text-slate-600" size={18} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const getFolderColor = (colorName?: string) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight uppercase">Index</h2>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 leading-none">Local Resource Manager</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isSelectMode && (
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              title="New Collection"
            >
              <Plus size={18} />
            </button>
          )}
          {files.length > 0 && (
            <div className="flex items-center space-x-2">
              {isSelectMode && (
                <button 
                  onClick={selectAll}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  {selectedFileIds.size === files.length ? "Deselect All" : "Select All"}
                </button>
              )}
              <button 
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedFileIds(new Set());
                }}
                className={cn(
                  "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                  isSelectMode 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                {isSelectMode ? "Done" : "Select"}
              </button>
            </div>
          )}
        </div>
      </div>

      {!activeFolderId && files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-1">
          {[
            { label: 'PDF', ...stats.pdf },
            { label: 'IMG', ...stats.image },
            { label: 'DOC', ...stats.doc },
            { label: 'ETC', ...stats.other },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="text-xs font-black text-slate-900 dark:text-white leading-none">{s.count}</div>
              <div className="text-[7px] text-blue-500 font-extrabold uppercase tracking-tight mt-1 leading-none">{formatSize(s.size)}</div>
              <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div 
        {...getRootProps()} 
        className={cn(
          "group relative rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300",
          isDragActive ? "bg-blue-50 dark:bg-blue-900/10" : "bg-white dark:bg-slate-900/40 hover:bg-blue-50/20 dark:hover:bg-slate-900/60 border border-blue-50/50 dark:border-transparent"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:scale-110 transition-all">
          <Upload className="w-5 h-5 text-slate-400 dark:text-slate-400 group-hover:text-blue-600" />
        </div>
        <p className="text-[10px] font-bold text-slate-500/70 dark:text-slate-400 uppercase tracking-widest text-center">
          {isDragActive ? "Inbound sync" : "Click or drag to archive"}
        </p>
        
        <AnimatePresence>
          {uploadProgress && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 z-10"
            >
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-2" />
              <p className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{uploadProgress.name}</p>
              <div className="w-32 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  className="h-full bg-blue-600"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isCreatingFolder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">New Collection</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Define your space</p>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  <div className={cn("w-20 h-20 rounded-[28px] flex items-center justify-center shadow-lg transition-all transform", getFolderColor(selectedFolderColor).bg)}>
                    <FolderPlus className={getFolderColor(selectedFolderColor).text} size={32} />
                  </div>
                  
                  <div className="w-full space-y-4">
                    <input 
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Protocol Name..."
                      className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 px-5 py-4 rounded-2xl text-sm font-bold focus:outline-none placeholder:text-slate-300 text-center"
                      onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                    />

                    <div className="flex justify-center space-x-3">
                      {FOLDER_COLORS.map(color => (
                          <button
                            key={color.name}
                            onClick={() => setSelectedFolderColor(color.name)}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all border-2",
                              color.class,
                              selectedFolderColor === color.name ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent"
                            )}
                          />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3 pt-4">
                  <button 
                    onClick={createFolder}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Initialize Archive
                  </button>
                  <button 
                    onClick={() => setIsCreatingFolder(false)}
                    className="w-full py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel Action
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenameModal && editingFile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Rename Asset</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Update local metadata</p>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  <div className="w-20 h-20 rounded-[28px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shadow-lg transition-all transform">
                    {getIcon(editingFile.type)}
                  </div>
                  
                  <div className="w-full">
                    <input 
                      autoFocus
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Asset Name..."
                      className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 px-5 py-4 rounded-2xl text-sm font-bold focus:outline-none placeholder:text-slate-300 text-center"
                      onKeyDown={(e) => e.key === 'Enter' && renameFile()}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3 pt-4">
                  <button 
                    onClick={renameFile}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    Execute Update
                  </button>
                  <button 
                    onClick={() => {
                      setShowRenameModal(false);
                      setEditingFile(null);
                    }}
                    className="w-full py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Abort Change
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectMode && selectedFileIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50"
          >
            <div className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between">
              <div className="flex flex-col ml-2">
                <span className="text-[10px] font-black uppercase tracking-widest">{selectedFileIds.size} Selected</span>
                <span className="text-[8px] opacity-50 font-bold uppercase tracking-tighter">Bulk Action Protocol</span>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowMoveModal(true)}
                  className="p-3 bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20 rounded-2xl transition-colors"
                >
                  <ExternalLink size={14} />
                </button>
                <button 
                  onClick={deleteSelected}
                  className="p-3 bg-red-500/80 hover:bg-red-500 rounded-2xl transition-colors text-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMoveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoveModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[32px] p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Relocate Node</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select target dimension</p>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  <button 
                    onClick={() => moveSelected(null)}
                    className="w-full flex items-center p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mr-3 text-slate-400">
                      <File size={16} />
                    </div>
                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Root Directory</span>
                  </button>
                  
                  {folders.map(folder => (
                    <button 
                      key={folder.id}
                      onClick={() => folder.id && moveSelected(folder.id)}
                      className="w-full flex items-center p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100"
                    >
                      <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center mr-3">
                        <FileText size={16} />
                      </div>
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">{folder.name}</span>
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowMoveModal(false)}
                  className="w-full py-3 text-slate-400 font-bold text-[9px] uppercase tracking-widest"
                >
                  Cancel Protocol
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-2">
        {loading && files.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
             <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hydrating Index...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-24 text-center space-y-6 px-10">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[28px] flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                <FileText size={32} className="text-slate-300 dark:text-slate-700" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Archive Empty</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-[220px] mx-auto">
                Implement your local index by dragging assets or indexing remote resources.
              </p>
            </div>
            <button 
              {...getRootProps().onClick ? { onClick: getRootProps().onClick } : {}}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Start Archiving
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                className={cn(
                  "group flex items-center p-3.5 rounded-xl transition-all cursor-pointer shadow-[0_1px_4px_-2px_rgba(0,0,0,0.1)] hover:shadow-md border",
                  isSelectMode && file.id && selectedFileIds.has(file.id)
                    ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                )}
                onClick={() => {
                  if (isSelectMode && file.id) {
                    toggleSelect(file.id);
                  } else {
                    setPreviewFile(file);
                    setNumPages(null);
                    setPageNumber(1);
                  }
                }}
              >
                {isSelectMode && (
                  <div className="mr-3">
                    <div className={cn(
                      "w-4 h-4 rounded border-2 transition-all flex items-center justify-center",
                      file.id && selectedFileIds.has(file.id)
                        ? "bg-blue-600 border-blue-600"
                        : "bg-transparent border-slate-200"
                    )}>
                      {file.id && selectedFileIds.has(file.id) && (
                        <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                      )}
                    </div>
                  </div>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mr-4 transition-all group-hover:scale-105",
                  file.type.toLowerCase().includes('pdf') ? "bg-red-50 text-red-500" : 
                  file.type.toLowerCase().includes('image') ? "bg-blue-50 text-blue-500" :
                  "bg-blue-50/50 text-blue-300"
                )}>
                  {getIcon(file.type, file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{file.name}</h3>
                  <div className="flex items-center space-x-2.5 mt-1">
                    <span className="text-[9px] font-bold text-slate-400/60 dark:text-slate-400 uppercase tracking-tighter">
                      {formatSize(file.size)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-100 dark:text-slate-800">•</span>
                    <span className="text-[9px] font-bold text-slate-400/60 dark:text-slate-400 uppercase tracking-tighter">
                      {format(file.createdAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center opacity-0 group-hover:opacity-100 transition-opacity",
                  isSelectMode && "hidden"
                )}>
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFile(file);
                      setNewFileName(file.name);
                      setShowRenameModal(true);
                    }}
                    className="p-2 text-slate-200 hover:text-blue-500 transition-colors"
                    title="Rename Asset"
                  >
                    <Edit2 size={12} />
                  </button>
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      file.id && deleteFile(file.id);
                    }}
                    className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                    title="Purge Asset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl z-10 relative flex flex-col h-[85vh]"
            >
              <div className="p-4 flex items-center justify-between sticky top-0 z-20 bg-white dark:bg-slate-900 backdrop-blur-md">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    {getIcon(previewFile.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate text-xs uppercase tracking-tight">{previewFile.name}</h4>
                    <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">{formatSize(previewFile.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-100 dark:bg-black p-4 flex flex-col items-center">
                {previewFile.type.includes('image') ? (
                  <img 
                    src={URL.createObjectURL(previewFile.data)} 
                    alt={previewFile.name}
                    className="max-w-full h-auto rounded-lg shadow-lg bg-white"
                  />
                ) : previewFile.type.includes('pdf') ? (
                  <div className="w-full flex flex-col items-center space-y-4">
                    <Document
                      file={previewFile.data}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<Loader2 className="w-8 h-8 text-blue-600 animate-spin my-20" />}
                      className="flex flex-col items-center"
                    >
                      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-sm overflow-hidden mb-4">
                        <Page 
                          pageNumber={pageNumber} 
                          scale={pdfScale}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="max-w-full"
                          width={Math.min(window.innerWidth - 80, 500)}
                        />
                      </div>
                    </Document>
                    
                    {numPages && (
                      <div className="sticky bottom-4 flex items-center space-x-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur pb-2 pt-2 px-6 rounded-2xl shadow-xl border border-blue-500/10 z-30 mb-8">
                        <button 
                          disabled={pageNumber <= 1}
                          onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                          className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 translate-y-[-1px]"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest whitespace-nowrap">
                          {pageNumber} <span className="opacity-20 font-normal">/</span> {numPages}
                        </div>
                        <button 
                          disabled={pageNumber >= numPages}
                          onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                          className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 translate-y-[-1px]"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <FileText size={40} className="text-slate-200 mx-auto mb-4" />
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Preview Unavailable</h5>
                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest underline decoration-2 decoration-blue-500/20">
                      Standard Archival Format Required
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white dark:bg-slate-900">
                <button 
                   onClick={() => {
                        const url = URL.createObjectURL(previewFile.data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = previewFile.name;
                        a.click();
                   }}
                  className="w-full py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={16} />
                  <span>Export Asset</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
