import React, { useState } from 'react';
import { Bell, Database, Trash2, Shield, Info, ChevronRight, Moon } from 'lucide-react';
import { db } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsPageProps {
  isDark?: boolean;
  setIsDark?: (val: boolean) => void;
}

export default function SettingsPage({ isDark, setIsDark }: SettingsPageProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const clearAllData = async () => {
    await db.files.clear();
    await db.folders.clear();
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const sections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-500',
          label: 'Notifications',
          description: 'Archive alerts and updates',
          action: (
            <div className="w-10 h-6 bg-blue-600 rounded-full relative flex items-center px-0.5">
              <div className="w-5 h-5 bg-white rounded-full ml-auto shadow-sm" />
            </div>
          ),
        },
      ],
    },
    {
      title: 'Storage',
      items: [
        {
          icon: Database,
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-500',
          label: 'Local Storage',
          description: 'All files stored on your device',
          action: <span className="text-[10px] font-semibold text-slate-400">IndexedDB</span>,
        },
        {
          icon: Trash2,
          iconBg: 'bg-red-50',
          iconColor: 'text-red-500',
          label: 'Clear All Data',
          description: 'Permanently delete all files and folders',
          action: <ChevronRight size={16} className="text-slate-300" />,
          onTap: () => setConfirmClear(true),
          danger: true,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Shield,
          iconBg: 'bg-violet-50',
          iconColor: 'text-violet-500',
          label: 'Privacy',
          description: 'No data ever leaves your device',
          action: <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">Local Only</span>,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Settings</h2>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">App preferences</p>
      </div>

      {/* Cleared Banner */}
      <AnimatePresence>
        {cleared && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center"
          >
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">All data cleared successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Sections */}
      {sections.map(section => (
        <div key={section.title} className="space-y-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">{section.title}</p>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50">
            {section.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={item.onTap}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-4 text-left transition-colors',
                    item.onTap ? 'hover:bg-slate-50 cursor-pointer active:bg-slate-100' : 'cursor-default',
                    item.danger ? 'hover:bg-red-50' : ''
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.iconBg)}>
                    <Icon size={16} className={item.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-[13px] font-semibold leading-none', item.danger ? 'text-red-600' : 'text-slate-800')}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                  {item.action}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* App Version */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-300 font-medium">Libre Archival Node · v1.0.0</p>
      </div>

      {/* Confirm Clear Modal */}
      <AnimatePresence>
        {confirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-[18px] flex items-center justify-center mx-auto mb-5">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Clear All Data?</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed mb-6 max-w-[220px] mx-auto">
                All files and folders will be permanently deleted. This cannot be undone.
              </p>
              <button
                onClick={clearAllData}
                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all mb-2"
              >
                Clear Everything
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="w-full py-2 text-slate-400 font-semibold text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
