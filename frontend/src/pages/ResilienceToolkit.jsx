import React, { useState, useEffect } from 'react';
import { Shield, BookOpen, Activity, Package, ArrowLeft, CheckCircle2, Play, ChevronRight, BarChart3, MapPin, AlertCircle, RefreshCcw, Download, Info, Globe as GlobeIcon, Plus, Save, X, MessageSquare, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../auth/api';

// --- Localized Dictionary ---
const translations = {
  en: {
    title: "RESILIENCE & PREPAREDNESS TOOLKIT",
    subtitle: "Strategic architecture for crisis mitigation and community fortification.",
    scorecard: "Scorecard",
    knowledge: "Knowledge Hub",
    simulations: "Simulation Drills",
    logistics: "Supply Planning",
    feedback: "Ground Feedback",
    manage: "Management",
    download: "Download for Offline",
    offline_success: "Resources synchronized for offline use.",
    start_sim: "Start AI-Drill",
    submit: "Submit Synchronization"
  },
  am: {
    title: "የመቋቋም እና የዝግጁነት መሳሪያ",
    subtitle: "ለችግር ቅነሳ እና ለማህበረሰብ ግንባታ ስትራቴጂካዊ ግንባታ።",
    scorecard: "ውጤት",
    knowledge: "የእውቀት ማዕከል",
    simulations: "የማስመሰል ልምምዶች",
    logistics: "የአቅርቦት እቅድ",
    feedback: "የመሬት ግብረመልስ",
    manage: "አስተዳደር",
    download: "ከመስመር ውጭ ለማውረድ",
    offline_success: "ሀብቶች ከመስመር ውጭ እንዲጠቀሙ ተመሳስለዋል።",
    start_sim: "የ AI ልምምድ ጀምር",
    submit: "ማመሳሰልን አስገባ"
  },
  om: {
    title: "MEESHA DANDEETTII FI QOPYII",
    subtitle: "Ijaarsa istraatigii hir'isuu rakkoo fi jabeessuun hawaasaa.",
    scorecard: "Kaardii Qabxii",
    knowledge: "Giddu-gala Beekkumsaa",
    simulations: "Shaakala Simulaashinii",
    logistics: "Karoora Dhiyeessii",
    feedback: "Yaada Ground",
    manage: "Bulchiinsa",
    download: "Offline Buufadhu",
    offline_success: "Qabeenya offline fayyadamuuf walsimsiifameera.",
    start_sim: "AI-Drill Jalqabi",
    submit: "Sync Ergi"
  }
};

const Card = ({ children, className = "" }) => (
  <div className={`glass-card p-6 overflow-hidden relative group transition-all hover:border-primary/50 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    primary: "bg-primary/20 text-primary border-primary/30",
    success: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    danger: "bg-red-500/20 text-red-500 border-red-500/30"
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${styles[variant]}`}>
      {children}
    </span>
  );
};

