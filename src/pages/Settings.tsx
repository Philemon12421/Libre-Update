import React from 'react';
import { 
  Bell, 
  Shield, 
  Moon, 
  Database, 
  Share2, 
  Trash2, 
  Heart,
  ChevronRight,
  User,
  Coffee
} from 'lucide-react';

export default function SettingsPage() {
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  const clearStorageAction = () => {
    if(confirm('DO YOU REALLY WANT TO CLEAR EVERYTHING? This action is IRREVERSIBLE. All your local files and pages will be deleted forever.')) {
      if(confirm('FINAL WARNING: Click OK to delete all 100% of your data.')) {
        localStorage.clear();
        indexedDB.deleteDatabase('LibreDatabase');
        window.location.reload();
      }
    }
  };

  const settingsGroups = [
    {
      title: "Account & Performance",
      items: [
        { icon: User, label: "Cloud Profile", color: "text-blue-500", bg: "bg-blue-50", desc: "Sync your settings" },
        { icon: Bell, label: "Notifications", color: "text-orange-500", bg: "bg-orange-50", desc: "Manage alerts", showBadge: true },
      ]
    },
    {
      title: "Digital Environment",
      items: [
        { icon: Moon, label: "Aesthetic Mode", color: "text-indigo-500", bg: "bg-indigo-50", desc: "Technical Dark", toggle: true },
        { icon: Database, label: "Indexing Storage", color: "text-emerald-500", bg: "bg-emerald-50", desc: "View disk usage" },
        { icon: Shield, label: "Advanced Security", color: "text-red-500", bg: "bg-red-50", desc: "Fingerprint lock" },
      ]
    },
    {
      title: "Community & Support",
      items: [
        { icon: Share2, label: "Share Libre", color: "text-blue-600", bg: "bg-blue-50", desc: "Spread the neatness" },
        { 
          icon: Heart, 
          label: "Support Project", 
          color: "text-pink-500", 
          bg: "bg-pink-50", 
          desc: "Visit GitHub", 
          onClick: () => window.open('https://github.com/philemon12421', '_blank') 
        },
        { icon: Coffee, label: "Fuel the Team", color: "text-amber-500", bg: "bg-amber-50", desc: "Buy a virtual coffee" },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="px-1">
        <h2 className="text-3xl font-black font-display text-slate-900 tracking-tight">Preferences</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Configure your Workspace</p>
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group, idx) => (
          <div key={idx} className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 px-2">{group.title}</h3>
             <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm">
                {group.items.map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => item.onClick ? item.onClick() : setActiveSubPage(item.label)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                       <div className={cn("w-12 h-12 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-95", item.bg, item.color)}>
                          <item.icon size={22} strokeWidth={2.5} />
                       </div>
                       <div className="text-left min-w-0">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{item.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{item.desc}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2">
                       {item.toggle ? (
                          <div className="w-10 h-6 bg-slate-100 rounded-full relative p-1 shadow-inner">
                             <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                       ) : (
                          <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                       )}
                    </div>
                  </button>
                ))}
             </div>
          </div>
        ))}
      </div>

      <div className="px-1">
        <button 
          onClick={clearStorageAction}
          className="w-full flex items-center justify-center space-x-3 p-5 bg-red-50 text-red-500 rounded-[32px] font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm"
        >
          <Trash2 size={20} strokeWidth={2.5} />
          <span>Wipe Laboratory</span>
        </button>
      </div>

      <AnimatePresence>
         {activeSubPage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveSubPage(null)}
                 className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="bg-white w-full max-w-sm rounded-[48px] p-8 relative z-10 shadow-2xl text-center"
               >
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                     <Shield size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{activeSubPage}</h3>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                     The <strong>{activeSubPage}</strong> module is currently being optimized for the next major release. 
                  </p>
                  <button 
                    onClick={() => setActiveSubPage(null)}
                    className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest"
                  >
                    Dismiss
                  </button>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
