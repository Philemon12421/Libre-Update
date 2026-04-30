import React from 'react';
import { Github, Globe, Heart, Code, Layers, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function AboutPage() {
  return (
    <div className="space-y-8 pb-32">
       <div className="flex flex-col items-center text-center space-y-4 px-1">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-xl shadow-blue-100"
          >
             <span className="text-4xl text-white font-black font-display tracking-tight">L</span>
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold font-display text-slate-800">Libre</h2>
            <p className="text-blue-600 font-bold uppercase tracking-widest text-[10px] mt-1">Version 1.0.0 Open Source</p>
          </div>
       </div>

       <div className="bg-white border border-slate-100 p-8 rounded-[40px] space-y-6">
          <div className="space-y-2">
             <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles size={20} className="text-blue-500" />
                <span>Our Mission</span>
             </h3>
             <p className="text-sm text-slate-500 leading-relaxed">
                Libre was designed by <strong>Drenchack Tech Company</strong> with the intention to solve the problem of scattered files and messy digital spaces on mobile devices. Our goal is to provide a neat, centralized haven for all your important documents and book discoveries.
             </p>
          </div>

          <div className="pt-4 border-t border-slate-50 space-y-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Collaboration</h3>
             <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Github size={20} className="text-slate-700" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Contributor</p>
                      <a 
                        href="https://github.com/philemon12421" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-slate-800 hover:text-blue-600"
                      >
                         @philemon12421
                      </a>
                   </div>
                </div>
                <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Code size={20} className="text-slate-700" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Design & Dev</p>
                      <p className="text-sm font-bold text-slate-800">Drenchack Tech</p>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="bg-blue-600 p-8 rounded-[40px] text-white space-y-6 shadow-xl shadow-blue-100">
          <div className="flex justify-between items-start">
             <h3 className="text-xl font-bold flex items-center space-x-2">
                <Heart size={20} fill="currentColor" />
                <span>Open Source</span>
             </h3>
          </div>
          <p className="text-sm text-blue-10/80 leading-relaxed">
             Libre is a community-driven project. We believe in transparency and the power of collaborative growth. You are invited to contribute, fork, and make Libre better for everyone.
          </p>
          <a 
            href="https://github.com/philemon12421" 
            className="block w-full py-4 bg-white text-blue-600 rounded-2xl font-bold text-center"
          >
             Contribute on GitHub
          </a>
       </div>

       <div className="text-center px-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-loose">
             Developed with Passion for the Community • © 2026 Drenchack Tech
          </p>
       </div>
    </div>
  );
}