export default function ResilienceToolkit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState('index');
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [indexData, setIndexData] = useState(null);
  const [resources, setResources] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [logistics, setLogistics] = useState(null);
  
  // Management States
  const [showManageModal, setShowManageModal] = useState(false);
  const [simRunning, setSimRunning] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [activeDrill, setActiveDrill] = useState(null); // The wizard state
  const [drillStep, setDrillStep] = useState(0);
  const [drillChoices, setDrillChoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [readingResource, setReadingResource] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/overview');
        setRegions(res.data.ranked_list);
        if (res.data.ranked_list.length > 0) {
            setSelectedRegion(res.data.ranked_list[0].id);
        }
        
        const [trRes, simRes] = await Promise.all([
            api.get('/toolkit/training-resources'),
            api.get('/toolkit/simulation-scenarios')
        ]);
        setResources(trRes.data);
        setScenarios(simRes.data);
      } catch (err) {
        console.error("Toolkit hydration failure", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
        fetchRegionSpecificData();
    }
  }, [selectedRegion]);

  const fetchRegionSpecificData = async () => {
    try {
        const [idxRes, logRes] = await Promise.all([
            api.get(`/toolkit/resilience-index/${selectedRegion}`),
            api.get(`/toolkit/pre-positioning/${selectedRegion}`)
        ]);
        setIndexData(idxRes.data);
        setLogistics(logRes.data);
    } catch (err) {
        console.error("Contextual data fetch failed", err);
    }
  };

  const handleRunSimulation = (scenario) => {
    setActiveDrill(scenario);
    setDrillStep(0);
    setDrillChoices([]);
    setSimResult(null);
  };

  const handleDrillChoice = async (choice) => {
    const nextChoices = [...drillChoices, choice];
    setDrillChoices(nextChoices);
    
    if (drillStep < 2) {
        setDrillStep(drillStep + 1);
    } else {
        // Final Step: Evaluate
        setSimRunning(activeDrill.id);
        setDrillStep(3); // Result/Processing Step
        try {
            const res = await api.post(`/toolkit/operator/simulations/run/${activeDrill.id}`, { choices: nextChoices });
            setTimeout(() => {
                setSimResult(res.data);
                setSimRunning(null);
            }, 2500);
        } catch (err) {
            console.error("Simulation engine failure", err);
            setSimRunning(null);
        }
    }
  };

  const submitFeedback = async () => {
    try {
        await api.post('/toolkit/field/feedback', {
            region_id: selectedRegion,
            feedback_text: feedbackText
        });
        setFeedbackText("");
        alert("Feedback synchronized with tactical core.");
    } catch (err) {
        alert("Feedback transmission failed.");
    }
  };

  const downloadOffline = () => {
    const data = { resources, scenarios, indexData };
    localStorage.setItem('earlygasha_offline_toolkit', JSON.stringify(data));
    setOfflineMode(true);
    setTimeout(() => setOfflineMode(false), 3000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-primary font-mono animate-pulse underline decoration-primary/50 underline-offset-8">HYDRATING RESILIENCE CORE...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-element border border-edge rounded-xl hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-default tracking-tighter uppercase">{t.title}</h1>
            <p className="text-sm text-muted">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Language Toggle */}
           <div className="flex bg-element border border-edge p-1 rounded-xl">
              {['en', 'am', 'om'].map(l => (
                <button 
                   key={l}
                   onClick={() => setLang(l)}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lang === l ? 'bg-primary text-black' : 'text-muted hover:text-default'}`}
                >
                   {l}
                </button>
              ))}
           </div>
           
           <button 
              onClick={downloadOffline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-edge ${offlineMode ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500' : 'bg-element text-muted hover:text-default'}`}
           >
              {offlineMode ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span className="hidden md:inline">{offlineMode ? t.offline_success : t.download}</span>
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-element border border-edge rounded-2xl gap-1 w-fit">
          {[
            { id: 'index', label: t.scorecard, icon: BarChart3, roles: ['system_admin', 'institutional_user', 'field_officer'] },
            { id: 'training', label: t.knowledge, icon: BookOpen, roles: ['system_admin', 'institutional_user', 'field_officer'] },
            { id: 'simulations', label: t.simulations, icon: Activity, roles: ['system_admin', 'institutional_user'] },
            { id: 'logistics', label: t.logistics, icon: Package, roles: ['system_admin', 'institutional_user'] },
            { id: 'feedback', label: t.feedback, icon: MessageSquare, roles: ['field_officer', 'system_admin'] },
            { id: 'manage', label: t.manage, icon: Plus, roles: ['system_admin'] }
          ].filter(tab => tab.roles.includes(user?.role)).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
                activeTab === tab.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted hover:text-default'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
      </div>

      {/* Main Content Areas */}
      <div className="flex-grow">
        {activeTab === 'index' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <h3 className="text-xs font-black uppercase text-primary tracking-widest mb-4">Sector Selection</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {regions.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRegion(r.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedRegion === r.id ? 'bg-primary/10 border-primary' : 'bg-white/5 border-edge hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-default">{r.region}</span>
                        <Badge variant={selectedRegion === r.id ? "primary" : "default"}>{r.country}</Badge>
                      </div>
                      <div className="text-[10px] text-muted font-mono">LAT: {r.lat.toFixed(2)} | LON: {r.lon.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <Shield className="w-8 h-8 text-primary mb-4" />
                <h2 className="text-3xl font-black text-default mb-1">{indexData?.overall_resilience || '0.00'}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Community Preparedness Index</p>
                <p className="text-xs text-muted leading-relaxed">
                  Composite score derived from healthcare threshold, food reserve telemetry, and infrastructure stress tests.
                </p>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {indexData?.categories.map((cat, i) => (
                  <Card key={i} className="border-edge/50">
                    <h4 className="text-xs font-bold text-default mb-4 flex items-center gap-2 uppercase">
                      <div className="w-1.5 h-6 bg-primary rounded-full" />
                      {cat.category.replace('_', ' ')}
                    </h4>
                    <div className="space-y-4">
                      {cat.metrics.map((m, mi) => (
                        <div key={mi} className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted font-bold">{m.metric}</span>
                            <span className={`font-black ${m.value > 0.6 ? 'text-emerald-500' : m.value > 0.3 ? 'text-amber-500' : 'text-red-500'}`}>
                              {(m.value * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                m.value > 0.6 ? 'bg-emerald-500' : m.value > 0.3 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${m.value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 bg-element/20 border border-edge rounded-[2rem]">
               <div className="flex-grow relative max-w-xl w-full">
                  <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search Global Knowledge Hub (Neural Interface)..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-edge rounded-2xl py-3 pl-12 pr-4 text-xs text-default focus:outline-none focus:border-primary/50 transition-all font-mono"
                  />
               </div>
               <div className="flex gap-2">
                  <Badge variant="primary" className="py-2 px-4 cursor-pointer hover:bg-primary-hover transition-colors">All Protocols</Badge>
                  <Badge variant="default" className="py-2 px-4 cursor-pointer hover:bg-white/10 transition-colors">Video Only</Badge>
                  <Badge variant="default" className="py-2 px-4 cursor-pointer hover:bg-white/10 transition-colors">Guides</Badge>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources
                .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.category.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((res, i) => (
              <Card key={i} className="flex flex-col h-full hover:scale-[1.02] transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${
                    res.resource_type === 'video' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    res.resource_type === 'guide' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {res.resource_type === 'video' ? <Play className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                  </div>
                  <Badge variant="default">{res.category.replace('_', ' ')}</Badge>
                </div>
                <h4 className="text-lg font-black text-default mb-2 leading-tight uppercase group-hover:text-primary transition-colors">{res.title}</h4>
                <p className="text-xs text-muted mb-6 flex-grow">Interactive training module specializing in {res.category.replace('_', ' ')} protocols. Tactical verification required.</p>
                <div className="flex gap-2">
                    <button 
                      onClick={() => setReadingResource(res)}
                      className="flex-grow py-3 bg-slate-900 hover:bg-slate-800 text-default rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-edge group-hover:border-primary/30"
                    >
                      Initialize Training <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="p-3 bg-element border border-edge rounded-xl text-muted hover:text-primary transition-colors">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
              </Card>
                ))}
            </div>
          </div>
        )}

        {readingResource && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in zoom-in duration-300">
                <Card className="w-full max-w-4xl bg-[#0a0a0c] border-primary/20 shadow-4xl max-h-[90vh] flex flex-col p-8">
                    <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <BookOpen className="text-primary w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-default uppercase tracking-widest">{readingResource.title}</h2>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">Operational Protocol // Ver: 4.0.2</p>
                            </div>
                        </div>
                        <button onClick={() => setReadingResource(null)} className="p-2 text-muted hover:text-white transition-colors bg-white/5 rounded-xl"><X size={24}/></button>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-6 custom-scrollbar text-slate-300 space-y-8 font-serif leading-relaxed text-sm">
                        <div className="p-6 bg-primary/5 border-l-4 border-primary rounded-r-3xl italic">
                            "The following protocols are established under Crisis Council Directive 8. Failure to adhere to these operational norms during a high-stakes hazard event may result in catastrophic multi-vector failure."
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-default uppercase font-sans tracking-tight">Phase 1: Tactical Ingestion</h3>
                            <p>Before deploying any localized response, ensure all telemetry sources are synchronized with the EarlyGasha Intelligence Core. 
                               Verify the following signatures:</p>
                            <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                                <li>Hydrological volatility indices exceeding stable thresholds (+15% variance).</li>
                                <li>Supply chain latency nodes in secondary and tertiary sectors.</li>
                                <li>Conflict signal density within a 50km radius of the mission zone.</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-default uppercase font-sans tracking-tight">Phase 2: Resource Fortification</h3>
                            <p>Tactical supply depots should be repositioned to 'Green Zone' sectors identified by the AI Logistics Map. 
                               Priority must be given to clinical supplies and potable water purification hardware.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 border border-edge rounded-2xl">
                                    <div className="text-[10px] uppercase font-black text-primary mb-1">Standard Loadout</div>
                                    <div className="text-xs">400 Medical Units / 1k Liter H2O</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-edge rounded-2xl">
                                    <div className="text-[10px] uppercase font-black text-primary mb-1">Emergency Loadout</div>
                                    <div className="text-xs">800 Medical Units / 3k Liter H2O</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-4">
                        <button onClick={() => setReadingResource(null)} className="px-8 py-3 bg-element hover:bg-element-hover text-muted rounded-xl text-xs font-black uppercase transition-all">Mark as Read</button>
                        <button className="px-8 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-primary/20">Acknowledge Protocol</button>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'simulations' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scenarios.map((sc, i) => (
                  <Card key={i} className={`border-primary/10 overflow-hidden ${simRunning === sc.id ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                    <div className="absolute top-0 right-0 p-4">
                      <Badge variant={sc.difficulty === 'advanced' ? 'danger' : sc.difficulty === 'intermediate' ? 'warning' : 'success'}>
                        {sc.difficulty}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="p-3 w-fit bg-primary/10 rounded-2xl text-primary">
                        <Activity className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-default uppercase tracking-tight mb-2">{sc.title}</h4>
                        <p className="text-sm text-muted leading-relaxed line-clamp-3 mb-4">{sc.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(JSON.parse(sc.ai_parameters)).map(([key, val], idx) => (
                          <div key={idx} className="px-2 py-1 bg-element rounded-lg border border-edge text-[9px] font-mono text-slate-400">
                            {key.toUpperCase()}: {val}
                          </div>
                        ))}
                      </div>

                      <button 
                         disabled={!!simRunning || !!activeDrill}
                         onClick={() => handleRunSimulation(sc)}
                         className="py-4 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCcw className={`w-4 h-4 ${simRunning === sc.id ? 'animate-spin' : ''}`} /> Initialize Drill
                      </button>
                    </div>
                  </Card>
                ))}
            </div>

            {activeDrill && !simResult && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-slate-900 border-primary/30 shadow-3xl">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <Activity className="text-primary w-6 h-6" />
                                <div>
                                    <h2 className="text-xl font-black text-default uppercase tracking-tight">Active Drill: {activeDrill.title}</h2>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Decision Matrix: Step {drillStep + 1} of 3</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveDrill(null)} className="p-2 text-muted hover:text-white transition-colors"><X size={24}/></button>
                        </div>

                        {drillStep === 0 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                                    <Info className="text-blue-500 shrink-0 mt-1" />
                                    <p className="text-xs text-slate-300 leading-relaxed italic">"Situational reports indicate escalating hazard signatures. Immediate reconnaissance is required to determine the risk vector density."</p>
                                </div>
                                <h3 className="text-sm font-black uppercase text-default mb-4">Select Reconnaissance Strategy:</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'sat', label: 'Deploy Multi-Spectral Satellite Pass', desc: 'Provides macro-level hazard thermal signatures with 85% accuracy.' },
                                        { id: 'drone', label: 'Launch High-Altitude Tactical Drones', desc: 'Real-time visual telemetry, high cloud-interference risk.' },
                                        { id: 'ground', label: 'Dispatch Rapid Response Ground Squad', desc: '100% ground-truth accuracy, high risk to personnel.' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => handleDrillChoice(opt.id)}
                                            className="w-full p-5 bg-white/5 border border-edge rounded-2xl text-left hover:border-primary/50 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="text-xs font-black text-default group-hover:text-primary transition-colors uppercase mb-1">{opt.label}</div>
                                            <div className="text-[10px] text-muted">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {drillStep === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-1" />
                                    <p className="text-xs text-slate-300 leading-relaxed">"Recon confirmed critical threshold breach. Population clusters are within the impact zone. Evacuation protocols must be synchronized immediately."</p>
                                </div>
                                <h3 className="text-sm font-black uppercase text-default mb-4">Command Directive:</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'total', label: 'Execute Total Evacuation Protocol', desc: 'Maximize safety, high secondary economic impact.' },
                                        { id: 'phased', label: 'Initiate Phased Shelter-in-Place', desc: 'Controlled movement, risk of cluster entrapment.' },
                                        { id: 'supply', label: 'Prioritize Resource Fortification', desc: 'Wait for precision strike/aid, high immediate danger.' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => handleDrillChoice(opt.id)}
                                            className="w-full p-5 bg-white/5 border border-edge rounded-2xl text-left hover:border-primary/50 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="text-xs font-black text-default group-hover:text-primary transition-colors uppercase mb-1">{opt.label}</div>
                                            <div className="text-[10px] text-muted">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {drillStep === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4">
                                    <Shield className="text-red-500 shrink-0 mt-1" />
                                    <p className="text-xs text-slate-300 leading-relaxed font-bold uppercase tracking-tight text-red-500">Hazard Interface Imminent. Engage Final Mitigation Layer.</p>
                                </div>
                                <h3 className="text-sm font-black uppercase text-default mb-4">Mitigation Priority:</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'health', label: 'Secure Medical Continuity', desc: 'Prioritize field hospitals and vaccination/treatment caches.' },
                                        { id: 'logistics', label: 'Defend Supply Corridors', desc: 'Ensure food and water transit remain operational post-impact.' },
                                        { id: 'comms', label: 'Maintain Signal Dominance', desc: 'Keep local alerts and coordination hub active at all costs.' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => handleDrillChoice(opt.id)}
                                            className="w-full p-5 bg-white/5 border border-edge rounded-2xl text-left hover:border-primary/50 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="text-xs font-black text-default group-hover:text-primary transition-colors uppercase mb-1">{opt.label}</div>
                                            <div className="text-[10px] text-muted">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {drillStep === 3 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-6">
                                <RefreshCcw className="w-16 h-16 text-primary animate-spin" />
                                <div>
                                    <h3 className="text-xl font-black text-default uppercase tracking-widest mb-2">Synthesizing Response Impact...</h3>
                                    <p className="text-xs text-muted max-w-sm">AI engine calculating multi-vector outcomes based on tactical choices and community preparedness index baseline.</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {simResult && (
               <div className="p-8 glass-card border-primary/40 bg-primary/5 animate-in zoom-in duration-500">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-primary mb-1 uppercase">Simulation Summary: {simResult.scenario}</h3>
                        <p className="text-xs text-muted">A tactical evaluation of response effectiveness based on injected stressors.</p>
                    </div>
                    <button onClick={() => setSimResult(null)} className="p-2 text-muted hover:text-default"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="p-6 bg-black/40 rounded-3xl border border-edge">
                        <div className="text-[10px] uppercase font-black text-primary mb-2">Impact Score</div>
                        <div className="text-5xl font-black text-default tracking-tighter">{simResult.impact_score}%</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-red-500" style={{width: `${simResult.impact_score}%`}}/>
                        </div>
                     </div>
                     <div className="p-6 bg-black/40 rounded-3xl border border-edge">
                        <div className="text-[10px] uppercase font-black text-primary mb-2">Response Effectiveness</div>
                        <div className="text-5xl font-black text-default tracking-tighter">{(simResult.response_effectiveness * 100).toFixed(0)}%</div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{width: `${simResult.response_effectiveness * 100}%`}}/>
                        </div>
                     </div>
                     <div className="p-6 bg-black/40 rounded-3xl border border-edge">
                        <div className="text-[10px] uppercase font-black text-primary mb-4">Tactical Logs</div>
                        <div className="space-y-2">
                           {simResult.logs.map((log, i) => (
                             <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-muted">
                                <span className="text-primary pr-2 border-r border-edge">{i+1}</span> {log}
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <button className="mt-8 w-full py-4 border border-primary/30 text-primary font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/5">
                      <Download className="w-4 h-4"/> Export Preparedness Report (PDF)
                  </button>
               </div>
            )}
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-700">
            <Card className="min-h-[500px] border-edge flex flex-col p-0 bg-transparent">
              <div className="absolute top-4 left-4 z-10 space-y-2">
                 <Badge variant="primary">Tactical Supply Interface</Badge>
                 <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-edge">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Cluster</div>
                    <div className="text-sm font-bold text-primary">{indexData?.region || 'Detecting...'}</div>
                 </div>
              </div>
              <div className="relative w-full h-[400px] bg-slate-900 overflow-hidden">
                 <img 
                    src="/earlygasha_tactical_risk_map_1776524202521.png" 
                    alt="Tactical Risk Map" 
                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                 />
                 {/* CSS Overlays for "Depots" */}
                 <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-primary rounded-full animate-ping" />
                 <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-primary rounded-full border border-white/50" />
                 
                 <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                 <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-emerald-500 rounded-full border border-white/50" />
              </div>
              <div className="p-8 grid grid-cols-2 gap-4 w-full relative -mt-12 z-20">
                 <div className="p-4 glass-card bg-black/80 border-primary/20 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Recommended Depots</div>
                    <div className="text-2xl font-black text-default">12</div>
                 </div>
                 <div className="p-4 glass-card bg-black/80 border-emerald-500/20 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Transit Efficiency</div>
                    <div className="text-2xl font-black text-emerald-500">92%</div>
                 </div>
              </div>
            </Card>

            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Pre-positioning Suggestions
              </h3>
              <div className="space-y-4">
                {logistics?.suggestions.map((s, i) => (
                  <div key={i} className="p-6 bg-element border border-edge rounded-3xl relative overflow-hidden group hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black text-default mb-1">{s.type}</h4>
                        <p className="text-xs text-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</p>
                      </div>
                      <Badge variant={s.priority === 'CRITICAL' ? 'danger' : 'warning'}>{s.priority}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.supplies.map((item, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-900/50 rounded-xl border border-edge text-[10px] font-bold text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl">
                <div className="flex items-center gap-3 mb-3">
                   <AlertCircle className="text-primary w-5 h-5 pointer-events-none" />
                   <h4 className="text-sm font-black text-default uppercase">Logistics Alert</h4>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Based on current drought forecasts for the {indexData?.region} sector, supply chains should prioritize non-perishable rations and medical hydration units within the next 14 operational days.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
           <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
              <Card>
                 <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="text-primary w-8 h-8" />
                    <div>
                        <h3 className="text-2xl font-black text-default uppercase tracking-tight">Ground-Truth Synchronization</h3>
                        <p className="text-xs text-muted">Provide observational data to refine regional preparedness indicators.</p>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Target Sector Indicator</label>
                        <select className="w-full p-4 bg-slate-900 border border-edge rounded-2xl text-xs text-default">
                           <option>Overall Preparedness Stability</option>
                           <option>Healthcare Threshold Validity</option>
                           <option>Food Reserve Discrepancy</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Site Observations</label>
                        <textarea 
                           className="w-full p-4 bg-slate-900 border border-edge rounded-2xl text-xs text-default h-40 resize-none focus:border-primary"
                           placeholder="Describe any discrepancies between system predictions and actual ground conditions..."
                           value={feedbackText}
                           onChange={e => setFeedbackText(e.target.value)}
                        />
                    </div>
                    
                    <button 
                       onClick={submitFeedback}
                       className="w-full py-4 bg-primary text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4"/> {t.submit}
                    </button>
                 </div>
              </Card>
           </div>
        )}

        {activeTab === 'manage' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-default flex items-center gap-2 uppercase">
                        <BarChart3 className="text-primary" /> Indicators Logic
                    </h3>
                    <Badge variant="primary">Control Plane</Badge>
                  </div>
                  <div className="space-y-4">
                      {['Healthcare Threshold', 'Grain Reserve Burn Rate', 'Evacuation Route Integrity'].map((metric, i) => (
                        <div key={i} className="p-4 bg-slate-900/50 rounded-2xl border border-edge flex justify-between items-center">
                           <span className="text-xs font-bold text-slate-300">{metric}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-primary">LIMIT: 0.85</span>
                              <button className="text-muted hover:text-primary"><Plus className="w-4 h-4"/></button>
                           </div>
                        </div>
                      ))}
                      <button className="w-full py-3 border border-edge border-dashed rounded-2xl text-[10px] font-black uppercase text-muted hover:text-default hover:border-primary transition-all">
                          Define New Preparedness Vector
                      </button>
                  </div>
              </Card>

              <Card className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-default flex items-center gap-2 uppercase">
                        <FileJson className="text-primary" /> Training Repository
                    </h3>
                  </div>
                  <div className="space-y-4">
                     {resources.slice(0, 3).map((res, i) => (
                        <div key={i} className="p-4 bg-slate-900/50 rounded-2xl border border-edge flex justify-between items-center">
                           <div className="flex flex-col">
                               <span className="text-xs font-bold text-slate-300">{res.title}</span>
                               <span className="text-[9px] text-muted uppercase">{res.resource_type}</span>
                           </div>
                           <button className="text-red-500/50 hover:text-red-500"><X className="w-4 h-4"/></button>
                        </div>
                     ))}
                     <button className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-[10px] font-black uppercase hover:bg-primary/20 transition-all">
                         Upload Strategic Resource
                     </button>
                  </div>
              </Card>

              <Card className="md:col-span-2">
                 <h3 className="text-xl font-black text-default flex items-center gap-2 uppercase mb-6">
                    <Activity className="text-primary" /> Simulation Drift & Parameters
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Drought Severity Vector', 'Flash Flood Velocity', 'Spread Coefficient'].map((label, i) => (
                       <div key={i} className="p-6 bg-element border border-edge rounded-3xl">
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block">{label}</label>
                          <div className="flex items-end gap-3">
                             <input type="number" defaultValue={0.75} step={0.05} className="bg-slate-900 border border-edge rounded-xl p-2 text-primary font-black w-24 focus:outline-none" />
                             <span className="text-[10px] font-bold text-muted pb-2">Global Bias</span>
                          </div>
                       </div>
                    ))}
                 </div>
                 <button className="mt-8 px-8 py-4 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                     Commit Global Scenario Adjustments
                 </button>
              </Card>
           </div>
        )}
      </div>
    </div>
  );
}
