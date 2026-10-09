import React, { useState, useEffect } from 'react';
import { ShieldAlert, Globe, Activity, Map as MapIcon, RefreshCcw, TrendingUp, Columns, LogOut, Monitor, User, Bookmark, Info, ChevronUp, ChevronDown, ListFilter, Zap, ArrowRight, Layers, History as HistoryIcon, Database, FileText, Shield, MessageSquare } from 'lucide-react';
import RiskMap from '../components/RiskMap';
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
  const [boundaries, setBoundaries] = useState(null);
  const [observedAt, setObservedAt] = useState(null);
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // New Functional Controls State (URL Synchronized)
  const [minRiskFilter, setMinRiskFilter] = useState(() => parseInt(searchParams.get('min_risk') || localStorage.getItem('gasha_min_risk') || "0"));
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || localStorage.getItem('gasha_view') || 'map');
  const [sortOrder, setSortOrder] = useState('risk');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
     const params = new URLSearchParams(searchParams);
     params.set('min_risk', minRiskFilter);
     params.set('view', viewMode);
     if (selectedRegion?.region) params.set('region', selectedRegion.region);
     setSearchParams(params, { replace: true });
  }, [minRiskFilter, viewMode, selectedRegion]);

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
      setObservedAt(response.data.observed_at || null);
      
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
    const intervalId = window.setInterval(fetchData, 5 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.get('/ethiopia/boundaries')
      .then((response) => {
        if (isMounted) setBoundaries(response.data);
      })
      .catch((err) => console.error('Unable to load Ethiopia boundaries:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const criticalCount = data?.length ? data.filter(d => d.level === 'CRITICAL').length : 0;
  const highCount = data?.length ? data.filter(d => d.level === 'HIGH').length : 0;
  const medCount = data?.length ? data.filter(d => d.level === 'MEDIUM').length : 0;
  const lowCount = data?.length ? data.filter(d => d.level === 'LOW').length : 0;
  const totalRegions = data?.length || 0;

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
        if (sortOrder === 'name') return a.region.localeCompare(b.region);
        if (sortOrder === 'temperature') return (b.observations?.temperature_c ?? -Infinity) - (a.observations?.temperature_c ?? -Infinity);
        return b.score - a.score;
    });

  const priorityQueue = [...data]
    .sort((a, b) => {
      const aAlert = alerts.find(al => al.region === a.region)?.alert_level === 'CRITICAL' ? 100 : 0;
      const bAlert = alerts.find(al => al.region === b.region)?.alert_level === 'CRITICAL' ? 100 : 0;
      return (b.score + bAlert) - (a.score + aAlert);
    })
    .slice(0, 5);

  const selectedOverviewRegion = data.find((region) => region.region === intelligence?.region);

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-4 md:gap-6 max-w-screen-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-4 py-3 glass-card gap-4 relative z-[2100]">
        <div className="flex items-center gap-3">
          <Globe className="text-primary w-6 h-6" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-default">EarlyGasha</h1>
              <span className="border-l border-edge pl-2 text-sm text-muted">Ethiopia</span>
            </div>
            <p className="text-xs text-muted">Regional early-warning monitoring</p>
          </div>
        </div>
         <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
           <ThemeToggle />
           <button 
             onClick={() => setCompareMode(!compareMode)}
             aria-pressed={compareMode}
             className={`px-3 py-2 text-xs md:text-sm rounded-md font-medium flex items-center gap-2 transition-all ${
               compareMode ? 'bg-emerald-600 text-white animate-pulse' : 'bg-element border border-edge text-muted hover:text-default'
             }`}
           >
             <Columns className="w-4 h-4" />
             <span className="hidden sm:inline">Compare regions</span>
           </button>
           <button 
             onClick={() => setSimplifiedMode(!simplifiedMode)}
             aria-pressed={simplifiedMode}
             className={`px-3 py-2 text-xs md:text-sm rounded-md font-medium transition-all ${
               simplifiedMode ? 'bg-blue-600 text-white' : 'bg-element border border-edge text-muted hover:text-default'
             }`}
           >
             <span className="hidden sm:inline">Alert highlights:</span> {simplifiedMode ? 'Off' : 'On'}
           </button>
              <button 
                onClick={() => handleSetViewMode(viewMode === 'map' ? 'grid' : 'map')}
                className="px-3 py-2 text-xs md:text-sm rounded-md font-medium transition-all bg-element border border-edge text-muted hover:text-default"
              >
                {viewMode === 'map' ? 'List view' : 'Map view'}
              </button>
              <button onClick={fetchData} className="p-2 rounded-md border border-edge bg-element text-muted hover:text-default" title="Refresh monitoring data" aria-label="Refresh monitoring data">
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
            <ListFilter size={14} className="text-primary" />
            <select 
              onChange={(e) => {
                const target = data.find(r => r.region === e.target.value);
                if (target) handleRegionSelect(target);
              }}
              className="bg-transparent text-xs font-bold text-default focus:outline-none cursor-pointer"
            >
              <option value="">Select a region...</option>
               {data.map(r => <option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
         </div>
         <div className="h-4 w-px bg-edge hidden md:block"></div>
         <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-medium text-muted whitespace-nowrap">Highest screening scores</span>
            {priorityQueue.map(p => (
              <button 
                key={p.region}
                onClick={() => handleRegionSelect(p)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-edge text-xs font-medium hover:border-primary transition-all whitespace-nowrap ${selectedRegion?.region === p.region ? 'bg-primary/10 border-primary text-primary' : 'bg-element text-muted'}`}
              >
                 {p.region}
                 <span className="text-default">{p.score.toFixed(0)}%</span>
              </button>
            ))}
         </div>
      </div>

      <CommandBriefing />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <MetricCard title="Critical regions" value={criticalCount} icon={<ShieldAlert className="text-red-500 w-4 md:w-6 h-4 md:h-6"/>} color="border-red-500/30" />
        <MetricCard title="High-risk regions" value={highCount} icon={<Activity className="text-orange-500 w-4 md:w-6 h-4 md:h-6"/>} color="border-orange-500/30" />
        <MetricCard title="Regions monitored" value={data.length} icon={<MapIcon className="text-primary w-4 md:w-6 h-4 md:h-6"/>} color="border-primary/30" />
        <MetricCard title="Average risk score" value={data.length ? (data.reduce((a,c)=>a+c.score,0)/data.length).toFixed(1) : 0} unit="%" icon={<TrendingUp className="text-primary w-4 md:w-6 h-4 md:h-6"/>} color="border-primary/30" />
      </div>

      {/* Risk Distribution View */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-4 text-xs font-medium text-muted">
        <span className="shrink-0"><Activity size={14} className="inline mr-1 text-primary" /> Ethiopia risk distribution</span>
         <div className="flex-grow h-2 rounded-full overflow-hidden flex bg-element border border-edge">
          <div style={{width: `${totalRegions ? (criticalCount/totalRegions)*100 : 0}%`}} className="h-full bg-red-500" title={`Critical: ${criticalCount}`}></div>
          <div style={{width: `${totalRegions ? (highCount/totalRegions)*100 : 0}%`}} className="h-full bg-orange-500" title={`High: ${highCount}`}></div>
          <div style={{width: `${totalRegions ? (medCount/totalRegions)*100 : 0}%`}} className="h-full bg-amber-500" title={`Medium: ${medCount}`}></div>
          <div style={{width: `${totalRegions ? (lowCount/totalRegions)*100 : 0}%`}} className="h-full bg-emerald-500" title={`Low: ${lowCount}`}></div>
         </div>
         <div className="shrink-0 flex gap-2">
            <span className="text-red-600">Critical {totalRegions ? Math.round((criticalCount/totalRegions)*100) : 0}%</span>
            <span className="text-emerald-700">Low {totalRegions ? Math.round((lowCount/totalRegions)*100) : 0}%</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
        <div className="lg:col-span-2 glass-card rounded-lg flex flex-col relative min-h-[400px] md:min-h-[500px] overflow-hidden">
          
          <div className="p-4 border-b border-edge flex flex-wrap gap-4 items-center justify-between bg-element/30">
                <div>
                 <h2 className="text-sm font-semibold text-default">Regional conditions</h2>
                 <p className="mt-1 text-xs text-muted">Sort and filter current weather screening</p>
                </div>
             
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <ListFilter size={14} className="text-muted" />
                    <select aria-label="Sort regions" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-transparent text-xs font-medium text-default focus:outline-none cursor-pointer">
                      <option value="risk">Highest risk</option>
                      <option value="temperature">Highest temperature</option>
                      <option value="name">Region name</option>
                    </select>
                 </div>
                 <div className="h-4 w-px bg-edge"></div>
                 <div className="flex items-center gap-3 w-40">
                     <label className="text-xs text-muted shrink-0">Minimum risk: {minRiskFilter}%</label>
                     <input type="range" min="0" max="100" value={minRiskFilter} onChange={(e) => handleSetMinRisk(e.target.value)} className="w-full h-1 bg-element rounded appearance-none cursor-pointer accent-primary" />
                 </div>
             </div>
          </div>

          <div className="flex-grow relative overflow-hidden">
             {viewMode === 'map' ? (
                <>
                  <div className="absolute top-4 left-4 z-[1000] glass px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-white/20">
                    <h3 className="text-sm font-semibold text-default">
                      Ethiopia regional map
                    </h3>
                    <p className="mt-1 text-[10px] text-muted">
                      Open-Meteo{observedAt ? ` · updated ${new Date(observedAt).toLocaleTimeString()}` : ' · waiting for first observation'}
                    </p>
                  </div>
          <div className="absolute top-4 right-4 z-[1000] flex gap-2">
			{alerts.some(a => a.alert_level === 'CRITICAL') && !simplifiedMode && (
				<span className="glass bg-red-500/20 text-red-500 border border-red-500 px-3 py-1.5 rounded-lg text-xs font-black animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]">
				CRITICAL ZONE ACTIVE
				</span>
			)}
          </div>
          <RiskMap data={filteredData} alerts={alerts} boundaries={boundaries} simplifiedMode={simplifiedMode || user?.role === 'community_user'} onRegionSelect={handleRegionSelect} />
          
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
                              <span className="text-sm font-medium">{d.region}</span>
                              <span className="text-xs text-muted">{d.level}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <p className="text-xs text-muted">{d.score.toFixed(0)}% screening score</p>
                              {d.observations?.temperature_c != null && <p className="text-xs text-muted">{d.observations.temperature_c.toFixed(1)} C</p>}
                              {alerts.filter(al => al.region === d.region).length > 0 && (
                                 <span className="text-xs text-red-700">Active alert</span>
                              )}
                           </div>
                        </div>
                     ))}
                 </div>
             ))}
          </div>
        )}
      </div></div>

                 <div className="glass-card p-4 md:p-5 rounded-lg flex-col flex overflow-hidden">
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
                 <h3 className="text-base text-default font-semibold flex items-center gap-2">
                   <MapIcon className="text-primary w-4 h-4" />
                   Region details
                 </h3>
                 {intelligence && <span className="text-xs text-muted">Current screening</span>}
               </div>
               
               {intelligence ? (
                 <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                      <div className="p-4 bg-element rounded-md border border-edge">
                       <div className="flex justify-between items-start mb-1">
                          <div>
                           <p className="text-base text-default font-semibold">{intelligence.region}</p>
                           <p className="mt-1 text-xs text-muted">Risk screening score</p>
                          </div>
                          <button 
                             onClick={() => toggleBookmark(intelligence.region)}
                            className={`p-1.5 rounded border transition-all ${bookmarks.includes(intelligence.region) ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' : 'bg-element text-muted border-edge hover:text-default'}`}
                            title="Save region"
                            aria-label={bookmarks.includes(intelligence.region) ? 'Remove saved region' : 'Save region'}
                          >
                             <Bookmark size={14} className={bookmarks.includes(intelligence.region) ? 'fill-amber-500' : ''} />
                          </button>
                       </div>
                        <div className="mt-3 flex items-baseline gap-2">
                         <span className="text-3xl font-semibold text-default">{(intelligence.risk_score * 100).toFixed(0)}%</span>
                         <span className={`text-xs font-medium ${intelligence.risk_level === 'CRITICAL' ? 'text-red-700' : intelligence.risk_level === 'HIGH' ? 'text-orange-700' : intelligence.risk_level === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {intelligence.risk_level} screening
                         </span>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-muted">{getInsightSummary(intelligence)}</p>
                    </div>

                      <section>
                       <h4 className="text-sm font-semibold text-default">Current weather</h4>
                       <p className="mt-1 text-xs text-muted">Source: Open-Meteo</p>
                       <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-edge bg-edge">
                        {[
                          ['Temperature', selectedOverviewRegion?.observations?.temperature_c, 'C'],
                          ['Rainfall (7 days)', selectedOverviewRegion?.observations?.rainfall_7d_mm, 'mm'],
                          ['Humidity', selectedOverviewRegion?.observations?.humidity_percent, '%'],
                          ['Wind speed', selectedOverviewRegion?.observations?.wind_speed_kmh, 'km/h'],
                        ].map(([label, value, unit]) => (
                          <div key={label} className="bg-element p-3">
                           <dt className="text-xs text-muted">{label}</dt>
                           <dd className="mt-1 text-base font-medium text-default">{value == null ? 'Not available' : `${Number(value).toFixed(1)} ${unit}`}</dd>
                          </div>
                        ))}
                       </dl>
                       <p className="mt-2 text-xs text-muted">
                        Observed {selectedOverviewRegion?.observed_at ? new Date(selectedOverviewRegion.observed_at).toLocaleString() : 'time not available'}
                       </p>
                      </section>

                      <section>
                       <h4 className="text-sm font-semibold text-default">Screening drivers</h4>
                       <ul className="mt-2 space-y-2 text-sm text-muted">
                        {intelligence.drivers?.map((driver) => <li key={driver}>{driver}</li>)}
                       </ul>
                      </section>
    
                    <div className="border-t border-edge pt-4 mt-2">
                        <h5 className="text-sm font-semibold text-default mb-3">Alerts</h5>
                        {alerts.some((alert) => alert.region === intelligence.region)
                          ? <AlertPanel alerts={alerts.filter((alert) => alert.region === intelligence.region)} />
                          : <p className="text-xs text-muted">No active alerts for this region.</p>}
                    </div>
    
                    <ScenarioSimulator
                          regionName={intelligence.region} 
                          apiBase={API_BASE_URL}
                        />
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center flex-grow text-muted opacity-50">
                   <Globe className="w-12 h-12 animate-pulse mb-4" />
                   <p className="text-sm font-medium">Select a region to view current weather and screening details.</p>
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
