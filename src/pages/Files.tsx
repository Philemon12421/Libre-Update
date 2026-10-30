import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView,
  Image, Platform, Animated, KeyboardAvoidingView, Keyboard, Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileText, Image as ImageIcon, File, Download, Trash2,
  Upload, X, Edit2, Plus, Search, ArrowUpDown, BookOpen,
  FileCode, Layout, Star, Folder as FolderIcon, MoreHorizontal,
  ExternalLink, ChevronLeft, ZoomIn, Minus, Sparkles, Send, MessageCircle,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, LibreFile, LibreFolder } from '../lib/db';
import { format } from 'date-fns';
import Raised, { THEME3D, shade } from '../components/Raised';


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

function getPreviewType(file: LibreFile): 'image' | 'text' | 'pdf' | 'office' | 'audio' | 'video' | 'none' {
  const t   = (file.type ?? '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // Images
  if (t.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','heic','svg','ico','tiff','tif'].includes(ext))
    return 'image';

  // PDF
  if (t === 'application/pdf' || ext === 'pdf') return 'pdf';

  // Audio
  if (t.startsWith('audio/') || ['mp3','wav','ogg','m4a','aac','flac','opus'].includes(ext))
    return 'audio';

  // Video
  if (t.startsWith('video/') || ['mp4','mov','avi','mkv','webm','3gp','flv'].includes(ext))
    return 'video';

  // Office
  if (['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods','odg'].includes(ext)
    || t.includes('msword') || t.includes('officedocument') || t.includes('opendocument'))
    return 'office';

  // Text / code
  if (t.startsWith('text/')
    || ['txt','md','csv','json','js','ts','jsx','tsx','html','css','xml',
        'yaml','yml','py','java','cpp','c','h','sh','rb','go','rs','swift',
        'kt','php','sql','ini','toml','env','log','gitignore'].includes(ext))
    return 'text';

  return 'none';
}

function officeKind(file: LibreFile): 'docx' | 'sheet' | 'pptx' | 'unsupported' {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'docx') return 'docx';
  if (['xlsx', 'xls', 'ods'].includes(ext)) return 'sheet';
  if (ext === 'pptx') return 'pptx';
  return 'unsupported';
}

function getIconColor(type: string, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t === 'application/pdf' || ext === 'pdf')                                          return { bg: '#fef2f2', color: '#ef4444' };
  if (t.startsWith('image/')  || ['jpg','jpeg','png','gif','webp'].includes(ext))        return { bg: '#ecfdf5', color: '#10b981' };
  if (t.includes('msword')    || ['doc','docx'].includes(ext))                          return { bg: '#eff6ff', color: '#2563eb' };
  if (t.includes('presentation') || ['ppt','pptx'].includes(ext))                       return { bg: '#fff7ed', color: '#f97316' };
  if (t.includes('sheet')     || ['xls','xlsx'].includes(ext))                          return { bg: '#f0fdf4', color: '#16a34a' };
  if (t.startsWith('audio/')  || ['mp3','wav','ogg','m4a'].includes(ext))               return { bg: '#fdf4ff', color: '#a21caf' };
  if (t.startsWith('video/')  || ['mp4','mov','avi','mkv'].includes(ext))               return { bg: '#eff6ff', color: '#2563eb' };
  if (t.startsWith('text/')   || ['txt','md'].includes(ext))                            return { bg: '#eef2ff', color: '#6366f1' };
  return { bg: '#f8fafc', color: '#94a3b8' };
}

