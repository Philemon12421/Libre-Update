import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FolderIcon, 
  Search, 
  Settings as SettingsIcon, 
  Info, 
  Plus, 
  LayoutGrid,
  List,
  Menu
} from 'lucide-react';
import { cn } from './lib/utils';

// Pages - I will create these shortly
import FilesPage from './pages/Files';
import FoldersPage from './pages/Folders';
import BookSearchPage from './pages/BookSearch';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';
import { registerForPushNotificationsAsync, sendLocalNotification } from './lib/notifications';
import { db } from './lib/db';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('files');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigation = [
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'folders', label: 'Pages', icon: FolderIcon },
    { id: 'search', label: 'Books', icon: Search },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about', label: 'About', icon: Info },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'files': return <FilesPage />;
      case 'folders': return <FoldersPage />;
      case 'search': return <BookSearchPage />;
      case 'settings': return <SettingsPage />;
      case 'about': return <AboutPage />;
      default: return <FilesPage />;
    }
  };

  const onAddFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = e.target.files;
      if (files) {
        for (const file of files) {
          await db.files.add({
            name: file.name,
            type: file.type,
            size: file.size,
            data: file,
            createdAt: Date.now(),
          });
        }
        sendLocalNotification("Upload Complete", `${files.length} file(s) have been added to your library.`);
        // This is a bit hacky, but since we don't have a global state for files,
        // we hope the user lands back on files page and it refreshes.
        // In a real app we'd use a store.
        if (currentPage === 'files') {
          window.location.reload(); // Simple way to refresh for now
        } else {
          setCurrentPage('files');
        }
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-blue-100/50 transform -rotate-12 transition-transform hover:rotate-0">
            <span className="text-white font-black text-xl font-display">L</span>
          </div>
          <div>
            <h1 className="text-2xl font-black font-display text-slate-900 tracking-tighter leading-none">Libre</h1>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Digital Lab</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isOnline ? "bg-emerald-500" : "bg-red-500"
          )} />
          <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="p-6"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-slate-50 px-6 py-4 flex justify-around items-center z-40">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "flex flex-col items-center space-y-1.5 transition-all duration-500 relative",
                isActive ? "text-blue-600 scale-110" : "text-slate-300 hover:text-slate-400"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-[18px] flex items-center justify-center transition-all duration-500",
                isActive ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-transparent"
              )}>
                <Icon size={22} strokeWidth={isActive ? 3 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddFile}
        className="fixed bottom-28 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center z-30"
      >
        <Plus size={28} />
      </motion.button>

      {/* Profile Sidebar/Overlay would go here */}
    </div>
  );
}
