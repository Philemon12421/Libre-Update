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
          <Search className={cn("w-5 h-5 transition-all duration-300", searching ? "text-blue-600 animate-pulse scale-110" : "text-blue-200 dark:text-slate-700 group-focus-within:text-blue-500")} />
        </div>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
          placeholder="Query Global Registry..."
          className="w-full bg-slate-50 dark:bg-slate-950/50 pl-14 pr-16 py-5 rounded-[24px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm focus:outline-none transition-all border border-slate-100 dark:border-slate-800/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/2"
        />
        <div className="absolute right-3.5 top-2 bottom-2 flex items-center">
          <button 
            onClick={searchBooks}
            disabled={searching}
            className="h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[14px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-50 transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Seek"}
          </button>
        </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 px-1 pb-10">
            {results.map((book) => (
              <motion.div 
                key={book.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedBook(book)}
                className="flex flex-col cursor-pointer group"
              >
                <div className="aspect-[3/4.2] w-full bg-slate-50 dark:bg-slate-800 rounded-[24px] overflow-hidden mb-3 relative shadow-sm group-hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-800/50 group-hover:-translate-y-1">
                  <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-lg text-[7px] font-black uppercase text-slate-800 dark:text-white tracking-widest shadow-sm">
                    {book.source}
                  </div>
                </div>
                <div className="space-y-1.5 px-1">
                  <h3 className="text-[11px] font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 transition-colors uppercase h-7">{book.title}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold truncate max-w-[70%]">{book.authors[0]}</p>
                    {book.rating && (
                      <div className="flex items-center space-x-0.5 text-amber-500">
                        <Star size={7} fill="currentColor" />
                        <span className="text-[8px] font-black">{book.rating}</span>
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
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 transition-all text-left"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all z-20"
              >
                <X size={16} />
              </button>

              <div className="overflow-y-auto custom-scrollbar">
                <div className="relative h-64 w-full">
                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800">
                    <img src={selectedBook.thumbnail} alt={selectedBook.title} className="w-full h-full object-cover blur-2xl opacity-30" />
                  </div>
                  <div className="relative h-full flex flex-col items-center justify-center pt-8">
                     <div className="w-36 h-52 rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 transform -rotate-2">
                        <img src={selectedBook.thumbnail} alt={selectedBook.title} className="w-full h-full object-cover" />
                     </div>
                  </div>
                </div>

                <div className="p-8 pb-32">
                   <div className="text-center mb-10">
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter uppercase px-4">{selectedBook.title}</h2>
                     <div className="flex items-center justify-center space-x-3 mt-4">
                       <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">{selectedBook.authors[0]}</p>
                       {selectedBook.rating && (
                         <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{selectedBook.rating}</span>
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/50">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                           {selectedBook.description.replace(/<[^>]*>?/gm, '').substring(0, 450)}...
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Index Source</p>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedBook.source} Registry</p>
                         </div>
                         {selectedBook.publishedDate && (
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Archive Date</p>
                              <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{selectedBook.publishedDate}</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent pt-12">
                  <div className="flex flex-col gap-3">
                    <a 
                      href={selectedBook.previewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-4.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center space-x-2 shadow-2xl shadow-blue-500/30 active:scale-95 transition-all"
                    >
                      <BookOpen size={18} />
                      <span>Execute Preview</span>
                    </a>
                    <a 
                      href={selectedBook.infoLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold text-[9px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <ExternalLink size={14} className="opacity-50" />
                      <span>Metadata Index</span>
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
