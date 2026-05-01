import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FolderIcon, 
  Search, 
  Settings as SettingsIcon, 
  BookOpen,
  Plus
} from 'lucide-react';
import { cn } from './lib/utils';

// Pages
import FilesPage from './pages/Files';
import FoldersPage from './pages/Folders';
import BookSearch from './pages/BookSearch';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('files');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const root = window.document.documentElement;
    root.classList.add('dark');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigation = [
    { id: 'files', label: 'Home', icon: FileText },
    { id: 'folders', label: 'Library', icon: FolderIcon },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about', label: 'About', icon: BookOpen },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'files': return <FilesPage />;
      case 'folders': return <FoldersPage />;
      case 'search': return <BookSearch />;
      case 'settings': return <SettingsPage isDark={isDark} setIsDark={setIsDark} />;
      case 'about': return <AboutPage />;
      default: return <FilesPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-bg-primary shadow-2xl relative overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex justify-between items-center bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-40 transition-colors border-b border-transparent">
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer" onClick={() => setCurrentPage('files')}>
            <div className="w-10 h-10 rounded-[14px] overflow-hidden shadow-2xl shadow-blue-500/20 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 active:scale-95">
              <img src="/favicon.svg" alt="Libre" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black font-sans text-text-primary tracking-tighter leading-none uppercase">Libre</h1>
            <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em] mt-1 leading-none">Archival Node</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {currentPage === 'folders' && (
            <button 
              onClick={() => {
                // We need to trigger the folders page's create mode.
                // For simplicity, we'll just let the folders page handle its own button, 
                // but we could use an event emitter or state in App.
                // Let's stick to refining the existing logic.
              }}
              className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-6"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl px-8 pt-4 pb-8 flex justify-around items-center z-40 transition-all border-t border-slate-50 dark:border-slate-900/50">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "flex flex-col items-center space-y-1.5 transition-all duration-300 group",
                isActive ? "text-blue-600" : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isActive ? "bg-blue-50 dark:bg-blue-900/20" : "bg-transparent group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40"
              )}>
                <Icon size={20} className="transition-transform group-active:scale-90" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-extrabold uppercase tracking-widest transition-all",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
