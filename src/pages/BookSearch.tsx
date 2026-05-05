import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet, 
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking
} from 'react-native';
import { Search, BookOpen, ExternalLink, Star, Globe, X } from 'lucide-react-native';

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

  const searchBooks = async (customQuery?: string) => {
    const activeQuery = customQuery || query;
    if (!activeQuery.trim()) return;
    setSearching(true);
    setResults([]);
    setHasSearched(true);

    try {
      const [googleRes, olRes, gutenRes, iaRes] = await Promise.all([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(activeQuery)}&maxResults=10`),
        fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(activeQuery)}&limit=10`),
        fetch(`https://gutendex.com/books/?search=${encodeURIComponent(activeQuery)}`),
        fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(activeQuery)}+AND+mediatype:texts&output=json&rows=10`),
      ]);

      const [googleData, olData, gutenData, iaData] = await Promise.all([
        googleRes.json(), 
        olRes.json(),
        gutenRes.json(),
        iaRes.json()
      ]);

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

      const olBooks: BookResult[] = (olData.docs || []).slice(0, 10).map((item: any) => ({
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

      const gutenBooks: BookResult[] = (gutenData.results || []).slice(0, 10).map((item: any) => ({
        id: `guten-${item.id}`,
        title: item.title || 'Unknown Title',
        authors: item.authors.map((a: any) => a.name) || ['Public Domain'],
        thumbnail: item.formats['image/jpeg'] || PLACEHOLDER_COVER,
        description: `Download count: ${item.download_count}. Languages: ${item.languages.join(', ')}.`,
        previewLink: item.formats['text/html'] || item.formats['text/plain'] || '#',
        infoLink: `https://www.gutenberg.org/ebooks/${item.id}`,
        source: 'Gutenberg',
        publishedDate: 'Public Domain',
      }));

      const iaBooks: BookResult[] = (iaData.response.docs || []).map((item: any) => ({
        id: `ia-${item.identifier}`,
        title: item.title || 'Unknown Title',
        authors: [item.creator || 'Unknown Creator'],
        thumbnail: `https://archive.org/services/img/${item.identifier}`,
        description: item.description || 'Digitized by Internet Archive.',
        previewLink: `https://archive.org/details/${item.identifier}`,
        infoLink: `https://archive.org/details/${item.identifier}`,
        source: 'Archive.org',
        publishedDate: item.date,
      }));

      setResults([...googleBooks, ...olBooks, ...gutenBooks, ...iaBooks]);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const renderBookItem = ({ item }: { item: BookResult }) => (
    <TouchableOpacity 
      style={styles.bookCard} 
      onPress={() => setSelectedBook(item)}
    >
      <View style={styles.coverContainer}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.cover}
          resizeMode="cover"
        />
        <View style={styles.sourceTag}>
          <Text style={styles.sourceTagText}>{item.source}</Text>
        </View>
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.bookMeta}>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.authors[0]}</Text>
          {item.rating && (
            <View style={styles.ratingRow}>
              <Star size={10} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search books, authors, titles..."
            onSubmitEditing={() => searchBooks()}
            placeholderTextColor="#cbd5e1"
          />
          {searching ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <TouchableOpacity 
              onPress={() => searchBooks()}
              disabled={!query.trim()}
              style={[styles.searchBtn, !query.trim() && { opacity: 0.5 }]}
            >
              <Text style={styles.searchBtnText}>SEARCH</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
        >
          {['Fiction', 'Science', 'History', 'Tech', 'Biography', 'Philosophy'].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => { setQuery(cat); searchBooks(cat); }}
              style={styles.categoryBtn}
            >
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results List */}
      {searching ? (
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.statusText}>SEARCHING...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderBookItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            {hasSearched ? <Search size={32} color="#cbd5e1" /> : <BookOpen size={32} color="#cbd5e1" />}
          </View>
          <Text style={styles.emptyTitle}>{hasSearched ? 'No results found' : 'Find Any Book'}</Text>
          <Text style={styles.emptySubtitle}>
            {hasSearched 
              ? 'Try different keywords or check your spelling.' 
              : 'Search across Google Books, Open Library, and Gutenberg simultaneously.'}
          </Text>
        </View>
      )}

      {/* Book Detail Modal */}
      <Modal
        visible={!!selectedBook}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBook(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea}
            onPress={() => setSelectedBook(null)}
          />
          <View style={styles.modalContent}>
            {selectedBook && (
              <>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedBook(null)}
                >
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>

                <ScrollView>
                  <View style={styles.modalHero}>
                    <Image 
                      source={{ uri: selectedBook.thumbnail }} 
                      style={styles.modalHeroCover}
                    />
                  </View>

                  <View style={styles.modalDetails}>
                    <Text style={styles.modalTitle}>{selectedBook.title}</Text>
                    <Text style={styles.modalAuthor}>{selectedBook.authors.join(', ')}</Text>
                    
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>
                        {selectedBook.description.replace(/<[^>]*>/g, '').substring(0, 500)}
                        {selectedBook.description.length > 500 ? '...' : ''}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>SOURCE</Text>
                        <Text style={styles.metaValue}>{selectedBook.source}</Text>
                      </View>
                      {selectedBook.publishedDate && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>PUBLISHED</Text>
                          <Text style={styles.metaValue}>{selectedBook.publishedDate}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={styles.primaryBtn}
                    onPress={() => Linking.openURL(selectedBook.previewLink)}
                  >
                    <BookOpen size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>PREVIEW BOOK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.secondaryBtn}
                    onPress={() => Linking.openURL(selectedBook.infoLink)}
                  >
                    <ExternalLink size={14} color="#64748b" />
                    <Text style={styles.secondaryBtnText}>MORE INFO</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  searchSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  categories: {
    marginTop: 12,
  },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bookCard: {
    width: '48%',
  },
  coverContainer: {
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  sourceTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceTagText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
  },
  bookInfo: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  bookTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 14,
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  bookAuthor: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
    marginLeft: 2,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 12,
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: '80%',
    paddingBottom: 40,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHero: {
    height: 200,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeroCover: {
    width: 110,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-2deg' }],
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  modalDetails: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 26,
  },
  modalAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  descriptionText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  modalFooter: {
    padding: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});