function getIcon(type: string, size = 18, name = '') {
  const t   = type.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (t === 'application/pdf' || ext === 'pdf')                                    return <FileText  color="#ef4444" size={size} />;
  if (t.startsWith('image/')  || ['jpg','jpeg','png','gif','webp'].includes(ext))  return <ImageIcon color="#10b981" size={size} />;
  if (t.startsWith('audio/')  || ['mp3','wav','m4a'].includes(ext))               return <BookOpen  color="#a21caf" size={size} />;
  if (t.startsWith('video/')  || ['mp4','mov','mkv'].includes(ext))               return <Layout    color="#2563eb" size={size} />;
  if (['doc','docx'].includes(ext) || t.includes('msword'))                        return <FileText  color="#2563eb" size={size} />;
  if (['xls','xlsx'].includes(ext) || t.includes('sheet'))                         return <Layout    color="#16a34a" size={size} />;
  if (['ppt','pptx'].includes(ext) || t.includes('presentation'))                  return <Layout    color="#f97316" size={size} />;
  if (['json','js','ts','tsx','jsx'].includes(ext))                                return <FileCode  color="#f59e0b" size={size} />;
  if (t.startsWith('text/') || ['txt','md','csv'].includes(ext))                   return <BookOpen  color="#6366f1" size={size} />;
  return <File color="#94a3b8" size={size} />;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── HTML Builders — Google Drive style previews ──────────────────────────

// Shared spinner CSS
const SPINNER_CSS = `
  .spin-wrap{position:fixed;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;background:#fff;
    font-family:-apple-system,sans-serif;gap:16px;
    transition:opacity .3s;z-index:99}
  .ring{width:40px;height:40px;border:3px solid #f1f5f9;
    border-top-color:#2563eb;border-radius:50%;
    animation:spin .8s linear infinite}
  .spin-label{font-size:13px;color:#64748b;font-weight:600}
  @keyframes spin{to{transform:rotate(360deg)}}
  .err{position:fixed;inset:0;display:none;flex-direction:column;
    align-items:center;justify-content:center;background:#fff;
    font-family:-apple-system,sans-serif;gap:12px;padding:32px;text-align:center}
  .err-icon{font-size:40px}
  .err-title{font-size:16px;font-weight:800;color:#1e293b}
  .err-msg{font-size:12px;color:#94a3b8;line-height:1.7;max-width:280px}
`;

// ═══ Docs-style in-app viewers ═══════════════════════════════════════════
// Every viewer is a self-contained HTML page shown in a WebView. Local files are
// read as base64 on the native side and handed to the page, so nothing depends on
// file:// access. The page tells React Native it has drawn something by posting 'ready'.

const DOCS_BG = '#f1f3f4';

const PAGE_JS_HELPERS =
  "function post(m){try{window.ReactNativeWebView.postMessage(m)}catch(e){}}" +
  "function ready(){post('ready')}" +
  "function b2u(b){var s=atob(b),n=s.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=s.charCodeAt(i);return u}" +
  "function fail(m){var e=document.getElementById('err');if(e){e.style.display='block';e.innerHTML='<div class=\"ei\">&#128196;</div><div class=\"et\">Preview unavailable</div><div class=\"em\">'+(m||'Something went wrong')+'</div>'}ready()}";

const ERR_CSS =
  "#err{display:none;padding:56px 28px;text-align:center;font-family:Arial,sans-serif}" +
  ".ei{font-size:40px;margin-bottom:10px}.et{font-size:16px;font-weight:700;color:#202124;margin-bottom:6px}" +
  ".em{font-size:13px;color:#5f6368;line-height:1.6}";

const PAPER_CSS =
  "*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}" +
  "html,body{margin:0;background:" + DOCS_BG + "}body{padding:12px 0 40px}" +
  ".paper{background:#fff;margin:0 auto;width:calc(100% - 16px);max-width:816px;min-height:70vh;padding:40px 30px;" +
  "box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15);font-family:Arial,Helvetica,sans-serif;" +
  "font-size:15px;line-height:1.7;color:#202124;overflow-wrap:anywhere}" +
  ".paper h1{font-size:26px;margin:18px 0 10px;line-height:1.25}.paper h2{font-size:21px;margin:16px 0 8px}" +
  ".paper h3{font-size:17px;margin:14px 0 6px}.paper p{margin:0 0 12px}.paper img{max-width:100%;height:auto}" +
  ".paper table{border-collapse:collapse;max-width:100%;display:block;overflow-x:auto;margin:10px 0}" +
  ".paper td,.paper th{border:1px solid #dadce0;padding:6px 9px;vertical-align:top}" +
  ".paper ul,.paper ol{margin:0 0 12px 22px}.paper a{color:#1a73e8}" +
  ".paper code{background:#f1f3f4;padding:2px 6px;border-radius:5px;font-family:'Courier New',monospace;font-size:13px;color:#7c3aed}" +
  ".paper blockquote{border-left:4px solid #dadce0;margin:12px 0;padding:6px 16px;color:#5f6368;background:#f8f9fa}";

// ── PDF: remote (Google viewer) ──────────────────────────────────────────
function buildPdfHtml(uri: string): string {
  const gd = 'https://docs.google.com/viewer?url=' + encodeURIComponent(uri) + '&embedded=true';
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}html,body{height:100%;background:${DOCS_BG}}iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:0}</style></head>
<body><iframe src="${gd}" onload="try{window.ReactNativeWebView.postMessage('ready')}catch(e){}"></iframe></body></html>`;
}

// ── PDF: local file → continuous-scroll pages like Google Drive ──────────
function buildPdfDataHtml(b64: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{background:${DOCS_BG};font-family:Roboto,Arial,sans-serif}
#pages{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:100%;width:max-content;padding:10px 8px 96px}
.pg{background:#fff;flex-shrink:0;box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)}
.pg canvas{display:block;width:100%;height:100%}
#pill{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:rgba(32,33,36,.92);color:#fff;font-size:12px;font-weight:600;padding:8px 14px;border-radius:20px;opacity:0;transition:opacity .25s;pointer-events:none}
#zoom{position:fixed;right:12px;bottom:14px;display:flex;flex-direction:column;gap:8px}
#zoom button{width:40px;height:40px;border:0;border-radius:12px;background:#fff;color:#3c4043;font-size:20px;font-weight:700;box-shadow:0 2px 6px rgba(60,64,67,.35)}
#zoom button:active{background:#e8eaed}
${ERR_CSS}
</style></head><body>
<div id="pages"></div><div id="err"></div><div id="pill"></div>
<div id="zoom"><button onclick="setZoom(zm*1.25)">+</button><button onclick="setZoom(zm/1.25)">&minus;</button></div>
<script>var B64='${b64}';${PAGE_JS_HELPERS}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" onerror="fail('Could not load the PDF engine. Check your internet connection.')"></script>
<script>
var pdf=null,zm=1,N=0,items=[],ratio=[],done={},tasks={},cw=window.innerWidth-16,pillT=null,raf=null;
var CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
var pagesEl=document.getElementById('pages'),pill=document.getElementById('pill');
function pageW(){return cw*zm}
function sizeAll(){for(var i=0;i<N;i++){var w=pageW();items[i].style.width=w+'px';items[i].style.height=(w*(ratio[i]||ratio[0]))+'px'}}
function renderPage(i){
  var key=Math.round(zm*100);
  if(done[i]===key)return;done[i]=key;
  if(tasks[i]){try{tasks[i].cancel()}catch(e){}}
  pdf.getPage(i+1).then(function(p){
    var base=p.getViewport({scale:1});
    ratio[i]=base.height/base.width;
    var w=pageW(),vp=p.getViewport({scale:w/base.width});
    var dpr=Math.min(window.devicePixelRatio||1,2);
    var el=items[i];el.style.width=w+'px';el.style.height=(w*ratio[i])+'px';
    var c=el.firstChild;c.width=Math.floor(vp.width*dpr);c.height=Math.floor(vp.height*dpr);
    var ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    var t=p.render({canvasContext:ctx,viewport:vp});tasks[i]=t;
    t.promise.then(function(){if(i===0)ready()}).catch(function(){});
  }).catch(function(e){if(i===0)fail(e&&e.message)});
}
function visible(){
  var top=window.scrollY-700,bot=window.scrollY+window.innerHeight+700;
  for(var i=0;i<N;i++){var el=items[i],y=el.offsetTop,h=el.offsetHeight;if(y+h>=top&&y<=bot)renderPage(i)}
}
function current(){
  var mid=window.scrollY+window.innerHeight/2,c=0;
  for(var i=0;i<N;i++){if(items[i].offsetTop<=mid)c=i}
  return c+1;
}
function onScroll(){
  if(raf)return;
  raf=requestAnimationFrame(function(){
    raf=null;visible();
    pill.textContent=current()+' / '+N;pill.style.opacity=1;
    clearTimeout(pillT);pillT=setTimeout(function(){pill.style.opacity=0},1400);
  });
}
function setZoom(z){
  z=Math.max(0.6,Math.min(4,z));if(z===zm)return;
  var r=(window.scrollY+window.innerHeight/2)/document.documentElement.scrollHeight;
  zm=z;sizeAll();
  window.scrollTo(window.scrollX,r*document.documentElement.scrollHeight-window.innerHeight/2);
  clearTimeout(window._zt);window._zt=setTimeout(visible,120);
}
window.addEventListener('scroll',onScroll,{passive:true});
var pd=0,pz=1;
function dist(t){var dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY;return Math.sqrt(dx*dx+dy*dy)}
document.addEventListener('touchstart',function(e){if(e.touches.length===2){pd=dist(e.touches);pz=zm}},{passive:true});
document.addEventListener('touchmove',function(e){if(e.touches.length===2&&pd){e.preventDefault();setZoom(pz*dist(e.touches)/pd)}},{passive:false});
var sx=0,sy=0,st=0,lastTap=0;
document.addEventListener('touchstart',function(e){if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now()}},{passive:true});
document.addEventListener('touchend',function(e){
  pd=0;
  if(e.changedTouches.length!==1||e.touches.length!==0)return;
  var t=e.changedTouches[0],n=Date.now();
  var tap=Math.abs(t.clientX-sx)<10&&Math.abs(t.clientY-sy)<10&&n-st<250;
  if(tap){if(n-lastTap<300){setZoom(zm>1.2?1:2.2);lastTap=0}else{lastTap=n}}
});
function boot(){
  fetch(CDN+'pdf.worker.min.js').then(function(r){return r.text()}).then(function(t){
    pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([t],{type:'text/javascript'}));
  }).catch(function(){pdfjsLib.GlobalWorkerOptions.workerSrc=CDN+'pdf.worker.min.js'}).then(function(){
    return pdfjsLib.getDocument({data:b2u(B64),verbosity:0}).promise;
  }).then(function(d){pdf=d;N=d.numPages;return d.getPage(1)}).then(function(p){
    var b=p.getViewport({scale:1});ratio[0]=b.height/b.width;
    for(var i=0;i<N;i++){var el=document.createElement('div');el.className='pg';el.appendChild(document.createElement('canvas'));pagesEl.appendChild(el);items.push(el)}
    sizeAll();visible();
  }).catch(function(e){fail('This PDF could not be opened'+(e&&e.message?' ('+e.message+')':''))});
}
if(window.pdfjsLib)boot();
</script></body></html>`;
}

