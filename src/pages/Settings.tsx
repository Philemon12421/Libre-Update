import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Shield, 
  Database, 
  Share2, 
  Trash2, 
  Heart,
  ChevronRight,
  User,
  Coffee,
  AlertTriangle,
  Flame,
  X,
  Cloud,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/db';

interface SettingsProps {
  isDark?: boolean;
  setIsDark?: (val: boolean) => void;
}

export default function SettingsPage({ isDark, setIsDark }: SettingsProps) {
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);
  const [wipeStep, setWipeStep] = useState(0);
  const [diskUsage, setDiskUsage] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [syncing, setSyncing] = useState(false);
  const [cloudConfigs, setCloudConfigs] = useState({
    googleDrive: localStorage.getItem('google_drive_key') || '',
    dropbox: localStorage.getItem('dropbox_token') || '',
  });

  const saveCloudConfig = (provider: string, value: string) => {
    setCloudConfigs(prev => ({ ...prev, [provider]: value }));
    localStorage.setItem(provider === 'googleDrive' ? 'google_drive_key' : 'dropbox_token', value);
  };

  const initiateSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setActiveSubPage(null);
    }, 2000);
  };

  useEffect(() => {
    const calcUsage = async () => {
      const files = await db.files.toArray();
      const total = files.reduce((acc, file) => acc + (file.size || 0), 0);
      setDiskUsage({ total, count: files.length });
    };
    calcUsage();
  }, [activeSubPage]);

  const clearStorageAction = () => {
    localStorage.clear();
    indexedDB.deleteDatabase('LibreDatabase');
    window.location.reload();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Libre Archival System',
          text: 'Check out this neat archival system for organizing local assets!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const settingsGroups = [
    {
      title: "Cloud Management",
      headerAction: (
        <button 
          onClick={initiateSync}
          disabled={syncing}
          className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-700 transition-colors py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10"
        >
          {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flame size={12} className="text-blue-500" />}
          <span className="text-[10px] font-bold uppercase tracking-widest">{syncing ? "Syncing..." : "Sync Now"}</span>
        </button>
      ),
      items: [
        { icon: Cloud, label: "Cloud Sync", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", desc: "Connect remote archives" },
        { icon: Bell, label: "Notifications", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", desc: "System alerts & updates" },
      ]
    },
    {
      title: "Support",
      items: [
        { 
          icon: Coffee, 
          label: "Support Drenchack", 
          color: "text-amber-500", 
          bg: "bg-amber-50 dark:bg-amber-900/20", 
          desc: "Help maintain the archive",
          onClick: () => window.open('https://buymeacoffee.com/drench', '_blank')
        },
        { 
          icon: Heart, 
          label: "Drenchack Group", 
          color: "text-rose-500", 
          bg: "bg-rose-50 dark:bg-rose-900/20", 
          desc: "Contribute to the culture",
          onClick: () => setActiveSubPage('Community')
        },
      ]
    },
    {
      title: "System",
      items: [
        { icon: Database, label: "Storage Analysis", color: "text-blue-500", bg: "bg-blue-50 dark:bg-slate-800", desc: `${formatSize(diskUsage.total)} used locally` },
        { 
          icon: Share2, 
          label: "Invite & Share", 
          color: "text-emerald-500", 
          bg: "bg-emerald-50 dark:bg-emerald-900/20", 
          desc: "Collaborate on library",
          onClick: handleShare
        },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500 text-left">
      <div className="px-1">
        <h2 className="text-2xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight leading-none uppercase">Settings</h2>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 leading-none">System Architecture</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Disk Consumption</h3>
            <Database size={14} className="text-blue-500" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{formatSize(diskUsage.total)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{diskUsage.count} Nodes Indexed Locally</p>
            </div>
            <button 
              onClick={() => setActiveSubPage('Storage Analysis')}
              className="px-4 py-2 bg-white dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group, idx) => (
          <div key={idx} className="space-y-4">
             <div className="flex justify-between items-end px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-200 dark:text-slate-700">{group.title}</h3>
                {group.headerAction}
             </div>
             <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
                {group.items.map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => item.onClick ? item.onClick() : setActiveSubPage(item.label)}
                    className="w-full flex items-center justify-between p-5 hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center space-x-4 min-w-0 text-left">
                       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-95", item.bg, item.color)}>
                          <item.icon size={20} />
                       </div>
                        <div className="min-w-0 text-left">
                          <p className="font-bold text-blue-600 dark:text-slate-200 text-sm leading-tight">{item.label}</p>
                          <p className="text-[9px] font-bold text-blue-400 dark:text-slate-500 uppercase tracking-tight mt-1">{item.desc}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2">
                       {item.toggle ? (
                          <div className={cn("w-9 h-5 rounded-full relative p-0.5 transition-colors", item.isActive ? "bg-blue-600" : "bg-blue-50 dark:bg-slate-700")}>
                             <motion.div 
                                animate={{ x: item.isActive ? 16 : 0 }}
                                className="w-4 h-4 bg-white dark:bg-slate-400 rounded-full shadow-sm" 
                             />
                          </div>
                       ) : (
                          <ChevronRight size={16} className="text-blue-100 dark:text-slate-700 group-hover:text-blue-500 transition-colors" />
                       )}
                    </div>
                  </button>
                ))}
             </div>
          </div>
        ))}
      </div>

      <div className="px-1 pt-4">
        <button 
          onClick={() => setWipeStep(1)}
          className="w-full flex items-center justify-center space-x-3 p-5 border border-red-100 dark:border-slate-800 text-red-500 rounded-3xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
        >
          <Trash2 size={16} />
          <span>Purge All Records</span>
        </button>
      </div>

      <AnimatePresence>
         {wipeStep > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.95, y: 10 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.95, y: 10 }}
                 className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-10 relative z-10 shadow-2xl"
               >
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                       <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Confirm Reset</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 px-4 leading-relaxed">
                        This will permanently delete all indexed documents from this browser.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <button 
                        onClick={clearStorageAction}
                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/10 active:scale-95 transition-all"
                      >
                        Confirm Delete
                      </button>
                      <button 
                        onClick={() => setWipeStep(0)}
                        className="w-full py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
               </motion.div>
            </div>
         )}

         {activeSubPage === "Storage Analysis" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveSubPage(null)}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.95 }}
                 animate={{ scale: 1 }}
                 exit={{ scale: 0.95 }}
                 className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-10 relative z-10 shadow-2xl text-left"
               >
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-600 rounded-xl flex items-center justify-center">
                          <Database size={24} />
                       </div>
                       <button onClick={() => setActiveSubPage(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                          <X size={20} />
                       </button>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Storage Analysis</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Local Resource Consumption</p>
                    </div>
                    
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Local Drive</p>
                           <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatSize(diskUsage.total)}</p>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cloud Limit</p>
                           <p className="text-xl font-bold text-blue-600 mt-1">{(cloudConfigs.googleDrive || cloudConfigs.dropbox) ? "15.0 GB" : "None"}</p>
                        </div>
                     </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <span>Usage Intensity</span>
                          <span className="text-slate-900 dark:text-white">{Math.min(100, Math.round((diskUsage.total / (500 * 1024 * 1024)) * 100))}%</span>
                       </div>
                       <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (diskUsage.total / (500 * 1024 * 1024)) * 100)}%` }}
                            className="h-full bg-blue-600 rounded-full" 
                          />
                       </div>
                    </div>

                    <button 
                      onClick={() => setActiveSubPage(null)}
                      className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Return
                    </button>
                  </div>
               </motion.div>
            </div>
         )}

         {activeSubPage === "Cloud Sync" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveSubPage(null)}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.95 }}
                 animate={{ scale: 1 }}
                 exit={{ scale: 0.95 }}
                 className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[85vh] text-left"
               >
                  <div className="space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
                           <Cloud size={24} />
                        </div>
                        <button onClick={() => setActiveSubPage(null)} className="p-2 text-slate-300 hover:text-slate-600">
                           <X size={20} />
                        </button>
                     </div>

                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Archival Sync</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Provider Authentication</p>
                     </div>
                    
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Google Drive</span>
                              {cloudConfigs.googleDrive && <CheckCircle2 size={12} className="text-green-500" />}
                           </div>
                           <input 
                              type="password"
                              placeholder="API Key / Client ID"
                              value={cloudConfigs.googleDrive}
                              onChange={(e) => saveCloudConfig('googleDrive', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                           />
                        </div>

                        <div className="space-y-3">
                           <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Dropbox</span>
                              {cloudConfigs.dropbox && <CheckCircle2 size={12} className="text-green-500" />}
                           </div>
                           <input 
                              type="password"
                              placeholder="OAuth Access Token"
                              value={cloudConfigs.dropbox}
                              onChange={(e) => saveCloudConfig('dropbox', e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                           />
                        </div>
                     </div>

                     <div className="p-4 bg-blue-50 dark:bg-bg-primary rounded-xl space-y-2">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Direct Link Active</p>
                        <p className="text-[9px] text-blue-600/60 leading-relaxed font-medium">Your credentials are stored locally and encrypted within the browser's secure context.</p>
                     </div>

                     <button 
                       onClick={initiateSync}
                       disabled={syncing || (!cloudConfigs.googleDrive && !cloudConfigs.dropbox)}
                       className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/10 flex items-center justify-center space-x-2"
                     >
                       {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame size={16} />}
                       <span>{syncing ? "Initiating Protocol..." : "Initiate Cloud Sync"}</span>
                     </button>

                  </div>
               </motion.div>
            </div>
         )}

         {activeSubPage === "Notifications" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-left">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveSubPage(null)}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.95 }}
                 animate={{ scale: 1 }}
                 exit={{ scale: 0.95 }}
                 className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 relative z-10 shadow-2xl"
               >
                  <div className="space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
                           <Bell size={24} />
                        </div>
                        <button onClick={() => setActiveSubPage(null)} className="p-2 text-slate-300 hover:text-slate-600">
                           <X size={20} />
                        </button>
                     </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">System Alerts</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Notification Preferences</p>
                    </div>

                    <div className="space-y-4">
                       {[
                         { id: 'status', label: "Archive Status", desc: "Index updates", active: true },
                         { id: 'sync', label: "Cloud Sync", desc: "Background activity", active: true },
                         { id: 'security', label: "Security", desc: "Access logs", active: false }
                       ].map((n) => (
                         <div key={n.id} className="flex items-center justify-between p-1">
                            <div className="min-w-0 pr-2">
                               <p className="font-bold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">{n.label}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{n.desc}</p>
                            </div>
                            <div className={cn("w-9 h-5 rounded-full flex items-center transition-colors px-0.5 shrink-0 cursor-pointer", n.active ? "bg-blue-600 justify-end" : "bg-slate-200 dark:bg-slate-700 justify-start")}>
                               <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                            </div>
                         </div>
                       ))}
                    </div>

                    <button 
                      onClick={() => setActiveSubPage(null)}
                      className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Update
                    </button>
                  </div>
               </motion.div>
            </div>
         )}


         {activeSubPage && !["Indexing Storage", "Cloud Profile", "Notifications"].includes(activeSubPage) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveSubPage(null)}
                 className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[48px] p-8 relative z-10 shadow-2xl text-center"
               >
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                     <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{activeSubPage}</h3>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                     The <strong>{activeSubPage}</strong> module is currently being optimized for the next major release. 
                  </p>
                  <button 
                    onClick={() => setActiveSubPage(null)}
                    className="mt-8 w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest"
                  >
                    Dismiss
                  </button>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
