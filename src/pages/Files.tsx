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
  Loader2
} from 'lucide-react';
import { db, LibreFile } from '../lib/db';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { sendLocalNotification } from '../lib/notifications';

export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files, setFiles] = useState<LibreFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<LibreFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number } | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    let allFiles;
    if (activeFolderId) {
      allFiles = await db.files.where('folderId').equals(activeFolderId).toArray();
    } else {
      allFiles = await db.files.orderBy('createdAt').reverse().toArray();
    }
    setFiles(allFiles);
    setLoading(false);
  }, [activeFolderId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const stats = React.useMemo(() => {
    const counts = { pdf: 0, image: 0, doc: 0, other: 0 };
    files.forEach(f => {
      if (f.type.includes('pdf')) counts.pdf++;
      else if (f.type.includes('image')) counts.image++;
      else if (f.type.includes('word') || f.type.includes('doc')) counts.doc++;
      else counts.other++;
    });
    return counts;
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
        type: file.type,
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
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    }
  } as any);

  const deleteFile = async (id: number) => {
    await db.files.delete(id);
    fetchFiles();
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="text-red-500" />;
    if (type.includes('presentation') || type.includes('ppt')) return <File className="text-orange-500" />;
    if (type.includes('word') || type.includes('doc')) return <FileText className="text-blue-600" />;
    return <File className="text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-900 tracking-tight">Your Lab</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Local Intelligence Storage</p>
        </div>
      </div>

      {/* Stats Bar */}
      {!activeFolderId && files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-1">
          {[
            { label: 'PDFs', val: stats.pdf, color: 'bg-red-500' },
            { label: 'IMGs', val: stats.image, color: 'bg-blue-500' },
            { label: 'DOCs', val: stats.doc, color: 'bg-indigo-500' },
            { label: 'ETC', val: stats.other, color: 'bg-slate-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-100 p-2 rounded-2xl text-center">
              <div className="text-sm font-black text-slate-900">{s.val}</div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.label}</div>
              <div className={`h-1 w-full mt-1 rounded-full ${s.color} opacity-20`} />
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      <div 
        {...getRootProps()} 
        className={cn(
          "group relative border-2 border-dashed rounded-[32px] p-8 flex flex-col items-center justify-center transition-all duration-500",
          isDragActive ? "border-blue-500 bg-blue-50/50 scale-[0.98]" : "border-slate-200 bg-white hover:border-blue-400"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 bg-blue-600 rounded-[18px] shadow-lg shadow-blue-100 flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm font-black text-slate-800">
          {isDragActive ? "Drop to save" : "Import Assets"}
        </p>
        
        {/* Active Upload Progress Overlay */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[38px] flex flex-col items-center justify-center p-8 z-10"
            >
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-black text-slate-800 text-center truncate w-full px-4">{uploadProgress.name}</p>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress.progress}%` }}
                  className="h-full bg-blue-600"
                />
              </div>
              <span className="text-[10px] font-black text-blue-600 mt-2 uppercase tracking-widest">{uploadProgress.progress}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File List */}
      <div className="space-y-4">
        {loading && files.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">indexing storage...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
               <FileText size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No files yet</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-[200px] mx-auto">Upload your first document to get started</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group flex items-center p-5 bg-white border border-slate-100 rounded-[32px] hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/20 transition-all cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <div className="w-14 h-14 bg-slate-50 rounded-[22px] flex items-center justify-center mr-5 transition-colors group-hover:bg-blue-50">
                  {getIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-800 truncate leading-snug">{file.name}</h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md">
                      {formatSize(file.size)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {format(file.createdAt, 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pr-2">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      file.id && deleteFile(file.id);
                    }}
                    className="p-3 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Enhanced Preview Modal */}
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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg mx-auto rounded-t-[40px] sm:rounded-[48px] overflow-hidden shadow-2xl z-10 relative flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                    {getIcon(previewFile.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 truncate max-w-[200px] leading-tight">{previewFile.name}</h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{formatSize(previewFile.size)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-8 min-h-[300px] flex items-center justify-center">
                {previewFile.type.includes('image') ? (
                  <img 
                    src={URL.createObjectURL(previewFile.data)} 
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-xl hover:scale-105 transition-transform cursor-zoom-in"
                    onClick={(e) => window.open(URL.createObjectURL(previewFile.data), '_blank')}
                  />
                ) : previewFile.type.includes('pdf') ? (
                  <iframe 
                    src={URL.createObjectURL(previewFile.data) + "#toolbar=0&navpanes=0&scrollbar=0"}
                    className="w-full h-full min-h-[500px] rounded-2xl border-0 shadow-lg"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="text-center p-10 max-w-sm">
                    <div className="w-20 h-20 bg-blue-50 text-blue-200 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                       <FileText size={40} />
                    </div>
                    <h5 className="font-bold text-slate-900 text-lg">Format Discovery</h5>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                      In-app viewer for <strong>{previewFile.type.split('/')[1]?.toUpperCase()}</strong> is in development. You can download and open it with your preferred local viewer.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-50 flex space-x-4">
                <button 
                   onClick={() => {
                      const url = URL.createObjectURL(previewFile.data);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = previewFile.name;
                      a.click();
                   }}
                  className="flex-1 py-5 bg-blue-600 text-white rounded-[24px] font-black flex items-center justify-center space-x-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-colors active:scale-[0.98]"
                >
                  <Download size={22} />
                  <span>Download File</span>
                </button>
              </div>
              <div className="h-4 sm:hidden bg-white" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
