import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FolderIcon, 
  Search, 
  Settings as SettingsIcon, 
  BookOpen,
} from 'lucide-react';
import { cn } from './lib/utils';

import FilesPage from './pages/Files';
import FoldersPage from './pages/Folders';
import BookSearch from './pages/BookSearch';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';

type Page = 'files' | 'folders' | 'search' | 'settings' | 'about';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('files');

  const navigation = [
    { id: 'files',    label: 'Home',     icon: FileText },
    { id: 'folders',  label: 'Library',  icon: FolderIcon },
    { id: 'search',   label: 'Discover', icon: Search },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'about',    label: 'About',    icon: BookOpen },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'files':    return <FilesPage />;
      case 'folders':  return <FoldersPage />;
      case 'search':   return <BookSearch />;
      case 'settings': return <SettingsPage />;
      case 'about':    return <AboutPage />;
      default:         return <FilesPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 flex items-center space-x-3 bg-white/95 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-100">
        <button onClick={() => setCurrentPage('files')} className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-[12px] overflow-hidden shadow-md shadow-blue-500/20 transition-transform active:scale-95">
            <img src="/favicon.svg" alt="Libre" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-[17px] font-black text-slate-900 tracking-tight leading-none uppercase">Libre</h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.18em] mt-0.5 leading-none">Archival Node</p>
          </div>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="px-5 pt-5 pb-28"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-slate-100 px-2 pt-2 pb-6 flex justify-around items-center z-40">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                'flex flex-col items-center space-y-1 transition-all duration-200 px-2 py-1.5 rounded-xl',
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive ? 'bg-blue-50' : 'bg-transparent'
              )}>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                'text-[9px] font-bold uppercase tracking-wider transition-all',
                isActive ? 'opacity-100 text-blue-600' : 'opacity-50'
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
