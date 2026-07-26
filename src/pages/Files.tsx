import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Platform, Animated, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, File, Download, Trash2,
  Upload, X, Edit2, Plus, Search, ArrowUpDown, BookOpen,
  FileCode, Layout, Star, Folder as FolderIcon, MoreHorizontal,
  ExternalLink, ChevronLeft, ZoomIn, Sparkles, Send, MessageCircle,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';

type SortOption  = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type Category    = 'all' | 'pdf' | 'word' | 'ppt' | 'txt' | 'image' | 'dirs' | 'favorites' | 'others';

const CATEGORIES: { id: Category; label: string; icon: any; color: string }[] = [
  { id: 'all',       label: 'All',     icon: File,           color: '#64748b' },
  { id: 'pdf',       label: 'PDF',     icon: FileText,       color: '#ef4444' },
  { id: 'word',      label: 'Word',    icon: FileText,       color: '#2563eb' },
  { id: 'ppt',       label: 'PPT',     icon: Layout,         color: '#f97316' },
  { id: 'txt',       label: 'Text',    icon: BookOpen,       color: '#6366f1' },
  { id: 'image',     label: 'Images',  icon: ImageIcon,      color: '#10b981' },
  { id: 'dirs',      label: 'Folders', icon: FolderIcon,     color: '#f59e0b' },
  { id: 'favorites', label: 'Starred', icon: Star,           color: '#ec4899' },
  { id: 'others',    label: 'Others',  icon: MoreHorizontal, color: '#94a3b8' },
];

function matchCategory(file: LibreFile, cat: Category): boolean {
  const t   = (file.type ?? '').toLowerCase();
  const ext = (file.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  switch (cat) {
    case 'all':       return true;
    case 'pdf':       return t.includes('pdf') || ext === 'pdf';
    case 'word':      return t.includes('word') || t.includes('msword') || ['doc','docx','odt','rtf'].includes(ext);
    case 'ppt':       return t.includes('presentation') || t.includes('powerpoint') || ['ppt','pptx','odp'].includes(ext);
    case 'txt':       return t.includes('text') || t.includes('json') || ['txt','md','csv','json','js','ts','jsx','tsx','html','css','xml','yaml','yml'].includes(ext);
    case 'image':     return t.includes('image') || ['jpg','jpeg','png','gif','webp','svg','bmp','heic'].includes(ext);
    case 'dirs':      return false;
    case 'favorites': return !!(file as any).starred;
    case 'others': {
      const known = t.includes('pdf') || t.includes('word') || t.includes('msword') ||
        t.includes('presentation') || t.includes('powerpoint') || t.includes('text') ||
        t.includes('json') || t.includes('image') ||
        ['doc','docx','odt','rtf','ppt','pptx','odp','txt','md','csv','json','js','ts',
         'jsx','tsx','html','css','xml','yaml','yml','jpg','jpeg','png','gif','webp',
         'svg','bmp','heic','pdf'].includes(ext);
      return !known;
    }
    default: return true;
  }
}

function getPreviewType(file: LibreFile): 'image' | 'text' | 'pdf' | 'office' | 'none' {
  const t   = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp','bmp','heic'].includes(ext)) return 'image';
  if (t.includes('pdf')   || ext === 'pdf')                                                 return 'pdf';
  if (t.includes('text')  || ['txt','md','csv','json','js','ts','html','css','xml','yaml','yml'].includes(ext)) return 'text';
  if (['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods'].includes(ext))             return 'office';
  return 'none';
}

function getIconColor(type: string, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf')          || ext === 'pdf')                               return { bg: '#fef2f2', color: '#ef4444' };
  if (t.includes('image')        || ['jpg','jpeg','png','gif','webp'].includes(ext)) return { bg: '#ecfdf5', color: '#10b981' };
  if (t.includes('word')         || ['doc','docx'].includes(ext))                return { bg: '#eff6ff', color: '#2563eb' };
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))                return { bg: '#fff7ed', color: '#f97316' };
  if (t.includes('text')         || ['txt','md'].includes(ext))                  return { bg: '#eef2ff', color: '#6366f1' };
  return { bg: '#f8fafc', color: '#94a3b8' };
}

function getIcon(type: string, size = 18, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t.includes('pdf')          || ext === 'pdf')                               return <FileText  color="#ef4444" size={size} />;
  if (t.includes('image')        || ['jpg','jpeg','png','gif','webp'].includes(ext)) return <ImageIcon color="#10b981" size={size} />;
  if (t.includes('text')         || ['txt','md'].includes(ext))                  return <BookOpen  color="#6366f1" size={size} />;
  if (t.includes('word')         || ['doc','docx'].includes(ext))                return <FileText  color="#2563eb" size={size} />;
  if (t.includes('sheet')        || ['xls','xlsx'].includes(ext))                return <Layout    color="#10b981" size={size} />;
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))                return <Layout    color="#f97316" size={size} />;
  if (t.includes('json')         || t.includes('code'))                          return <FileCode  color="#f59e0b" size={size} />;
  return <File color="#94a3b8" size={size} />;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── HTML builders ──────────────────────────────────────────────────────────

