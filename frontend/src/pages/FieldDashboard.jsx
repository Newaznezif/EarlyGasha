import React, { useState, useEffect } from 'react';
import { Globe, MapPin, ClipboardList, LogOut, Send, ShieldAlert, Activity, RefreshCcw, History as HistoryIcon, FileText, Shield, MessageSquare } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../auth/api';
import FieldReportForm from '../components/FieldReportForm';
import OperationalSummary from '../components/OperationalSummary';
import ThemeToggle from '../components/ThemeToggle';
import ProfileModal from '../components/ProfileModal';
import AlertPanel from '../components/AlertPanel';

export default function FieldDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [directives, setDirectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [targetRegion, setTargetRegion] = useState('');
  
  const [duplicatePayload, setDuplicatePayload] = useState(null);
  const [minimalMode, setMinimalMode] = useState(false);

  const fetchData = async () => {
    try {
      const [regionsRes, reportsRes, alertsRes, directivesRes] = await Promise.all([
        api.get('/overview'),
        api.get('/field/reports'),
        api.get('/alerts/active'),
        api.get('/field/directives')
      ]);
      setRegions(regionsRes.data.ranked_list);
      setMyReports(reportsRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setDirectives(directivesRes.data || []);
      
      if (!targetRegion && regionsRes.data.ranked_list.length > 0) {
        setTargetRegion(regionsRes.data.ranked_list[0].region);
      }
    } catch (error) {
      console.error('Field sync failure:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetRegion]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCompleteMission = async (directiveId) => {
    try {
        await api.post(`/field/directives/${directiveId}/complete`);
        fetchData();
    } catch(err) {
        alert("Transmission Failed: Mission status could not be synchronized.");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-primary font-mono animate-pulse uppercase tracking-[0.5em]">Establishing Tactical Uplink...</div>;

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-screen-2xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 glass-card gap-4">
        <div className="flex flex-col gap-1.5 text-center md:text-left">
           <div className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-2">
              <span className="text-slate-500">Node</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">Tactical</span>
              <span className="text-slate-700">/</span>
              <span className="text-default">Observational</span>
           </div>
           <div className="flex items-center gap-3">
             <ShieldAlert className="text-primary w-6 h-6 md:w-8 md:h-8" />
             <h1 className="text-lg md:text-2xl font-black text-default uppercase tracking-tight">Field Operator Dashboard</h1>
           </div>
        </div>

        <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-element/30 border border-white/5 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-primary/20 bg-black flex items-center justify-center relative">
                    <img src="/earlygasha_tactical_heartbeat_icon_1776524925349.png" alt="Heartbeat" className="w-7 h-7 object-contain opacity-80" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
                </div>
                <div>
                    <div className="text-[9px] font-black uppercase text-primary tracking-widest leading-none mb-1">Tactical Heartbeat</div>
                    <div className="text-[11px] font-mono text-default font-bold flex items-center gap-2">
                        98.4 MS <span className="text-[8px] text-slate-500 font-normal">LATENCY</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-1 items-end min-w-[80px]">
                <div className="text-[8px] font-black text-slate-500 uppercase">Signal Stability</div>
                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-emerald-500 rounded-full" />
                </div>
            </div>
        </div>

        <div className="flex gap-4 items-center">
           <button 
              onClick={() => setMinimalMode(!minimalMode)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${minimalMode ? 'bg-primary text-black' : 'bg-element border border-edge text-muted'}`}
           >
              {minimalMode ? 'Focus Active' : 'Show Full Intelligence'}
           </button>
           <button 
               onClick={() => navigate('/comm')}
               className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl transition-colors"
               title="Crisis Communication Hub"
            >
               <MessageSquare className="w-4 h-4" />
            </button>
            <button 
               onClick={() => setProfileOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-primary border border-edge rounded-xl transition-colors"
           >
              <Activity className="w-4 h-4" />
           </button>
           <button 
              onClick={() => setSummaryOpen(true)}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl transition-colors"
              title="Operational Summary"
           >
              <FileText className="w-4 h-4" />
           </button>
           <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
           >
              <LogOut className="w-4 h-4" />
           </button>
        </div>
      </header>

      {summaryOpen && (
        <OperationalSummary 
          role="field_officer" 
          data={{ myReports, targetRegion }} 
          onClose={() => setSummaryOpen(false)} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
         {/* Central Reporting Column */}
         <div className={`space-y-6 ${minimalMode ? 'lg:col-span-3 max-w-3xl mx-auto w-full' : 'lg:col-span-2'}`}>
            <div className="glass-card p-6">
               <h2 className="text-lg font-bold text-default mb-1">Tactical Situational Report (SITREP)</h2>
               <p className="text-xs text-muted mb-6">Transmit ground-truth observations directly to the risk engine.</p>
               <FieldReportForm regions={regions} onSuccess={fetchData} duplicatePayload={duplicatePayload} recentReports={myReports} />
            </div>

            {!minimalMode && (
              <div className="glass-card p-6 overflow-hidden flex flex-col">
                 <h3 className="text-sm font-bold text-default mb-4 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <ClipboardList className="text-primary w-4 h-4" /> Transmission History
                 </div>
               </h3>
               
               <div className="flex gap-2 mb-3">
                  <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} className="bg-slate-900 border border-edge rounded-lg px-2 py-1.5 text-[10px] text-default focus:outline-none focus:border-primary/50 transition-colors flex-1">
                    <option value="ALL">All Mission Zones</option>
                    {regions.map(r => <option key={r.region} value={r.id || r.id}>{r.region}</option>)}
                  </select>
                  <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="bg-slate-900 border border-edge rounded-lg px-2 py-1.5 text-[10px] text-default focus:outline-none focus:border-primary/50 transition-colors flex-1">
                    <option value="ALL">All Anomalies</option>
                    <option value="drought">Drought</option>
                    <option value="flood">Flood</option>
                    <option value="disease">Disease</option>
                    <option value="conflict">Conflict</option>
                  </select>
               </div>

               <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                  {myReports.filter(r => 
                      (filterRegion === 'ALL' || String(r.region_id) === String(filterRegion)) &&
                      (filterType === 'ALL' || r.report_type === filterType)
                  ).length === 0 ? (
                    <p className="text-xs text-muted italic">No SITREPs transmitted matching current filters.</p>
                  ) : (
                    myReports.filter(r => 
                         (filterRegion === 'ALL' || String(r.region_id) === String(filterRegion)) &&
                         (filterType === 'ALL' || r.report_type === filterType)
                    ).slice().reverse().map((r, i) => {
                      const matchingRegion = regions.find(reg => String(reg.id) === String(r.region_id));
                      
                      return (
                      <div key={i} className="p-4 border border-edge rounded-xl bg-element/30 flex flex-col gap-2">
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">{r.report_type} | ID-{r.id.toString().padStart(4, '0')}</span>
                            <div className="flex gap-2">
                               <button onClick={() => setDuplicatePayload(r)} className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">Duplicate</button>
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                  r.status === 'verified' ? 'bg-emerald-500/20 text-emerald-500' :
                                  r.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                  'bg-amber-500/20 text-amber-500'
                               }`}>
                                  {r.status}
                               </span>
                            </div>
                         </div>
                         <p className="text-xs text-default leading-relaxed">{r.description}</p>
                         <div className="flex justify-between items-center mt-2 border-t border-edge pt-2">
                            <span className="text-[8px] text-muted font-bold uppercase">{matchingRegion?.region || 'Sector-Unknown'}</span>
                            <span className="text-[8px] text-muted font-mono">{new Date(r.timestamp).toLocaleString()}</span>
                         </div>
                      </div>
                      );
                    })
                  )}
               </div>
              </div>
            )}
         </div>

         {/* Sidebar: Tactical Context */}
         {!minimalMode && (
           <div className="space-y-6">
              <div className="glass-card p-6">
                 <h3 className="text-sm font-bold text-default mb-4 flex items-center gap-2">
                    <Globe className="text-primary w-4 h-4" /> Operational Area Summary
                 </h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-muted font-bold uppercase">Sector Identification</span>
                       <span className="text-xs text-default font-black">{targetRegion || 'N/A'}</span>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-edge">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] text-primary font-bold uppercase">Stability Index</span>
                          <span className="text-[10px] text-default font-black">{regions.find(r => r.region === targetRegion)?.risk_score?.toFixed(2) || '0.00'}</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-primary transition-all duration-1000" 
                             style={{ width: `${(regions.find(r => r.region === targetRegion)?.risk_score || 0) * 100}%` }}
                          />
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                       <HistoryIcon size={12} className="text-secondary" /> Chronological Activity Feed
                    </h4>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                       {myReports.filter(r => String(r.region_id) === String(targetRegion) || regions.find(re => re.region === targetRegion)?.id === r.region_id).length === 0 ? (
                          <p className="text-[10px] text-muted italic text-center py-4 bg-slate-900/30 rounded-lg border border-dashed border-edge">No tactical logs for this sector.</p>
                       ) : (
                          myReports
                           .filter(r => String(r.region_id) === String(targetRegion) || regions.find(re => re.region === targetRegion)?.id === r.region_id)
                           .reverse()
                           .map((r, i) => (
                             <div key={i} className="p-2.5 bg-slate-900/80 border-l-2 border-primary rounded-r-lg flex flex-col gap-1 transition-all hover:bg-slate-800">
                                <div className="flex justify-between items-center text-[9px] font-bold">
                                   <span className="text-default font-mono">ID-{r.id}</span>
                                   <span className="text-muted">{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 italic line-clamp-1">{r.description}</p>
                             </div>
                           ))
                       )}
                    </div>
                 </div>
              </div>

              <div className="glass-card p-6">
                 <h3 className="text-sm font-bold text-default mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-primary w-4 h-4" /> Command Directives
                 </h3>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {directives.filter(d => 
                       !user?.region_id || String(regions.find(r => r.name === d.region)?.id) === String(user.region_id)
                    ).length === 0 ? (
                       <p className="text-[10px] text-muted italic text-center py-4 bg-slate-900/30 rounded-lg border border-dashed border-edge">No active missions for your current sector allocation.</p>
                    ) : (
                       directives.filter(d => 
                          !user?.region_id || String(regions.find(r => r.name === d.region)?.id) === String(user.region_id)
                       ).map((d, i) => (
                          <div key={i} className={`p-4 border rounded-xl flex flex-col gap-2 transition-all group ${
                             d.priority === 'IMMEDIATE' ? 'border-red-500/30 bg-red-500/10' : 
                             d.priority === 'URGENT' ? 'border-amber-500/30 bg-amber-500/10' : 'border-edge bg-white/5'
                          }`}>
                               <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase text-primary tracking-widest">{d.region}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                                   d.priority === 'IMMEDIATE' ? 'bg-red-500 text-white' : 
                                   d.priority === 'URGENT' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                                }`}>{d.priority}</span>
                             </div>
                             <p className="text-xs text-default font-medium leading-relaxed">{d.objective}</p>
                             <div className="flex justify-between items-center text-[8px] text-muted font-mono mt-1 pt-1 border-t border-white/5">
                                <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                                <button 
                                  onClick={() => handleCompleteMission(d.id)}
                                  className="text-emerald-500 hover:text-emerald-400 font-black uppercase transition-colors flex items-center gap-1"
                                >
                                   <RefreshCcw size={10} className="group-hover:rotate-180 transition-transform duration-500" /> Mark Complete
                                </button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              <div className="glass-card p-6 border-red-500/10">
                 <h3 className="text-sm font-bold text-default mb-4 flex items-center gap-2">
                    <Activity className="text-red-500 w-4 h-4" /> Emergency Alerts
                 </h3>
                 <div className="space-y-2">
                    {alerts.length === 0 ? (
                       <p className="text-[10px] text-muted italic">No active system alerts.</p>
                    ) : (
                       alerts.map((a, i) => (
                          <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-red-500 font-bold uppercase">{a.region}</span>
                                <span className="text-[8px] font-black text-white bg-red-500 px-1 rounded">CRITICAL</span>
                             </div>
                             <p className="text-[10px] text-slate-400">Escalation detected. Verify ground truth immediately.</p>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
         )}
      </div>
      
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
