import React from 'react';
import { 
  Info, 
  Github, 
  Code, 
  Globe, 
  Sparkles,
  ShieldCheck,
  Zap,
  Coffee
} from 'lucide-react';
import { motion } from 'motion/react';

export default function AboutPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 text-left">
        <div className="px-1 text-left flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold font-sans text-slate-900 dark:text-white tracking-tight uppercase">Archive Node</h2>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Drenchack Systems Protocol</p>
          </div>
          <img src="/favicon.svg" alt="Libre Logo" className="w-12 h-12 rounded-xl shadow-lg" />
       </div>

       <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] space-y-8 shadow-sm border border-slate-50 dark:border-slate-800/50">
          <div className="space-y-4">
             <div className="flex items-center space-x-3 text-blue-600">
                <Sparkles size={18} />
                <h3 className="text-sm font-bold uppercase tracking-tight">The Vision</h3>
             </div>
             <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Libre was developed by <span className="text-slate-900 dark:text-blue-400 font-bold">Drenchack company</span> as a free, open-source contribution to solve the problem of scattered files on mobile devices. We built this to be a neat, efficient archive for public use at zero cost.
             </p>
          </div>

          <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-6">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-700">Governance & Access</h3>
             <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-slate-100">
                   <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                      <Github size={20} className="text-slate-600 dark:text-slate-300" />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">Open Source</p>
                      <a href="https://github.com/philemon12421" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:underline">
                         Project Repository
                      </a>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="pt-4 grid grid-cols-2 gap-4">
             <div className="p-5 bg-blue-600 rounded-3xl text-white space-y-3 shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95 transition-all" onClick={() => window.open('https://buymeacoffee.com/drench', '_blank')}>
                <Coffee size={24} />
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Support Us</p>
                   <p className="text-lg font-bold leading-tight mt-1 tracking-tight">Buy us a coffee</p>
                </div>
             </div>
             <div className="p-5 bg-blue-50 dark:bg-slate-800 rounded-3xl space-y-3">
                <Zap size={24} className="text-blue-600" />
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Speed</p>
                   <p className="text-lg font-bold text-blue-600 dark:text-white leading-tight mt-1 tracking-tight">Instant Indexing</p>
                </div>
             </div>
          </div>

       <div className="text-center px-8">
          <p className="text-[9px] font-bold text-blue-200 dark:text-slate-600 uppercase tracking-[0.3em]">
             Built with passion for the digital future.
          </p>
       </div>
    </div>
  );
}
