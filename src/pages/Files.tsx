import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, Image as ImageIcon, File, Download, Trash2, Upload,
  X, Loader2, ChevronLeft, ChevronRight, Edit2, Plus, FolderPlus
} from 'lucide-react';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { sendLocalNotification } from '../lib/notifications';
import { Document, Page, pdfjs } from 'react-pdf';

const FOLDER_COLORS = [
  { name: 'blue',    class: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-600' },
  { name: 'rose',    class: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-600' },
  { name: 'emerald', class: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { name: 'amber',   class: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  { name: 'violet',  class: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-600' },
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

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const allFiles = activeFolderId
      ? await db.files.where('folderId').equals(activeFolderId).toArray()
      : await db.files.orderBy('createdAt').reverse().toArray();
    const allFolders = await db.folders.toArray();
    setFolders(allFolders);
    setFiles(allFiles);
    setLoading(false);
    setSelectedFileIds(new Set());
  }, [activeFolderId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const stats = React.useMemo(() => {
    const data = { pdf: { count: 0, size: 0 }, image: { count: 0, size: 0 }, doc: { count: 0, size: 0 }, other: { count: 0, size: 0 } };
    files.forEach(f => {
      const t = f.type.toLowerCase();
      let cat: keyof typeof data = 'other';
      if (t.includes('pdf')) cat = 'pdf';
      else if (t.includes('image')) cat = 'image';
      else if (t.includes('word') || t.includes('doc') || t.includes('presentation') || t.includes('powerpoint') || t.includes('sheet') || t.includes('excel')) cat = 'doc';
      data[cat].count++;
      data[cat].size += f.size || 0;
    });
    return data;
  }, [files]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploadProgress({ name: file.name, progress: 0 });
      for (let p = 0; p <= 100; p += 25) {
        setUploadProgress(prev => prev ? { ...prev, progress: p } : null);
        await new Promise(r => setTimeout(r, 40));
      }
      await db.files.add({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: file,
        folderId: activeFolderId,
        createdAt: Date.now(),
      });
    }
    setUploadProgress(null);
    sendLocalNotification('Files Added', `${acceptedFiles.length} file(s) archived.`);
    fetchFiles();
  }, [fetchFiles, activeFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop } as any);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({ name: newFolderName, createdAt: Date.now(), color: selectedFolderColor });
    setNewFolderName(''); setSelectedFolderColor('blue'); setIsCreatingFolder(false);
    fetchFiles();
  };

  const renameFile = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false); setEditingFile(null); setNewFileName('');
    fetchFiles();
  };

  const deleteFile = async (id: number) => {
    if (!confirm('Delete this file permanently?')) return;
    await db.files.delete(id);
    fetchFiles();
  };

  const deleteSelected = async () => {
    if (selectedFileIds.size === 0) return;
    if (!confirm(`Delete ${selectedFileIds.size} file(s)?`)) return;
    await Promise.all(Array.from(selectedFileIds).map(id => db.files.delete(id)));
    setIsSelectMode(false); fetchFiles();
  };

  const toggleSelect = (id: number) => {
    const s = new Set(selectedFileIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedFileIds(s);
  };

  const selectAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map(f => f.id).filter((id): id is number => id !== undefined)));
    }
  };

  const moveSelected = async (folderId: number | null) => {
    if (selectedFileIds.size === 0) return;
    await Promise.all(Array.from(selectedFileIds).map(id => db.files.update(id, { folderId: folderId || undefined })));
    setShowMoveModal(false); setIsSelectMode(false); fetchFiles();
  };

  const getIcon = (type: string, name = '') => {
    const t = type.toLowerCase(), n = name.toLowerCase();
    if (t.includes('pdf') || n.endsWith('.pdf'))           return <FileText className="text-red-500" size={18} />;
    if (t.includes('image'))                               return <ImageIcon className="text-blue-500" size={18} />;
    if (t.includes('word') || t.includes('doc'))           return <FileText className="text-indigo-500" size={18} />;
    if (t.includes('presentation') || t.includes('ppt'))   return <FileText className="text-orange-500" size={18} />;
    if (t.includes('spreadsheet') || t.includes('excel'))  return <FileText className="text-emerald-500" size={18} />;
    return <File className="text-slate-400" size={18} />;
  };

  const getFileBg = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf'))   return 'bg-red-50';
    if (t.includes('image')) return 'bg-blue-50';
    return 'bg-slate-50';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFolderColor = (colorName?: string) => FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Files</h2>
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Local Resource Manager</p>
        </div>
        <div className="flex items-center gap-2">
          {!isSelectMode && (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
              title="New Folder"
            >
              <Plus size={16} />
            </button>
          )}
          {files.length > 0 && (
            <>
              {isSelectMode && (
                <button
                  onClick={selectAll}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest"
                >
                  {selectedFileIds.size === files.length ? 'Deselect' : 'All'}
                </button>
              )}
              <button
                onClick={() => { setIsSelectMode(!isSelectMode); setSelectedFileIds(new Set()); }}
                className={cn(
                  'px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95',
                  isSelectMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {isSelectMode ? 'Done' : 'Select'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats row — only show when there are files */}
      {!activeFolderId && files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'PDF', ...stats.pdf },
            { label: 'IMG', ...stats.image },
            { label: 'DOC', ...stats.doc },
            { label: 'ETC', ...stats.other },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
              <div className="text-sm font-black text-slate-900">{s.count}</div>
              <div className="text-[8px] text-blue-500 font-bold uppercase mt-0.5">{formatSize(s.size)}</div>
              <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-7 flex flex-col items-center justify-center gap-3',
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
          isDragActive ? 'bg-blue-100' : 'bg-white border border-slate-200'
        )}>
          <Upload className={cn('w-5 h-5', isDragActive ? 'text-blue-600' : 'text-slate-400')} />
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {isDragActive ? 'Drop files here' : 'Click or drag to upload'}
        </p>

        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 p-4 z-10"
            >
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[180px]">{uploadProgress.name}</p>
              <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File List */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Loading...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-20 text-center space-y-4 px-8">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[22px] flex items-center justify-center mx-auto">
              <FileText size={28} className="text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">No Files Yet</h3>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                Upload your first file using the area above.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {files.map(file => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={cn(
                  'group flex items-center p-3 rounded-2xl border transition-all cursor-pointer',
                  isSelectMode && file.id && selectedFileIds.has(file.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                )}
                onClick={() => {
                  if (isSelectMode && file.id) toggleSelect(file.id);
                  else { setPreviewFile(file); setNumPages(null); setPageNumber(1); }
                }}
              >
                {isSelectMode && (
                  <div className="mr-3 shrink-0">
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                      file.id && selectedFileIds.has(file.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    )}>
                      {file.id && selectedFileIds.has(file.id) && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                    </div>
                  </div>
                )}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mr-3 shrink-0', getFileBg(file.type))}>
                  {getIcon(file.type, file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatSize(file.size)} · {format(file.createdAt, 'MMM d, yyyy')}
                  </p>
                </div>
                {!isSelectMode && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingFile(file); setNewFileName(file.name); setShowRenameModal(true); }}
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); file.id && deleteFile(file.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {isSelectMode && selectedFileIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-5 z-50"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest">{selectedFileIds.size} selected</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMoveModal(true)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors"
                >
                  Move
                </button>
                <button
                  onClick={deleteSelected}
                  className="px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Modal */}
      <AnimatePresence>
        {showMoveModal && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMoveModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl relative z-10"
            >
              <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4">Move to folder</h3>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                <button onClick={() => moveSelected(null)} className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors text-left gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"><File size={14} className="text-slate-400" /></div>
                  <span className="text-[12px] font-semibold text-slate-700">Root (no folder)</span>
                </button>
                {folders.map(folder => (
                  <button key={folder.id} onClick={() => folder.id && moveSelected(folder.id)} className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors text-left gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><FolderPlus size={14} className="text-blue-500" /></div>
                    <span className="text-[12px] font-semibold text-slate-700">{folder.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowMoveModal(false)} className="w-full mt-4 py-3 text-slate-400 font-semibold text-[11px] uppercase tracking-widest">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {isCreatingFolder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl border border-slate-100"
            >
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight text-center mb-1">New Folder</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest text-center mb-6">Organize your files</p>
              <div className={cn('w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5 transition-all', getFolderColor(selectedFolderColor).bg)}>
                <FolderPlus className={getFolderColor(selectedFolderColor).text} size={28} />
              </div>
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400 placeholder:text-slate-300 text-center mb-4"
                onKeyDown={e => e.key === 'Enter' && createFolder()}
              />
              <div className="flex justify-center gap-2.5 mb-6">
                {FOLDER_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedFolderColor(c.name)}
                    className={cn('w-6 h-6 rounded-full border-2 transition-all', c.class, selectedFolderColor === c.name ? 'border-slate-800 scale-110' : 'border-transparent')}
                  />
                ))}
              </div>
              <button onClick={createFolder} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mb-2">
                Create Folder
              </button>
              <button onClick={() => setIsCreatingFolder(false)} className="w-full py-2 text-slate-400 font-semibold text-[10px] uppercase tracking-widest">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {showRenameModal && editingFile && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl border border-slate-100"
            >
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight text-center mb-1">Rename File</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest text-center mb-6">Update file name</p>
              <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center mx-auto mb-5">
                {getIcon(editingFile.type)}
              </div>
              <input
                autoFocus
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400 text-center mb-5"
                onKeyDown={e => e.key === 'Enter' && renameFile()}
              />
              <button onClick={renameFile} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mb-2">
                Save
              </button>
              <button onClick={() => { setShowRenameModal(false); setEditingFile(null); }} className="w-full py-2 text-slate-400 font-semibold text-[10px] uppercase tracking-widest">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewFile(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl z-10 relative flex flex-col h-[88vh]"
            >
              {/* Preview Header */}
              <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">{getIcon(previewFile.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{previewFile.name}</p>
                  <p className="text-[10px] text-blue-500 font-semibold">{formatSize(previewFile.size)}</p>
                </div>
                <button onClick={() => setPreviewFile(null)} className="w-8 h-8 bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full flex items-center justify-center transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-auto bg-slate-50 flex flex-col items-center p-4">
                {previewFile.type.includes('image') ? (
                  <img src={URL.createObjectURL(previewFile.data)} alt={previewFile.name} className="max-w-full h-auto rounded-xl shadow-lg" />
                ) : previewFile.type.includes('pdf') ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <Document
                      file={previewFile.data}
                      onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                      loading={<Loader2 className="w-7 h-7 text-blue-500 animate-spin mt-16" />}
                    >
                      <div className="shadow-xl rounded-lg overflow-hidden">
                        <Page
                          pageNumber={pageNumber}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          width={Math.min(window.innerWidth - 64, 480)}
                        />
                      </div>
                    </Document>
                    {numPages && (
                      <div className="flex items-center gap-4 bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-sm">
                        <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-[11px] font-bold text-slate-700">{pageNumber} / {numPages}</span>
                        <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-colors">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-24 text-center">
                    <FileText size={36} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-semibold text-slate-700">Preview not available</p>
                    <p className="text-[11px] text-slate-400 mt-1">Download the file to view it.</p>
                  </div>
                )}
              </div>

              {/* Preview Footer */}
              <div className="p-4 bg-white border-t border-slate-100">
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(previewFile.data);
                    const a = document.createElement('a');
                    a.href = url; a.download = previewFile.name; a.click();
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
