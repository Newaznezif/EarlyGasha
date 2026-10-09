import React, { useState, useEffect } from 'react';
import { Shield, Zap, Terminal, Activity, ChevronRight, Loader2 } from 'lucide-react';
import api from '../auth/api';

export default function CommandBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefing = async () => {
        try {
            const res = await api.get('/intel/command-briefing');
            setBriefing(res.data);
        } catch (err) {
            console.error("Briefing transmission error:", err);
        } finally {
            setLoading(false);
        }
    };
    fetchBriefing();
  }, []);

  if (loading) return (
    <div className="h-32 flex items-center justify-center p-6 bg-element/20 border border-edge rounded-3xl">
        <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Processing Situational Data...</span>
    </div>
  );

  return (
    <div className="relative group overflow-hidden rounded-[2rem] border border-primary/20 bg-black shadow-2xl transition-all duration-700 hover:border-primary/50">
        {/* Background Decorative Layer */}
        <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
            <img src="/earlygasha_command_briefing_bg_1776524824878.png" alt="" className="w-full h-full object-cover" />
        </div>
        
        {/* Animated Scanning Line */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan z-10" />

        <div className="relative z-20 p-6 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-grow space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                        <Terminal className="text-primary w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-1">Tactical SitRep Briefing</h3>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">{new Date(briefing?.timestamp).toLocaleString()} // ETHIOPIA WEATHER SCREENING</p>
                    </div>
                </div>

                <div className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Shield className="w-20 h-20" />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-black uppercase tracking-tight">
                        {briefing?.briefing_narrative}
                    </p>
                </div>
            </div>

            <div className="shrink-0 w-full md:w-64 space-y-3">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-emerald-500 w-4 h-4" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Priority Vector</span>
                    </div>
                    <p className="text-xs font-black text-default uppercase tracking-tight">{briefing?.priority_vulnerability}</p>
                </div>
                
                <button className="w-full py-4 bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                    Review Directive <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
}
