import React, { useState, useEffect } from 'react';
import { ShieldAlert, Globe, Activity, Map as MapIcon, RefreshCcw, TrendingUp, Columns, LogOut, Monitor, User, Bookmark, Info, ChevronUp, ChevronDown, ListFilter, Zap, ArrowRight, Layers, History as HistoryIcon, Database, FileText, Shield, MessageSquare } from 'lucide-react';
import RiskMap from '../components/RiskMap';
import RiskChart from '../components/RiskChart';
import AlertPanel from '../components/AlertPanel';
import MetricCard from '../components/MetricCard';
import ChatBot from '../components/ChatBot';
import ScenarioSimulator from '../components/ScenarioSimulator';
import ComparisonPanel from '../components/ComparisonPanel';
import IntelligenceFeed from '../components/IntelligenceFeed';
import ThemeToggle from '../components/ThemeToggle';
import ReportEngine from '../components/ReportEngine';
import ProfileModal from '../components/ProfileModal';
import FieldReportForm from '../components/FieldReportForm';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../auth/api';
import OperationalSummary from '../components/OperationalSummary';
import CommandBriefing from '../components/CommandBriefing';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [compareRegion, setCompareRegion] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [compareIntelligence, setCompareIntelligence] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [demoLock, setDemoLock] = useState(false);
  const [loadingText, setLoadingText] = useState("Synchronizing Intelligence...");
  const [profileOpen, setProfileOpen] = useState(false);
  
  // New Functional Controls State (URL Synchronized)
  const [timeHorizon, setTimeHorizon] = useState(() => searchParams.get('horizon') || 'current');
  const [minRiskFilter, setMinRiskFilter] = useState(() => parseInt(searchParams.get('min_risk') || localStorage.getItem('gasha_min_risk') || "0"));
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || localStorage.getItem('gasha_view') || 'map');
  const [focusMode, setFocusMode] = useState(() => searchParams.get('focus') === 'true');
  const [sortOrder, setSortOrder] = useState('risk'); // risk, momentum, alerts
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
     const params = new URLSearchParams(searchParams);
     params.set('horizon', timeHorizon);
     params.set('min_risk', minRiskFilter);
     params.set('view', viewMode);
     params.set('focus', focusMode);
     if (selectedRegion?.region) params.set('region', selectedRegion.region);
     setSearchParams(params, { replace: true });
  }, [timeHorizon, minRiskFilter, viewMode, focusMode, selectedRegion]);

  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gasha_bookmarks')) || []; }
    catch { return []; }
  });

  const toggleBookmark = (regionName) => {
    const updated = bookmarks.includes(regionName)
      ? bookmarks.filter(b => b !== regionName)
      : [...bookmarks, regionName];
    setBookmarks(updated);
    localStorage.setItem('gasha_bookmarks', JSON.stringify(updated));
  };
  
  const handleSetMinRisk = (val) => {
     setMinRiskFilter(val);
     localStorage.setItem('gasha_min_risk', val);
  };
  const handleSetViewMode = (val) => {
     setViewMode(val);
     localStorage.setItem('gasha_view', val);
  };
  
  const semanticLoadingOptions = [
    "Analyzing climate indicators...",
    "Processing conflict signals...",
    "Updating forecast model...",
    "Correlating supply chains..."
  ];

  useEffect(() => {
    let i = 0;
    const int = setInterval(() => {
        setLoadingText(semanticLoadingOptions[i % semanticLoadingOptions.length]);
        i++;
    }, 2000);
    return () => clearInterval(int);
  }, []);

  const fetchIntelligence = async (regionName, isCompare = false) => {
    setLoadingIntel(true);
    try {
      const response = await api.get(`/risk/${regionName}`);
      if (isCompare) setCompareIntelligence(response.data);
      else setIntelligence(response.data);
    } catch (error) {
      console.error("Error fetching intelligence:", error);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleRegionSelect = (region) => {
    if (compareMode) {
      setCompareRegion(region);
      fetchIntelligence(region.region, true);
    } else {
      setSelectedRegion(region);
      fetchIntelligence(region.region);
    }
  };

  const fetchData = async () => {
    if (demoLock) return; // FREEZE SYSTEM STATE protects against accidental mutation
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/overview');
      const alertsResponse = await api.get('/alerts/active');
      
      const regionsList = response.data.ranked_list.map(d => ({
        ...d,
        score: d.risk_score * 100,
        level: d.risk_level
      }));
      setData(regionsList);
      setAlerts(alertsResponse.data.alerts || []);
      
      // Layer 5: Lightweight Caching Layer
      if (cacheEnabled) {
        localStorage.setItem('gasha_cache_overview', JSON.stringify(regionsList));
        localStorage.setItem('gasha_cache_alerts', JSON.stringify(alertsResponse.data.alerts));
        localStorage.setItem('gasha_cache_ts', Date.now());
      }

      const paramRegion = searchParams.get('region');
      if (paramRegion) {
         const target = regionsList.find(r => r.region === paramRegion);
         if (target) handleRegionSelect(target);
      } else if (regionsList.length > 0 && !selectedRegion) {
         handleRegionSelect(regionsList[0]);
      }
    } catch (err) {
      console.error(err);
      
      // Cache Fallback
      const cachedData = localStorage.getItem('gasha_cache_overview');
      if (cachedData && cacheEnabled) {
         setData(JSON.parse(cachedData));
         setAlerts(JSON.parse(localStorage.getItem('gasha_cache_alerts') || '[]'));
         setError("Operating on Cached Intelligence (Offline Mode)");
      } else {
         setError("API Connection Paused. Displaying Last Known Data (Demo Override).");
      }
    } finally {
      setTimeout(() => setLoading(false), 500); // 500ms debounce
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const criticalCount = data?.length ? data.filter(d => d.level === 'CRITICAL').length : 0;
  const highCount = data?.length ? data.filter(d => d.level === 'HIGH').length : 0;
  const medCount = data?.length ? data.filter(d => d.level === 'MEDIUM').length : 0;
  const lowCount = data?.length ? data.filter(d => d.level === 'LOW').length : 0;
  const totalRegions = data?.length || 1;

  const getInsightSummary = (intel) => {
     if (!intel) return "";
     const score = intel.risk_score;
     const prefix = score >= 0.8 ? "Critical conditions are imminent" : score >= 0.6 ? "Risk indices are rising" : score >= 0.3 ? "Conditions are fluctuating" : "The region is stable";
     const driverText = intel.drivers && intel.drivers.length > 0 && intel.drivers[0] !== "stable baseline indicators"
        ? ` driven by ${intel.drivers.join(' and ')}.`
        : ".";
     return `${prefix}${driverText}`;
  };

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-screen-2xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="h-24 bg-slate-800 rounded-2xl w-full border border-white/5" />
        
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
           <div className="h-24 bg-slate-800 rounded-2xl w-full border border-white/5" />
           <div className="h-24 bg-slate-800 rounded-2xl w-full border border-white/5" />
           <div className="h-24 bg-slate-800 rounded-2xl w-full border border-white/5" />
           <div className="h-24 bg-slate-800 rounded-2xl w-full border border-white/5" />
        </div>

        {/* Global Overview Skeleton */}
        <div className="h-12 bg-slate-800 rounded-xl w-full border border-white/5" />

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
           <div className="lg:col-span-2 bg-slate-800 rounded-2xl w-full border border-white/5 min-h-[500px]" />
           <div className="space-y-6 flex flex-col">
              <div className="h-32 bg-slate-800 rounded-2xl w-full border border-white/5" />
              <div className="flex-grow bg-slate-800 rounded-2xl w-full border border-white/5" />
           </div>
        </div>
      </div>
    );
  }

  const filteredData = data
    .filter(d => d.score >= minRiskFilter)
    .sort((a, b) => {
        if (sortOrder === 'risk') return b.score - a.score;
        if (sortOrder === 'momentum') return (b.score % 10) - (a.score % 10);
        if (sortOrder === 'alerts') return (alerts.filter(al => al.region === b.region).length) - (alerts.filter(al => al.region === a.region).length);
        return 0;
    });

  // Layer 5 Logic: Risk Momentum & Priority Queue
  const getMomentum = (region) => {
    // Deterministic pseudo-momentum based on score parity
    const val = (region.score % 10);
    if (val > 7) return { label: 'Increasing Rapidly', color: 'text-red-500', icon: <TrendingUp className="w-3 h-3" /> };
    if (val < 3) return { label: 'Declining', color: 'text-emerald-500', icon: <ChevronDown className="w-3 h-3" /> };
    return { label: 'Stable', color: 'text-slate-500', icon: <Activity className="w-3 h-3" /> };
  };

  const priorityQueue = [...data]
    .sort((a, b) => {
      const aAlert = alerts.find(al => al.region === a.region)?.alert_level === 'CRITICAL' ? 100 : 0;
      const bAlert = alerts.find(al => al.region === b.region)?.alert_level === 'CRITICAL' ? 100 : 0;
      return (b.score + bAlert) - (a.score + aAlert);
    })
    .slice(0, 5);

  const getFactorBreakdown = (score) => {
    // Derived breakdown based on score magnitude
    return {
      climate: Math.round(score * 0.4),
      food: Math.round(score * 0.3),
      conflict: Math.round(score * 0.2),
      health: Math.round(score * 0.1)
    };
  };

  // Focus Mode override renders only the intelligence pane
  if (focusMode && intelligence) {
     return (
        <div className="min-h-screen p-4 md:p-6 flex flex-col gap-4 max-w-[800px] mx-auto bg-[#0a0a0c]">
           <button onClick={() => setFocusMode(false)} className="self-start text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-4 hover:underline">← Exit Focus Mode</button>
           <h2 className="text-3xl font-black text-default uppercase tracking-widest">{intelligence.region}</h2>
           <p className="text-xs text-muted mb-4">{getInsightSummary(intelligence)}</p>
           <div className="h-64 mb-6"><RiskChart region={{...intelligence, score: intelligence.risk_score * 100}} /></div>
           <ReportEngine regions={data} selectedRegion={intelligence} />
           <ScenarioSimulator 
              regionName={intelligence.region} 
              apiBase={API_BASE_URL}
              onSimulateResult={(res) => setIntelligence({...intelligence, risk_score: res.simulated_risk})}
              onReset={() => fetchIntelligence(intelligence.region)}
            />
        </div>
     );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-4 md:gap-6 max-w-screen-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 glass-card gap-4 relative z-[2100] transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col gap-1.5">
           <div className="text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="text-slate-500">Home</span>
              <span className="text-slate-700">/</span>
              <span className="text-slate-500">{user?.role?.replace('_', ' ')}</span>
              <span className="text-slate-700">/</span>
              <span className="text-default">Dashboard</span>
              {selectedRegion && (
                 <>
                   <span className="text-slate-700">/</span>
                   <span className="text-primary truncate max-w-[150px] md:max-w-none block">{selectedRegion.region}</span>
                 </>
              )}
           </div>
           <div className="flex items-center gap-3">
             <Globe className="text-primary w-8 h-8" />
             <h1 className="text-xl md:text-3xl font-black text-default">EARLY<span className="text-primary">GASHA</span></h1>
           </div>
        </div>
         <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
           <ThemeToggle />
           <button 
             onClick={() => setCompareMode(!compareMode)}
             className={`px-3 py-2 text-xs md:text-sm rounded-xl font-bold flex items-center gap-2 transition-all ${
               compareMode ? 'bg-emerald-600 text-white animate-pulse' : 'bg-element border border-edge text-muted hover:text-default'
             }`}
           >
             <Columns className="w-4 h-4" />
             <span className="hidden sm:inline">Benchmark</span>
           </button>
           <button 
             onClick={() => setSimplifiedMode(!simplifiedMode)}
             className={`px-3 py-2 text-xs md:text-sm rounded-xl font-bold transition-all ${
               simplifiedMode ? 'bg-blue-600 text-white' : 'bg-element border border-edge text-muted hover:text-default'
             }`}
           >
             <span className="hidden sm:inline">Map:</span> {simplifiedMode ? 'Calm' : 'Full'}
           </button>
           <button 
             onClick={() => setDemoLock(!demoLock)}
             className={`px-3 py-2 text-xs md:text-sm rounded-xl font-bold transition-all ${
               demoLock ? 'bg-amber-500 text-black animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-element border border-edge text-muted hover:text-default'
             }`}
           >
             {demoLock ? 'SYSTEM FROZEN' : 'DEMO UNLOCKED'}
           </button>
              <button 
                onClick={() => handleSetViewMode(viewMode === 'map' ? 'grid' : 'map')}
                className="px-3 py-2 text-xs md:text-sm rounded-xl font-bold transition-all bg-element border border-edge text-muted hover:text-default"
              >
                <span className="hidden sm:inline">View: </span> {viewMode === 'map' ? 'Grid' : 'Map'}
              </button>
              
              {/* Layer 5: Time Range Selector */}
              <div className="hidden lg:flex items-center bg-slate-900 border border-edge rounded-xl px-2 h-[38px]">
                 <HistoryIcon size={14} className="text-muted mr-2" />
                 <select className="bg-transparent text-[10px] font-black uppercase text-default focus:outline-none cursor-pointer">
                    <option>Last 7 Days</option>
                    <option>Last 14 Days</option>
                    <option>Last 30 Days</option>
                 </select>
              </div>

              <button onClick={fetchData} disabled={demoLock} className={`p-2 rounded-xl border transition-colors ${demoLock ? 'border-red-500/20 text-red-500/50 cursor-not-allowed opacity-50 bg-red-500/5' : 'bg-element hover:bg-element-hover border-edge text-muted'}`}>
               <RefreshCcw className={loading ? 'animate-spin' : ''} />
             </button>
             <ReportEngine regions={data} selectedRegion={selectedRegion} />
            {user?.role === 'system_admin' && (
              <button 
                onClick={() => navigate('/admin')}
                className="p-2 ml-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors"
                title="Admin Sandbox"
              >
                <Monitor className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => navigate('/comm')}
              className="p-2 ml-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl transition-all"
              title="Crisis Communication Hub"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/toolkit')}
              className="p-2 ml-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-xl transition-all"
              title="Resilience Toolkit"
            >
              <Shield className="w-4 h-4" />
            </button>
             <button 
               onClick={() => setProfileOpen(true)}
               className="p-2 ml-2 bg-element hover:bg-element-hover border border-edge text-muted hover:text-default rounded-xl transition-all"
               title="Identity Matrix"
             >
               <User className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setSummaryOpen(true)}
               className="p-2 ml-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-xl transition-all"
               title="Operational Summary Report"
             >
               <FileText className="w-4 h-4" />
             </button>
            <button 
              onClick={() => { logout(); navigate("/login"); }}
             className="p-2 ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl transition-colors"
             title="Terminate Link"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </header>

      {summaryOpen && (
        <OperationalSummary 
          role="institutional_user" 
          data={{ intelligence, data, alerts, selectedRegion }} 
          onClose={() => setSummaryOpen(false)} 
        />
      )}

      {/* Layer 5: Quick Jump & Priority Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-element border border-edge p-3 rounded-2xl">
         <div className="flex items-center gap-2 group flex-grow md:flex-initial">
            <ListFilter size={14} className="text-primary group-hover:rotate-180 transition-transform" />
            <select 
              onChange={(e) => {
                const target = data.find(r => r.region === e.target.value);
                if (target) handleRegionSelect(target);
              }}
              className="bg-transparent text-xs font-bold text-default focus:outline-none cursor-pointer"
            >
               <option value="">Quick Jump to Region...</option>
               {data.map(r => <option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
         </div>
         <div className="h-4 w-px bg-edge hidden md:block"></div>
         <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-black uppercase text-muted tracking-widest whitespace-nowrap">Priority Queue:</span>
            {priorityQueue.map(p => (
              <button 
                key={p.region}
                onClick={() => handleRegionSelect(p)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg border border-edge text-[10px] font-bold hover:border-primary transition-all whitespace-nowrap ${selectedRegion?.region === p.region ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-900 text-slate-400'}`}
              >
                 {p.region}
                 <span className={p.score > 70 ? 'text-red-500' : 'text-orange-500'}>{p.score.toFixed(0)}%</span>
              </button>
            ))}
         </div>
      </div>

      <CommandBriefing />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <MetricCard title="Critical" value={criticalCount} icon={<ShieldAlert className="text-red-500 w-4 md:w-6 h-4 md:h-6"/>} color="border-red-500/20" />
        <MetricCard title="High Risk" value={highCount} icon={<Activity className="text-orange-500 w-4 md:w-6 h-4 md:h-6"/>} color="border-orange-500/20" />
        <MetricCard title="Monitored" value={data.length} icon={<MapIcon className="text-primary w-4 md:w-6 h-4 md:h-6"/>} color="border-blue-500/20" />
        <MetricCard title="Avg Index" value={data.length ? (data.reduce((a,c)=>a+c.score,0)/data.length).toFixed(1) : 0} icon={<TrendingUp className="text-emerald-400 w-4 md:w-6 h-4 md:h-6"/>} color="border-emerald-500/20" />
      </div>

      {/* Risk Distribution View */}
      <div className="glass-card p-3 rounded-xl flex items-center gap-4 text-xs font-bold text-muted border-white/5">
         <span className="shrink-0"><Activity size={14} className="inline mr-1 text-primary" /> Global Distribution Profile</span>
         <div className="flex-grow h-2 rounded-full overflow-hidden flex bg-element border border-edge">
            <div style={{width: `${(criticalCount/totalRegions)*100}%`}} className="h-full bg-red-500 hover:opacity-80 transition-opacity" title={`CRITICAL: ${criticalCount}`}></div>
            <div style={{width: `${(highCount/totalRegions)*100}%`}} className="h-full bg-orange-500 hover:opacity-80 transition-opacity" title={`HIGH: ${highCount}`}></div>
            <div style={{width: `${(medCount/totalRegions)*100}%`}} className="h-full bg-amber-500 hover:opacity-80 transition-opacity" title={`MEDIUM: ${medCount}`}></div>
            <div style={{width: `${(lowCount/totalRegions)*100}%`}} className="h-full bg-emerald-500 hover:opacity-80 transition-opacity" title={`LOW: ${lowCount}`}></div>
         </div>
         <div className="shrink-0 flex gap-2">
            <span className="text-red-500">{Math.round((criticalCount/totalRegions)*100)}% CRT</span>
            <span className="text-emerald-500">{Math.round((lowCount/totalRegions)*100)}% LOW</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col relative min-h-[400px] md:min-h-[500px] transition-all duration-300 hover:shadow-lg overflow-hidden">
          
          <div className="p-4 border-b border-edge flex flex-wrap gap-4 items-center justify-between bg-element/30">
              <div className="flex flex-col gap-1">
                 <div className="flex bg-slate-900 border border-edge p-1 rounded-lg w-max">
                     {['current', '7_days', '14_days'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setTimeHorizon(t)}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${timeHorizon === t ? 'bg-primary text-white' : 'text-slate-500 hover:text-default'}`}
                        >
                           {t === 'current' ? 'Now' : t.replace('_', ' ')}
                        </button>
                     ))}
                 </div>
                 {selectedRegion && (
                   <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight ${getMomentum(selectedRegion).color}`}>
                      {getMomentum(selectedRegion).icon}
                      Momentum: {getMomentum(selectedRegion).label}
                   </div>
                 )}
              </div>
             
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <ListFilter size={14} className="text-muted" />
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-transparent text-[10px] font-black uppercase text-default focus:outline-none cursor-pointer">
                        <option value="risk">Sort: Severity</option>
                        <option value="momentum">Sort: Momentum</option>
                        <option value="alerts">Sort: Alert Count</option>
                    </select>
                 </div>
                 <div className="h-4 w-px bg-edge"></div>
                 <div className="flex items-center gap-3 w-40">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">Limit: {minRiskFilter}%</label>
                     <input type="range" min="0" max="100" value={minRiskFilter} onChange={(e) => handleSetMinRisk(e.target.value)} className="w-full h-1 bg-element rounded appearance-none cursor-pointer accent-primary" />
                 </div>
             </div>
          </div>

          <div className="flex-grow relative overflow-hidden">
             {viewMode === 'map' ? (
                <>
                  <div className="absolute top-4 left-4 z-[1000] glass px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-white/20">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-default drop-shadow-md">
                      {user?.role === 'community_user' ? 'Local Safety Map' : 'Live Risk Mapping'}
                    </h3>
                  </div>
          <div className="absolute top-4 right-4 z-[1000] flex gap-2">
			{alerts.some(a => a.alert_level === 'CRITICAL') && !simplifiedMode && (
				<span className="glass bg-red-500/20 text-red-500 border border-red-500 px-3 py-1.5 rounded-lg text-xs font-black animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]">
				CRITICAL ZONE ACTIVE
				</span>
			)}
          </div>
          <RiskMap data={filteredData} alerts={alerts} simplifiedMode={simplifiedMode || user?.role === 'community_user'} onRegionSelect={handleRegionSelect} />
          
          {user?.role !== 'community_user' && (
            <div className="absolute bottom-0 left-0 right-0 z-[1000] border-t border-edge bg-element/80 backdrop-blur-md">
              <IntelligenceFeed data={filteredData} />
            </div>
          )}
          </>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto absolute inset-0">
             {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                 <div key={level} className="space-y-2">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest border-b border-edge pb-2 ${level === 'CRITICAL' ? 'text-red-500' : level === 'HIGH' ? 'text-orange-500' : level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'}`}>{level} CLUSTER</h4>
                     {filteredData.filter(d => d.level === level).map(d => (
                        <div key={d.region} onClick={() => handleRegionSelect(d)} className={`p-3 bg-element border rounded-xl cursor-pointer hover:bg-slate-800 transition-all ${selectedRegion?.region === d.region ? 'border-primary ring-1 ring-primary/20' : 'border-edge'}`}>
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold uppercase">{d.region}</span>
                              <span className={`text-[9px] font-black ${getMomentum(d).color}`}>{getMomentum(d).icon}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <p className="text-[10px] text-muted">{d.score.toFixed(0)}% Risk Index</p>
                              {alerts.filter(al => al.region === d.region).length > 0 && (
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              )}
                           </div>
                        </div>
                     ))}
                 </div>
             ))}
          </div>
        )}
      </div></div>

        <div className="glass-card p-4 md:p-6 rounded-2xl flex-col flex overflow-hidden">
           {user?.role === 'community_user' ? (
             <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                    <ShieldAlert size={16} /> Community Guidance
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This dashboard provides simplified alerts for your safety. Always follow local authority instructions during critical events.
                  </p>
                </div>
                
                <div className="border-t border-edge pt-4">
                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Active Safety Warnings</h5>
                    {alerts.length > 0 ? (
                      <div className="space-y-2">
                        {alerts.map((a, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${a.alert_level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                            <p className="font-bold text-xs uppercase">{a.region}: {a.alert_level}</p>
                            <p className="text-[10px] opacity-80 mt-1">{a.message || 'Stay alert and monitor conditions.'}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-muted">All monitored regions report stable conditions.</p>}
                </div>
             </div>
           ) : (
             <>
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg md:text-xl text-default font-bold flex items-center gap-2">
                   <TrendingUp className="text-primary w-5 h-5" />
                   Intelligence Details
                 </h3>
                 <button onClick={() => setFocusMode(true)} className="px-2 py-1 bg-element border border-edge rounded text-[9px] uppercase font-bold text-blue-500 hover:bg-blue-500/10">Focus</button>
               </div>
               
               {intelligence ? (
                 <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                       <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">{intelligence.region}</p>
                          <button 
                             onClick={() => toggleBookmark(intelligence.region)}
                             className={`p-1.5 rounded-lg border transition-all ${bookmarks.includes(intelligence.region) ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-element text-muted border-edge hover:text-default'}`}
                             title="Toggle Mission Watchlist"
                          >
                             <Bookmark size={14} className={bookmarks.includes(intelligence.region) ? 'fill-amber-500' : ''} />
                          </button>
                       </div>
                       
                       <div className="mt-2 p-3 bg-element border border-edge rounded-lg flex gap-3 items-start">
                          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                              {getInsightSummary(intelligence)}
                            </p>
                            <div className="flex gap-2 isolate pt-1">
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-sm ${intelligence.risk_score > 0.8 ? 'bg-red-500' : intelligence.risk_score > 0.4 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                                  {intelligence.risk_score > 0.8 ? 'Volatile Pattern' : intelligence.risk_score > 0.4 ? 'Rapid Escalation' : 'Stable Low Risk'}
                               </span>
                            </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="h-48 border-b border-white/5 pb-4">
                       <RiskChart region={{...intelligence, score: intelligence.risk_score * 100}} />
                    </div>
                    
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Risk Signal Variance</h5>
                        <SignalMetric label="Climate" value={intelligence?.features?.climate ? Object.values(intelligence.features.climate).reduce((a,b)=>a+b,0)/3 : 0} />
                        <SignalMetric label="Food Security" value={intelligence?.features?.food ? Object.values(intelligence.features.food).reduce((a,b)=>a+b,0)/3 : 0} />
                        <SignalMetric label="Conflict Security" value={intelligence?.features?.conflict ? Object.values(intelligence.features.conflict).reduce((a,b)=>a+b,0)/3 : 0} />
                    </div>

                    {/* Layer 5: Multi-Factor Risk Breakdown */}
                    <div className="glass-card p-4 rounded-2xl border-white/5 bg-white/5">
                        <div className="flex justify-between items-center mb-3">
                           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                              <Layers size={14} className="text-primary" /> Contributing Vectors
                           </h3>
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                              <Database size={10} className="text-emerald-500" />
                              <span className="text-[8px] font-bold text-emerald-500 uppercase">Synchronized</span>
                           </div>
                        </div>
                        <div className="space-y-3">
                           {Object.entries(getFactorBreakdown(intelligence.risk_score * 100)).map(([factor, val]) => (
                             <div key={factor} className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold uppercase">
                                   <span className="text-muted">{factor}</span>
                                   <span className="text-default">{val}% Contribution</span>
                                </div>
                                <div className="w-full h-1 bg-element rounded-full overflow-hidden border border-edge">
                                   <div 
                                     className={`h-full transition-all duration-1000 ${
                                       factor === 'climate' ? 'bg-blue-500' : 
                                       factor === 'food' ? 'bg-amber-500' : 
                                       factor === 'conflict' ? 'bg-red-500' : 'bg-emerald-500'
                                     }`} 
                                     style={{ width: `${(val / (intelligence.risk_score * 100)) * 100}%` }}
                                   ></div>
                                </div>
                             </div>
                           ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h5 className="text-[10px] font-black uppercase text-secondary tracking-widest flex items-center gap-2">
                           <Activity className="w-3 h-3" /> Regional Forecast Matrix (14D)
                        </h5>
                        <div className="grid grid-cols-2 gap-3">
                           {intelligence?.forecast && Object.entries(intelligence.forecast).map(([day, val]) => (
                             <div key={day} className="p-3 bg-element border border-edge rounded-lg flex flex-col gap-1">
                                <span className="text-[9px] text-muted font-bold uppercase">{day.replace('_', ' ')}</span>
                                <div className="flex justify-between items-end">
                                   <span className={`text-base font-black ${val > 0.7 ? 'text-red-500' : val > 0.4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {(val * 100).toFixed(0)}%
                                   </span>
                                   <span className="text-[8px] text-slate-500 font-bold mb-1">PROBABILITY</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className={`h-full ${val > 0.7 ? 'bg-red-500' : val > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${val * 100}%` }}></div>
                                </div>
                             </div>
                           ))}
                        </div>
                    </div>
    
                    <div className="border-t border-edge pt-4 mt-2">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Live Risk Alerts</h5>
                        {alerts.length > 0 ? <AlertPanel alerts={alerts} /> : <p className="text-xs text-muted">No active anomalous alerts globally.</p>}
                    </div>
    
                    {!demoLock ? (
                        <ScenarioSimulator 
                          regionName={intelligence.region} 
                          apiBase={API_BASE_URL}
                          onSimulateResult={(res) => {
                            setData(prev => prev.map(r => 
                              r.region === res.region 
                                ? { ...r, score: res.simulated_risk * 100, level: res.risk_level } 
                                : r
                            ));
                          }}
                          onReset={(regionName) => {
                            fetchData();
                          }}
                        />
                    ) : (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500/80 text-xs font-bold uppercase tracking-widest flex items-center justify-center">
                            <Activity className="w-4 h-4 mr-2" /> Simulator locked during demo sync
                        </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center flex-grow text-muted opacity-50">
                   <Globe className="w-12 h-12 animate-pulse mb-4" />
                   <p className="text-sm font-medium">Select a region to analyze intelligence</p>
                 </div>
               )}
             </>
           )}
        </div>
      </div>
      <ChatBot />
      {compareMode && (
        <ComparisonPanel 
          main={intelligence} 
          compare={compareIntelligence} 
          onClose={() => setCompareMode(false)} 
        />
      )}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

// Extracted SignalMetric
const SignalMetric = ({ label, value = 0 }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-bold uppercase">
      <span className="text-muted">{label}</span>
      <span className="text-default">{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="h-1.5 w-full bg-element border border-edge rounded-full overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${value * 100}%` }}></div>
    </div>
  </div>
);

const getFactorBreakdown = (totalRisk) => {
  // Mock logic to distribute the risk score into factors
  // In a real app, this would come from the API
  return {
     climate: (totalRisk * 0.4).toFixed(1),
     food: (totalRisk * 0.3).toFixed(1),
     conflict: (totalRisk * 0.2).toFixed(1),
     health: (totalRisk * 0.1).toFixed(1)
  };
};
