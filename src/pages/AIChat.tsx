import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Platform, Animated,
  KeyboardAvoidingView, Alert, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Sparkles, Send, X, BookOpen, Search, Brain,
  ChevronDown, Lightbulb, MessageCircle, Trash2,
  ExternalLink, RefreshCw,
} from 'lucide-react-native';

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }

const PROVIDERS: Record<string, { url: (m: string) => string; headers: (k: string) => Record<string, string>; body: (m: string, msgs: Message[]) => any; parse: (d: any) => string }> = {
  groq: {
    url: () => 'https://api.groq.com/openai/v1/chat/completions',
    headers: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    body: (m, msgs) => ({ model: m, messages: msgs, max_tokens: 1024, temperature: 0.7 }),
    parse: d => d.choices?.[0]?.message?.content ?? '',
  },
  openai: {
    url: () => 'https://api.openai.com/v1/chat/completions',
    headers: k => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
    body: (m, msgs) => ({ model: m, messages: msgs, max_tokens: 1024, temperature: 0.7 }),
    parse: d => d.choices?.[0]?.message?.content ?? '',
  },
  gemini: {
    url: m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (_, msgs) => ({
      contents: msgs.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: { parts: [{ text: msgs.find(m => m.role === 'system')?.content ?? '' }] },
    }),
    parse: d => d.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  },
  anthropic: {
    url: () => 'https://api.anthropic.com/v1/messages',
    headers: k => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
    body: (m, msgs) => ({
      model: m,
      max_tokens: 1024,
      system: msgs.find(msg => msg.role === 'system')?.content ?? '',
      messages: msgs.filter(msg => msg.role !== 'system').map(msg => ({ role: msg.role, content: msg.content })),
    }),
    parse: d => d.content?.[0]?.text ?? '',
  },
};

const SYSTEM_PROMPT = `You are Libre AI — a knowledgeable and enthusiastic assistant specialising in books, research, literature, academic papers, and knowledge discovery.

Your personality:
- Warm, intellectually curious, and encouraging
- You love discussing books, authors, genres, and ideas
- You help users discover new books based on their interests
- You can summarise research papers and explain complex concepts simply
- You suggest related works, authors, and further reading
- You discuss themes, symbolism, historical context, and literary analysis
- You help with academic research — finding sources, structuring arguments, citing correctly

You always:
- Recommend specific titles and authors when relevant
- Explain your reasoning for recommendations
- Ask follow-up questions to better understand what the user wants
- Keep responses focused and readable — use bullet points for lists of books
- Mention when a topic has great related books to explore`;

const QUICK_PROMPTS = [
  { icon: '📚', label: 'Recommend books',      prompt: 'Recommend 5 books for someone who loves science fiction with deep philosophical themes' },
  { icon: '🔬', label: 'Research help',         prompt: 'Help me understand the key concepts in machine learning research papers' },
  { icon: '✍️', label: 'Summarise a paper',     prompt: 'How should I read and summarise an academic research paper efficiently?' },
  { icon: '🌍', label: 'World literature',       prompt: 'What are the most important works of world literature I should read?' },
  { icon: '🧠', label: 'Deep dive a topic',     prompt: 'I want to deeply understand quantum computing — what books should I start with?' },
  { icon: '📖', label: 'Book analysis',          prompt: 'What makes a great novel? What do the best books have in common?' },
];

function TypingDots() {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]));
    Animated.parallel([anim(a1, 0), anim(a2, 160), anim(a3, 320)]).start();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: 4 }}>
      {[a1, a2, a3].map((a, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#7c3aed', opacity: a }} />
      ))}
    </View>
  );
}

