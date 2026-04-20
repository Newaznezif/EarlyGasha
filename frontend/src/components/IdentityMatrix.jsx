import React from 'react';
import { Shield, User, Globe, Activity, Terminal } from 'lucide-react';

export default function IdentityMatrix({ users, regions }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-default uppercase tracking-tighter">Digital Identity Matrix</h3>
          <p className="text-xs text-muted">A topological map of all operational identities across the global grid.</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Activity className="text-emerald-500 w-4 h-4" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{users.length} Linked Nodes</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u, i) => {
          const region = regions.find(r => r.id === u.region_id);
          const clearance = u.role === 'system_admin' ? 'ALPHA-9' : u.role === 'institutional_user' ? 'BETA-3' : 'FIELD-SYNC';
          
          return (
            <div key={i} className="glass-card p-6 relative overflow-hidden group transition-all duration-500 hover:border-primary/50">
                {/* Identity Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                            u.role === 'system_admin' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
                            u.role === 'field_officer' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-black'
                        }`}>
                            {u.email[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-black text-default truncate w-32">{u.email.split('@')[0]}</div>
                            <div className="text-[9px] font-black uppercase text-primary tracking-widest">{clearance} CLEARANCE</div>
                        </div>
                    </div>
                    <div className="p-2 bg-white/5 border border-white/5 rounded-xl">
                        <Shield className={`w-4 h-4 ${u.role === 'system_admin' ? 'text-red-500' : 'text-slate-500'}`} />
                    </div>
                </div>

                {/* Tactical Context */}
                <div className="space-y-4">
                    <div className="p-3 bg-black/40 border border-edge rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-3 h-3 text-blue-400" />
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Operational Sector</span>
                        </div>
                        <div className="text-[11px] font-bold text-default">{region?.region || 'GLOBAL MANDATE'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-black/40 border border-edge rounded-2xl">
                            <div className="text-[8px] font-black uppercase text-slate-500 mb-1">Last Uplink</div>
                            <div className="text-[10px] font-mono text-default truncate">
                                {u.updated_at ? new Date(u.updated_at).toLocaleTimeString() : 'OFFLINE'}
                            </div>
                        </div>
                        <div className="p-3 bg-black/40 border border-edge rounded-2xl">
                            <div className="text-[8px] font-black uppercase text-slate-500 mb-1">Access Type</div>
                            <div className="text-[10px] font-mono text-default uppercase">{u.role}</div>
                        </div>
                    </div>
                </div>

                {/* Animated Background Overlay */}
                <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Terminal className="w-24 h-24" />
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
