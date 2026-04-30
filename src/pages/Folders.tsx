import React, { useState, useEffect } from 'react';
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
import { db, LibreFolder, LibreFile } from '../lib/db';
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

export default function FoldersPage() {
  const [folders, setFolders] = useState<LibreFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<LibreFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [isCreating, setIsCreating] = useState(false);

  const fetchFolders = async () => {
    const allFolders = await db.folders.orderBy('createdAt').reverse().toArray();
    setFolders(allFolders);
  };

  useEffect(() => {
    fetchFolders();
  }, []);

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

  const openFolder = async (folder: LibreFolder) => {
    setActiveFolder(folder);
    if (folder.id) {
      const files = await db.files.where('folderId').equals(folder.id).toArray();
      setFolderFiles(files);
    }
  };

  const deleteFolder = async (id: number) => {
    if (!confirm('Delete this page? Items inside will be unassigned.')) return;
    await db.folders.delete(id);
    await db.files.where('folderId').equals(id).modify({ folderId: undefined });
    fetchFolders();
  };

  const getFolderColor = (colorName?: string) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="text-red-500" />;
    if (type.includes('presentation') || type.includes('ppt')) return <File className="text-orange-500" />;
    if (type.includes('word') || type.includes('doc')) return <FileText className="text-blue-600" />;
    return <File className="text-slate-400" />;
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      {!activeFolder ? (
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <div>
              <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">Spaces</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Curate your collections</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="w-14 h-14 bg-blue-600 text-white rounded-[24px] flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={28} />
            </button>
          </div>

          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-white p-6 rounded-[40px] border border-blue-100 shadow-xl shadow-blue-10/10 space-y-5"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", getFolderColor(selectedColor).bg)}>
                    <FolderPlus className={getFolderColor(selectedColor).text} size={20} />
                  </div>
                  <input 
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Collection Name..."
                    className="flex-1 bg-slate-50 px-5 py-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                  />
                </div>
                
                <div className="flex items-center justify-between px-1">
                  <div className="flex space-x-2">
                    {FOLDER_COLORS.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(color.name)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all border-2",
                            color.class,
                            selectedColor === color.name ? "border-slate-900 scale-125" : "border-transparent"
                          )}
                        />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 text-slate-400 font-bold text-xs uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={createFolder}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-5">
            {folders.length === 0 && !isCreating && (
              <div className="col-span-2 py-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <FolderPlus size={40} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Empty Spaces</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-[200px] mx-auto">Group your documents into beautiful folders</p>
              </div>
            )}
            {folders.map((folder) => {
              const color = getFolderColor(folder.color);
              return (
                <motion.div 
                  key={folder.id}
                  layout
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => openFolder(folder)}
                  className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm relative group cursor-pointer transition-all hover:bg-slate-50"
                >
                  <div className={cn("w-14 h-14 rounded-[22px] flex items-center justify-center mb-5", color.bg)}>
                    <FolderIcon size={28} className={color.text} fill="currentColor" fillOpacity={0.15} />
                  </div>
                  <h3 className="font-black text-slate-800 truncate leading-tight pr-4">{folder.name}</h3>
                  <p className="text-[10px] font-black tracking-[0.1em] text-slate-400 mt-2 uppercase">
                    Added {format(folder.createdAt, 'MMM d')}
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      folder.id && deleteFolder(folder.id);
                    }}
                    className="absolute top-5 right-5 p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-4 px-1">
             <button 
               onClick={() => setActiveFolder(null)}
               className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
             >
               <ChevronRight className="w-5 h-5 rotate-180" />
             </button>
             <div>
               <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight leading-none">{activeFolder.name}</h2>
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 px-1">Active Space</p>
             </div>
          </div>

          <FilesPage activeFolderId={activeFolder.id} />
        </div>
      )}

      {/* Preview Modal (Same as Files page for consistency) */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg mx-auto rounded-t-[40px] sm:rounded-[48px] overflow-hidden shadow-2xl z-10 relative flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                    {getIcon(previewFile.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 truncate max-w-[200px] leading-tight">{previewFile.name}</h4>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex items-center justify-center">
                {previewFile.type.includes('image') ? (
                  <img src={URL.createObjectURL(previewFile.data)} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-2xl shadow-xl" />
                ) : previewFile.type.includes('pdf') ? (
                  <iframe src={URL.createObjectURL(previewFile.data)} className="w-full h-full min-h-[400px] rounded-2xl border-0" title={previewFile.name} />
                ) : (
                  <div className="text-center p-10">
                    <FileText size={40} className="mx-auto mb-4 text-blue-200" />
                    <p className="text-sm font-bold text-slate-500">Preview not available online</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-50">
                <button 
                   onClick={() => {
                        const url = URL.createObjectURL(previewFile.data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = previewFile.name;
                        a.click();
                   }}
                  className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black flex items-center justify-center space-x-3"
                >
                  <Download size={22} />
                  <span>Download File</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
