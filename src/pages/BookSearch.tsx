import React, { useState, useEffect } from 'react';
import { Search, BookOpen, ExternalLink, Globe, Star, Book, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface BookResult {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string;
  description: string;
  previewLink: string;
  infoLink: string;
  source: string;
  publishedDate?: string;
  rating?: number;
}

export default function BookSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);

  const searchBooks = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);

    try {
      // Parallel fetch from Google Books and Open Library
      const [googleRes, olRes] = await Promise.all([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12`),
        fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`)
      ]);

      const [googleData, olData] = await Promise.all([googleRes.json(), olRes.json()]);
      
      const googleBooks = (googleData.items || []).map((item: any) => ({
        id: `google-${item.id}`,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors || ['Unknown'],
        thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=200',
        description: item.volumeInfo.description || 'No description available.',
        previewLink: item.volumeInfo.previewLink,
        infoLink: item.volumeInfo.infoLink,
        source: 'Google',
        publishedDate: item.volumeInfo.publishedDate,
        rating: item.volumeInfo.averageRating
      }));

      const olBooks = (olData.docs || []).map((item: any) => ({
        id: `ol-${item.key}`,
        title: item.title,
        authors: item.author_name || ['Unknown'],
        thumbnail: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : 'https://images.unsplash.com/photo-1543004218-ee141104975a?auto=format&fit=crop&q=80&w=200',
        description: (item.first_sentence && item.first_sentence[0]) || 'Available in the archives.',
        previewLink: `https://openlibrary.org${item.key}`,
        infoLink: `https://openlibrary.org${item.key}`,
        source: 'OpenLib',
        publishedDate: item.first_publish_year?.toString()
      }));

      const combined = [...googleBooks, ...olBooks].sort((a, b) => b.title.length - a.title.length);
      setResults(combined);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="px-1 py-2">
        <h2 className="text-xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight uppercase">Discovery</h2>
        <p className="text-slate-400 dark:text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 leading-none">Global Resource Index</p>
      </div>

      <div className="relative group px-1">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className={cn("w-4 h-4 transition-colors", searching ? "text-blue-600 animate-pulse" : "text-blue-200 dark:text-slate-300")} />
        </div>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
          placeholder="Resource locator..."
          className="w-full bg-slate-50 dark:bg-slate-900/50 pl-11 pr-12 py-3.5 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm focus:outline-none transition-all border border-slate-100 dark:border-transparent focus:border-blue-200"
        />
        <button 
          onClick={searchBooks}
          disabled={searching}
          className="absolute right-3.5 top-2 bottom-2 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all"
        >
          {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Index"}
        </button>
      </div>

      <div className="space-y-4">
        {searching && results.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
             <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">Syncing Registry Nodes...</p>
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <div className="py-24 text-center space-y-4 px-12">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-100 dark:border-slate-800">
               <Search size={24} className="text-slate-200" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Resource Not Located</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              We couldn't find any assets matching "{query}". 
              Try refining your query or check the Registry status.
            </p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="grid grid-cols-2 gap-4 px-1">
            {results.map((book) => (
              <motion.div 
                key={book.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelectedBook(book)}
                className="flex flex-col cursor-pointer group"
              >
                <div className="aspect-[3/4.2] w-full bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden mb-3 relative shadow-sm group-hover:shadow-md transition-all border border-slate-100 dark:border-transparent">
                  <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-900/60 backdrop-blur-md rounded text-[7px] font-bold uppercase text-white tracking-widest">
                    {book.source}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 leading-tight tracking-tight group-hover:text-blue-600 transition-colors uppercase">{book.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold truncate max-w-[80%]">{book.authors[0]}</p>
                    {book.rating && (
                      <div className="flex items-center space-x-0.5 text-blue-600">
                        <Star size={7} fill="currentColor" />
                        <span className="text-[8px] font-bold">{book.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!searching && !query && (
          <div className="py-20 text-center space-y-6 px-10">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/5 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[28px] flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                <Search size={32} className="text-slate-300 dark:text-slate-700" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Resource Discovery</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">
                Scan the global registry for decentralized literary assets and distributed archives.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {['Google API', 'Open Archive'].map((lib) => (
                <div key={lib} className="flex items-center space-x-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Globe size={10} className="text-blue-500/40" />
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{lib}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedBook(null)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] border border-slate-100 dark:border-slate-800 transition-all text-left"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600"
              >
                <X size={20} />
              </button>

              <div className="p-8 overflow-y-auto">
                <div className="flex flex-col items-center text-center mb-8">
                   <div className="w-32 h-44 rounded-2xl overflow-hidden shadow-xl mb-6 bg-slate-50 border border-white">
                      <img src={selectedBook.thumbnail} alt={selectedBook.title} className="w-full h-full object-cover" />
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight px-4">{selectedBook.title}</h2>
                   <div className="flex items-center space-x-2 mt-3">
                     <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">{selectedBook.authors[0]}</p>
                     {selectedBook.rating && (
                       <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-slate-600">{selectedBook.rating}</span>
                       </div>
                     )}
                   </div>
                </div>

                <div className="mb-10 px-2 space-y-4">
                   <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span>Source</span>
                      <span className="text-slate-600 dark:text-slate-300">{selectedBook.source} Registry</span>
                   </div>
                   {selectedBook.publishedDate && (
                     <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50 pb-2">
                        <span>Archive Date</span>
                        <span className="text-slate-600 dark:text-slate-300">{selectedBook.publishedDate}</span>
                     </div>
                   )}
                   <p className="text-xs text-slate-500 leading-relaxed font-medium pt-2">
                      {selectedBook.description.replace(/<[^>]*>?/gm, '').substring(0, 300)}...
                   </p>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-2 space-y-3 flex flex-col border-t border-slate-50 dark:border-slate-800">
                  <div className="flex flex-col gap-2">
                    <a 
                      href={selectedBook.previewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <BookOpen size={18} />
                      <span>Read Online Now</span>
                    </a>
                    <a 
                      href={selectedBook.infoLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <ExternalLink size={14} />
                      <span>View Online</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