export default function AIChatPage() {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [apiKey,      setApiKey]      = useState('');
  const [provider,    setProvider]    = useState('groq');
  const [model,       setModel]       = useState('llama-3.1-8b-instant');
  const [hasKey,      setHasKey]      = useState(false);
  const scrollRef    = useRef<ScrollView>(null);
  const inputRef     = useRef<TextInput>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const prov  = await AsyncStorage.getItem('libre_ai_provider') ?? 'groq';
      const mod   = await AsyncStorage.getItem('libre_ai_model')    ?? 'llama-3.1-8b-instant';
      const storageKey = `libre_api_${prov}`;
      const key   = await AsyncStorage.getItem(storageKey) ?? '';
      setProvider(prov);
      setModel(mod);
      setApiKey(key);
      setHasKey(!!key.trim());
    } catch {}
  };

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    if (!hasKey || !apiKey.trim()) {
      Alert.alert('No AI Key', 'Go to Settings → AI Integration to add your free API key.', [{ text: 'OK' }]);
      return;
    }

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    scrollToBottom();

    const p = PROVIDERS[provider];
    if (!p) { setLoading(false); return; }

    const fullMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...newMessages.slice(-12),
    ];

    try {
      const url = provider === 'gemini'
        ? `${p.url(model)}?key=${apiKey.trim()}`
        : p.url(model);

      const res = await fetch(url, {
        method: 'POST',
        headers: p.headers(apiKey.trim()),
        body: JSON.stringify(p.body(model, fullMessages)),
      });

      const data = await res.json();
      const reply = p.parse(data);

      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${data.error.message ?? 'API error'}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ No response received. Check your API key and model.' }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Network error: ${e.message}` }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, messages, loading, hasKey, apiKey, provider, model]);

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Start a fresh conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Sparkles size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Libre AI</Text>
            <Text style={styles.headerSub}>Books · Research · Knowledge</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {hasKey && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>{provider}</Text>
            </View>
          )}
          {messages.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={scrollToBottom}
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Brain size={36} color="#7c3aed" />
              </View>
              <Text style={styles.emptyTitle}>Your AI Research Assistant</Text>
              <Text style={styles.emptySub}>
                {hasKey
                  ? 'Ask about books, get research help, or explore any topic'
                  : 'Add a free AI key in Settings → AI Integration to get started'}
              </Text>

              {!hasKey && (
                <TouchableOpacity
                  style={styles.setupBtn}
                  onPress={() => Alert.alert('Setup', 'Go to Settings → AI Integration to add your free Groq API key.')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.setupBtnText}>Set Up AI →</Text>
                </TouchableOpacity>
              )}

              {hasKey && (
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickCard}
                      onPress={() => sendMessage(q.prompt)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.quickCardIcon}>{q.icon}</Text>
                      <Text style={styles.quickCardLabel}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                  <Sparkles size={11} color="#7c3aed" />
                </View>
              )}
              <View style={[
                styles.bubbleInner,
                msg.role === 'user' ? styles.userInner : styles.aiInner,
              ]}>
                <Text style={[
                  styles.bubbleText,
                  msg.role === 'user' ? styles.userText : styles.aiText,
                ]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {loading && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <Sparkles size={11} color="#7c3aed" />
              </View>
              <View style={[styles.bubbleInner, styles.aiInner]}>
                <TypingDots />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={hasKey ? 'Ask about books, research, or any topic…' : 'Add an API key in Settings first…'}
            placeholderTextColor="#cbd5e1"
            multiline
            maxLength={1000}
            editable={hasKey}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading || !hasKey) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading || !hasKey}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 16 : 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon:  { width: 42, height: 42, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  headerSub:   { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  activeDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c3aed', textTransform: 'capitalize' },
  clearBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8, gap: 14 },

  emptyState:  { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, gap: 10 },
  emptyIcon:   { width: 76, height: 76, borderRadius: 24, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:  { fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
  emptySub:    { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  setupBtn:    { backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, marginTop: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  setupBtnText:{ fontSize: 13, fontWeight: '900', color: '#fff' },
  quickGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, justifyContent: 'center' },
  quickCard: {
    width: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'flex-start', gap: 6,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  quickCardIcon:  { fontSize: 22 },
  quickCardLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b', lineHeight: 16 },

  bubble:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble:{ justifyContent: 'flex-end' },
  aiBubble:  { justifyContent: 'flex-start' },
  aiAvatar:  { width: 28, height: 28, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubbleInner:{ maxWidth: '82%', borderRadius: 18, padding: 13 },
  userInner: { backgroundColor: '#7c3aed', borderBottomRightRadius: 5 },
  aiInner:   { backgroundColor: '#fff', borderBottomLeftRadius: 5, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText:{ fontSize: 14, lineHeight: 22 },
  userText:  { color: '#fff' },
  aiText:    { color: '#1e293b' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  input: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 14, color: '#1e293b', maxHeight: 120, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: '#e2e8f0', shadowOpacity: 0 },
});
