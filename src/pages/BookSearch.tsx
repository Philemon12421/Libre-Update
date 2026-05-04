import React, { useState } from 'react';
import { Search, BookOpen, ExternalLink, Star, Globe, X, Loader2 } from 'lucide-react';
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

const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200&h=280';

export default function BookSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchBooks = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setHasSearched(true);

    try {
      const [googleRes, olRes] = await Promise.all([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`),
        fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`),
      ]);

      const [googleData, olData] = await Promise.all([googleRes.json(), olRes.json()]);

      const googleBooks: BookResult[] = (googleData.items || []).map((item: any) => ({
        id: `google-${item.id}`,
        title: item.volumeInfo.title || 'Unknown Title',
        authors: item.volumeInfo.authors || ['Unknown Author'],
        thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || PLACEHOLDER_COVER,
        description: item.volumeInfo.description || 'No description available.',
        previewLink: item.volumeInfo.previewLink || '#',
        infoLink: item.volumeInfo.infoLink || '#',
        source: 'Google',
        publishedDate: item.volumeInfo.publishedDate,
        rating: item.volumeInfo.averageRating,
      }));

      const olBooks: BookResult[] = (olData.docs || []).map((item: any) => ({
        id: `ol-${item.key}`,
        title: item.title || 'Unknown Title',
        authors: item.author_name || ['Unknown Author'],
        thumbnail: item.cover_i
          ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
          : PLACEHOLDER_COVER,
        description: item.first_sentence?.[0] || 'Available on Open Library.',
        previewLink: `https://openlibrary.org${item.key}`,
        infoLink: `https://openlibrary.org${item.key}`,
        source: 'OpenLib',
        publishedDate: item.first_publish_year?.toString(),
      }));

      setResults([...googleBooks, ...olBooks]);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Discover</h2>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Search books worldwide</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className={cn('w-4 h-4 transition-colors', searching ? 'text-blue-500 animate-pulse' : 'text-slate-300')} />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchBooks()}
          placeholder="Search books, authors, titles..."
          className="w-full bg-slate-50 border border-slate-200 pl-11 pr-24 py-3.5 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
        <button
          onClick={searchBooks}
          disabled={searching || !query.trim()}
          className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* States */}
      {searching && (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Searching...</p>
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="py-16 text-center space-y-3 px-8">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-[18px] flex items-center justify-center mx-auto">
            <Search size={22} className="text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">No results found</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Try different keywords or check your spelling.
          </p>
        </div>
      )}

      {!searching && !hasSearched && (
        <div className="py-14 text-center space-y-5 px-8">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[22px] flex items-center justify-center mx-auto">
            <BookOpen size={28} className="text-slate-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Find Any Book</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[200px] mx-auto">
              Search across Google Books and Open Library simultaneously.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            {['Google Books', 'Open Library'].map(src => (
              <div key={src} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                <Globe size={10} className="text-blue-400" />
                <span className="text-[9px] font-semibold text-slate-500 uppercase">{src}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!searching && results.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {results.map(book => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedBook(book)}
              className="cursor-pointer group"
            >
              {/* Cover */}
              <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-100 mb-2.5 relative shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-0.5">
                <img
                  src={book.thumbnail}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                />
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/90 rounded-md text-[7px] font-bold uppercase text-slate-700 shadow-sm">
                  {book.source}
                </div>
              </div>
              {/* Info */}
              <div className="space-y-0.5 px-0.5">
                <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{book.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 truncate max-w-[75%]">{book.authors[0]}</p>
                  {book.rating && (
                    <div className="flex items-center gap-0.5 text-amber-400">
                      <Star size={8} fill="currentColor" />
                      <span className="text-[9px] font-bold">{book.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl z-10 relative max-h-[90vh] flex flex-col"
            >
              {/* Close */}
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full flex items-center justify-center z-10 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="overflow-y-auto">
                {/* Hero */}
                <div className="relative h-52 w-full bg-slate-100">
                  <img src={selectedBook.thumbnail} alt="" className="w-full h-full object-cover blur-xl opacity-30" />
                  <div className="absolute inset-0 flex items-center justify-center pt-6">
                    <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-white -rotate-2">
                      <img
                        src={selectedBook.thumbnail}
                        alt={selectedBook.title}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                      />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 pb-32">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight px-4">{selectedBook.title}</h2>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">{selectedBook.authors[0]}</p>
                      {selectedBook.rating && (
                        <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-slate-700">{selectedBook.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                      {selectedBook.description.replace(/<[^>]*>/g, '').substring(0, 400)}
                      {selectedBook.description.length > 400 ? '...' : ''}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Source</p>
                      <p className="text-[11px] font-bold text-slate-800">{selectedBook.source}</p>
                    </div>
                    {selectedBook.publishedDate && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Published</p>
                        <p className="text-[11px] font-bold text-slate-800">{selectedBook.publishedDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA Footer */}
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-white via-white/98 to-transparent pt-10">
                <div className="flex flex-col gap-2">
                  <a
                    href={selectedBook.previewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                  >
                    <BookOpen size={15} />
                    <span>Preview Book</span>
                  </a>
                  <a
                    href={selectedBook.infoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ExternalLink size={13} />
                    <span>More Info</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
