import React from 'react';
import { Shield, HardDrive, Wifi, BookOpen, Github, ExternalLink } from 'lucide-react';

const features = [
  {
    icon: HardDrive,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: 'Offline First',
    description: 'All files stored locally on your device using IndexedDB. No internet required.',
  },
  {
    icon: Shield,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    title: 'Private by Default',
    description: 'Your data never leaves your device. Zero telemetry, zero tracking.',
  },
  {
    icon: Wifi,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    title: 'Book Discovery',
    description: 'Search millions of books via Google Books and Open Library APIs.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'PDF Viewer',
    description: 'Read PDFs and preview images directly in the app, no external tools needed.',
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">About</h2>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Libre Archival Node</p>
      </div>

      {/* App Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white text-center">
        <div className="w-14 h-14 bg-white/20 rounded-[18px] flex items-center justify-center mx-auto mb-4 overflow-hidden">
          <img src="/favicon.svg" alt="Libre" className="w-full h-full object-cover" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight">Libre</h3>
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">Archival Node</p>
        <p className="text-blue-100/80 text-[11px] mt-3 leading-relaxed max-w-[220px] mx-auto">
          A local-first file manager and book discovery tool. Your personal archive, offline and private.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl">
          <span className="text-[10px] font-bold text-white">Version 1.0.0</span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Features</p>
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-3.5 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${f.iconBg}`}>
                  <Icon size={16} className={f.iconColor} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-slate-800 leading-none mb-1">{f.title}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Built With</p>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Dexie.js', 'react-pdf', 'Framer Motion'].map(tech => (
            <span key={tech} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-semibold text-slate-600">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50">
        <a
          href="https://github.com/Philemon12421"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3.5 p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <Github size={16} className="text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-slate-800">GitHub</p>
            <p className="text-[10px] text-slate-400">View source code</p>
          </div>
          <ExternalLink size={14} className="text-slate-300" />
        </a>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-300 font-medium">
        Made with care · Open Source
      </p>
    </div>
  );
}
