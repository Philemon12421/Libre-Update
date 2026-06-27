import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, ActivityIndicator, Image, ScrollView,
  Modal, Linking, Alert, Platform,
} from 'react-native';
import {
  Search, X, BookOpen, ExternalLink, Download,
  Star, ChevronRight, RefreshCw, Filter,
} from 'lucide-react-native';

interface Book {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  language?: string[];
  edition_count?: number;
  ia?: string[];
  has_fulltext?: boolean;
  public_scan_b?: boolean;
}

interface BookDetail {
  title: string;
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
}

const SUBJECTS = [
  { id: 'science', label: 'Science', color: '#10b981' },
  { id: 'history', label: 'History', color: '#f59e0b' },
  { id: 'philosophy', label: 'Philosophy', color: '#8b5cf6' },
  { id: 'technology', label: 'Technology', color: '#3b82f6' },
  { id: 'fiction', label: 'Fiction', color: '#ec4899' },
  { id: 'mathematics', label: 'Math', color: '#ef4444' },
  { id: 'medicine', label: 'Medicine', color: '#06b6d4' },
  { id: 'law', label: 'Law', color: '#64748b' },
];

const COVER_URL = (id: number, size: 'S' | 'M' | 'L' = 'M') =>
  `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;

const OPEN_LIB_SEARCH = (q: string, page = 1) =>
  `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&page=${page}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,subject,language,edition_count,ia,has_fulltext,public_scan_b`;

const SUBJECT_SEARCH = (subject: string, page = 1) =>
  `https://openlibrary.org/subjects/${subject}.json?limit=20&offset=${(page - 1) * 20}`;