function buildPdfHtml(uri: string): string {
  // Use Google Docs viewer for all PDFs — most reliable cross-platform approach
  const isHttp = uri.startsWith('http');
  if (isHttp) {
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(uri)}&embedded=true`;
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}body{background:#1a1a2e}iframe{width:100vw;height:100vh;border:none}</style>
</head><body>
<iframe src="${viewerUrl}" allowfullscreen></iframe>
</body></html>`;
  }
  // Local PDF — use pdf.js from CDN with the file URI
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1e1e2e;font-family:sans-serif}
#toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0f172a;position:sticky;top:0;z-index:10}
.info{color:#94a3b8;font-size:12px;text-align:center;flex:1}
.info span{color:#60a5fa;font-weight:700}
.btn{background:#1e293b;border:none;color:#e2e8f0;border-radius:8px;padding:7px 13px;font-size:12px;cursor:pointer}
#wrap{display:flex;flex-direction:column;align-items:center;padding:12px;gap:12px;min-height:100vh}
canvas{border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:100%;background:#fff}
#load{display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;color:#60a5fa;gap:14px;font-size:13px}
.spin{width:34px;height:34px;border:3px solid #1e293b;border-top-color:#60a5fa;border-radius:50%;animation:s 0.9s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
#err{padding:30px;text-align:center;color:#f87171;font-size:12px;line-height:1.7;display:none}
</style></head><body>
<div id="toolbar">
  <button class="btn" onclick="go(-1)">‹</button>
  <div class="info">Page <span id="pn">–</span> / <span id="pc">–</span></div>
  <button class="btn" onclick="go(1)">›</button>
  <button class="btn" onclick="zoomIn()">＋</button>
  <button class="btn" onclick="zoomOut()">－</button>
</div>
<div id="load"><div class="spin"></div>Loading PDF…</div>
<div id="wrap" style="display:none"></div>
<div id="err"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
var workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.workerSrc=workerSrc;
var pdf=null,page=1,scale=1.2,busy=false;
var wrap=document.getElementById('wrap');
var load=document.getElementById('load');
var err=document.getElementById('err');

function showErr(msg){load.style.display='none';wrap.style.display='none';err.style.display='block';err.textContent=msg;}

pdfjsLib.getDocument({url:'${uri}',disableStream:true,disableRange:true}).promise.then(function(doc){
  pdf=doc;
  document.getElementById('pc').textContent=doc.numPages;
  load.style.display='none';
  wrap.style.display='flex';
  render(1);
}).catch(function(e){showErr('Cannot load PDF.\n'+e.message+'\n\nTry sharing the file and opening in a PDF viewer app.');});

function render(n){
  if(busy||!pdf)return;busy=true;page=n;
  pdf.getPage(n).then(function(p){
    var vp=p.getViewport({scale:scale});
    var id='c'+n;
    var c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;wrap.innerHTML='';wrap.appendChild(c);}
    c.width=vp.width;c.height=vp.height;
    p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){
      document.getElementById('pn').textContent=n;busy=false;
    });
  });
}
function go(d){var n=page+d;if(pdf&&n>=1&&n<=pdf.numPages)render(n);}
function zoomIn(){scale=Math.min(scale+0.25,3.5);render(page);}
function zoomOut(){scale=Math.max(scale-0.25,0.5);render(page);}
</script></body></html>`;
}


function buildOfficeViewerHtml(uri: string): string {
  const src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(uri)}`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}
iframe{width:100vw;height:100vh;border:none;display:block}</style>
</head><body>
<iframe src="${src}" allowfullscreen></iframe>
</body></html>`;
}

function buildTextHtml(text: string, name: string): string {
  const ext    = name.split('.').pop()?.toLowerCase() ?? '';
  const isCode = ['js','ts','jsx','tsx','html','css','json','xml','yaml','yml','py','java','cpp','c','sh','md'].includes(ext);
  const esc    = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (isCode) {
    const lines = esc.split('\n').map((line, i) =>
      `<tr><td class="ln">${i + 1}</td><td class="code">${line || ' '}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:'Courier New',monospace;font-size:12px}
