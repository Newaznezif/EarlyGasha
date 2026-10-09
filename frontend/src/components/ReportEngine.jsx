import React, { useState } from 'react';
import { FileText, Download, Filter, MapPin, AlertTriangle, Layers } from 'lucide-react';
import api from '../auth/api';

const ReportEngine = ({ selectedRegion = null }) => {
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
      link.setAttribute('download', `EarlyGasha_Ethiopia_Report_${new Date().getTime()}.pdf`);
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
        className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Generate report</span>
      </button>

      {showConfig && (
          <div className="absolute top-full right-0 mt-2 w-72 glass-card p-4 z-[2500] shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-edge pb-2">
              <h4 className="text-sm font-semibold text-default">Report settings</h4>
              <button onClick={() => setShowConfig(false)} className="text-muted hover:text-white">&times;</button>
           </div>

           <div className="space-y-4">
              {/* Scope Selector */}
              <div className="space-y-2">
                 <label className="text-xs font-medium text-muted flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Report Scope
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setTargetScope('global')}
                      className={`py-2 rounded-md text-xs font-medium border transition-all ${targetScope === 'global' ? 'bg-primary/10 border-primary text-primary' : 'bg-element border-edge text-muted'}`}
                    >
                       All regions
                    </button>
                    <button 
                      onClick={() => setTargetScope('region')}
                      className={`py-2 rounded-md text-xs font-medium border transition-all ${targetScope === 'region' ? 'bg-primary/10 border-primary text-primary' : 'bg-element border-edge text-muted'}`}
                    >
                       Selected region
                    </button>
                 </div>
              </div>

              {/* Threshold Slider */}
              {targetScope === 'global' && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Risk Threshold
                        </label>
                        <span className="text-xs text-default">{minScore}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="w-full accent-primary"
                    />
                </div>
              )}

              {targetScope === 'region' && selectedRegion && (
                <div className="p-2 bg-element border border-edge rounded-md flex items-center gap-2">
                  <MapPin className="text-primary w-3 h-3" />
                  <span className="text-xs font-medium text-default">{selectedRegion.region || selectedRegion}</span>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                   <span>Preparing report...</span>
                ) : (
                   <><Download className="w-4 h-4" /> Download report</>
                )}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportEngine;
