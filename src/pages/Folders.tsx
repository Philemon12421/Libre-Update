import React, { useState, useEffect, useCallback } from 'react';
import { FolderIcon, Plus, ChevronLeft, FolderPlus, Trash2 } from 'lucide-react';
import { db, LibreFolder } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import FilesPage from './Files';

const FOLDER_COLORS = [
  { name: 'blue',    class: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100' },
  { name: 'rose',    class: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100' },
  { name: 'emerald', class: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { name: 'amber',   class: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100' },
  { name: 'violet',  class: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100' },
];

interface FolderWithStats extends LibreFolder {
  count: number;
  totalSize: number;
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
        const filesInFolder = await db.files.where('folderId').equals(folder.id!).toArray();
        return {
          ...folder,
          count: filesInFolder.length,
          totalSize: filesInFolder.reduce((sum, f) => sum + (f.size || 0), 0),
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
    await db.folders.add({ name: newFolderName.trim(), createdAt: Date.now(), color: selectedColor });
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

  return (
    <div className="space-y-5 pb-8">
      <AnimatePresence mode="wait">
        {!activeFolder ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Library</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Your collections</p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Folder Grid */}
            {folders.length === 0 ? (
              <div className="py-20 text-center space-y-4 px-8">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[22px] flex items-center justify-center mx-auto">
                  <FolderPlus size={28} className="text-slate-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">No Folders Yet</h3>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                    Create a folder to organize your files into collections.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Create Folder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <AnimatePresence initial={false}>
                  {folders.map(folder => {
                    const color = getFolderColor(folder.color);
                    return (
                      <motion.div
                        key={folder.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setActiveFolder(folder)}
                        className={cn(
                          'bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5 group relative',
                          color.border
                        )}
                      >
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105', color.bg)}>
                          <FolderIcon size={20} className={color.text} />
                        </div>
                        <p className="text-[12px] font-bold text-slate-800 truncate pr-6 leading-snug">{folder.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md', color.bg, color.text)}>
                            {folder.count} files
                          </span>
                          <span className="text-[9px] text-slate-400">{formatSize(folder.totalSize)}</span>
                        </div>
                        <p className="text-[9px] text-slate-300 mt-1.5 font-medium">{format(folder.createdAt, 'MMM d, yyyy')}</p>

                        {/* Delete button */}
                        <button
                          onClick={e => { e.stopPropagation(); if (folder.id) setConfirmDeleteId(folder.id); }}
                          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="folder" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
            {/* Folder Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveFolder(null)}
                  className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight uppercase leading-none">{activeFolder.name}</h2>
                  <p className="text-[10px] text-blue-500 font-semibold mt-0.5">{folderFileCount} file{folderFileCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => activeFolder.id && setConfirmDeleteId(activeFolder.id)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <FilesPage activeFolderId={activeFolder.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl border border-slate-100"
            >
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight text-center mb-1">New Folder</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest text-center mb-6">Organize your files</p>

              <div className={cn('w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5 transition-all', getFolderColor(selectedColor).bg)}>
                <FolderPlus className={getFolderColor(selectedColor).text} size={28} />
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
                    onClick={() => setSelectedColor(c.name)}
                    className={cn('w-6 h-6 rounded-full border-2 transition-all', c.class, selectedColor === c.name ? 'border-slate-800 scale-110' : 'border-transparent')}
                  />
                ))}
              </div>

              <button
                onClick={createFolder}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mb-2"
              >
                Create Folder
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewFolderName(''); }}
                className="w-full py-2 text-slate-400 font-semibold text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-[18px] flex items-center justify-center mx-auto mb-5">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Delete Folder?</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-6 max-w-[220px] mx-auto">
                This will permanently delete the folder and all files inside it. This cannot be undone.
              </p>
              <button
                onClick={() => executeDelete(confirmDeleteId)}
                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all mb-2"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="w-full py-2 text-slate-400 font-semibold text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
