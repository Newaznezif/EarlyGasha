import React, { useState } from 'react';
import { FileText, Download, Filter, MapPin, AlertTriangle, Layers } from 'lucide-react';
import api from '../auth/api';

const ReportEngine = ({ regions = [], selectedRegion = null }) => {
  const [minScore, setMinScore] = useState(0);
  const [targetScope, setTargetScope] = useState('global'); // 'global' or 'region'
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const regionParam = targetScope === 'region' ? (selectedRegion?.region || selectedRegion) : '';
      const url = `/report/generate?min_score=${minScore}${regionParam ? `&region=${regionParam}` : ''}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Gasha_Report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Report Generation Fault:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowConfig(!showConfig)}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
      >
        <FileText className="w-4 h-4" />
        GENERATE INTEL BRIEF
      </button>

      {showConfig && (
        <div className="absolute top-full right-0 mt-3 w-72 glass-card p-4 z-[2500] border border-emerald-500/30 shadow-2xl animate-in slide-in-from-top-2">
           <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-tighter text-emerald-500">Generator Configuration</h4>
              <button onClick={() => setShowConfig(false)} className="text-muted hover:text-white">&times;</button>
           </div>

           <div className="space-y-4">
              {/* Scope Selector */}
              <div className="space-y-2">
                 <label className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Report Scope
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setTargetScope('global')}
                      className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${targetScope === 'global' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/5 text-muted'}`}
                    >
                       Global
                    </button>
                    <button 
                      onClick={() => setTargetScope('region')}
                      className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${targetScope === 'region' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/5 text-muted'}`}
                    >
                       Selected
                    </button>
                 </div>
              </div>

              {/* Threshold Slider */}
              {targetScope === 'global' && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Risk Threshold
                        </label>
                        <span className="text-[10px] text-emerald-500 font-bold">{minScore}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="w-full accent-emerald-500"
                    />
                </div>
              )}

              {targetScope === 'region' && selectedRegion && (
                <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center gap-2">
                    <MapPin className="text-emerald-500 w-3 h-3" />
                    <span className="text-[10px] font-bold text-slate-300">{selectedRegion.region || selectedRegion}</span>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                   <span className="animate-pulse">Synthesizing...</span>
                ) : (
                   <><Download className="w-3 h-3" /> Generate Intelligence Brief</>
                )}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportEngine;
