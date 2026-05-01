import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderIcon, 
  Plus, 
  ChevronRight, 
  FolderPlus,
  Trash2,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  X
} from 'lucide-react';
import { db, LibreFolder } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

import FilesPage from './Files';

const FOLDER_COLORS = [
  { name: 'blue', class: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  { name: 'rose', class: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
  { name: 'emerald', class: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { name: 'amber', class: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  { name: 'violet', class: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
];

interface FolderWithStats extends LibreFolder {
  count: number;
  totalSize: number;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderWithStats[]>([]);
  const [activeFolder, setActiveFolder] = useState<LibreFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);
  const [folderFileCount, setFolderFileCount] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [folderIdToDelete, setFolderIdToDelete] = useState<number | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchFolders = useCallback(async () => {
    const allFolders = await db.folders.orderBy('createdAt').reverse().toArray();
    
    // Enrich folders with stats
    const foldersWithStats = await Promise.all(allFolders.map(async (folder) => {
      const filesInFolder = await db.files.where('folderId').equals(folder.id!).toArray();
      const totalSize = filesInFolder.reduce((sum, f) => sum + (f.size || 0), 0);
      return {
        ...folder,
        count: filesInFolder.length,
        totalSize
      };
    }));

    setFolders(foldersWithStats);
    
    if (activeFolder) {
      const count = await db.files.where('folderId').equals(activeFolder.id!).count();
      setFolderFileCount(count);
    }
  }, [activeFolder]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await db.folders.add({
      name: newFolderName,
      createdAt: Date.now(),
      color: selectedColor
    });
    setNewFolderName('');
    setSelectedColor('blue');
    setIsCreating(false);
    fetchFolders();
  };

  const openFolder = (folder: LibreFolder) => {
    setActiveFolder(folder);
  };

  const deleteFolder = async (id: number) => {
    setFolderIdToDelete(id);
    setDeleteStep(1);
  };

  const executeDelete = async () => {
    if (folderIdToDelete === null) return;
    await db.files.where('folderId').equals(folderIdToDelete).delete();
    await db.folders.delete(folderIdToDelete);
    if (activeFolder?.id === folderIdToDelete) setActiveFolder(null);
    setDeleteStep(0);
    setFolderIdToDelete(null);
    fetchFolders();
  };

  const getFolderColor = (colorName?: string) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      {!activeFolder ? (
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <div>
              <h2 className="text-2xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight uppercase">Library</h2>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Organize your collections</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 active:scale-95"
            >
              <Plus size={24} />
            </button>
          </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
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
                  <div className={cn("w-20 h-20 rounded-[28px] flex items-center justify-center shadow-lg transition-all transform", getFolderColor(selectedColor).bg)}>
                    <FolderPlus className={getFolderColor(selectedColor).text} size={32} />
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
                            onClick={() => setSelectedColor(color.name)}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all border-2",
                              color.class,
                              selectedColor === color.name ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent"
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
                    onClick={() => setIsCreating(false)}
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

          <div className="grid grid-cols-2 gap-3 px-1">
            {folders.length === 0 && !isCreating && (
              <div className="col-span-2 py-24 text-center px-10 space-y-6">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 blur-2xl rounded-full" />
                  <div className="relative w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[28px] flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                    <FolderPlus size={32} className="text-slate-300 dark:text-slate-700" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">No Libraries</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-[220px] mx-auto">
                    Spaces allow you to group related nodes into logical distributed archives.
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all mx-auto"
                >
                  Create Collection
                </button>
              </div>
            )}
            {folders.map((folder) => {
              const color = getFolderColor(folder.color);
              return (
                <motion.div 
                  key={folder.id}
                  layout
                  onClick={() => openFolder(folder)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm relative group cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:-translate-y-0.5 border border-slate-50 dark:border-transparent hover:border-blue-100"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", color.bg, "dark:bg-slate-800")}>
                    <FolderIcon size={20} className={color.text} fill="currentColor" fillOpacity={0.1} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white truncate leading-tight pr-4 text-[11px] uppercase tracking-tight">{folder.name}</h3>
                  <div className="flex flex-col space-y-1.5 mt-2.5">
                    <div className="flex items-center space-x-2">
                       <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">
                         {folder.count} Nodes
                       </span>
                       <span className="text-[8px] font-bold text-slate-400 uppercase">
                         {formatSize(folder.totalSize)}
                       </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-[0.1em]">
                        {format(folder.createdAt, 'MMM d')}
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (folder.id) deleteFolder(folder.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setActiveFolder(null)}
                className="w-10 h-10 bg-white dark:bg-slate-900 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight leading-none uppercase">{activeFolder.name}</h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1.5">{folderFileCount} Items</p>
              </div>
            </div>
            <button 
              onClick={() => activeFolder.id && deleteFolder(activeFolder.id)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 border border-transparent hover:border-red-500/20"
              title="Delete Collection"
            >
              <Trash2 size={22} />
            </button>
          </div>

          <FilesPage activeFolderId={activeFolder.id} />
        </div>
      )}

      <AnimatePresence>
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[28px] flex items-center justify-center mx-auto">
                   <Trash2 size={32} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                    {deleteStep === 1 ? "Archive Purge" : "Final Consent"}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed px-4">
                    {deleteStep === 1 
                      ? "Deleting this collection will permanently remove all archived items indexed within it. This action is atomic and irreversible."
                      : "Are you sure? This is the final point of no return. All nodes in this space will be destroyed from local storage."}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => deleteStep === 1 ? setDeleteStep(2) : executeDelete()}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95",
                      deleteStep === 1 
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/20" 
                        : "bg-red-600 text-white shadow-red-500/20"
                    )}
                  >
                    {deleteStep === 1 ? "Next Protocol" : "Execute Purge"}
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteStep(0);
                      setFolderIdToDelete(null);
                    }}
                    className="w-full py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Abort Action
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
