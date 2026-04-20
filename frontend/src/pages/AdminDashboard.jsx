import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Server, Globe, Home, LogOut, Plus, Key, Terminal, RefreshCcw, Link as LinkIcon, Database, History as HistoryIcon, TrendingUp, AlertTriangle, FileText, Shield, MessageSquare } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../auth/api';
import OperationalSummary from '../components/OperationalSummary';
import IdentityMatrix from '../components/IdentityMatrix';

const HealthStatusItem = ({ label, status, value }) => (
    <div className="flex justify-between items-center p-2 border-b border-edge last:border-0">
        <span className="text-xs text-muted font-bold">{label}</span>
        {status ? (
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                status === 'nominal' || status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
                {status}
            </span>
        ) : (
            <span className="text-xs text-default font-mono">{value}</span>
        )}
    </div>
);

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sysHealth, setSysHealth] = useState(null);
    const [sysHealthDetail, setSysHealthDetail] = useState(null);
    const [globalRisk, setGlobalRisk] = useState([]);
    const [users, setUsers] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [directives, setDirectives] = useState([]);
    const [newDirective, setNewDirective] = useState({ region_id: '', priority: 'ROUTINE', objective: '' });
    const [newOp, setNewOp] = useState({ email: '', password: '', role: 'institutional_user', region_id: '' });
    const [loading, setLoading] = useState(false);
    
    const [silentMode, setSilentMode] = useState(() => JSON.parse(localStorage.getItem('gasha_silent')) || false);
    const [thresholds, setThresholds] = useState(() => JSON.parse(localStorage.getItem('gasha_thresholds')) || { low: 30, med: 60, high: 80 });
    const [auditRegion, setAuditRegion] = useState(null);
    const [snapshotMode, setSnapshotMode] = useState(false);
    const [dependencyChain, setDependencyChain] = useState(null);
    const [summaryOpen, setSummaryOpen] = useState(false);

    const sourceReliability = {
        'NASA': { score: 92, status: 'stable' },
        'World Bank': { score: 85, status: 'nominal' },
        'ACLED': { score: 89, status: 'active' },
        'WHO': { score: 94, status: 'stable' }
    };

    const impactRelationships = {
        'Ethiopia': ['Regional Food Shortage', 'Internal Displacement', 'Border Trade Stagnation'],
        'Somalia': ['Port Logistics Delay', 'Cross-border Migration', 'Cattle Export Drop'],
        'Kenya': ['Energy Protocol Strain', 'Refugee Camp Pressure', 'Tourism Signal Loss'],
        'Sudan': ['River Nile Flow Variation', 'Transit Corridor Blockade', 'Inflation Spike'],
        'Tigray': ['Logistics Isolation', 'Agricultural Disruption', 'Medical Cache Depletion'],
        'South Sudan': ['Oil Pipeline Vulnerability', 'Grazing Land Conflict', 'NGO Flight Density'],
        'Kenya North': ['Arid Soil Degradation', 'Water Hole Aggregation', 'Livestock Health Decline'],
        'Amhara': ['Wheat Production Variance', 'Highland Supply Latency', 'Regional Militia Presence'],
        'Oromia': ['Coffee Export Fluctuations', 'Infrastructure Stress', 'Telecomm Outages']
    };

    const toggleSilentMode = () => {
        const val = !silentMode;
        setSilentMode(val);
        localStorage.setItem('gasha_silent', JSON.stringify(val));
    };

    const updateThreshold = (key, val) => {
        const newT = { ...thresholds, [key]: parseInt(val) };
        setThresholds(newT);
        localStorage.setItem('gasha_thresholds', JSON.stringify(newT));
    };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [healthRes, usersRes, sessionsRes, alertsRes, logsRes, sysDetailRes, overviewRes, directivesRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/users'),
          api.get('/admin/sessions'),
          api.get('/admin/alerts'),
          api.get('/admin/audit/logs'),
          api.get('/system/health'),
          api.get('/overview'),
          api.get('/admin/directives')
        ]);
        setSysHealth(healthRes.data);
        setUsers(usersRes.data);
        setSessions(sessionsRes.data);
        setAlerts(alertsRes.data.alerts);
        setAuditLogs(logsRes.data);
        setSysHealthDetail(sysDetailRes.data);
        setGlobalRisk(overviewRes.data.ranked_list);
        setDirectives(directivesRes.data);
      } catch(err) {
        console.error("Admin data hydration failed: ", err);
      }
    };
    fetchAdminData();
  }, []);

  const handleProvision = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        await api.post('/admin/users', {
            ...newOp,
            region_id: newOp.region_id ? parseInt(newOp.region_id) : null
        });
        setNewOp({ email: '', password: '', role: 'institutional_user', region_id: '' });
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data);
    } catch(err) {
        alert(err.response?.data?.detail || "Provisioning Failed");
    } finally {
        setLoading(false);
    }
  };

  const handleIssueDirective = async (e) => {
    e.preventDefault();
    if (!newDirective.region_id) return alert("Select target region");
    
    try {
        const payload = {
            ...newDirective,
            region_id: parseInt(newDirective.region_id)
        };
        await api.post('/admin/directives', payload);
        setNewDirective({ region_id: '', priority: 'ROUTINE', objective: '' });
        const res = await api.get('/admin/directives');
        setDirectives(res.data);
    } catch(err) {
        alert("Directive Transmission Failed");
    }
  };

  const handleLogout = () => {
     logout();
     navigate("/login");
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Purge this identity from the matrix?")) return;
    try {
        await api.delete(`/admin/users/${userId}`);
        setUsers(prev => prev.filter(u => u.id !== userId));
    } catch(err) {
        alert(err.response?.data?.detail || "Purge Failed");
    }
  };

  const handleVerifyReport = async (reportId, status) => {
    try {
        await api.post(`/field/verify/${reportId}?status=${status}`);
        const healthRes = await api.get('/admin/dashboard');
        setSysHealth(healthRes.data);
    } catch(err) {
        alert(err.response?.data?.detail || "Verification Fault");
    }
  };

  if (!sysHealth || loading) {
     return (
      <div className="min-h-screen p-6 flex flex-col gap-6 max-w-screen-2xl mx-auto animate-pulse bg-black">
        <div className="h-20 bg-slate-800 rounded-2xl w-full border border-white/5" />
        <div className="grid grid-cols-4 gap-6 flex-grow">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-2xl w-full border border-white/5" />)}
        </div>
      </div>
     );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-screen-2xl mx-auto animate-in fade-in duration-500 ${silentMode ? 'silent-mode' : ''}`}>
      <header className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 glass-card gap-4">
        <div className="flex flex-col gap-1.5">
           <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <span className="text-slate-500">Home</span>
              <span className="text-slate-700">{'>'}</span>
              <span className="text-slate-500">{user?.role}</span>
              <span className="text-slate-700">{'>'}</span>
              <span className="text-default">Command Authority</span>
           </div>
           <div className="flex items-center gap-3">
             <Globe className="text-primary w-8 h-8" />
             <h1 className="text-xl md:text-3xl font-black text-default">EARLYGASHA</h1>
           </div>
        </div>
         <div className="flex gap-4">
           <button onClick={toggleSilentMode} className="px-3 py-2 font-black text-[10px] uppercase border border-edge rounded-lg">
              {silentMode ? 'Silent Mode On' : 'Silent Mode Off'}
           </button>
           <button onClick={() => setSummaryOpen(true)} className="px-4 py-2 font-black text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg flex items-center gap-2 transition-colors hover:bg-emerald-500/20">
              <FileText className="w-4 h-4" /> Summary Report
           </button>
           <button onClick={() => navigate('/comm')} className="px-4 py-2 font-black text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg flex items-center gap-2 transition-colors hover:bg-emerald-500/20">
              <MessageSquare className="w-4 h-4" /> Crisis Comms
           </button>
           <button onClick={() => navigate('/toolkit')} className="px-4 py-2 font-black text-xs bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-lg flex items-center gap-2 transition-colors hover:bg-blue-500/20">
              <Shield className="w-4 h-4" /> Resilience Toolkit
           </button>
           <button onClick={handleLogout} className="px-4 py-2 font-bold text-xs bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Terminate Link
           </button>
        </div>
      </header>

      {summaryOpen && (
        <OperationalSummary 
          role="system_admin" 
          data={{ sysHealth, sysHealthDetail, alerts, globalRisk }} 
          onClose={() => setSummaryOpen(false)} 
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="glass-card p-6 flex flex-col gap-2">
            <h3 className="font-bold uppercase text-xs text-muted">Infrastructure</h3>
            <p className="text-3xl font-black text-default">{sysHealth?.data_points || 0}</p>
         </div>
         <div className="glass-card p-6 flex flex-col gap-2">
            <h3 className="font-bold uppercase text-xs text-muted">Risk Profile</h3>
            <p className="text-3xl font-black text-default">{globalRisk.filter(r => r.risk_score > 0.6).length}</p>
         </div>
         <div className="glass-card p-6 flex flex-col gap-2">
            <h3 className="font-bold uppercase text-xs text-muted">Active Alerts</h3>
            <p className="text-3xl font-black text-default">{alerts.length}</p>
         </div>
         <div onClick={() => setSnapshotMode(!snapshotMode)} className={`glass-card p-6 cursor-pointer ${snapshotMode ? 'border-amber-500/50' : ''}`}>
            <h3 className="font-bold uppercase text-xs text-muted">Archive Mode</h3>
            <p className="text-xl font-black">{snapshotMode ? 'ACTIVE' : 'LIVE'}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="glass-card p-8 rounded-2xl flex flex-col overflow-hidden">
               <IdentityMatrix users={users} regions={globalRisk} />
            </div>

            <div className="glass-card p-6 rounded-2xl border-orange-500/10">
               <h3 className="text-lg font-bold text-default mb-4">Rendering Thresholds</h3>
               <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Low Risk</label>
                    <input type="range" value={thresholds.low} onChange={e => updateThreshold('low', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Medium Risk</label>
                    <input type="range" value={thresholds.med} onChange={e => updateThreshold('med', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">High Risk</label>
                    <input type="range" value={thresholds.high} onChange={e => updateThreshold('high', e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                  </div>
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="glass-card p-6 rounded-2xl">
                 <h3 className="text-lg font-bold mb-4">Strategic Alerts</h3>
                 <div className="space-y-2">
                    {alerts.slice(0, 5).map((a, i) => (
                       <div key={i} className="p-3 bg-element rounded-xl border border-edge text-xs flex justify-between items-center">
                          <span className="font-bold">{a.region}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                             a.alert_level === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                          }`}>{a.alert_level}</span>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border-orange-500/10">
                 <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-orange-400" /> Dependency Net
                 </h3>
                 <select onChange={e => setDependencyChain(e.target.value)} className="bg-slate-900 border border-edge rounded-lg p-2 text-xs w-full mb-3 text-default focus:outline-none focus:border-primary/50">
                    <option value="">Select Anchor...</option>
                    {Object.keys(impactRelationships).map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
                 <div className="flex flex-col gap-1.5">
                    {dependencyChain && impactRelationships[dependencyChain].map((r, i) => (
                        <div key={i} className="text-[10px] ml-2 border-l-2 border-primary/20 pl-3 py-1 font-bold text-slate-400 group hover:border-primary transition-colors cursor-default">
                           {r}
                        </div>
                    ))}
                 </div>
              </div>

              <div className="glass-card p-6 border-emerald-500/20">
                 <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> Provision Node
                 </h3>
                 <form onSubmit={handleProvision} className="flex flex-col gap-3">
                    <input type="email" placeholder="Operator Email" required value={newOp.email} onChange={e => setNewOp({...newOp, email: e.target.value})} className="bg-slate-900 border border-edge rounded-lg p-2.5 text-xs text-default focus:outline-none focus:border-primary/50" />
                    <input type="password" placeholder="Access Key" required value={newOp.password} onChange={e => setNewOp({...newOp, password: e.target.value})} className="bg-slate-900 border border-edge rounded-lg p-2.5 text-xs text-default focus:outline-none focus:border-primary/50" />
                    <select value={newOp.role} onChange={e => setNewOp({...newOp, role: e.target.value})} className="bg-slate-900 border border-edge rounded-lg p-2.5 text-xs text-default">
                        <option value="field_officer">Field Officer</option>
                        <option value="institutional_user">Institutional User</option>
                        <option value="system_admin">System Admin</option>
                    </select>
                    <select value={newOp.region_id} onChange={e => setNewOp({...newOp, region_id: e.target.value})} className="bg-slate-900 border border-edge rounded-lg p-2.5 text-xs text-default">
                        <option value="">Global/Unassigned</option>
                        {globalRisk.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                    </select>
                    <button type="submit" className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">SYNCHRONIZE IDENTITY</button>
                 </form>
              </div>
          </div>

          <div className="glass-card p-6 mt-6 lg:col-span-2 border-primary/10">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Tactical Queue (Directives)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
                   {directives.length === 0 ? (
                      <p className="text-[10px] text-muted italic text-center py-10 opacity-50">No active directives in queue.</p>
                   ) : (
                      directives.map((d, i) => (
                        <div key={i} className={`p-4 border rounded-2xl flex flex-col gap-2 transition-all ${
                          d.priority === 'IMMEDIATE' ? 'border-red-500/30 bg-red-500/5' : 
                          d.priority === 'URGENT' ? 'border-amber-500/30 bg-amber-500/5' : 'border-edge bg-white/5 shadow-sm'
                        }`}>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-primary tracking-widest">{d.region}</span>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                                 d.priority === 'IMMEDIATE' ? 'bg-red-500 text-white' : 
                                 d.priority === 'URGENT' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                              }`}>{d.priority}</span>
                           </div>
                           <p className="text-xs text-default font-medium leading-relaxed">{d.objective}</p>
                           <div className="flex justify-between items-center text-[8px] text-muted font-mono mt-1 pt-2 border-t border-edge">
                              <span>{new Date(d.timestamp).toLocaleDateString()}</span>
                              <span className={`uppercase font-black ${d.status === 'completed' ? 'text-emerald-500' : 'text-primary'}`}>{d.status}</span>
                           </div>
                        </div>
                     ))
                   )}
                </div>
                <div className="bg-slate-900/40 p-5 rounded-3xl border border-edge/50">
                   <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Issue Regional Mission</h4>
                   <form onSubmit={handleIssueDirective} className="flex flex-col gap-3">
                      <select 
                        required 
                        value={newDirective.region_id} 
                        onChange={e => setNewDirective({...newDirective, region_id: e.target.value})}
                        className="bg-slate-900 border border-edge rounded-xl p-2.5 text-xs text-default focus:outline-none focus:border-primary/50"
                      >
                         <option value="">Select Target Sector...</option>
                         {globalRisk.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                      </select>
                      <select 
                        required 
                        value={newDirective.priority} 
                        onChange={e => setNewDirective({...newDirective, priority: e.target.value})}
                        className="bg-slate-900 border border-edge rounded-xl p-2.5 text-xs text-default focus:outline-none focus:border-primary/50"
                      >
                         <option value="ROUTINE">ROUTINE PRIORITY</option>
                         <option value="URGENT">URGENT PRIORITY</option>
                         <option value="IMMEDIATE">IMMEDIATE PRIORITY</option>
                      </select>
                      <textarea 
                        required 
                        placeholder="Mission Objective Statement..."
                        value={newDirective.objective}
                        onChange={e => setNewDirective({...newDirective, objective: e.target.value})}
                        className="bg-slate-900 border border-edge rounded-xl p-3 text-xs text-default h-28 resize-none focus:outline-none focus:border-primary/50 leading-relaxed"
                      />
                      <button type="submit" className="py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/10">
                        TRANSMIT DIRECTIVE
                      </button>
                   </form>
                </div>
             </div>
          </div>
          
          <div className="glass-card p-6 mt-6 lg:col-span-1 border-primary/10">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-slate-500" /> Audit Log
             </h3>
             <div className="space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
                {auditLogs.slice(0, 15).map((log, i) => (
                   <div key={i} className="p-3 bg-white/5 border border-edge rounded-2xl text-[10px] group transition-all hover:bg-white/[0.07]">
                      <div className="flex justify-between font-black mb-1.5 uppercase tracking-tighter">
                         <span className="text-primary">{log.action?.replace('_', ' ') || 'EVENT'}</span>
                         <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="italic text-slate-400 leading-normal line-clamp-3">{log.details || log.message}</div>
                      <div className="text-[8px] text-slate-600 mt-2 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> {log.user_email}
                      </div>
                   </div>
                ))}
             </div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