export default function BookSearch() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [error, setError] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const search = useCallback(async (q: string, pg = 1, append = false) => {
    if (!q.trim() && !activeSubject) return;
    pg === 1 ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const url = activeSubject && !q.trim()
        ? SUBJECT_SEARCH(activeSubject, pg)
        : OPEN_LIB_SEARCH(q, pg);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let results: Book[] = [];
      let total = 0;

      if (activeSubject && !q.trim()) {
        // Subject API returns { works: [...] }
        results = (data.works ?? []).map((w: any) => ({
          key: w.key,
          title: w.title,
          author_name: w.authors?.map((a: any) => a.name),
          first_publish_year: w.first_publish_year,
          cover_i: w.cover_id,
          edition_count: w.edition_count,
        }));
        total = data.work_count ?? results.length;
      } else {
        results = data.docs ?? [];
        total = data.numFound ?? 0;
      }

      setTotalFound(total);
      setBooks(prev => append ? [...prev, ...results] : results);
      setPage(pg);
      setHasMore(results.length === 20 && (append ? books.length + results.length : results.length) < total);
    } catch (e: any) {
      setError('Could not load books. Check your internet connection.');
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeSubject, books.length]);

  const handleSearch = () => {
    setBooks([]); setPage(1);
    search(query, 1, false);
  };

  const handleSubject = (id: string) => {
    const next = activeSubject === id ? null : id;
    setActiveSubject(next);
    setQuery('');
    setBooks([]); setPage(1);
    if (next) search('', 1, false);
    else { setBooks([]); setTotalFound(0); }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) search(query, page + 1, true);
  };

  const openDetail = async (book: Book) => {
    setSelectedBook(book);
    setLoadingDetail(true);
    setBookDetail(null);
    try {
      const res = await fetch(`https://openlibrary.org${book.key}.json`);
      if (res.ok) setBookDetail(await res.json());
    } catch {}
    finally { setLoadingDetail(false); }
  };

  const openArchive = (book: Book) => {
    if (book.ia && book.ia.length > 0) {
      Linking.openURL(`https://archive.org/details/${book.ia[0]}`);
    } else {
      Linking.openURL(`https://openlibrary.org${book.key}`);
    }
  };

  const getDescription = (detail: BookDetail) => {
    if (!detail.description) return null;
    if (typeof detail.description === 'string') return detail.description;
    return detail.description.value ?? null;
  };

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity style={styles.bookCard} onPress={() => openDetail(item)} activeOpacity={0.7}>
      <View style={styles.coverWrap}>
        {item.cover_i ? (
          <Image
            source={{ uri: COVER_URL(item.cover_i, 'S') }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <BookOpen size={22} color="#3b82f6" />
          </View>
        )}
        {(item.has_fulltext || item.public_scan_b) && (
          <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        {item.author_name && (
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author_name.slice(0, 2).join(', ')}</Text>
        )}
        <View style={styles.bookMeta}>
          {item.first_publish_year && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{item.first_publish_year}</Text>
            </View>
          )}
          {item.edition_count && item.edition_count > 1 && (
            <View style={[styles.metaChip, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
              <Text style={[styles.metaChipText, { color: '#2563eb' }]}>{item.edition_count} eds</Text>
            </View>
          )}
          {item.language && item.language.includes('eng') && (
            <View style={[styles.metaChip, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
              <Text style={[styles.metaChipText, { color: '#10b981' }]}>EN</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Open Library · {totalFound > 0 ? `${totalFound.toLocaleString()} results` : 'Millions of free books'}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search books, authors, topics..."
            placeholderTextColor="#cbd5e1"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => { setQuery(''); setBooks([]); setTotalFound(0); }}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Search size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Subject chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll} contentContainerStyle={styles.subjectsContent}>
        {SUBJECTS.map(s => {
          const isActive = activeSubject === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.subjectChip, isActive && { backgroundColor: s.color, borderColor: s.color }]}
              onPress={() => handleSubject(s.id)}
            >
              <Text style={[styles.subjectText, isActive && { color: '#fff' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Error */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => search(query, 1, false)}>
            <RefreshCw size={14} color="#ef4444" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={styles.loadingText}>Searching Open Library...</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && books.length === 0 && error === '' && (
        <View style={styles.emptyBox}>
          <BookOpen size={40} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Search the World's Books</Text>
          <Text style={styles.emptySub}>
            Powered by Open Library — millions of books,{'\n'}many with free full-text access.
          </Text>
          <View style={styles.tipRow}>
            {['Classic novels', 'Science texts', 'History books'].map(t => (
              <TouchableOpacity key={t} style={styles.tipChip} onPress={() => { setQuery(t); setTimeout(handleSearch, 50); }}>
                <Text style={styles.tipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      {!loading && books.length > 0 && (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.loadMoreBox}><ActivityIndicator color="#3b82f6" /></View>
          ) : hasMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : null}
        />
      )}

      {/* Book Detail Modal */}
      <Modal visible={!!selectedBook} animationType="slide" onRequestClose={() => setSelectedBook(null)}>
        {selectedBook && (
          <ScrollView style={styles.detailContainer} contentContainerStyle={styles.detailContent}>
            {/* Cover hero */}
            <View style={styles.detailHero}>
              {selectedBook.cover_i ? (
                <Image
                  source={{ uri: COVER_URL(selectedBook.cover_i, 'L') }}
                  style={styles.detailCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.detailCover, styles.detailCoverPlaceholder]}>
                  <BookOpen size={48} color="#3b82f6" />
                </View>
              )}
              <View style={styles.detailHeroOverlay} />
            </View>

            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBook(null)}>
              <X size={20} color="#fff" />
            </TouchableOpacity>

            {/* Info card */}
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>{selectedBook.title}</Text>
              {selectedBook.author_name && (
                <Text style={styles.detailAuthor}>{selectedBook.author_name.join(', ')}</Text>
              )}

              {/* Meta row */}
              <View style={styles.detailMetaRow}>
                {selectedBook.first_publish_year && (
                  <View style={styles.metaChip}><Text style={styles.metaChipText}>First published {selectedBook.first_publish_year}</Text></View>
                )}
                {selectedBook.edition_count && (
                  <View style={[styles.metaChip, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                    <Text style={[styles.metaChipText, { color: '#2563eb' }]}>{selectedBook.edition_count} editions</Text>
                  </View>
                )}
                {(selectedBook.has_fulltext || selectedBook.public_scan_b) && (
                  <View style={[styles.metaChip, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                    <Text style={[styles.metaChipText, { color: '#10b981' }]}>✓ Free to read</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {loadingDetail ? (
                <ActivityIndicator color="#3b82f6" style={{ marginVertical: 16 }} />
              ) : bookDetail && getDescription(bookDetail) ? (
                <View style={styles.descBox}>
                  <Text style={styles.descLabel}>ABOUT THIS BOOK</Text>
                  <Text style={styles.descText}>{getDescription(bookDetail)}</Text>
                </View>
              ) : null}

              {/* Subjects */}
              {selectedBook.subject && selectedBook.subject.length > 0 && (
                <View style={styles.subjectsBox}>
                  <Text style={styles.descLabel}>SUBJECTS</Text>
                  <View style={styles.subjectTagsRow}>
                    {selectedBook.subject.slice(0, 8).map(s => (
                      <View key={s} style={styles.subjectTag}><Text style={styles.subjectTagText}>{s}</Text></View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => openArchive(selectedBook)}>
                  <ExternalLink size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {selectedBook.has_fulltext || selectedBook.public_scan_b ? 'Read Free on Archive.org' : 'View on Open Library'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => Linking.openURL(`https://openlibrary.org${selectedBook.key}`)}
                >
                  <BookOpen size={18} color="#2563eb" />
                  <Text style={styles.secondaryBtnText}>Open Library Page</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  subtitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 4, letterSpacing: 0.5 },

  searchWrap: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  searchBtn: {
    width: 48, height: 48, backgroundColor: '#2563eb',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },

  subjectsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 56 },
  subjectsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  subjectChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  subjectText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  errorBox: { margin: 16, padding: 14, backgroundColor: '#fef2f2', borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: 12, color: '#ef4444', fontWeight: '600', flex: 1 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 12 },
  retryText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginTop: 20, textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#94a3b8', marginTop: 8, textAlign: 'center', lineHeight: 18 },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, justifyContent: 'center' },
  tipChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  tipText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  listContent: { padding: 16 },
  bookCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 10, padding: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  coverWrap: { position: 'relative', marginRight: 14 },
  cover: { width: 52, height: 72, borderRadius: 8, backgroundColor: '#f1f5f9' },
  coverPlaceholder: { width: 52, height: 72, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  freeBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#10b981', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 },
  freeBadgeText: { fontSize: 7, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 18 },
  bookAuthor: { fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: '500' },
  bookMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  metaChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  metaChipText: { fontSize: 9, fontWeight: '700', color: '#64748b' },

  loadMoreBox: { padding: 20, alignItems: 'center' },
  loadMoreBtn: { margin: 16, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  loadMoreText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },

  // Detail
  detailContainer: { flex: 1, backgroundColor: '#f8fafc' },
  detailContent: { paddingBottom: 40 },
  detailHero: { height: 260, position: 'relative' },
  detailCover: { width: '100%', height: '100%' },
  detailCoverPlaceholder: { backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  detailHeroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    // gradient-like fade via background
    backgroundColor: 'rgba(248,250,252,0.0)',
  },
  closeBtn: {
    position: 'absolute', top: 48, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  detailCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -24, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  detailTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', lineHeight: 26 },
  detailAuthor: { fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: '600' },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  descBox: { marginTop: 20 },
  descLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },
  descText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  subjectsBox: { marginTop: 20 },
  subjectTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  subjectTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  subjectTagText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  actionRow: { marginTop: 24, gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#0f172a', height: 56, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#eff6ff', height: 52, borderRadius: 16,
    borderWidth: 1, borderColor: '#dbeafe',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});