// ── Office: remote (Microsoft viewer) ────────────────────────────────────
function buildOfficeViewerHtml(uri: string): string {
  const ms = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(uri);
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}html,body{height:100%;background:#fff}iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:0}</style></head>
<body><iframe src="${ms}" onload="try{window.ReactNativeWebView.postMessage('ready')}catch(e){}"></iframe></body></html>`;
}

// ── Word (.docx) → paper page ────────────────────────────────────────────
function buildDocxHtml(b64: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${PAPER_CSS}${ERR_CSS}</style></head><body>
<div class="paper" id="doc"></div><div id="err"></div>
<script>var B64='${b64}';${PAGE_JS_HELPERS}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js" onerror="fail('Could not load the document engine. Check your internet connection.')"></script>
<script>
if(window.mammoth){
  mammoth.convertToHtml({arrayBuffer:b2u(B64).buffer}).then(function(r){
    document.getElementById('doc').innerHTML=r.value||'<p style="color:#5f6368">This document is empty.</p>';ready();
  }).catch(function(e){document.getElementById('doc').style.display='none';fail('This document could not be read'+(e&&e.message?' ('+e.message+')':''))});
}
</script></body></html>`;
}

// ── Excel (.xlsx/.xls/.ods) → Sheets-style grid with tabs ────────────────
function buildSheetHtml(b64: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#fff;font-family:Roboto,Arial,sans-serif}
#tabs{position:fixed;left:0;right:0;bottom:0;height:44px;background:#f8f9fa;display:flex;overflow-x:auto;box-shadow:0 -1px 4px rgba(60,64,67,.2);z-index:5}
#tabs button{flex:0 0 auto;border:0;background:transparent;padding:0 18px;font-size:13px;font-weight:600;color:#5f6368;height:44px}
#tabs button.on{color:#188038;background:#e6f4ea;box-shadow:inset 0 -3px 0 #188038}
#wrap{position:absolute;top:0;left:0;right:0;bottom:44px;overflow:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;font-size:12px;min-width:100%}
th,td{border:1px solid #e1e3e6;padding:4px 8px;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis;height:26px}
th{background:#f8f9fa;color:#5f6368;font-weight:600;text-align:center;position:sticky;top:0;z-index:2}
td.rn{background:#f8f9fa;color:#5f6368;text-align:center;position:sticky;left:0;z-index:1;min-width:38px}
th.cn{left:0;z-index:3}
#note{padding:14px;font-size:11px;color:#80868b;text-align:center}
${ERR_CSS}
</style></head><body>
<div id="wrap"></div><div id="tabs"></div><div id="err"></div>
<script>var B64='${b64}';${PAGE_JS_HELPERS}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" onerror="fail('Could not load the spreadsheet engine. Check your internet connection.')"></script>
<script>
(function(){
if(!window.XLSX)return;
try{
  var wb=XLSX.read(b2u(B64),{type:'array'});
  var wrap=document.getElementById('wrap'),tabs=document.getElementById('tabs');
  var col=function(n){var s='';n++;while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
  var esc=function(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
  var show=function(k){
    var ws=wb.Sheets[wb.SheetNames[k]];
    var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
    var total=rows.length;rows=rows.slice(0,500);
    var mc=0;rows.forEach(function(r){if(r.length>mc)mc=r.length});mc=Math.min(Math.max(mc,1),60);
    var h='<table><thead><tr><th class="cn"></th>';
    for(var c=0;c<mc;c++)h+='<th>'+col(c)+'</th>';
    h+='</tr></thead><tbody>';
    rows.forEach(function(r,i){h+='<tr><td class="rn">'+(i+1)+'</td>';for(var c=0;c<mc;c++)h+='<td>'+esc(r[c]==null?'':r[c])+'</td>';h+='</tr>'});
    h+='</tbody></table>';
    if(total>500)h+='<div id="note">Showing the first 500 of '+total+' rows</div>';
    if(!total)h='<div id="note">This sheet is empty</div>';
    wrap.innerHTML=h;wrap.scrollTop=0;wrap.scrollLeft=0;
    var bs=tabs.children;for(var i=0;i<bs.length;i++)bs[i].className=(i===k?'on':'');
  };
  wb.SheetNames.forEach(function(n,i){var b=document.createElement('button');b.textContent=n;b.onclick=function(){show(i)};tabs.appendChild(b)});
  show(0);ready();
}catch(e){fail('This spreadsheet could not be read'+(e&&e.message?' ('+e.message+')':''))}
})();
</script></body></html>`;
}

// ── PowerPoint (.pptx) → 16:9 slide cards (text + first images) ──────────
function buildPptxHtml(b64: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;background:${DOCS_BG};font-family:Arial,Helvetica,sans-serif}
#list{display:flex;flex-direction:column;align-items:center;gap:16px;padding:12px 8px 40px}
.sl{width:100%;max-width:760px}
.sn{font-size:11px;font-weight:700;color:#5f6368;margin:0 2px 6px}
.card{position:relative;width:100%;padding-top:56.25%;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)}
.in{position:absolute;top:0;left:0;right:0;bottom:0;padding:5% 6%;overflow:hidden;display:flex;flex-direction:column;gap:2.4%}
.ti{font-size:clamp(15px,4.4vw,30px);font-weight:700;color:#202124;line-height:1.2}
.tx{font-size:clamp(11px,2.7vw,18px);color:#3c4043;line-height:1.35}
.im{display:flex;gap:2%;margin-top:auto;height:38%}
.im img{max-width:32%;max-height:100%;object-fit:contain;border-radius:3px}
${ERR_CSS}
</style></head><body>
<div id="list"></div><div id="err"></div>
<script>var B64='${b64}';${PAGE_JS_HELPERS}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" onerror="fail('Could not load the presentation engine. Check your internet connection.')"></script>
<script>
(function(){
if(!window.JSZip)return;
var list=document.getElementById('list');
function esc(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function paras(xml){
  var d=new DOMParser().parseFromString(xml,'application/xml'),ps=d.getElementsByTagName('a:p'),out=[];
  for(var i=0;i<ps.length;i++){var ts=ps[i].getElementsByTagName('a:t'),t='';for(var j=0;j<ts.length;j++)t+=ts[j].textContent;t=t.trim();if(t)out.push(t)}
  return out;
}
function mime(n){var e=n.split('.').pop().toLowerCase();return e==='png'?'image/png':e==='gif'?'image/gif':(e==='jpg'||e==='jpeg')?'image/jpeg':null}
function loadImg(zip,fn,m){var f=zip.file(fn);return f?f.async('base64').then(function(b){return 'data:'+m+';base64,'+b}):Promise.resolve(null)}
JSZip.loadAsync(B64,{base64:true}).then(function(zip){
  var names=Object.keys(zip.files).filter(function(n){return n.indexOf('ppt/slides/slide')===0&&n.slice(-4)==='.xml'});
  names.sort(function(a,b){return parseInt(a.slice(16))-parseInt(b.slice(16))});
  if(!names.length){fail('No slides were found in this presentation');return}
  var chain=Promise.resolve();
  names.forEach(function(n,idx){
    chain=chain.then(function(){
      return zip.file(n).async('string').then(function(xml){
        var ps=paras(xml),rel=zip.file('ppt/slides/_rels/'+n.slice(11)+'.rels');
        if(!rel)return {ps:ps,imgs:[]};
        return rel.async('string').then(function(rx){
          var rd=new DOMParser().parseFromString(rx,'application/xml'),rs=rd.getElementsByTagName('Relationship'),jobs=[];
          for(var i=0;i<rs.length&&jobs.length<3;i++){
            var tg=rs[i].getAttribute('Target')||'';
            if(tg.indexOf('media/')>-1){var fn='ppt/media/'+tg.split('/').pop(),m=mime(fn);if(m)jobs.push(loadImg(zip,fn,m))}
          }
          return Promise.all(jobs).then(function(imgs){return {ps:ps,imgs:imgs}});
        });
      });
    }).then(function(s){
      var title=s.ps.length?s.ps[0]:'',body=s.ps.slice(1);
      var h='<div class="sl"><div class="sn">Slide '+(idx+1)+'</div><div class="card"><div class="in">';
      if(title)h+='<div class="ti">'+esc(title)+'</div>';
      body.slice(0,14).forEach(function(t){h+='<div class="tx">'+esc(t)+'</div>'});
      if(s.imgs.length){h+='<div class="im">';s.imgs.forEach(function(u){if(u)h+='<img src="'+u+'">'});h+='</div>'}
      if(!s.ps.length&&!s.imgs.length)h+='<div class="tx" style="color:#9aa0a6">(No text on this slide)</div>';
      h+='</div></div></div>';
      list.insertAdjacentHTML('beforeend',h);
      if(idx===0)ready();
    });
  });
  return chain;
}).catch(function(e){fail('This presentation could not be read'+(e&&e.message?' ('+e.message+')':''))});
})();
</script></body></html>`;
}

// ── Text / Markdown → paper page, code → dark editor look ────────────────
function buildTextHtml(text: string, name: string): string {
  const ext    = name.split('.').pop()?.toLowerCase() ?? '';
  const isCode = ['js','ts','jsx','tsx','html','htm','css','json','xml','yaml','yml',
                  'py','java','cpp','c','h','sh','rb','go','rs','swift','kt','php',
                  'sql','ini','toml','env','log','gitignore','csv'].includes(ext);
  const isMd   = ext === 'md';

  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (isCode) {
    const rows = esc.split('\n').map((l: string, i: number) =>
      `<tr><td class="ln">${i + 1}</td><td class="cd">${l || '&nbsp;'}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#0f172a;height:100%}
table{width:100%;border-collapse:collapse;padding:8px 0}
.ln{color:#4b5563;text-align:right;padding:2px 14px 2px 10px;user-select:none;vertical-align:top;
  font-size:12px;font-family:'Courier New',monospace;line-height:1.7;min-width:42px;
  position:sticky;left:0;background:#0f172a}
.cd{padding:2px 16px 2px 14px;white-space:pre;color:#38bdf8;font-size:13px;
  font-family:'Courier New',monospace;line-height:1.7;vertical-align:top}
</style></head><body><table><tbody>${rows}</tbody></table></body></html>`;
  }

  let inner: string;
  if (isMd) {
    inner = '<p>' + esc
      .replace(/^### (.+)$/gm,    '</p><h3>$1</h3><p>')
      .replace(/^## (.+)$/gm,     '</p><h2>$1</h2><p>')
      .replace(/^# (.+)$/gm,      '</p><h1>$1</h1><p>')
      .replace(/\*\*(.+?)\*\*/g,  '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,      '<em>$1</em>')
      .replace(/`(.+?)`/g,        '<code>$1</code>')
      .replace(/^- (.+)$/gm,      '<li>$1</li>')
      .replace(/^&gt; (.+)$/gm,   '<blockquote>$1</blockquote>')
      .split('\n\n').join('</p><p>')
      .split('\n').join('<br>') + '</p>';
  } else {
    inner = '<p>' + esc.split('\n\n').join('</p><p>').split('\n').join('<br>') + '</p>';
  }
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${PAPER_CSS}</style></head><body><div class="paper">${inner}</div></body></html>`;
}


function buildAudioHtml(uri: string, name: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fdf4ff;display:flex;align-items:center;
    justify-content:center;height:100vh;font-family:-apple-system,sans-serif}
  .card{background:#fff;border-radius:24px;padding:32px 28px;
    box-shadow:0 8px 32px rgba(162,28,175,0.12);
    display:flex;flex-direction:column;align-items:center;
    gap:20px;max-width:320px;width:90%}
  .icon{font-size:52px}
  .title{font-size:14px;font-weight:700;color:#1e293b;
    text-align:center;word-break:break-all;max-width:100%}
  audio{width:100%;border-radius:12px;outline:none}
  audio::-webkit-media-controls-panel{background:#fdf4ff}
</style></head><body>
<div class="card">
  <div class="icon">🎵</div>
  <div class="title">${name.replace(/</g,'&lt;')}</div>
  <audio controls autoplay src="${uri}">
    Your browser does not support audio playback.
  </audio>
</div>
</body></html>`;
}

function buildVideoHtml(uri: string, name: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#000;display:flex;align-items:center;
    justify-content:center;height:100vh}
  video{max-width:100%;max-height:100vh;width:100%;
    object-fit:contain;outline:none}
</style></head><body>
<video controls autoplay playsinline
  src="${uri}"
  onerror="document.body.innerHTML='<div style=color:#fff;text-align:center;padding:40px;font-family:sans-serif><div style=font-size:36px>🎬</div><p style=margin-top:16px;color:#94a3b8>${name.replace(/</g,'&lt;')} could not be played.</p></div>'">
</video>
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
// ── Image with pinch-free zoom: buttons + double-tap, pan by scrolling ─────
function ZoomableImage({ uri, onLoaded }: { uri: string; onLoaded: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [box, setBox]   = useState({ w: 0, h: 0 });
  const lastTap = useRef(0);
  const clamp = (z: number) => Math.min(4, Math.max(1, z));
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) setZoom(z => (z > 1.05 ? 1 : 2.5));
    lastTap.current = now;
  };
  return (
    <View style={{ flex: 1 }} onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ minHeight: box.h, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: box.w, alignItems: 'center' }}
          >
            <Pressable onPress={onTap}>
              <Image
                source={{ uri }}
                style={{ width: box.w * zoom, height: box.h * zoom }}
                resizeMode="contain"
                onLoad={onLoaded}
                onError={onLoaded}
              />
            </Pressable>
          </ScrollView>
        </ScrollView>
      )}
      <View style={vStyles.zoomCol} pointerEvents="box-none">
        <Raised onPress={() => setZoom(z => clamp(z + 0.75))} radius={14} depth={3} faceStyle={vStyles.zoomFace}>
          <Plus size={18} color="#334155" strokeWidth={2.5} />
        </Raised>
        <Raised onPress={() => setZoom(z => clamp(z - 0.75))} radius={14} depth={3} faceStyle={vStyles.zoomFace}>
          <Minus size={18} color="#334155" strokeWidth={2.5} />
        </Raised>
      </View>
    </View>
  );
}

function DocumentViewer({ file, onClose }: { file: LibreFile; onClose: () => void }) {
  const [textContent,  setTextContent]  = useState('');
  const [editedText,   setEditedText]   = useState('');
  const [isEditing,    setIsEditing]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [webLoading,   setWebLoading]   = useState(true);
  const [imgLoaded,    setImgLoaded]    = useState(false);
  const [showAI,       setShowAI]       = useState(false);
  const [docB64,       setDocB64]       = useState<string | null>(null);
  const [docError,     setDocError]     = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const type  = getPreviewType(file);
  const ic    = getIconColor(file.type, file.name);
  const isLocal    = !file.data.startsWith('http') && !file.data.startsWith('data:');
  const isRemote   = file.data.startsWith('http');
  const isTextFile = type === 'text';

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    // Reset loading state when viewer opens
    setWebLoading(type !== 'image');
    setImgLoaded(false);
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

  // ── Read local PDF / Word / Excel / PowerPoint as base64 so the viewer page can open them ──
  useEffect(() => {
    const needs = type === 'pdf' || (type === 'office' && officeKind(file) !== 'unsupported');
    if (!needs || isRemote) return;
    let cancelled = false;
    (async () => {
      try {
        if ((file.size ?? 0) > 30 * 1024 * 1024) throw new Error('too large');
        let b64 = '';
        if (file.data.startsWith('data:')) b64 = file.data.split(',')[1] ?? '';
        else b64 = await FileSystem.readAsStringAsync(file.data, { encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64' });
        if (!cancelled) setDocB64(b64);
      } catch {
        if (!cancelled) { setDocError(true); setWebLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Never leave the spinner up forever (e.g. offline while a library loads)
  useEffect(() => {
    if (!webLoading) return;
    const t = setTimeout(() => setWebLoading(false), 25000);
    return () => clearTimeout(t);
  }, [webLoading]);

  // Build each page once — a fresh HTML string would make the WebView reload
  const viewerHtml = useMemo(() => {
    if (type === 'pdf')    return isRemote ? buildPdfHtml(file.data) : docB64 ? buildPdfDataHtml(docB64) : null;
    if (type === 'office') {
      if (isRemote) return buildOfficeViewerHtml(file.data);
      if (!docB64)  return null;
      const k = officeKind(file);
      return k === 'docx' ? buildDocxHtml(docB64) : k === 'sheet' ? buildSheetHtml(docB64) : k === 'pptx' ? buildPptxHtml(docB64) : null;
    }
    if (type === 'text' && !isEditing) return buildTextHtml(textContent || ' ', file.name);
    if (type === 'audio' && isRemote)  return buildAudioHtml(file.data, file.name);
    if (type === 'video' && isRemote)  return buildVideoHtml(file.data, file.name);
    return null;
  }, [type, isRemote, docB64, textContent, isEditing, file.data, file.name]);

  const spinner = (label?: string) => (
    <View style={vStyles.loadingOverlay} pointerEvents="none">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={vStyles.loadingText}>{label ?? 'Opening…'}</Text>
    </View>
  );

  const fallback = (msg: string) => (
    <View style={vStyles.fallback}>
      <View style={[vStyles.fallbackIcon, { backgroundColor: ic.bg }]}>
        {getIcon(file.type, 52, file.name)}
      </View>
      <Text style={vStyles.fallbackName}>{file.name}</Text>
      <Text style={vStyles.fallbackSub}>{msg}</Text>
      <TouchableOpacity style={[vStyles.openBtn, { backgroundColor: ic.color }]}
        onPress={() => Sharing.shareAsync(file.data)} activeOpacity={0.85}>
        <ExternalLink size={15} color="#fff" />
        <Text style={vStyles.openBtnText}>Open with App</Text>
      </TouchableOpacity>
    </View>
  );

  const webProps = {
    originWhitelist: ['*'],
    javaScriptEnabled: true,
    domStorageEnabled: true,
    cacheEnabled: true,
    mixedContentMode: 'always' as const,
    setSupportMultipleWindows: false,
    overScrollMode: 'never' as const,
    bounces: false,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
    onMessage: (e: any) => { if (e?.nativeEvent?.data === 'ready') setWebLoading(false); },
    onError: () => setWebLoading(false),
  };

  const renderBody = () => {
    // ── IMAGE ─────────────────────────────────────────────────────────────
    if (type === 'image') return (
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <ZoomableImage uri={file.data} onLoaded={() => setImgLoaded(true)} />
        {!imgLoaded && spinner('Loading image…')}
      </View>
    );

    // ── TEXT / MARKDOWN / CODE ────────────────────────────────────────────
    if (type === 'text') {
      if (isEditing) return (
        <KeyboardAvoidingView style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 60}>
          <ScrollView style={vStyles.editorScroll}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
            <TextInput style={vStyles.editorInput} value={editedText}
              onChangeText={setEditedText} multiline autoFocus
              textAlignVertical="top" scrollEnabled={false}
              placeholder="Start typing…" placeholderTextColor="#cbd5e1" />
          </ScrollView>
        </KeyboardAvoidingView>
      );
      return (
        <View style={{ flex: 1 }}>
          <WebView
            {...webProps}
            style={{ flex: 1, backgroundColor: DOCS_BG }}
            source={{ html: viewerHtml ?? '' }}
            javaScriptEnabled={false}
            onLoadEnd={() => setWebLoading(false)}
          />
          {webLoading && spinner('Opening document…')}
        </View>
      );
    }

    // ── PDF ───────────────────────────────────────────────────────────────
    if (type === 'pdf') {
      if (docError) return fallback('This PDF could not be opened inside the app. Open it with another app instead.');
      if (!viewerHtml) return <View style={{ flex: 1 }}>{spinner('Reading PDF…')}</View>;
      return (
        <View style={{ flex: 1 }}>
          <WebView {...webProps} style={{ flex: 1, backgroundColor: DOCS_BG }} source={{ html: viewerHtml }} allowFileAccess />
          {webLoading && spinner('Opening PDF…')}
        </View>
      );
    }

    // ── WORD / EXCEL / POWERPOINT ─────────────────────────────────────────
    if (type === 'office') {
      if (!isRemote && officeKind(file) === 'unsupported')
        return fallback('Older .doc, .ppt and .odt files can’t be shown inside the app. Open it with another app instead.');
      if (docError) return fallback('This document could not be opened inside the app. Open it with another app instead.');
      if (!viewerHtml) return <View style={{ flex: 1 }}>{spinner('Reading document…')}</View>;
      return (
        <View style={{ flex: 1 }}>
          <WebView {...webProps} style={{ flex: 1, backgroundColor: DOCS_BG }} source={{ html: viewerHtml }} />
          {webLoading && spinner('Opening document…')}
        </View>
      );
    }

    // ── AUDIO / VIDEO — local files play straight from disk ───────────────
    if (type === 'audio' || type === 'video') {
      const src = isRemote && viewerHtml ? { html: viewerHtml } : { uri: file.data };
      return (
        <View style={{ flex: 1, backgroundColor: type === 'video' ? '#000' : '#fdf4ff' }}>
          <WebView
            style={{ flex: 1, backgroundColor: type === 'video' ? '#000' : '#fdf4ff' }}
            originWhitelist={['*']}
            source={src}
            javaScriptEnabled={false}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={file.data}
            mixedContentMode="always"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => setWebLoading(false)}
          />
          {webLoading && spinner('Loading media…')}
        </View>
      );
    }

    return fallback('No preview is available for this file type.');
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

  body: { flex: 1, backgroundColor: '#f1f3f4' },

  imageBg:   { flex: 1, backgroundColor: '#0f172a' },
  imageFile: { flex: 1, width: '100%' },

  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 12 },
  fallbackIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fallbackName: { fontSize: 15, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  fallbackSub:  { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  openBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  openBtnText:  { color: '#fff', fontSize: 12, fontWeight: '800' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
  zoomCol:  { position: 'absolute', right: 14, bottom: 16, gap: 10 },
  zoomFace: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
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
      <Raised
        onPress={onPress}
        onLongPress={onLongPress}
        radius={18} depth={4}
        face={isSelected ? THEME3D.skyTint.face : '#ffffff'}
        edge={isSelected ? THEME3D.skyTint.edge : THEME3D.white.edge}
        faceStyle={fiStyles.item}
      >
        {isSelectMode && (
          <View style={[fiStyles.checkbox, isSelected && fiStyles.checkboxActive]}>
            {isSelected && <View style={fiStyles.checkMark} />}
          </View>
        )}

        {/* Icon */}
        <Raised
          radius={14} depth={3} glowOpacity={0.1}
          face={ic.bg} edge={ic.color + '45'} glow={ic.color}
          style={{ marginRight: 14 }}
          faceStyle={fiStyles.iconWrap}
        >
          {getIcon(item.type, 20, item.name)}
        </Raised>

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
      </Raised>
    </Animated.View>
  );
}

const fiStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  itemSelected: {},
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: '#cbd5e1',
    marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  checkMark: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 2 },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
            <Raised onPress={pickDocument} disabled={uploading} radius={12} depth={3}
              face={THEME3D.blue.face} edge={THEME3D.blue.edge} glow={THEME3D.blue.glow} glowOpacity={0.3}
              faceStyle={styles.raisedBtn}>
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Upload size={13} color="#fff" strokeWidth={2.5} /><Text style={[styles.actionCardText, { color: '#fff' }]}>Upload</Text></>}
            </Raised>
            <Raised onPress={() => setShowNoteModal(true)} radius={12} depth={3}
              face={THEME3D.greenTint.face} edge={THEME3D.greenTint.edge} glow={THEME3D.greenTint.glow}
              faceStyle={styles.raisedBtn}>
              <Plus size={13} color="#10b981" strokeWidth={2.5} /><Text style={[styles.actionCardText, { color: '#059669' }]}>Note</Text>
            </Raised>
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
              <Raised
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                radius={20} depth={3} glowOpacity={isActive ? 0.28 : 0.1}
                face={isActive ? cat.color : '#ffffff'}
                edge={isActive ? shade(cat.color, 0.28) : THEME3D.white.edge}
                glow={cat.color}
                faceStyle={styles.tab}
              >
                <Icon size={11} color={isActive ? '#fff' : cat.color} strokeWidth={2.25} />
                <Text style={[styles.tabText, isActive && { color: '#fff' }]}>{cat.label}</Text>
                <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : cat.color + '18' }]}>
                  <Text style={[styles.tabCountText, { color: isActive ? '#fff' : cat.color }]}>{counts[cat.id]}</Text>
                </View>
              </Raised>
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
          <Raised onPress={() => setShowSortOptions(true)} radius={14} depth={3} faceStyle={styles.sortBtn}>
            <ArrowUpDown size={13} color="#64748b" />
            <Text style={styles.sortBtnText}>
              {sortOption === 'newest' ? 'New' : sortOption === 'oldest' ? 'Old' : sortOption === 'name-asc' ? 'A–Z' : 'Z–A'}
            </Text>
          </Raised>
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
            <Raised onPress={renameFile} radius={14} depth={4}
              face={THEME3D.blue.face} edge={THEME3D.blue.edge} glow={THEME3D.blue.glow} glowOpacity={0.3}
              style={{ width: '100%', marginTop: 8 }} faceStyle={styles.dialogBtnFace}>
              <Text style={styles.dialogBtnText}>Save</Text>
            </Raised>
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
            <Raised onPress={createNote} disabled={savingNote} radius={14} depth={4}
              face={THEME3D.blue.face} edge={THEME3D.blue.edge} glow={THEME3D.blue.glow} glowOpacity={0.3}
              style={{ marginTop: 10 }} faceStyle={styles.dialogBtnFace}>
              {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dialogBtnText}>Create Note</Text>}
            </Raised>
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
  raisedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9 },
  dialogBtnFace: { height: 48, alignItems: 'center', justifyContent: 'center' },
  actionCardText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },

  // ── Chips ──
  tabsScroll:   { height: 62 },
  tabsContent:  { paddingHorizontal: 18, paddingVertical: 11, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 34,
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
    paddingHorizontal: 12, height: 40,
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