table{width:100%;border-collapse:collapse;padding:12px 0}
.ln{color:#334155;text-align:right;padding:3px 12px 3px 8px;user-select:none;vertical-align:top;min-width:36px;font-size:11px}
.code{padding:3px 12px 3px 0;white-space:pre-wrap;word-break:break-word;color:#38bdf8;line-height:1.6}
</style></head><body>
<table><tbody>${lines}</tbody></table>
</body></html>`;
  }

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;color:#1e293b;font-family:-apple-system,system-ui,sans-serif;font-size:15px;line-height:1.8;padding:20px}
p{margin-bottom:14px}
</style></head><body>
<div>${esc.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
</body></html>`;
}


// ── AI Chat Panel ──────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string; }

function AIChatPanel({
  file, textContent, onClose,
}: {
  file: LibreFile;
  textContent: string;
  onClose: () => void;
}) {
  const [messages,   setMessages]   = useState<ChatMsg[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [apiKey,     setApiKey]     = useState('');
  const [modelId,    setModelId]    = useState('llama-3.1-8b-instant');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key   = await AsyncStorage.getItem('libre_groq_api_key');
      const model = await AsyncStorage.getItem('libre_groq_model');
      if (key)   setApiKey(key);
      if (model) setModelId(model);
    } catch {}
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(onClose);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) {
      Alert.alert('No API Key', 'Go to Settings → AI Integration to add your free Groq API key.');
      return;
    }

    const userMsg: ChatMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Build context from file
    const docContext = textContent
      ? `You are a helpful document assistant. The user is viewing a file called "${file.name}". Here is its content:

${textContent.slice(0, 6000)}

---
Answer the user's question based on this document.`
      : `You are a helpful assistant. The user is viewing a file called "${file.name}" (${file.type}). You cannot see its content directly, but help as best you can.`;

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: docContext },
            ...history,
            { role: 'user', content: userMsg.content },
          ],
          max_tokens: 1024,
          temperature: 0.7,
          stream: false,
        }),
      });

      const data = await res.json();

      if (data.choices?.[0]?.message?.content) {
        const reply: ChatMsg = { role: 'assistant', content: data.choices[0].message.content };
        setMessages(prev => [...prev, reply]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else if (data.error) {
        const errMsg: ChatMsg = { role: 'assistant', content: `❌ Error: ${data.error.message}` };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (e: any) {
      const errMsg: ChatMsg = { role: 'assistant', content: `❌ Network error: ${e.message}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK = [
    'Summarise this document',
    'What are the key points?',
    'Explain this simply',
    'List all dates mentioned',
  ];

  return (
    <Animated.View style={[aiStyles.panel, { transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={aiStyles.header}>
        <View style={aiStyles.headerLeft}>
          <View style={aiStyles.sparkleWrap}>
            <Sparkles size={16} color="#fff" />
          </View>
          <View>
            <Text style={aiStyles.headerTitle}>Ask AI</Text>
            <Text style={aiStyles.headerSub} numberOfLines={1}>{file.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClose} style={aiStyles.closeBtn} activeOpacity={0.7}>
          <X size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={aiStyles.messages}
        contentContainerStyle={aiStyles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={aiStyles.emptyState}>
            <View style={aiStyles.emptyIcon}>
              <MessageCircle size={28} color="#7c3aed" />
            </View>
            <Text style={aiStyles.emptyTitle}>Ask about this document</Text>
            <Text style={aiStyles.emptySub}>
              {apiKey ? 'Type a question or tap a suggestion below' : 'Add your free Groq API key in Settings → AI Integration'}
            </Text>
            {/* Quick prompts */}
            {apiKey && (
              <View style={aiStyles.quickRow}>
                {QUICK.map((q, i) => (
                  <TouchableOpacity key={i} style={aiStyles.quickChip} onPress={() => { setInput(q); }} activeOpacity={0.8}>
                    <Text style={aiStyles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {messages.map((msg, i) => (
          <View key={i} style={[aiStyles.bubble, msg.role === 'user' ? aiStyles.userBubble : aiStyles.aiBubble]}>
            {msg.role === 'assistant' && (
              <View style={aiStyles.aiAvatar}>
                <Sparkles size={10} color="#7c3aed" />
              </View>
            )}
            <View style={[aiStyles.bubbleContent, msg.role === 'user' ? aiStyles.userContent : aiStyles.aiContent]}>
              <Text style={[aiStyles.bubbleText, msg.role === 'user' ? aiStyles.userText : aiStyles.aiText]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={[aiStyles.bubble, aiStyles.aiBubble]}>
            <View style={aiStyles.aiAvatar}><Sparkles size={10} color="#7c3aed" /></View>
            <View style={[aiStyles.bubbleContent, aiStyles.aiContent, aiStyles.typingBubble]}>
              <View style={aiStyles.typingDots}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[aiStyles.typingDot, { opacity: 0.4 + i * 0.2 }]} />
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={aiStyles.inputRow}>
          <TextInput
            style={aiStyles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about this document…"
            placeholderTextColor="#cbd5e1"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[aiStyles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
          >
            <Send size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const aiStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '68%',
    backgroundColor: '#fff',
    zIndex: 200,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sparkleWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  headerSub:   { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 1, maxWidth: 200 },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, gap: 12, paddingBottom: 8 },

  emptyState:  { alignItems: 'center', paddingTop: 24, paddingHorizontal: 16, gap: 8 },
  emptyIcon:   { width: 60, height: 60, borderRadius: 18, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:  { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  emptySub:    { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  quickRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  quickChip:   { backgroundColor: '#faf5ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  quickChipText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },

  bubble:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble:  { justifyContent: 'flex-end' },
  aiBubble:    { justifyContent: 'flex-start' },
  aiAvatar:    { width: 24, height: 24, borderRadius: 8, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubbleContent: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userContent: { backgroundColor: '#7c3aed', borderBottomRightRadius: 4 },
  aiContent:   { backgroundColor: '#f8fafc', borderBottomLeftRadius: 4 },
  bubbleText:  { fontSize: 13, lineHeight: 20 },
  userText:    { color: '#fff' },
  aiText:      { color: '#1e293b' },
  typingBubble:{ paddingVertical: 14 },
  typingDots:  { flexDirection: 'row', gap: 5, alignItems: 'center' },
  typingDot:   { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#7c3aed' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 14, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: '#1e293b', maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
});

// ── Document Viewer ────────────────────────────────────────────────────────
function DocumentViewer({ file, onClose }: { file: LibreFile; onClose: () => void }) {
  const [textContent,  setTextContent]  = useState('');
  const [editedText,   setEditedText]   = useState('');
  const [isEditing,    setIsEditing]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [webLoading,   setWebLoading]   = useState(true);
  const [imgLoaded,    setImgLoaded]    = useState(false);
  const [showAI,       setShowAI]       = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const type  = getPreviewType(file);
  const ic    = getIconColor(file.type, file.name);
  const isLocal    = !file.data.startsWith('http') && !file.data.startsWith('data:');
  const isTextFile = type === 'text';

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (type !== 'text') return;
    (async () => {
      try {
        const src = Platform.OS !== 'web'
          ? await FileSystem.readAsStringAsync(file.data)
          : file.data.startsWith('data:')
            ? atob(file.data.split(',')[1])
            : await (await fetch(file.data)).text();
        setTextContent(src);
        setEditedText(src);
      } catch { setTextContent('Could not read file.'); }
    })();
  }, [file]);

  const saveTextFile = async () => {
    setSaving(true);
    try {
      if (Platform.OS !== 'web') {
        await FileSystem.writeAsStringAsync(file.data, editedText);
      }
      setTextContent(editedText);
      setIsEditing(false);
      Alert.alert('✓ Saved', `"${file.name}" saved successfully.`);
    } catch {
      Alert.alert('Error', 'Could not save file.');
    } finally { setSaving(false); }
  };

  const discardEdits = () => {
    Alert.alert('Discard Changes', 'Lose all unsaved changes?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { setEditedText(textContent); setIsEditing(false); } },
    ]);
  };

  const handleClose = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose);
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });

  // ── Fallback card ──
  const FallbackCard = ({ label }: { label: string }) => (
    <View style={vStyles.fallback}>
      <View style={[vStyles.fallbackIcon, { backgroundColor: ic.bg }]}>
        {getIcon(file.type, 52, file.name)}
      </View>
      <Text style={vStyles.fallbackName} numberOfLines={2}>{file.name}</Text>
      <Text style={vStyles.fallbackSub}>{label}</Text>
      <TouchableOpacity style={[vStyles.openBtn, { backgroundColor: ic.color }]} onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
        <ExternalLink size={15} color="#fff" />
        <Text style={vStyles.openBtnText}>Open with App</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Loading spinner overlay ──
  const LoadingOverlay = () => webLoading ? (
    <View style={vStyles.loadingOverlay}>
      <View style={vStyles.loadingCard}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={vStyles.loadingText}>Loading preview…</Text>
      </View>
    </View>
  ) : null;

  const renderBody = () => {
    // IMAGE
    if (type === 'image') return (
      <View style={vStyles.imageBg}>
        <Image
          source={{ uri: file.data }}
          style={vStyles.imageFile}
          resizeMode="contain"
          onLoad={() => setImgLoaded(true)}
        />
        {!imgLoaded && (
          <View style={vStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    );

    // TEXT / CODE
    if (type === 'text') {
      if (isEditing) return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 60}
        >
          <ScrollView
            style={vStyles.editorScroll}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            <TextInput
              style={vStyles.editorInput}
              value={editedText}
              onChangeText={setEditedText}
              multiline
              autoFocus
              textAlignVertical="top"
              scrollEnabled={false}
              placeholder="Start typing…"
              placeholderTextColor="#cbd5e1"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      );
      return (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            originWhitelist={['*']}
            source={{ html: buildTextHtml(textContent, file.name) }}
            onLoadEnd={() => setWebLoading(false)}
            showsVerticalScrollIndicator={false}
            scrollEnabled
          />
          <LoadingOverlay />
        </View>
      );
    }

    // PDF
    if (type === 'pdf') return (
      <View style={{ flex: 1 }}>
        <WebView
          style={{ flex: 1 }}
          originWhitelist={['*']}
          source={{ html: buildPdfHtml(file.data) }}
          onLoadEnd={() => setWebLoading(false)}
          javaScriptEnabled
          allowFileAccess
          mixedContentMode="always"
          showsVerticalScrollIndicator={false}
        />
        <LoadingOverlay />
      </View>
    );

    // OFFICE
    if (type === 'office') {
      if (isLocal) return (
        <FallbackCard label="Office files can only be previewed via a public URL. Tap below to open in a compatible app on your device." />
      );
      return (
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            source={{ html: buildOfficeViewerHtml(file.data) }}
            onLoadEnd={() => setWebLoading(false)}
            javaScriptEnabled
          />
          <LoadingOverlay />
        </View>
      );
    }

    return <FallbackCard label="No preview available for this file type." />;
  };

  return (
    <Animated.View style={[vStyles.container, { transform: [{ translateY }] }]}>
      {/* Header */}
      <View style={vStyles.header}>
        <TouchableOpacity onPress={isEditing ? discardEdits : handleClose} style={vStyles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={vStyles.headerMeta}>
          <View style={[vStyles.headerTypeTag, { backgroundColor: ic.bg }]}>
            {getIcon(file.type, 11, file.name)}
            <Text style={[vStyles.headerTypeText, { color: ic.color }]}>
              {isEditing ? 'EDITING' : file.name.split('.').pop()?.toUpperCase()}
            </Text>
          </View>
          <Text style={vStyles.headerName} numberOfLines={1}>{file.name}</Text>
          <Text style={vStyles.headerSize}>{formatSize(file.size)} · {format(file.createdAt, 'MMM d, yyyy')}</Text>
        </View>
        {isTextFile && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={vStyles.editBtn} activeOpacity={0.8}>
            <Edit2 size={14} color="#10b981" />
            <Text style={vStyles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        {isEditing && (
          <TouchableOpacity onPress={saveTextFile} style={vStyles.saveEditBtn} activeOpacity={0.85} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={vStyles.saveEditBtnText}>Save</Text>}
          </TouchableOpacity>
        )}
        {!isEditing && (
          <TouchableOpacity onPress={() => setShowAI(true)} style={vStyles.aiBtn} activeOpacity={0.8}>
            <Sparkles size={15} color="#7c3aed" />
            <Text style={vStyles.aiBtnText}>Ask AI</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => Sharing.shareAsync(file.data)} style={vStyles.shareBtn} activeOpacity={0.7}>
          <Download size={16} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={vStyles.body}>{renderBody()}</View>

      {/* Footer */}
      {!isEditing && (
        <View style={vStyles.footer}>
          <TouchableOpacity style={vStyles.footerBtn} onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
            <Download size={15} color="#fff" />
            <Text style={vStyles.footerBtnText}>Share / Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={vStyles.aiFooterBtn} onPress={() => setShowAI(true)} activeOpacity={0.85}>
            <Sparkles size={15} color="#7c3aed" />
            <Text style={vStyles.aiFooterBtnText}>Ask AI</Text>
          </TouchableOpacity>
        </View>
      )}
      {isEditing && (
        <View style={vStyles.editFooter}>
          <TouchableOpacity style={vStyles.discardBtn} onPress={discardEdits} activeOpacity={0.8}>
            <Text style={vStyles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={vStyles.saveEditFooterBtn} onPress={saveTextFile} activeOpacity={0.85} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Text style={vStyles.saveEditFooterBtnText}>Save File</Text></>}
          </TouchableOpacity>
        </View>
      )}

      {/* AI Chat Panel */}
      {showAI && (
        <AIChatPanel
          file={file}
          textContent={textContent}
          onClose={() => setShowAI(false)}
        />
      )}
    </Animated.View>
  );
}

const vStyles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1 },
  headerTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  headerTypeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  headerName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  headerSize: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  shareBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1 },

  imageBg:   { flex: 1, backgroundColor: '#0f172a' },
  imageFile: { flex: 1, width: '100%' },

  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12 },
  fallbackIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fallbackName: { fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  fallbackSub:  { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  openBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  openBtnText:  { color: '#fff', fontSize: 12, fontWeight: '800' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
  loadingCard: { alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 28, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  footerBtn: { flex: 1, backgroundColor: '#0f172a', height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  aiFooterBtn: { flex: 1, backgroundColor: '#faf5ff', height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiFooterBtnText: { color: '#7c3aed', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#faf5ff', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 },
  aiBtnText: { fontSize: 11, fontWeight: '800', color: '#7c3aed' },
});

// ── FileItem Component (hooks-safe, outside FlatList render) ─────────────
function FileItem({
  item, index, isSelectMode, isSelected,
  onPress, onLongPress, onStar, onRename, onDelete,
}: {
  item: LibreFile;
  index: number;
  isSelectMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ic         = getIconColor(item.type, item.name);
  const hasPreview = getPreviewType(item) !== 'none';
  const starred    = !!(item as any).starred;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, delay: index * 45, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: index * 45, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[fiStyles.item, isSelected && fiStyles.itemSelected]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.72}
      >
        {isSelectMode && (
          <View style={[fiStyles.checkbox, isSelected && fiStyles.checkboxActive]}>
            {isSelected && <View style={fiStyles.checkMark} />}
          </View>
        )}

        {/* Icon */}
        <View style={[fiStyles.iconWrap, { backgroundColor: ic.bg }]}>
          {getIcon(item.type, 20, item.name)}
        </View>

        {/* Info */}
        <View style={fiStyles.info}>
          <Text style={fiStyles.name} numberOfLines={1}>{item.name}</Text>
          <View style={fiStyles.metaRow}>
            <Text style={fiStyles.meta}>{formatSize(item.size)}</Text>
            <View style={fiStyles.dot} />
            <Text style={fiStyles.meta}>{format(item.createdAt, 'MMM d, yyyy')}</Text>
          </View>
        </View>

        {/* Preview badge */}
        {hasPreview && !isSelectMode && (
          <View style={[fiStyles.previewBadge, { backgroundColor: ic.bg }]}>
            <ZoomIn size={10} color={ic.color} />
          </View>
        )}

        {/* Actions */}
        {!isSelectMode && (
          <View style={fiStyles.actions}>
            <TouchableOpacity onPress={onStar} style={fiStyles.actionBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Star size={13} color={starred ? '#f59e0b' : '#d1d5db'} fill={starred ? '#f59e0b' : 'none'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRename} style={fiStyles.actionBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Edit2 size={13} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[fiStyles.actionBtn, fiStyles.deleteBtn]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Trash2 size={13} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const fiStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    marginBottom: 0,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemSelected: { backgroundColor: '#eff6ff' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: '#cbd5e1',
    marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  checkMark: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 2 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  info:    { flex: 1, gap: 4 },
  name:    { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:    { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  dot:     { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#d1d5db' },
  previewBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  actions:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 4 },
  actionBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  deleteBtn: { backgroundColor: '#fef2f2' },
});

// ── Main Page ──────────────────────────────────────────────────────────────
export default function FilesPage({ activeFolderId }: { activeFolderId?: number }) {
  const [files,      setFiles]      = useState<LibreFile[]>([]);
  const [folders,    setFolders]    = useState<LibreFolder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [category,   setCategory]   = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [viewingFile, setViewingFile] = useState<LibreFile | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingFile, setEditingFile] = useState<LibreFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteName,    setNoteName]    = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote,  setSavingNote]  = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeFolderId
        ? await db.files.where('folderId').equals(activeFolderId).toArray()
        : await db.files.toArray();
      const sorted = [...query].sort((a, b) => {
        if (sortOption === 'newest')    return b.createdAt - a.createdAt;
        if (sortOption === 'oldest')    return a.createdAt - b.createdAt;
        if (sortOption === 'name-asc')  return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
      setFiles(sorted);
      setFolders(await db.folders.toArray());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeFolderId, sortOption]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const counts: Record<Category, number> = {} as any;
  CATEGORIES.forEach(c => {
    counts[c.id] = c.id === 'dirs' ? folders.length : files.filter(f => matchCategory(f, c.id)).length;
  });

  const filtered = (category === 'dirs' ? [] : files)
    .filter(f => matchCategory(f, category))
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      setUploading(true);
      const { name, size, uri, mimeType } = result.assets[0];
      let finalUri = uri;
      if (Platform.OS !== 'web') {
        const dir  = FileSystem.documentDirectory + 'libre_files/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        finalUri = dir + Date.now() + '_' + name;
        await FileSystem.copyAsync({ from: uri, to: finalUri });
      } else if (size && size < 2 * 1024 * 1024) {
        try {
          const blob = await (await fetch(uri)).blob();
          finalUri = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
        } catch {}
      }
      await db.files.add({ id: Date.now(), name, type: mimeType ?? 'application/octet-stream', size: size ?? 0, data: finalUri, folderId: activeFolderId, createdAt: Date.now() });
      Alert.alert('✓ Uploaded', `"${name}" added successfully.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to pick file.'); }
    finally { setUploading(false); }
  };

  const toggleStar = async (file: LibreFile) => {
    await db.files.update(file.id!, { starred: !(file as any).starred } as any);
    fetchFiles();
  };

  const deleteFile = (file: LibreFile) => {
    Alert.alert(
      'Delete File',
      `Permanently delete "${file.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              // Delete physical file from device storage
              if (Platform.OS !== 'web' && file.data && !file.data.startsWith('data:') && !file.data.startsWith('http')) {
                const info = await FileSystem.getInfoAsync(file.data);
                if (info.exists) await FileSystem.deleteAsync(file.data, { idempotent: true });
              }
              await db.files.delete(file.id!);
              fetchFiles();
            } catch (e) {
              // Still remove from DB even if physical delete fails
              await db.files.delete(file.id!);
              fetchFiles();
            }
          },
        },
      ]
    );
  };
  const renameFile  = async () => {
    if (!newFileName.trim() || !editingFile?.id) return;
    await db.files.update(editingFile.id, { name: newFileName.trim() });
    setShowRenameModal(false); setEditingFile(null); setNewFileName(''); fetchFiles();
  };
  const deleteSelected = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Delete Files',
      `Permanently delete ${count} file${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete ${count}`, style: 'destructive',
          onPress: async () => {
            const toDelete = files.filter(f => selectedIds.has(f.id!));
            await Promise.all(toDelete.map(async (file) => {
              try {
                if (Platform.OS !== 'web' && file.data && !file.data.startsWith('data:') && !file.data.startsWith('http')) {
                  const info = await FileSystem.getInfoAsync(file.data);
                  if (info.exists) await FileSystem.deleteAsync(file.data, { idempotent: true });
                }
                await db.files.delete(file.id!);
              } catch {
                await db.files.delete(file.id!);
              }
            }));
            setIsSelectMode(false);
            setSelectedIds(new Set());
            fetchFiles();
          },
        },
      ]
    );
  };
  const moveSelected = async (folderId: number | null) => {
    await Promise.all(Array.from(selectedIds).map(id => db.files.update(id as number, { folderId: folderId ?? undefined })));
    setShowMoveModal(false); setIsSelectMode(false); setSelectedIds(new Set()); fetchFiles();
  };
  const createNote = async () => {
    if (!noteName.trim()) { Alert.alert('Error', 'Enter a note name.'); return; }
    setSavingNote(true);
    try {
      let name = noteName.trim();
      if (!name.endsWith('.txt') && !name.endsWith('.md')) name += '.txt';
      let uri = '';
      if (Platform.OS !== 'web') {
        const dir  = FileSystem.documentDirectory + 'libre_files/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        uri = dir + Date.now() + '_' + name;
        await FileSystem.writeAsStringAsync(uri, noteContent);
      } else {
        uri = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(noteContent)))}`;
      }
      await db.files.add({ id: Date.now(), name, type: 'text/plain', size: noteContent.length, data: uri, folderId: activeFolderId, createdAt: Date.now() });
      setShowNoteModal(false); setNoteName(''); setNoteContent('');
      Alert.alert('✓ Created', `Note "${name}" saved.`);
      fetchFiles();
    } catch { Alert.alert('Error', 'Failed to create note.'); }
    finally { setSavingNote(false); }
  };

  const renderFile = ({ item, index }: { item: LibreFile; index: number }) => (
    <FileItem
      item={item}
      index={index}
      isSelectMode={isSelectMode}
      isSelected={selectedIds.has(item.id!)}
      onPress={() => isSelectMode
        ? setSelectedIds(prev => { const s = new Set(prev); s.has(item.id!) ? s.delete(item.id!) : s.add(item.id!); return s; })
        : setViewingFile(item)
      }
      onLongPress={() => { setIsSelectMode(true); setSelectedIds(new Set([item.id!])); }}
      onStar={() => toggleStar(item)}
      onRename={() => { setEditingFile(item); setNewFileName(item.name); setShowRenameModal(true); }}
      onDelete={() => deleteFile(item)}
    />
  );

  const renderFolder = ({ item }: { item: LibreFolder }) => (
    <View style={fiStyles.item}>
      <View style={[fiStyles.iconWrap, { backgroundColor: '#fffbeb' }]}>
        <FolderIcon size={20} color="#f59e0b" />
      </View>
      <View style={fiStyles.info}>
        <Text style={fiStyles.name}>{item.name}</Text>
        <View style={fiStyles.metaRow}>
          <Text style={fiStyles.meta}>Folder</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Top block: header + tabs + search ── */}
      <View style={styles.topBlock}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Files</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionCard} onPress={pickDocument} disabled={uploading}>
              {uploading
                ? <ActivityIndicator color="#2563eb" size="small" />
                : <><Upload size={13} color="#2563eb" /><Text style={styles.actionCardText}>Upload</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]} onPress={() => setShowNoteModal(true)}>
              <Plus size={13} color="#10b981" /><Text style={[styles.actionCardText, { color: '#10b981' }]}>Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {CATEGORIES.map(cat => {
            const Icon     = cat.icon;
            const isActive = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tab, isActive && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Icon size={11} color={isActive ? '#fff' : cat.color} strokeWidth={2} />
                <Text style={[styles.tabText, isActive && { color: '#fff' }]}>{cat.label}</Text>
                <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : cat.color + '18' }]}>
                  <Text style={[styles.tabCountText, { color: isActive ? '#fff' : cat.color }]}>{counts[cat.id]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Search + sort */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={13} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search files…"
              placeholderTextColor="#cbd5e1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={13} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortOptions(true)}>
            <ArrowUpDown size={13} color="#64748b" />
            <Text style={styles.sortBtnText}>
              {sortOption === 'newest' ? 'New' : sortOption === 'oldest' ? 'Old' : sortOption === 'name-asc' ? 'A–Z' : 'Z–A'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>{/* end topBlock */}

      {/* Select bar */}
      {isSelectMode && (
        <View style={styles.selectBar}>
          <Text style={styles.selectCount}>{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.selectAction} onPress={() => setShowMoveModal(true)}>
              <Text style={styles.selectActionText}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectAction, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]} onPress={deleteSelected}>
              <Text style={[styles.selectActionText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectAction} onPress={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}>
              <X size={13} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* File list */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.emptyBox}><ActivityIndicator color="#94a3b8" /></View>
        ) : category === 'dirs' ? (
          folders.length === 0 ? (
            <View style={styles.emptyBox}>
              <FolderIcon size={36} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Folders Yet</Text>
              <Text style={styles.emptySub}>Create folders from the Library tab</Text>
            </View>
          ) : (
            <FlatList
            data={folders}
            renderItem={renderFolder}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
          )
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <File size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No Results' : 'No Files Here'}</Text>
            <Text style={styles.emptySub}>{searchQuery ? 'Try a different keyword' : 'Upload a file to get started'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderFile}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Document Viewer */}
      {viewingFile && <DocumentViewer file={viewingFile} onClose={() => setViewingFile(null)} />}

      {/* ── Sort sheet ── */}
      <Modal visible={showSortOptions} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
            {(['newest','oldest','name-asc','name-desc'] as const).map(id => {
              const label = id === 'newest' ? 'Newest First' : id === 'oldest' ? 'Oldest First' : id === 'name-asc' ? 'Name A–Z' : 'Name Z–A';
              return (
                <TouchableOpacity key={id} style={[styles.sheetOption, sortOption === id && styles.sheetOptionActive]}
                  onPress={() => { setSortOption(id); setShowSortOptions(false); }}>
                  <Text style={[styles.sheetOptionText, sortOption === id && { color: '#2563eb', fontWeight: '700' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowSortOptions(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.overlayCenter} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Rename File</Text>
            <TextInput
              style={styles.dialogInput}
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={renameFile}
            />
            <TouchableOpacity style={styles.dialogBtn} onPress={renameFile}>
              <Text style={styles.dialogBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRenameModal(false); setEditingFile(null); }}>
              <Text style={styles.dialogCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Move modal ── */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Move to Folder</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetOption} onPress={() => moveSelected(null)}>
                <Text style={styles.sheetOptionText}>Root (no folder)</Text>
              </TouchableOpacity>
              {folders.map(f => (
                <TouchableOpacity key={f.id} style={styles.sheetOption} onPress={() => f.id && moveSelected(f.id)}>
                  <FolderIcon size={14} color="#f59e0b" />
                  <Text style={[styles.sheetOptionText, { marginLeft: 8 }]}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowMoveModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── New Note modal — keyboard aware ── */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Create Note</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            >
              <TextInput
                style={styles.dialogInput}
                placeholder="Filename (e.g. my_note.txt)"
                placeholderTextColor="#94a3b8"
                value={noteName}
                onChangeText={setNoteName}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.dialogInput, styles.noteBody]}
                placeholder="Write your note here…"
                placeholderTextColor="#cbd5e1"
                multiline
                value={noteContent}
                onChangeText={setNoteContent}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </ScrollView>
            <TouchableOpacity style={[styles.dialogBtn, { marginTop: 10 }]} onPress={createNote} disabled={savingNote}>
              {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogBtnText}>Create Note</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => { setShowNoteModal(false); setNoteName(''); setNoteContent(''); }}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f1f5f9' },

  // ── Top block ──
  topBlock: {
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  divider: { height: 10, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14,
  },
  title:          { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerActions:  { flexDirection: 'row', gap: 8 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
  },
  actionCardText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  // ── Chips ──
  tabsScroll:   { height: 56 },
  tabsContent:  { paddingHorizontal: 18, paddingVertical: 11, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9',
    height: 34,
  },
  tabText:      { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabCount:     { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabCountText: { fontSize: 8, fontWeight: '900' },

  // ── Search ──
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 13, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 13, paddingHorizontal: 12, height: 44,
  },
  sortBtnText: { fontSize: 10, fontWeight: '800', color: '#64748b' },

  // ── Select bar ──
  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 12, marginBottom: 0, backgroundColor: '#0f172a',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  selectCount:      { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  selectAction: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  selectActionText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // ── File list ──
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40, gap: 10 },
  /* FileItem styles moved to fiStyles above */

  emptyBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 52, gap: 12 },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptySub:   { fontSize: 11, color: '#cbd5e1', textAlign: 'center' },

  // ── Sheets & dialogs ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 36,
    gap: 4,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10 },
  sheetOptionActive: { backgroundColor: '#eff6ff' },
  sheetOptionText:   { fontSize: 14, fontWeight: '500', color: '#475569' },
  sheetCancel:       { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetCancelText:   { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },

  overlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog:        { backgroundColor: '#fff', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center', gap: 4 },
  dialogTitle:   { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  dialogInput: {
    width: '100%', backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 13,
    fontSize: 14, color: '#1e293b',
  },
  noteBody:      { height: 160, textAlignVertical: 'top' },
  dialogBtn:     { backgroundColor: '#2563eb', width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dialogBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  dialogCancel:  { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 },
  // ── Text editor ──
  editorScroll: { flex: 1, backgroundColor: '#fff' },
  editorInput: {
    flex: 1, padding: 18,
    fontSize: 14, color: '#1e293b', lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    minHeight: 400, textAlignVertical: 'top',
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  editBtnText:     { fontSize: 11, fontWeight: '800', color: '#10b981' },
  saveEditBtn: {
    backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 52,
  },
  saveEditBtnText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  editFooter: {
    flexDirection: 'row', gap: 10, padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  discardBtn:          { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  discardBtnText:      { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  saveEditFooterBtn: {
    flex: 2, height: 48, borderRadius: 14, backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveEditFooterBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
});
